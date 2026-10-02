import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Profile, Task } from './types';

interface DoNextDB extends DBSchema {
  profiles: { key: string; value: Profile };
  tasks: { key: string; value: Task; indexes: { byOwner: string } };
  meta: { key: string; value: string | null };
}

export const DB_NAME = 'donext';

/**
 * Everything DoNext stores lives in this one IndexedDB database on the device.
 * Nothing is sent to a server.
 */
export class LocalDB {
  private constructor(private db: IDBPDatabase<DoNextDB>) {}

  static async open(name = DB_NAME): Promise<LocalDB> {
    const db = await openDB<DoNextDB>(name, 1, {
      upgrade(db) {
        db.createObjectStore('profiles', { keyPath: 'id' });
        const tasks = db.createObjectStore('tasks', { keyPath: 'id' });
        tasks.createIndex('byOwner', 'ownerId');
        db.createObjectStore('meta');
      },
    });
    return new LocalDB(db);
  }

  close() {
    this.db.close();
  }

  getProfiles() {
    return this.db.getAll('profiles');
  }

  putProfile(p: Profile) {
    return this.db.put('profiles', p);
  }

  getTasks() {
    return this.db.getAll('tasks');
  }

  putTask(t: Task) {
    return this.db.put('tasks', t);
  }

  deleteTask(id: string) {
    return this.db.delete('tasks', id);
  }

  async getMeta(key: string) {
    return (await this.db.get('meta', key)) ?? null;
  }

  async setMeta(key: string, value: string | null) {
    await this.db.put('meta', value, key);
  }

  /**
   * Removes a person. Their private tasks are deleted; tasks they shared stay for everyone,
   * and anything assigned to them becomes unassigned.
   */
  async deleteProfile(id: string) {
    const tx = this.db.transaction(['profiles', 'tasks'], 'readwrite');
    const tasks = tx.objectStore('tasks');
    for (const t of await tasks.getAll()) {
      if (t.ownerId === id && !t.shared) await tasks.delete(t.id);
      else if (t.assigneeId === id) await tasks.put({ ...t, assigneeId: null, updatedAt: new Date().toISOString() });
    }
    await tx.objectStore('profiles').delete(id);
    await tx.done;
  }

  /** Writes many records in one transaction (used by Import backup). */
  async putMany(profiles: Profile[], tasks: Task[]) {
    const tx = this.db.transaction(['profiles', 'tasks'], 'readwrite');
    for (const p of profiles) await tx.objectStore('profiles').put(p);
    for (const t of tasks) await tx.objectStore('tasks').put(t);
    await tx.done;
  }

  /** Erases every profile, task and setting on this device. */
  async clearAll() {
    const tx = this.db.transaction(['profiles', 'tasks', 'meta'], 'readwrite');
    await Promise.all([tx.objectStore('profiles').clear(), tx.objectStore('tasks').clear(), tx.objectStore('meta').clear(), tx.done]);
  }
}
