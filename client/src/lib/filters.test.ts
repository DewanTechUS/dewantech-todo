import { describe, expect, it } from 'vitest';
import { categoriesOf, defaultFilters, filterTasks, formatDueDate, isOverdue } from './filters';
import type { Task } from './types';

let n = 0;
const task = (overrides: Partial<Task>): Task => {
  n += 1;
  return {
    id: `id-${n}`,
    title: `Task ${n}`,
    description: '',
    dueDate: null,
    priority: 'medium',
    category: '',
    completed: false,
    createdAt: new Date(2026, 0, n).toISOString(),
    updatedAt: new Date(2026, 0, n).toISOString(),
    deletedAt: null,
    ...overrides,
  };
};

describe('filterTasks', () => {
  const tasks = [
    task({ title: 'Write quarterly report', category: 'Work', priority: 'high', dueDate: '2026-10-05' }),
    task({ title: 'Buy groceries', description: 'milk, eggs', category: 'Home', priority: 'low' }),
    task({ title: 'Gym', category: 'health', completed: true, dueDate: '2026-09-01' }),
    task({ title: 'Email Sam', description: 'about the report', category: 'work', dueDate: '2026-10-02' }),
    task({ title: 'Deleted', deletedAt: '2026-01-01T00:00:00.000Z' }),
  ];
  const titles = (f: Partial<typeof defaultFilters>) => filterTasks(tasks, { ...defaultFilters, ...f }).map((t) => t.title);

  it('hides deleted tasks and sorts open tasks first, then by due date (undated last)', () => {
    expect(titles({})).toEqual(['Email Sam', 'Write quarterly report', 'Buy groceries', 'Gym']);
  });

  it('searches title, description and category case-insensitively', () => {
    expect(titles({ query: 'REPORT' })).toEqual(['Email Sam', 'Write quarterly report']);
    expect(titles({ query: 'eggs' })).toEqual(['Buy groceries']);
    expect(titles({ query: '  home ' })).toEqual(['Buy groceries']);
  });

  it('filters by status, priority and category', () => {
    expect(titles({ status: 'completed' })).toEqual(['Gym']);
    expect(titles({ status: 'active', priority: 'high' })).toEqual(['Write quarterly report']);
    expect(titles({ category: 'WORK' })).toEqual(['Email Sam', 'Write quarterly report']);
  });

  it('sorts by priority and by newest', () => {
    expect(titles({ sort: 'priority' })).toEqual(['Write quarterly report', 'Email Sam', 'Buy groceries', 'Gym']);
    expect(titles({ sort: 'newest' })[0]).toBe('Email Sam');
  });
});

describe('date helpers', () => {
  it('flags overdue only for incomplete tasks with a past due date', () => {
    expect(isOverdue({ dueDate: '2026-09-30', completed: false }, '2026-10-01')).toBe(true);
    expect(isOverdue({ dueDate: '2026-10-01', completed: false }, '2026-10-01')).toBe(false);
    expect(isOverdue({ dueDate: '2026-09-30', completed: true }, '2026-10-01')).toBe(false);
    expect(isOverdue({ dueDate: null, completed: false }, '2026-10-01')).toBe(false);
  });

  it('formats today and tomorrow in words', () => {
    expect(formatDueDate('2026-10-01', '2026-10-01')).toBe('Today');
    expect(formatDueDate('2026-10-02', '2026-10-01')).toBe('Tomorrow');
    expect(formatDueDate('2026-11-01', '2026-10-31')).toBe('Tomorrow'); // month rollover
  });

  it('lists unique categories case-insensitively', () => {
    expect(categoriesOf([task({ category: 'Work' }), task({ category: 'work' }), task({ category: 'Home' })])).toEqual([
      'Home',
      'Work',
    ]);
  });
});
