import { uuid } from './id';
import type { LocalDB } from './db';
import { PRIORITIES, type Backup, type Profile, type Task, type TaskFields } from './types';

/** Avatar colours, all readable with white initials. */
export const PROFILE_COLORS = ['#006fef', '#7c3aed', '#db2777', '#ea580c', '#0d9488', '#16a34a', '#b45309', '#475569'];

const ACTIVE_KEY = 'activeProfileId';

export interface AppState {
  ready: boolean;
  profiles: Profile[];
  tasks: Task[];
  activeProfileId: string | null;
}

const pickFields = (t: TaskFields): TaskFields => ({
  title: t.title.trim().slice(0, 200),
  description: t.description.slice(0, 2000),
  dueDate: t.dueDate || null,
  priority: PRIORITIES.includes(t.priority) ? t.priority : 'medium',
  category: t.category.trim().slice(0, 50),
  completed: Boolean(t.completed),
  shared: Boolean(t.shared),
  assigneeId: t.assigneeId || null,
});

export class BackupError extends Error {}

/**
 * All app data, kept in IndexedDB on this device. The UI subscribes to changes
 * (useSyncExternalStore) and never talks to a server.
 */
export class AppStore {
  state: AppState = { ready: false, profiles: [], tasks: [], activeProfileId: null };
  private listeners = new Set<() => void>();

  constructor(
    private db: LocalDB,
    private now: () => Date = () => new Date(),
  ) {}

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getState = () => this.state;

  private set(patch: Partial<AppState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((fn) => fn());
  }

  private ts() {
    return this.now().toISOString();
  }

  async init() {
    const [profiles, tasks, active] = await Promise.all([this.db.getProfiles(), this.db.getTasks(), this.db.getMeta(ACTIVE_KEY)]);
    profiles.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    this.set({
      ready: true,
      profiles,
      tasks,
      activeProfileId: active && profiles.some((p) => p.id === active) ? active : null,
    });
  }

  get activeProfile(): Profile | null {
    return this.state.profiles.find((p) => p.id === this.state.activeProfileId) ?? null;
  }

  // ---------- people ----------

  async addProfile(name: string, color?: string): Promise<Profile> {
    const clean = name.trim().slice(0, 40);
    if (!clean) throw new Error('Please enter a name.');
    if (this.state.profiles.some((p) => p.name.toLowerCase() === clean.toLowerCase())) {
      throw new Error(`There is already someone called “${clean}”.`);
    }
    const used = new Set(this.state.profiles.map((p) => p.color));
    const ts = this.ts();
    const profile: Profile = {
      id: uuid(),
      name: clean,
      color: color ?? PROFILE_COLORS.find((c) => !used.has(c)) ?? PROFILE_COLORS[this.state.profiles.length % PROFILE_COLORS.length],
      createdAt: ts,
      updatedAt: ts,
    };
    await this.db.putProfile(profile);
    this.set({ profiles: [...this.state.profiles, profile] });
    return profile;
  }

  async updateProfile(id: string, patch: { name?: string; color?: string }) {
    const existing = this.state.profiles.find((p) => p.id === id);
    if (!existing) throw new Error('This person no longer exists.');
    const name = patch.name !== undefined ? patch.name.trim().slice(0, 40) : existing.name;
    if (!name) throw new Error('Please enter a name.');
    if (this.state.profiles.some((p) => p.id !== id && p.name.toLowerCase() === name.toLowerCase())) {
      throw new Error(`There is already someone called “${name}”.`);
    }
    const updated: Profile = { ...existing, name, color: patch.color ?? existing.color, updatedAt: this.ts() };
    await this.db.putProfile(updated);
    this.set({ profiles: this.state.profiles.map((p) => (p.id === id ? updated : p)) });
  }

  async removeProfile(id: string) {
    await this.db.deleteProfile(id);
    const tasks = await this.db.getTasks();
    const profiles = this.state.profiles.filter((p) => p.id !== id);
    const activeProfileId = this.state.activeProfileId === id ? null : this.state.activeProfileId;
    if (activeProfileId === null) await this.db.setMeta(ACTIVE_KEY, null);
    this.set({ profiles, tasks, activeProfileId });
  }

  async selectProfile(id: string | null) {
    if (id && !this.state.profiles.some((p) => p.id === id)) throw new Error('This person no longer exists.');
    await this.db.setMeta(ACTIVE_KEY, id);
    this.set({ activeProfileId: id });
  }

  // ---------- tasks ----------

  private requireActive(): string {
    const id = this.state.activeProfileId;
    if (!id) throw new Error('Choose who is using DoNext first.');
    return id;
  }

