import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import type { Config } from '../config.js';
import { HttpError } from '../lib/errors.js';
import {
  createTaskSchema,
  listQuerySchema,
  syncChangeSchema,
  syncRequestSchema,
  updateTaskSchema,
  type SyncChange,
} from '../lib/validation.js';
import { requireAuth } from '../middleware/auth.js';
import { parse } from '../middleware/validate.js';
import { Task, toTaskDTO, type TaskAttrs } from '../models/Task.js';

/**
 * Pull cursors are moved back by this much so a write that committed while a
 * pull was running is still picked up next time. Clients upsert idempotently,
 * so receiving a task twice is harmless.
 */
export const SYNC_SAFETY_WINDOW_MS = 5000;

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

type ChangeResult =
  | { id: string | null; status: 'applied' }
  | { id: string | null; status: 'stale' }
  | { id: string | null; status: 'rejected'; reason: string };

async function applyChange(userId: string, change: SyncChange, now: Date): Promise<ChangeResult> {
  // Never trust a client clock that claims to be in the future.
  const clientUpdatedAt = new Date(Math.min(Date.parse(change.updatedAt), now.getTime()));
  const existing = await Task.findById(change.id).lean<TaskAttrs>();

  if (existing && String(existing.user) !== userId) {
    return { id: change.id, status: 'rejected', reason: 'Task belongs to another account.' };
  }

  if (change.op === 'delete') {
    if (!existing || existing.deletedAt) return { id: change.id, status: 'applied' };
    await Task.updateOne(
      { _id: change.id, user: userId },
      { $set: { deletedAt: clientUpdatedAt, updatedAt: clientUpdatedAt, serverUpdatedAt: now } },
    );
    return { id: change.id, status: 'applied' };
  }

  // Deletions are sticky; otherwise the most recent edit wins.
  if (existing && (existing.deletedAt || new Date(existing.updatedAt) >= clientUpdatedAt)) {
    return { id: change.id, status: 'stale' };
  }

  try {
    await Task.updateOne(
      { _id: change.id, user: userId },
      {
        $set: { ...change.data, updatedAt: clientUpdatedAt, serverUpdatedAt: now, deletedAt: null },
        $setOnInsert: { createdAt: change.createdAt ? new Date(change.createdAt) : clientUpdatedAt },
      },
      { upsert: true, runValidators: true },
    );
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      return { id: change.id, status: 'rejected', reason: 'Task belongs to another account.' };
    }
    throw err;
  }
  return { id: change.id, status: 'applied' };
}

export function tasksRouter(config: Config): Router {
  const router = Router();
  router.use(requireAuth(config.JWT_SECRET));

  router.get('/', async (req, res) => {
    const { q, status, priority, category } = parse(listQuerySchema, req.query);
    const filter: Record<string, unknown> = { user: req.userId, deletedAt: null };
    if (status === 'active') filter.completed = false;
    if (status === 'completed') filter.completed = true;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (q?.trim()) {
      const rx = new RegExp(escapeRegex(q.trim()), 'i');
      filter.$or = [{ title: rx }, { description: rx }, { category: rx }];
    }
    const tasks = await Task.find(filter).sort({ completed: 1, dueDate: 1, createdAt: -1 }).lean<TaskAttrs[]>();
    res.json({ tasks: tasks.map(toTaskDTO) });
  });

  router.post('/', async (req, res) => {
    const { id, ...data } = parse(createTaskSchema, req.body);
    const now = new Date();
    try {
      const task = await Task.create({
        _id: id ?? randomUUID(),
        user: req.userId,
        ...data,
        createdAt: now,
        updatedAt: now,
        serverUpdatedAt: now,
      });
      res.status(201).json({ task: toTaskDTO(task.toObject()) });
    } catch (err) {
      if ((err as { code?: number }).code === 11000) throw new HttpError(409, 'A task with this id already exists.');
      throw err;
    }
  });

  /** Offline sync: push queued changes, then pull everything changed since `since`. */
  router.post('/sync', async (req, res) => {
    const userId = req.userId!;
    const { since, changes } = parse(syncRequestSchema, req.body);
    const now = new Date();

    const results: ChangeResult[] = [];
    const staleIds: string[] = [];
    for (const raw of changes) {
      const parsed = syncChangeSchema.safeParse(raw);
      if (!parsed.success) {
        const id = typeof (raw as { id?: unknown })?.id === 'string' ? (raw as { id: string }).id : null;
        results.push({ id, status: 'rejected', reason: parsed.error.issues[0]?.message ?? 'Invalid change.' });
        continue;
      }
      const result = await applyChange(userId, parsed.data, now);
      if (result.status === 'stale') staleIds.push(parsed.data.id);
      results.push(result);
    }

    const cursor = new Date(Date.now() - SYNC_SAFETY_WINDOW_MS);
    const pullFilter: Record<string, unknown> = { user: userId };
    if (since) pullFilter.serverUpdatedAt = { $gte: new Date(since) };
    else pullFilter.deletedAt = null; // first sync: tombstones aren't needed

    const [pulled, stale] = await Promise.all([
      Task.find(pullFilter).lean<TaskAttrs[]>(),
      staleIds.length ? Task.find({ _id: { $in: staleIds }, user: userId }).lean<TaskAttrs[]>() : [],
    ]);
    const byId = new Map<string, TaskAttrs>();
    for (const t of [...pulled, ...stale]) byId.set(t._id, t);

    res.json({ tasks: [...byId.values()].map(toTaskDTO), results, cursor: cursor.toISOString() });
  });

  router.get('/:id', async (req, res) => {
    const task = await Task.findOne({ _id: req.params.id, user: req.userId, deletedAt: null }).lean<TaskAttrs>();
    if (!task) throw new HttpError(404, 'Task not found.');
    res.json({ task: toTaskDTO(task) });
  });

  router.patch('/:id', async (req, res) => {
    const updates = parse(updateTaskSchema, req.body);
    const now = new Date();
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.userId, deletedAt: null },
      { $set: { ...updates, updatedAt: now, serverUpdatedAt: now } },
      { new: true, runValidators: true },
    ).lean<TaskAttrs>();
    if (!task) throw new HttpError(404, 'Task not found.');
    res.json({ task: toTaskDTO(task) });
  });

  router.delete('/:id', async (req, res) => {
    const now = new Date();
    const result = await Task.updateOne(
      { _id: req.params.id, user: req.userId, deletedAt: null },
      { $set: { deletedAt: now, updatedAt: now, serverUpdatedAt: now } },
    );
    if (result.matchedCount === 0) throw new HttpError(404, 'Task not found.');
    res.status(204).end();
  });

  return router;
}
