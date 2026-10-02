export const PRIORITIES = ['low', 'medium', 'high'] as const;
export type Priority = (typeof PRIORITIES)[number];

/** A person using DoNext on this device. */
export interface Profile {
  id: string;
  name: string;
  /** Avatar colour (hex). */
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskFields {
  title: string;
  description: string;
  /** Calendar date, YYYY-MM-DD */
  dueDate: string | null;
  priority: Priority;
  category: string;
  completed: boolean;
  /** Visible to everyone on this device. Private tasks are only visible to their creator (and assignee). */
  shared: boolean;
  /** Profile the task is assigned to, if any. The assignee can always see it. */
  assigneeId: string | null;
}

export interface Task extends TaskFields {
  id: string;
  /** Profile that created the task. */
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

/** Contents of a backup file (Download backup / Import backup). */
export interface Backup {
  app: 'DoNext';
  version: 1;
  exportedAt: string;
  profiles: Profile[];
  tasks: Task[];
}
