import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Task } from '../lib/types';
import { CalendarDialog, defaultTime } from './CalendarDialog';

const task: Task = {
  id: 't1',
  title: 'Pay rent',
  description: '',
  dueDate: '2026-11-01',
  priority: 'high',
  category: '',
  completed: false,
  listId: null,
  assigneeId: null,
  createdBy: 'me',
  createdAt: '',
  updatedAt: '',
  deletedAt: null,
};

describe('CalendarDialog', () => {
  it.each([
    ['apple', 'Add to Apple Calendar'],
    ['android', 'Add to Google Calendar'],
    ['windows', 'Add to Outlook / Windows Calendar'],
    ['other', 'Add to Google Calendar'],
  ] as const)('on %s devices, shows one main button: "%s"', async (platform, primary) => {
    const user = userEvent.setup();
    render(<CalendarDialog task={task} onClose={vi.fn()} platform={platform} />);
    expect(screen.getByText(primary).closest('a,button')).toHaveClass('btn-primary');
    // Only one calendar button until the user asks for others.
    const calendarControls = () => [...screen.queryAllByRole('link'), ...screen.queryAllByRole('button')].filter((el) => /Calendar/.test(el.textContent ?? ''));
    expect(calendarControls()).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Use another calendar' }));
    const names = calendarControls().map((el) => el.textContent ?? '');
    for (const name of ['Google Calendar', 'Apple Calendar', 'Outlook / Windows Calendar']) {
      expect(names.some((n) => n.includes(name))).toBe(true);
    }
  });

  it('defaults to 9:00, or the next hour if 9:00 has already passed today', () => {
    const at = (h: number, m = 0) => new Date(2026, 9, 12, h, m);
    expect(defaultTime('2026-10-12', at(7, 30))).toBe('09:00');
    expect(defaultTime('2026-10-12', at(14, 20))).toBe('15:00');
    expect(defaultTime('2026-10-12', at(23, 40))).toBe('23:00');
    expect(defaultTime('2026-10-20', at(14, 20))).toBe('09:00'); // another day
  });

  it('builds a Google Calendar link from the chosen date, time and reminder', async () => {
    const user = userEvent.setup();
    render(<CalendarDialog task={task} onClose={vi.fn()} platform="other" />);
    expect(screen.getByLabelText('Date')).toHaveValue('2026-11-01'); // defaults to the due date

    await user.clear(screen.getByLabelText('Time'));
    await user.type(screen.getByLabelText('Time'), '18:15');
    await user.selectOptions(screen.getByLabelText('Remind me'), '1440');

    const link = screen.getByRole('link', { name: /Google Calendar/ });
    const url = new URL(link.getAttribute('href')!);
    expect(url.searchParams.get('text')).toBe('Pay rent');
    expect(url.searchParams.get('dates')).toBe('20261101T181500/20261101T184500');
  });

  it('downloads an .ics file for Apple Calendar / Outlook', async () => {
    const user = userEvent.setup();
    const created: Blob[] = [];
    URL.createObjectURL = vi.fn((b: Blob) => {
      created.push(b);
      return 'blob:x';
    });
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    render(<CalendarDialog task={task} onClose={vi.fn()} platform="apple" />);
    await user.click(screen.getByRole('button', { name: /Add to Apple Calendar/ }));

    expect(click).toHaveBeenCalled();
    expect(created[0].type).toBe('text/calendar');
    const text = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(created[0]);
    });
    expect(text).toContain('SUMMARY:Pay rent');
    expect(await screen.findByText(/Calendar file downloaded/)).toBeInTheDocument();
    click.mockRestore();
  });
});