  async createTask(fields: TaskFields): Promise<Task> {
    const ownerId = this.requireActive();
    const ts = this.ts();
    const task: Task = { id: uuid(), ...pickFields(fields), ownerId, createdAt: ts, updatedAt: ts };
    await this.db.putTask(task);
    this.set({ tasks: [...this.state.tasks, task] });
    return task;
  }

  async updateTask(id: string, patch: Partial<TaskFields>): Promise<Task> {
    this.requireActive();
    const existing = this.state.tasks.find((t) => t.id === id);
    if (!existing) throw new Error('This task no longer exists.');
    const task: Task = { ...existing, ...pickFields({ ...existing, ...patch }), updatedAt: this.ts() };
    await this.db.putTask(task);
    this.set({ tasks: this.state.tasks.map((t) => (t.id === id ? task : t)) });
    return task;
  }

  toggleTask(id: string) {
    const t = this.state.tasks.find((x) => x.id === id);
    return this.updateTask(id, { completed: !t?.completed });
  }

  async deleteTask(id: string) {
    this.requireActive();
    await this.db.deleteTask(id);
    this.set({ tasks: this.state.tasks.filter((t) => t.id !== id) });
  }

  // ---------- backup ----------

  exportBackup(): Backup {
    return { app: 'DoNext', version: 1, exportedAt: this.ts(), profiles: this.state.profiles, tasks: this.state.tasks };
  }

  /**
   * Merges a backup into this device. Items that exist on both sides keep whichever
   * was changed most recently, so importing the same file twice is harmless.
   */
  async importBackup(raw: unknown): Promise<{ profiles: number; tasks: number }> {
    const backup = parseBackup(raw);
    const profilesById = new Map(this.state.profiles.map((p) => [p.id, p]));
    const tasksById = new Map(this.state.tasks.map((t) => [t.id, t]));
    const newer = <T extends { updatedAt: string }>(incoming: T, current?: T) => !current || incoming.updatedAt > current.updatedAt;

    const profiles = backup.profiles.filter((p) => newer(p, profilesById.get(p.id)));
    const tasks = backup.tasks.filter((t) => newer(t, tasksById.get(t.id)));
    await this.db.putMany(profiles, tasks);

    for (const p of profiles) profilesById.set(p.id, p);
    for (const t of tasks) tasksById.set(t.id, t);
    this.set({
      profiles: [...profilesById.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      tasks: [...tasksById.values()],
    });
    return { profiles: profiles.length, tasks: tasks.length };
  }

  /** Deletes all people and tasks from this device. */
  async eraseEverything() {
    await this.db.clearAll();
    this.set({ profiles: [], tasks: [], activeProfileId: null });
  }
}

// ---------- backup validation ----------

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : null);
const isoOrNow = (v: unknown) => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : new Date().toISOString());

/** Validates and cleans a backup file so a damaged or hand-edited file can't break the app. */
export function parseBackup(raw: unknown): Backup {
  const b = raw as Partial<Backup> | null;
  if (!b || typeof b !== 'object' || b.app !== 'DoNext' || !Array.isArray(b.profiles) || !Array.isArray(b.tasks)) {
    throw new BackupError("This file isn't a DoNext backup.");
  }
  const profiles: Profile[] = [];
  for (const p of b.profiles as unknown[]) {
    const o = p as Record<string, unknown>;
    const id = str(o?.id, 64);
    const name = str(o?.name, 40)?.trim();
    if (!id || !name) continue;
    const color = typeof o.color === 'string' && /^#[0-9a-f]{6}$/i.test(o.color) ? o.color : PROFILE_COLORS[0];
    profiles.push({ id, name, color, createdAt: isoOrNow(o.createdAt), updatedAt: isoOrNow(o.updatedAt) });
  }
  const tasks: Task[] = [];
  for (const t of b.tasks as unknown[]) {
    const o = t as Record<string, unknown>;
    const id = str(o?.id, 64);
    const ownerId = str(o?.ownerId, 64);
    const title = str(o?.title, 200)?.trim();
    if (!id || !ownerId || !title) continue;
    const dueDate = typeof o.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.dueDate) ? o.dueDate : null;
    tasks.push({
      id,
      ownerId,
      title,
      description: str(o.description, 2000) ?? '',
      dueDate,
      priority: PRIORITIES.includes(o.priority as never) ? (o.priority as Task['priority']) : 'medium',
      category: (str(o.category, 50) ?? '').trim(),
      completed: o.completed === true,
      shared: o.shared === true,
      assigneeId: str(o.assigneeId, 64),
      createdAt: isoOrNow(o.createdAt),
      updatedAt: isoOrNow(o.updatedAt),
    });
  }
  return { app: 'DoNext', version: 1, exportedAt: isoOrNow(b.exportedAt), profiles, tasks };
}
