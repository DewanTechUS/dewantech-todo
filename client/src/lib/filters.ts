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

/** Local time as HH:MM. */
export function nowTime(now = new Date()): string {
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

/** Past its due date, or due earlier today at a time that has passed. */
export function isOverdue(
  task: Pick<Task, 'dueDate' | 'completed'> & { dueTime?: string | null },
  today = todayISO(),
  time = nowTime(),
): boolean {
  if (task.completed || !task.dueDate) return false;
  return task.dueDate < today || (task.dueDate === today && !!task.dueTime && task.dueTime <= time);
}

export type TimeLeftTone = 'overdue' | 'soon' | 'later';

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`;

/** Whole calendar days from `from` to `to` (both YYYY-MM-DD). */
function dayDiff(from: string, to: string) {
  const [a, b] = [from, to].map((s) => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  });
  return Math.round((b - a) / 86_400_000);
}

/**
 * How long until a task is due: "3 days left", "5 hours left", "Due today", "2 days overdue"…
 * Tasks without a time count as due at the end of their day. Null when done or undated.
 */
export function timeLeft(
  task: Pick<Task, 'dueDate' | 'completed'> & { dueTime?: string | null },
  now = new Date(),
): { text: string; tone: TimeLeftTone } | null {
  if (task.completed || !task.dueDate) return null;
  const days = dayDiff(todayISO(now), task.dueDate);

  if (!task.dueTime) {
    if (days === 0) return { text: 'Due today', tone: 'soon' };
    if (days > 0) return { text: `${plural(days, 'day')} left`, tone: days === 1 ? 'soon' : 'later' };
    return { text: `${plural(-days, 'day')} overdue`, tone: 'overdue' };
  }

  const [y, mo, d] = task.dueDate.split('-').map(Number);
  const [h, mi] = task.dueTime.split(':').map(Number);
  const mins = Math.round((new Date(y, mo - 1, d, h, mi).getTime() - now.getTime()) / 60_000);
  const abs = Math.abs(mins);
  const amount =
    abs < 60 ? plural(Math.max(abs, 1), 'min') : abs < 24 * 60 ? plural(Math.round(abs / 60), 'hour') : plural(Math.abs(days) || 1, 'day');
  if (mins < 0) return { text: `${amount} overdue`, tone: 'overdue' };
  return { text: `${amount} left`, tone: mins < 24 * 60 ? 'soon' : 'later' };
}

/** "15:30" → "3:30 PM" (in the user's locale). */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** e.g. "Oct 12, 3:04 PM" (the year is added when it isn't this year). */
export function formatTimestamp(iso: string, now = new Date()): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
    hour: 'numeric',
    minute: '2-digit',
  });
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
    if (t.deletedAt) return false;
    if (f.status === 'active' && t.completed) return false;
    if (f.status === 'completed' && !t.completed) return false;
    if (f.priority !== 'all' && t.priority !== f.priority) return false;
    if (f.category && t.category.toLowerCase() !== f.category.toLowerCase()) return false;
    const subtasks = (t.subtasks ?? []).map((s) => s.title).join('\n');
    if (q && !`${t.title}\n${t.description}\n${t.category}\n${subtasks}`.toLowerCase().includes(q)) return false;
    return true;
  });

  const byDue = (a: Task, b: Task) => {
    if (!a.dueDate !== !b.dueDate) return a.dueDate ? -1 : 1; // undated last
    // Within a day, tasks with a time come first, earliest first.
    const ka = a.dueDate ? `${a.dueDate} ${a.dueTime ?? '~'}` : '';
    const kb = b.dueDate ? `${b.dueDate} ${b.dueTime ?? '~'}` : '';
    return ka === kb ? 0 : ka < kb ? -1 : 1;
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
