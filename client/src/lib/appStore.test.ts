import { afterEach, describe, expect, it } from 'vitest';
import { AppStore, BackupError, parseBackup } from './appStore';
import { LocalDB } from './db';
import { uuid } from './id';
import type { TaskFields } from './types';
import { canDelete, tasksForView } from './visibility';

const fields = (title: string, extra: Partial<TaskFields> = {}): TaskFields => ({
  title,
  description: '',
  dueDate: null,
  priority: 'medium',
  category: '',
  completed: false,
  shared: false,
  assigneeId: null,
  ...extra,
});

const opened: LocalDB[] = [];
async function setup(name = `test-${uuid()}`) {
  const db = await LocalDB.open(name);
  opened.push(db);
  const store = new AppStore(db);
  await store.init();
  return { store, db, name };
}

afterEach(() => {
  for (const db of opened.splice(0)) db.close();
});

describe('people', () => {
  it('adds people with distinct colours and rejects blank or duplicate names', async () => {
    const { store } = await setup();
    const a = await store.addProfile('  Rocky  ');
    const b = await store.addProfile('Sara');
    expect(a.name).toBe('Rocky');
    expect(a.color).not.toBe(b.color);
    await expect(store.addProfile('   ')).rejects.toThrow(/name/i);
    await expect(store.addProfile('rocky')).rejects.toThrow(/already/i);
  });

  it('remembers who is selected across restarts', async () => {
    const { store, db, name } = await setup();
    const a = await store.addProfile('Rocky');
    await store.selectProfile(a.id);
    db.close();
    const again = await setup(name);
    expect(again.store.activeProfile?.name).toBe('Rocky');
  });
});

describe('tasks and sharing', () => {
  async function twoPeople() {
    const ctx = await setup();
    const rocky = await ctx.store.addProfile('Rocky');
    const sara = await ctx.store.addProfile('Sara');
    await ctx.store.selectProfile(rocky.id);
    return { ...ctx, rocky, sara };
  }

  it('requires someone to be selected before adding tasks', async () => {
    const { store } = await setup();
    await expect(store.createTask(fields('x'))).rejects.toThrow(/choose who/i);
  });

  it('keeps private tasks private and shows shared and assigned tasks to others', async () => {
    const { store, rocky, sara } = await twoPeople();
    await store.createTask(fields('Rocky private'));
    await store.createTask(fields('Team shopping', { shared: true }));
    await store.createTask(fields('Sara please call', { assigneeId: sara.id }));

    const titles = (who: string, view: 'mine' | 'shared' | 'all') =>
      tasksForView(store.state.tasks, who, view)
        .map((t) => t.title)
        .sort();

    expect(titles(rocky.id, 'mine')).toEqual(['Rocky private', 'Sara please call', 'Team shopping']);
    expect(titles(sara.id, 'all')).toEqual(['Sara please call', 'Team shopping']);
    expect(titles(sara.id, 'mine')).toEqual(['Sara please call']);
    expect(titles(sara.id, 'shared')).toEqual(['Team shopping']);
  });

  it('lets only the creator delete a task', async () => {
    const { store, rocky, sara } = await twoPeople();
    const t = await store.createTask(fields('Shared', { shared: true }));
    const ids = new Set([rocky.id, sara.id]);
    expect(canDelete(t, rocky.id, ids)).toBe(true);
    expect(canDelete(t, sara.id, ids)).toBe(false);
  });

  it('removing a person deletes their private tasks, keeps shared ones and unassigns their work', async () => {
    const { store, rocky, sara } = await twoPeople();
    await store.selectProfile(sara.id);
    await store.createTask(fields('Sara private'));
    await store.createTask(fields('Sara shared', { shared: true }));
    await store.selectProfile(rocky.id);
    const assigned = await store.createTask(fields('For Sara', { assigneeId: sara.id }));

    await store.removeProfile(sara.id);
    const titles = store.state.tasks.map((t) => t.title).sort();
    expect(titles).toEqual(['For Sara', 'Sara shared']);
    expect(store.state.tasks.find((t) => t.id === assigned.id)?.assigneeId).toBeNull();
    expect(store.state.profiles.map((p) => p.name)).toEqual(['Rocky']);
  });

  it('saves tasks on the device so they survive a restart', async () => {
    const { store, db, name, rocky } = await twoPeople();
    await store.createTask(fields('  Survives  ', { category: ' Home ' }));
    db.close();
    const again = await setup(name);
    expect(again.store.state.tasks).toEqual([
      expect.objectContaining({ title: 'Survives', category: 'Home', ownerId: rocky.id, shared: false }),
    ]);
  });
});

describe('backup', () => {
  it('exports everything and imports it into another device', async () => {
    const a = await setup();
    const rocky = await a.store.addProfile('Rocky');
    await a.store.selectProfile(rocky.id);
    await a.store.createTask(fields('Moved task', { shared: true }));
    const file = JSON.parse(JSON.stringify(a.store.exportBackup()));

    const b = await setup();
    const result = await b.store.importBackup(file);
    expect(result).toEqual({ profiles: 1, tasks: 1 });
    expect(b.store.state.tasks[0]).toMatchObject({ title: 'Moved task', ownerId: rocky.id, shared: true });

    // Importing the same file again changes nothing.
    expect(await b.store.importBackup(file)).toEqual({ profiles: 0, tasks: 0 });
  });

  it('keeps the newer version when a task exists on both devices', async () => {
    let clock = Date.parse('2026-10-01T10:00:00Z');
    const db = await LocalDB.open(`test-${uuid()}`);
    opened.push(db);
    const store = new AppStore(db, () => new Date(clock));
    await store.init();
    const p = await store.addProfile('Rocky');
    await store.selectProfile(p.id);
    const t = await store.createTask(fields('Original'));
    const oldBackup = JSON.parse(JSON.stringify(store.exportBackup()));

    clock += 60_000;
    await store.updateTask(t.id, { title: 'Edited later' });
    await store.importBackup(oldBackup);
    expect(store.state.tasks.find((x) => x.id === t.id)?.title).toBe('Edited later');
  });

  it('rejects files that are not DoNext backups and cleans damaged entries', async () => {
    const { store } = await setup();
    await expect(store.importBackup({ hello: 'world' })).rejects.toBeInstanceOf(BackupError);
    const cleaned = parseBackup({
      app: 'DoNext',
      profiles: [{ id: 'p1', name: 'Ok', color: 'javascript:alert(1)' }, { id: '', name: 'No id' }],
      tasks: [
        { id: 't1', ownerId: 'p1', title: 'Fine', priority: 'urgent', dueDate: 'tomorrow', shared: 'yes' },
        { id: 't2', ownerId: 'p1', title: '' },
      ],
    });
    expect(cleaned.profiles).toHaveLength(1);
    expect(cleaned.profiles[0].color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(cleaned.tasks).toEqual([expect.objectContaining({ id: 't1', priority: 'medium', dueDate: null, shared: false })]);
  });

  it('erases everything', async () => {
    const { store } = await setup();
    const p = await store.addProfile('Rocky');
    await store.selectProfile(p.id);
    await store.createTask(fields('Gone'));
    await store.eraseEverything();
    expect(store.state).toMatchObject({ profiles: [], tasks: [], activeProfileId: null });
  });
});
