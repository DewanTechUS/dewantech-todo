import type { Task } from './types';

export type TaskView = 'mine' | 'shared' | 'all';

/** A task is visible to a person if it is shared, or they created it, or it is assigned to them. */
export function canSee(task: Task, profileId: string): boolean {
  return task.shared || task.ownerId === profileId || task.assigneeId === profileId;
}

/** Only the creator can delete a task (or anyone, if the creator's profile was removed). */
export function canDelete(task: Task, profileId: string, profileIds: Set<string>): boolean {
  return task.ownerId === profileId || !profileIds.has(task.ownerId);
}

/**
 * - mine:   tasks I created or that are assigned to me
 * - shared: tasks shared with everyone on this device
 * - all:    everything I'm allowed to see
 */
export function tasksForView(tasks: Task[], profileId: string, view: TaskView): Task[] {
  return tasks.filter((t) => {
    if (!canSee(t, profileId)) return false;
    if (view === 'mine') return t.ownerId === profileId || t.assigneeId === profileId;
    if (view === 'shared') return t.shared;
    return true;
  });
}
