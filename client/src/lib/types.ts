export const PRIORITIES = ['low', 'medium', 'high'] as const;
export type Priority = (typeof PRIORITIES)[number];

export interface TaskFields {
  title: string;
  description: string;
  /** Calendar date, YYYY-MM-DD */
  dueDate: string | null;
  priority: Priority;
  category: string;
  completed: boolean;
}

export interface Task extends TaskFields {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Session {
  token: string;
  user: User;
}

export type SyncChange =
  | { op: 'upsert'; id: string; updatedAt: string; createdAt: string; data: TaskFields }
  | { op: 'delete'; id: string; updatedAt: string };

/** A queued change waiting to be pushed. `rev` guards against removing a newer edit made mid-sync. */
export type OutboxEntry = SyncChange & { rev: number };

export interface SyncRequest {
  since: string | null;
  changes: SyncChange[];
}

export interface SyncResponse {
  tasks: Task[];
  results: Array<{ id: string | null; status: 'applied' | 'stale' | 'rejected'; reason?: string }>;
  cursor: string;
}
