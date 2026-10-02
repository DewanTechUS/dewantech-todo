import type { Priority, Task } from './types';

export type StatusFilter = 'all' | 'active' | 'completed';
export type SortKey = 'due' | 'priority' | 'newest';

export interface TaskFilters {
  query: string;
  status: StatusFilter;
  priority: Priority | 'all';
  category: string; // '' = all
  sort: SortKey;
}

export const defaultFilters: TaskFilters = { query: '', status: 'all', priority: 'all', category: '', sort: 'due' };

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

/** Local calendar date as YYYY-MM-DD. */
export function todayISO(now = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

export function isOverdue(task: Pick<Task, 'dueDate' | 'completed'>, today = todayISO()): boolean {
  return !task.completed && !!task.dueDate && task.dueDate < today;
}

export function formatDueDate(dueDate: string, today = todayISO()): string {
  if (dueDate === today) return 'Today';
  const tomorrow = new Date(`${today}T12:00:00`);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (dueDate === todayISO(tomorrow)) return 'Tomorrow';
  const [y, m, d] = dueDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(String(y) !== today.slice(0, 4) ? { year: 'numeric' } : {}),
  });
}

export function categoriesOf(tasks: Task[]): string[] {
  const set = new Map<string, string>();
  for (const t of tasks) {
    const c = t.category.trim();
    if (c && !set.has(c.toLowerCase())) set.set(c.toLowerCase(), c);
  }
  return [...set.values()].sort((a, b) => a.localeCompare(b));
}

export function filterTasks(tasks: Task[], f: TaskFilters): Task[] {
  const q = f.query.trim().toLowerCase();
  const result = tasks.filter((t) => {
    if (f.status === 'active' && t.completed) return false;
    if (f.status === 'completed' && !t.completed) return false;
    if (f.priority !== 'all' && t.priority !== f.priority) return false;
    if (f.category && t.category.toLowerCase() !== f.category.toLowerCase()) return false;
    if (q && !`${t.title}\n${t.description}\n${t.category}`.toLowerCase().includes(q)) return false;
    return true;
  });

  const byDue = (a: Task, b: Task) => {
    if (a.dueDate === b.dueDate) return 0;
    if (!a.dueDate) return 1; // undated last
    if (!b.dueDate) return -1;
    return a.dueDate < b.dueDate ? -1 : 1;
  };
  const byNewest = (a: Task, b: Task) => b.createdAt.localeCompare(a.createdAt);
  const byPriority = (a: Task, b: Task) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];

  return result.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1; // open tasks first
    if (f.sort === 'priority') return byPriority(a, b) || byDue(a, b) || byNewest(a, b);
    if (f.sort === 'newest') return byNewest(a, b);
    return byDue(a, b) || byPriority(a, b) || byNewest(a, b);
  });
}
