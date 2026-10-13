import { describe, expect, it } from 'vitest';
import { parseDue, suggestTask } from './smartSuggest';

// Tuesday, Oct 13 2026, 10:00 local time
const now = new Date(2026, 9, 13, 10, 0);
const suggest = (text: string, categories: string[] = []) => suggestTask(text, { now, categories });

describe('suggestTask', () => {
  it('turns a single food into a grocery task', () => {
    expect(suggest('milk')).toEqual({ title: 'Buy milk', category: 'Groceries' });
    expect(suggest('oat milk')).toMatchObject({ title: 'Buy oat milk', category: 'Groceries' });
  });

  it('turns a list of foods into sub-items, with or without commas', () => {
    const expected = { title: 'Buy groceries', category: 'Groceries', subtasks: ['Milk', 'Eggs', 'Bread'] };
    expect(suggest('milk, eggs and bread')).toEqual(expected);
    expect(suggest('buy milk eggs bread')).toEqual(expected);
    expect(suggest('milk eggs and bread')).toEqual(expected);
    expect(suggest('oat milk and brown rice').subtasks).toEqual(['Oat milk', 'Brown rice']);
  });

  it('suggests a starter list for plain "groceries"', () => {
    expect(suggest('groceries').subtasks).toContain('Milk');
  });

  it('reads dates and times and removes them from the title', () => {
    expect(suggest('call mom tomorrow at 5pm')).toEqual({
      title: 'Call mom',
      category: 'Family',
      dueDate: '2026-10-14',
      dueTime: '17:00',
    });
    expect(suggest('pay rent on friday')).toMatchObject({ title: 'Pay rent', category: 'Bills', dueDate: '2026-10-16' });
    expect(suggest('dentist next tuesday 9:30 am')).toMatchObject({ category: 'Health', dueDate: '2026-10-20', dueTime: '09:30' });
    expect(suggest('finish report in 3 days')).toMatchObject({ title: 'Finish report', dueDate: '2026-10-16' });
    // A time that has already passed today means tomorrow.
    expect(suggest('email Sam at 8am')).toMatchObject({ dueDate: '2026-10-14', dueTime: '08:00' });
    expect(suggest('watch a movie tonight')).toMatchObject({ dueDate: '2026-10-13', dueTime: '20:00' });
  });

  it('sets priority from urgency words and due-today', () => {
    expect(suggest('pay the bills asap')).toMatchObject({ title: 'Pay the bills', category: 'Bills', priority: 'high' });
    expect(suggest('learn guitar someday')).toMatchObject({ title: 'Learn guitar', priority: 'low' });
    expect(suggest('hi I need some groceries today')).toMatchObject({ category: 'Groceries', priority: 'high', dueDate: '2026-10-13' });
    expect(suggest('pay the bills').priority).toBeUndefined();
  });

  it('suggests a checklist for common tasks', () => {
    expect(suggest('plan the weekend trip')).toMatchObject({ category: 'Travel', subtasks: expect.arrayContaining(['Pack bag']) });
    expect(suggest('clean the house')).toMatchObject({ category: 'Home', subtasks: expect.arrayContaining(['Kitchen']) });
  });

  it("reuses the user's own category names", () => {
    expect(suggest('milk', ['groceries']).category).toBe('groceries');
    expect(suggest('fix the bike', ['Bike'])).toMatchObject({ category: 'Bike' });
  });

  it('avoids common false matches', () => {
    expect(suggest('order 5 amazon packages').dueTime).toBeUndefined();
    expect(suggest('pack snacks and water').subtasks).toBeUndefined();
    expect(suggest('book the cabin').category).toBeUndefined();
    expect(suggest('oil change').category).toBe('Car');
    expect(suggest('what to do')).toEqual({});
    expect(suggest('x')).toEqual({});
  });
});

describe('parseDue (typing a due date)', () => {
  const due = (text: string) => parseDue(text, now);

  it('understands words, month names, numbers and times', () => {
    expect(due('tomorrow 5pm')).toEqual({ date: '2026-10-14', time: '17:00' });
    expect(due('Oct 20')).toEqual({ date: '2026-10-20', time: null });
    expect(due('october 20th, 2027 at 9:30 am')).toEqual({ date: '2027-10-20', time: '09:30' });
    expect(due('20 Oct')).toEqual({ date: '2026-10-20', time: null });
    expect(due('10/20 15:45')).toEqual({ date: '2026-10-20', time: '15:45' });
    expect(due('20/10/2026')).toEqual({ date: '2026-10-20', time: null });
    expect(due('2026-12-24')).toEqual({ date: '2026-12-24', time: null });
    expect(due('friday evening')).toEqual({ date: '2026-10-16', time: '18:00' });
    expect(due('this weekend')).toEqual({ date: '2026-10-17', time: null });
    expect(due('in 3 hours')).toEqual({ date: '2026-10-13', time: '13:00' });
    expect(due('Jan 5')).toEqual({ date: '2027-01-05', time: null }); // already past this year
  });

  it('reads back what the app displays', () => {
    expect(due('Today, 6:00 PM')).toEqual({ date: '2026-10-13', time: '18:00' });
    expect(due('Oct 16, 6:00 PM')).toEqual({ date: '2026-10-16', time: '18:00' });
    expect(due('Friday, October 16')).toEqual({ date: '2026-10-16', time: null });
  });

  it('clears on empty and rejects text that is not a date', () => {
    expect(due('')).toEqual({ date: null, time: null });
    expect(due('no date')).toEqual({ date: null, time: null });
    expect(due('buy milk tomorrow')).toBeNull();
    expect(due('Feb 30')).toBeNull();
    expect(due('soon')).toBeNull();
  });
});
