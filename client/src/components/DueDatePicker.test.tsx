import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DueDateField, DueDatePickerModal, quickDates } from './DueDatePicker';
import { Modal } from './Modal';

// Tuesday
const today = '2026-10-13';

describe('DueDatePicker', () => {
  it('computes quick picks from today', () => {
    expect(quickDates(today).map((q) => [q.label, q.date])).toEqual([
      ['Today', '2026-10-13'],
      ['Tomorrow', '2026-10-14'],
      ['This weekend', '2026-10-17'],
      ['Next week', '2026-10-19'],
    ]);
    expect(quickDates('2026-10-18')[2].date).toBe('2026-10-18'); // Sunday: the weekend is today
    expect(quickDates('2026-10-18')[3].date).toBe('2026-10-19'); // next Monday
  });

  it('picks a day in another month and a time', async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<DueDatePickerModal date={null} time={null} today={today} onDone={onDone} onClose={vi.fn()} />);

    expect(screen.getByText('October 2026')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByText('November 2026')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /November 26, 2026/ }));
    await user.click(screen.getByRole('button', { name: /Evening/ }));
    expect(screen.getByText(/Nov 26, 6:00 PM/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(onDone).toHaveBeenCalledWith({ date: '2026-11-26', time: '18:00' });
  });

  it('clears the date and time with "No date"', async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<DueDatePickerModal date="2026-10-20" time="09:00" today={today} onDone={onDone} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: /October 20, 2026/ })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'No date' }));
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(onDone).toHaveBeenCalledWith({ date: null, time: null });
  });

  it('closes only the picker on Escape when opened over another dialog', async () => {
    const user = userEvent.setup();
    const closeOuter = vi.fn();
    render(
      <Modal title="Edit task" onClose={closeOuter}>
        <DueDateField id="due" date={null} time={null} onChange={vi.fn()} />
      </Modal>,
    );
    await user.click(screen.getByRole('button', { name: 'Open calendar' }));
    expect(screen.getByRole('dialog', { name: 'Due date' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Due date' })).not.toBeInTheDocument();
    expect(closeOuter).not.toHaveBeenCalled();
  });
});

describe('DueDateField (typing)', () => {
  it('reads a typed date, warns about text it cannot read, and clears', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DueDateField id="due" date={null} time={null} onChange={onChange} />);
    const box = screen.getByLabelText('Due date');

    await user.type(box, 'whenever{Enter}');
    expect(screen.getByText(/Not sure what date that is/)).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();

    await user.clear(box);
    await user.type(box, '2026-12-24 9am{Enter}');
    expect(onChange).toHaveBeenLastCalledWith({ date: '2026-12-24', time: '09:00' });
  });

  it('shows the date and time left for a set date, and clears it', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DueDateField id="due" date="2099-01-01" time={null} onChange={onChange} />);
    expect(screen.getByLabelText('Due date')).toHaveValue('Jan 1, 2099');
    expect(screen.getByText(/days left/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear due date' }));
    expect(onChange).toHaveBeenCalledWith({ date: null, time: null });
  });
});
