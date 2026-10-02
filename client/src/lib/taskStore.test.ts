import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './api';
import { LocalStore } from './db';
import { uuid } from './id';
import { TaskStore } from './taskStore';
import type { SyncRequest, SyncResponse, Task, TaskFields } from './types';

const fields = (title: string, extra: Partial<TaskFields> = {}): TaskFields => ({
  title,
  description: '',
  dueDate: null,
  priority: 'medium',
  category: '',
  completed: false,
  ...extra,
});

/** Minimal in-memory stand-in for POST /api/tasks/sync (last-write-wins). */
class FakeServer {
  tasks = new Map<string, Task>();
  requests: SyncRequest[] = [];

  handle = async (req: SyncRequest): Promise<SyncResponse> => {
    this.requests.push(structuredClone(req));
    const results: SyncResponse['results'] = [];
    for (const c of req.changes) {
      const existing = this.tasks.get(c.id);
      if (c.op === 'delete') {
        if (existing) this.tasks.set(c.id, { ...existing, deletedAt: c.updatedAt, updatedAt: c.updatedAt });
      } else if (!existing || existing.updatedAt < c.updatedAt) {
        this.tasks.set(c.id, { id: c.id, ...c.data, createdAt: c.createdAt, updatedAt: c.updatedAt, deletedAt: null });
      }
      results.push({ id: c.id, status: 'applied' });
    }
    return { tasks: [...this.tasks.values()], results, cursor: new Date().toISOString() };
  };
}

const opened: Array<{ store: LocalStore; ts: TaskStore }> = [];
async function setup(opts: { online?: () => boolean; sync?: (r: SyncRequest) => Promise<SyncResponse>; userId?: string } = {}) {
  const server = new FakeServer();
  const store = await LocalStore.open(opts.userId ?? uuid());
  const onUnauthorized = vi.fn();
  const ts = new TaskStore({
    store,
    sync: opts.sync ?? server.handle,
    isOnline: opts.online ?? (() => true),
    onUnauthorized,
    debounceMs: 60_000, // tests trigger sync explicitly
  });
  await ts.init();
  opened.push({ store, ts });
  return { server, store, ts, onUnauthorized };
}

afterEach(() => {
  for (const { store, ts } of opened.splice(0)) {
    ts.dispose();
    store.close();
  }
});

describe('TaskStore (offline-first)', () => {
  it('saves locally while offline, then pushes the queued change once online', async () => {
    let online = false;
    const { ts, server } = await setup({ online: () => online });

    const task = await ts.create(fields('  Offline task  '));
    expect(ts.tasks.map((t) => t.title)).toEqual(['Offline task']);
    expect(ts.state.pending).toBe(1);

    await ts.syncNow();
    expect(ts.state.status).toBe('offline');
    expect(server.requests).toHaveLength(0);

    online = true;
    await ts.syncNow();
    expect(ts.state).toMatchObject({ status: 'idle', pending: 0, error: null });
    expect(server.tasks.get(task.id)?.title).toBe('Offline task');
  });

  it('coalesces multiple offline edits to one task into a single change', async () => {
    const { ts, server } = await setup();
    const t = await ts.create(fields('Draft'));
    await ts.update(t.id, { title: 'Draft 2' });
    await ts.toggle(t.id);
    expect(ts.state.pending).toBe(1);
    await ts.syncNow();
    expect(server.requests[0].changes).toHaveLength(1);
    expect(server.tasks.get(t.id)).toMatchObject({ title: 'Draft 2', completed: true });
  });

  it('does not lose an edit made while a sync is in flight', async () => {
    const server = new FakeServer();
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const { ts } = await setup({
      sync: async (req) => {
        const res = await server.handle(req); // server sees the *old* title
        await gate;
        return res;
      },
    });
    const t = await ts.create(fields('Old title'));
    const syncing = ts.syncNow();
    await vi.waitFor(() => expect(server.requests).toHaveLength(1));

    await ts.update(t.id, { title: 'New title' }); // user edits mid-sync
    release();
    await syncing;

    expect(ts.tasks.find((x) => x.id === t.id)?.title).toBe('New title');
    expect(ts.state.pending).toBe(1); // newer edit is still queued
    await ts.syncNow();
    expect(server.tasks.get(t.id)?.title).toBe('New title');
    expect(ts.state.pending).toBe(0);
  });

  it('pulls tasks created on other devices and applies remote deletions', async () => {
    const { ts, server } = await setup();
    const remote: Task = {
      id: uuid(),
      ...fields('From my phone'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    };
    server.tasks.set(remote.id, remote);
    await ts.syncNow();
    expect(ts.tasks.map((t) => t.title)).toContain('From my phone');

    server.tasks.set(remote.id, { ...remote, deletedAt: new Date().toISOString() });
    await ts.syncNow();
    expect(ts.tasks.find((t) => t.id === remote.id)).toBeUndefined();
  });

  it('removes a task locally and propagates the deletion', async () => {
    const { ts, server } = await setup();
    const t = await ts.create(fields('Temp'));
    await ts.syncNow();
    await ts.remove(t.id);
    expect(ts.tasks).toHaveLength(0);
    await ts.syncNow();
    expect(server.tasks.get(t.id)?.deletedAt).toBeTruthy();
  });

  it('keeps queued changes and reports session expiry on 401', async () => {
    const { ts, onUnauthorized } = await setup({
      sync: async () => {
        throw new ApiError(401, 'expired');
      },
    });
    await ts.create(fields('Keep me'));
    await ts.syncNow();
    expect(onUnauthorized).toHaveBeenCalledOnce();
    expect(ts.state.status).toBe('error');
    expect(ts.state.pending).toBe(1);
  });

  it('treats network failures as offline and retries later', async () => {
    const { ts } = await setup({
      sync: async () => {
        throw new ApiError(0, 'no network');
      },
    });
    await ts.create(fields('Later'));
    await ts.syncNow();
    expect(ts.state).toMatchObject({ status: 'offline', pending: 1, error: null });
  });

  it('surfaces server rejections without blocking the queue', async () => {
    const { ts } = await setup({
      sync: async (req) => ({
        tasks: [],
        results: req.changes.map((c) => ({ id: c.id, status: 'rejected' as const, reason: 'Title is required' })),
        cursor: new Date().toISOString(),
      }),
    });
    await ts.create(fields('x'));
    await ts.syncNow();
    expect(ts.state.error).toMatch(/rejected.*Title is required/);
    expect(ts.state.pending).toBe(0);
  });

  it('persists tasks and the outbox across restarts, isolated per user', async () => {
    const userId = uuid();
    const a = await setup({ userId, online: () => false });
    await a.ts.create(fields('Survives restart'));
    a.ts.dispose();
    a.store.close();

    const again = await setup({ userId, online: () => false });
    expect(again.ts.tasks.map((t) => t.title)).toEqual(['Survives restart']);
    expect(again.ts.state.pending).toBe(1);

    const other = await setup({ userId: uuid() });
    expect(other.ts.tasks).toEqual([]);

    again.store.close();
    await LocalStore.destroy(userId);
    const wiped = await setup({ userId });
    expect(wiped.ts.tasks).toEqual([]);
  });
});
