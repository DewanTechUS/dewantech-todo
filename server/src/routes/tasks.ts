import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { Types } from 'mongoose';
import type { Config } from '../config.js';
import {
  canDeleteTask,
  canSeeTask,
  checkTarget,
  loadAccess,
  pendingInvites,
  toListDTOs,
  visibleTaskFilter,
  type Access,
} from '../lib/access.js';
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
import { User } from '../models/User.js';

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

const NO_ACCESS = "You don't have access to this task.";
const NO_DELETE = 'Only the person who created this task, or the list owner, can delete it.';

async function applyChange(a: Access, change: SyncChange, now: Date): Promise<ChangeResult> {
  // Never trust a client clock that claims to be in the future.
  const clientUpdatedAt = new Date(Math.min(Date.parse(change.updatedAt), now.getTime()));
  const existing = await Task.findById(change.id).lean<TaskAttrs>();

  if (existing && !canSeeTask(existing, a)) return { id: change.id, status: 'rejected', reason: NO_ACCESS };

  if (change.op === 'delete') {
    if (!existing || existing.deletedAt) return { id: change.id, status: 'applied' };
    if (!canDeleteTask(existing, a)) return { id: change.id, status: 'rejected', reason: NO_DELETE };
    await Task.updateOne(
      { _id: change.id },
      { $set: { deletedAt: clientUpdatedAt, updatedAt: clientUpdatedAt, serverUpdatedAt: now } },
    );
    return { id: change.id, status: 'applied' };
  }

  // Deletions are sticky; otherwise the most recent edit wins.
  if (existing && (existing.deletedAt || new Date(existing.updatedAt) >= clientUpdatedAt)) {
    return { id: change.id, status: 'stale' };
  }

  let target: ReturnType<typeof checkTarget>;
  try {
    target = checkTarget(change.data, a, existing);
  } catch (err) {
    if (err instanceof HttpError) return { id: change.id, status: 'rejected', reason: err.message };
    throw err;
  }
  const { listId: _l, assigneeId: _a, ...fields } = change.data;
  const set = { ...fields, listId: target.listId, assignee: target.assignee, updatedAt: clientUpdatedAt, serverUpdatedAt: now, deletedAt: null };

  try {
    if (existing) {
      const movedOut = existing.listId && existing.listId !== target.listId;
      await Task.updateOne({ _id: change.id }, { $set: set, ...(movedOut ? { $addToSet: { movedFrom: existing.listId } } : {}) });
    } else {
      await Task.updateOne(
        { _id: change.id, user: new Types.ObjectId(a.userId) },
        { $set: set, $setOnInsert: { createdAt: change.createdAt ? new Date(change.createdAt) : clientUpdatedAt } },
        { upsert: true, runValidators: true },
      );
    }
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return { id: change.id, status: 'rejected', reason: NO_ACCESS };
    throw err;
  }
  return { id: change.id, status: 'applied' };
}

