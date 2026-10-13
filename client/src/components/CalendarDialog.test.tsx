import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Task } from '../lib/types';
import { CalendarDialog } from './CalendarDialog';

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
  it('builds a Google Calendar link from the chosen date, time and reminder', async () => {
    const user = userEvent.setup();
    render(<CalendarDialog task={task} onClose={vi.fn()} />);
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

    render(<CalendarDialog task={task} onClose={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /Apple Calendar/ }));

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