export function tasksRouter(config: Config): Router {
  const router = Router();
  router.use(requireAuth(config.JWT_SECRET));

  router.get('/', async (req, res) => {
    const { q, status, priority, category } = parse(listQuerySchema, req.query);
    const a = await loadAccess(req.userId!);
    const filter: Record<string, unknown> = { ...visibleTaskFilter(a), deletedAt: null };
    const and: Record<string, unknown>[] = [];
    if (status === 'active') filter.completed = false;
    if (status === 'completed') filter.completed = true;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (q?.trim()) {
      const rx = new RegExp(escapeRegex(q.trim()), 'i');
      and.push({ $or: [{ title: rx }, { description: rx }, { category: rx }, { 'subtasks.title': rx }] });
    }
    if (and.length) filter.$and = and;
    const tasks = await Task.find(filter).sort({ completed: 1, dueDate: 1, createdAt: -1 }).lean<TaskAttrs[]>();
    res.json({ tasks: tasks.map(toTaskDTO) });
  });

  router.post('/', async (req, res) => {
    const { id, listId, assigneeId, ...data } = parse(createTaskSchema, req.body);
    const a = await loadAccess(req.userId!);
    const target = checkTarget({ listId, assigneeId }, a);
    const now = new Date();
    try {
      const task = await Task.create({
        _id: id ?? randomUUID(),
        user: req.userId,
        ...data,
        listId: target.listId,
        assignee: target.assignee,
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

  /**
   * Offline sync: push queued changes, then pull everything changed since `since`.
   * Also returns the lists you belong to and invitations waiting for you, so the client
   * can drop tasks from lists it has left.
   */
  router.post('/sync', async (req, res) => {
    const userId = req.userId!;
    const { since, changes } = parse(syncRequestSchema, req.body);
    const now = new Date();
    const a = await loadAccess(userId);

    const results: ChangeResult[] = [];
    const staleIds: string[] = [];
    for (const raw of changes) {
      const parsed = syncChangeSchema.safeParse(raw);
      if (!parsed.success) {
        const id = typeof (raw as { id?: unknown })?.id === 'string' ? (raw as { id: string }).id : null;
        results.push({ id, status: 'rejected', reason: parsed.error.issues[0]?.message ?? 'Invalid change.' });
        continue;
      }
      const result = await applyChange(a, parsed.data, now);
      if (result.status === 'stale') staleIds.push(parsed.data.id);
      results.push(result);
    }

    const cursor = new Date(Date.now() - SYNC_SAFETY_WINDOW_MS);
    const uid = new Types.ObjectId(userId);
    const myLists = [...a.lists.keys()];
    let pullFilter: Record<string, unknown>;
    let removedTaskIds: string[] = [];

    if (!since) {
      pullFilter = { ...visibleTaskFilter(a), deletedAt: null }; // first sync: tombstones aren't needed
    } else {
      const sinceDate = new Date(since);
      // Lists joined since the last sync: send all their (live) tasks, not just recent changes.
      const joinedSince = [...a.lists.values()]
        .filter((l) => l.members.some((m) => String(m.user) === userId && new Date(m.joinedAt) >= sinceDate))
        .map((l) => l._id);
      pullFilter = {
        $or: [
          { user: uid, listId: null, serverUpdatedAt: { $gte: sinceDate } },
          { listId: { $in: myLists }, serverUpdatedAt: { $gte: sinceDate } },
          { listId: { $in: joinedSince }, deletedAt: null },
        ],
      };
      // Tasks moved out of my lists (or out of my personal tasks) into places I can't see.
      const moved = await Task.find({
        serverUpdatedAt: { $gte: sinceDate },
        $or: [{ movedFrom: { $in: myLists } }, { user: uid, listId: { $nin: [null, ...myLists] } }],
      })
        .select('_id user listId')
        .lean<Pick<TaskAttrs, '_id' | 'user' | 'listId'>[]>();
      removedTaskIds = moved.filter((t) => !canSeeTask(t, a)).map((t) => t._id);
    }

    const [pulled, stale, me] = await Promise.all([
      Task.find(pullFilter).lean<TaskAttrs[]>(),
      staleIds.length ? Task.find({ _id: { $in: staleIds } }).lean<TaskAttrs[]>() : [],
      User.findById(userId).select('email').lean(),
    ]);
    const byId = new Map<string, TaskAttrs>();
    for (const t of [...pulled, ...stale]) if (canSeeTask(t, a)) byId.set(t._id, t);

    res.json({
      tasks: [...byId.values()].map(toTaskDTO),
      results,
      cursor: cursor.toISOString(),
      lists: await toListDTOs([...a.lists.values()], userId),
      invites: me ? await pendingInvites(me.email) : [],
      removedTaskIds,
    });
  });

  router.get('/:id', async (req, res) => {
    const a = await loadAccess(req.userId!);
    const task = await Task.findOne({ _id: req.params.id, deletedAt: null }).lean<TaskAttrs>();
    if (!task || !canSeeTask(task, a)) throw new HttpError(404, 'Task not found.');
    res.json({ task: toTaskDTO(task) });
  });

  router.patch('/:id', async (req, res) => {
    const updates = parse(updateTaskSchema, req.body);
    const a = await loadAccess(req.userId!);
    const existing = await Task.findOne({ _id: req.params.id, deletedAt: null }).lean<TaskAttrs>();
    if (!existing || !canSeeTask(existing, a)) throw new HttpError(404, 'Task not found.');

    const { listId: newList, assigneeId: newAssignee, ...fields } = updates;
    const listId = newList !== undefined ? newList : (existing.listId ?? null);
    const assigneeId = newAssignee !== undefined ? newAssignee : existing.assignee ? String(existing.assignee) : null;
    const target = checkTarget({ listId, assigneeId }, a, existing);
    const now = new Date();
    const movedOut = existing.listId && existing.listId !== target.listId;
    const task = await Task.findOneAndUpdate(
      { _id: existing._id },
      {
        $set: { ...fields, listId: target.listId, assignee: target.assignee, updatedAt: now, serverUpdatedAt: now },
        ...(movedOut ? { $addToSet: { movedFrom: existing.listId } } : {}),
      },
      { new: true, runValidators: true },
    ).lean<TaskAttrs>();
    res.json({ task: toTaskDTO(task!) });
  });

  router.delete('/:id', async (req, res) => {
    const a = await loadAccess(req.userId!);
    const existing = await Task.findOne({ _id: req.params.id, deletedAt: null }).lean<TaskAttrs>();
    if (!existing || !canSeeTask(existing, a)) throw new HttpError(404, 'Task not found.');
    if (!canDeleteTask(existing, a)) throw new HttpError(403, NO_DELETE);
    const now = new Date();
    await Task.updateOne({ _id: existing._id }, { $set: { deletedAt: now, updatedAt: now, serverUpdatedAt: now } });
    res.status(204).end();
  });

  return router;
}
