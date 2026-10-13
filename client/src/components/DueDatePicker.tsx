import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { formatDueDate, formatTime, timeLeft, todayISO } from '../lib/filters';
import { parseDue } from '../lib/smartSuggest';
import { CalendarIcon, ChevronRightIcon, ClockIcon, CloseIcon } from './Icons';
import { Modal } from './Modal';

interface Due {
  date: string | null;
  time: string | null;
}

const parse = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};
const shift = (iso: string, days: number) => {
  const d = parse(iso);
  d.setDate(d.getDate() + days);
  return todayISO(d);
};

/** Quick picks, relative to today. */
export function quickDates(today: string) {
  const dow = parse(today).getDay(); // 0 = Sunday
  return [
    { label: 'Today', date: today },
    { label: 'Tomorrow', date: shift(today, 1) },
    // The coming Saturday (today, if it's already the weekend).
    { label: 'This weekend', date: dow === 0 || dow === 6 ? today : shift(today, 6 - dow) },
    { label: 'Next week', date: shift(today, ((8 - dow) % 7) || 7) }, // next Monday
  ];
}

const QUICK_TIMES = [
  { label: 'Morning', time: '09:00' },
  { label: 'Noon', time: '12:00' },
  { label: 'Afternoon', time: '15:00' },
  { label: 'Evening', time: '18:00' },
];

/** 6 weeks × 7 days covering the month, starting on Sunday. */
function monthGrid(year: number, month: number) {
  const offset = new Date(year, month, 1).getDay();
  return Array.from({ length: 42 }, (_, i) => new Date(year, month, 1 - offset + i, 12));
}

const WEEKDAYS = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(2026, 0, 4 + i); // Jan 4 2026 is a Sunday
  return { short: d.toLocaleDateString(undefined, { weekday: 'narrow' }), long: d.toLocaleDateString(undefined, { weekday: 'long' }) };
});

const chip = (active: boolean) =>
  `min-h-[40px] rounded-full border px-3 text-sm font-medium transition-colors ${
    active
      ? 'border-brand-600 bg-brand-600 text-white'
      : 'border-slate-200 text-slate-700 hover:border-brand-400 hover:bg-brand-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
  }`;

export function describeDue(date: string | null, time: string | null) {
  if (!date) return '';
  return `${formatDueDate(date)}${time ? `, ${formatTime(time)}` : ''}`;
}

interface PickerProps extends Due {
  onDone: (due: Due) => void;
  onClose: () => void;
  /** Override "today" (tests). */
  today?: string;
}

/** A modal to pick a due date (quick picks or a month calendar) and an optional time. */
export function DueDatePickerModal({ date: initialDate, time: initialTime, onDone, onClose, today = todayISO() }: PickerProps) {
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime);
  const start = parse(initialDate ?? today);
  const [view, setView] = useState({ y: start.getFullYear(), m: start.getMonth() });

  const pick = (iso: string) => {
    setDate(iso);
    const d = parse(iso);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };
  const moveMonth = (by: number) => setView(({ y, m }) => ({ y: y + Math.floor((m + by) / 12), m: (((m + by) % 12) + 12) % 12 }));
  const monthLabel = new Date(view.y, view.m, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <Modal title="Due date" onClose={onClose}>
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Quick picks">
          {quickDates(today).map((q) => (
            <button key={q.label} type="button" className={chip(date === q.date)} aria-pressed={date === q.date} onClick={() => pick(q.date)}>
              {q.label}
            </button>
          ))}
          <button
            type="button"
            className={chip(!date)}
            aria-pressed={!date}
            onClick={() => {
              setDate(null);
              setTime(null);
            }}
          >
            No date
          </button>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <button type="button" className="btn-ghost" onClick={() => moveMonth(-1)} aria-label="Previous month">
              <ChevronRightIcon className="rotate-180" />
            </button>
            <p className="font-semibold" aria-live="polite">
              {monthLabel}
            </p>
            <button type="button" className="btn-ghost" onClick={() => moveMonth(1)} aria-label="Next month">
              <ChevronRightIcon />
            </button>
          </div>
          <div className="grid grid-cols-7 text-center text-xs font-medium text-slate-500 dark:text-slate-400" aria-hidden>
            {WEEKDAYS.map((w) => (
              <span key={w.long} className="py-1">
                {w.short}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-1" role="group" aria-label={monthLabel}>
            {monthGrid(view.y, view.m).map((d) => {
              const iso = todayISO(d);
              const selected = iso === date;
              const isToday = iso === today;
              const inMonth = d.getMonth() === view.m;
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => pick(iso)}
                  aria-pressed={selected}
                  aria-label={d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  aria-current={isToday ? 'date' : undefined}
                  className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm transition-colors ${
                    selected
                      ? 'bg-brand-600 font-semibold text-white'
                      : isToday
                        ? 'font-semibold text-brand-700 ring-1 ring-brand-500 dark:text-brand-300'
                        : inMonth
                          ? 'hover:bg-slate-100 dark:hover:bg-slate-800'
                          : 'text-slate-300 hover:bg-slate-100 dark:text-slate-600 dark:hover:bg-slate-800'
                  }`}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        <fieldset disabled={!date} className="disabled:opacity-50">
          <legend className="label flex items-center gap-1.5">
            <ClockIcon width={16} height={16} /> Time <span className="font-normal text-slate-500 dark:text-slate-400">(optional)</span>
          </legend>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={chip(!time)} aria-pressed={!time} onClick={() => setTime(null)}>
              Any time
            </button>
            {QUICK_TIMES.map((q) => (
              <button key={q.time} type="button" className={chip(time === q.time)} aria-pressed={time === q.time} onClick={() => setTime(q.time)}>
                {q.label} <span className="opacity-75">{formatTime(q.time)}</span>
              </button>
            ))}
            <label className="sr-only" htmlFor="due-picker-time">
              Exact time
            </label>
            <input
              id="due-picker-time"
              type="time"
              className="input w-auto"
              value={time ?? ''}
              onChange={(e) => setTime(e.target.value || null)}
            />
          </div>
        </fieldset>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <p className="min-w-0 text-sm text-slate-600 dark:text-slate-400">
            {date ? (
              <>
                Due <span className="font-semibold text-slate-900 dark:text-slate-100">{describeDue(date, time)}</span>
                <span className="block text-xs">{leftText(date, time)}</span>
              </>
            ) : (
              'No due date'
            )}
          </p>
          <div className="flex shrink-0 gap-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={() => onDone({ date, time: date ? time : null })}>
              Done
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

interface FieldProps extends Due {
  id: string;
  onChange: (due: Due) => void;
}

/** "Fri, Oct 16, 6:00 PM" */
function longDue(date: string, time: string | null) {
  const [y, m, d] = date.split('-').map(Number);
  const day = new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(y !== new Date().getFullYear() ? { year: 'numeric' } : {}),
  });
  return time ? `${day}, ${formatTime(time)}` : day;
}

const leftText = (date: string, time: string | null) => timeLeft({ dueDate: date, dueTime: time, completed: false })?.text;

/**
 * The due date field: type it ("tomorrow 5pm", "Oct 20", "10/20 3pm"…) or tap the calendar
 * button to pick it in a modal. What you type is read back as a date while you type.
 */
export function DueDateField({ id, date, time, onChange }: FieldProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(() => describeDue(date, time));
  const focused = useRef(false);
  const input = useRef<HTMLInputElement>(null);

  // Show changes made elsewhere (the calendar, smart suggestions) unless the user is typing.
  useEffect(() => {
    if (!focused.current) setText(describeDue(date, time));
  }, [date, time]);

  const shown = describeDue(date, time);
  const parsed = text.trim() === shown ? { date, time } : parseDue(text);
  const changed = text.trim() !== shown;

  const commit = () => {
    if (!changed) return;
    if (parsed) {
      onChange(parsed);
      setText(describeDue(parsed.date, parsed.time));
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // don't submit the whole form
      commit();
    } else if (e.key === 'Escape' && changed) {
      e.stopPropagation();
      setText(shown);
    }
  };

  let hint: { text: string; error?: boolean };
  if (changed && text.trim() && !parsed) {
    hint = { text: 'Not sure what date that is. Try “tomorrow 5pm”, “Oct 20” or “friday evening”, or tap the calendar.', error: true };
  } else if (changed && parsed?.date) {
    hint = { text: `→ ${longDue(parsed.date, parsed.time)} · ${leftText(parsed.date, parsed.time) ?? ''}` };
  } else if (date) {
    hint = { text: `${longDue(date, time)} · ${leftText(date, time) ?? ''}` };
  } else {
    hint = { text: 'Type a date like “tomorrow 5pm” or “Oct 20”, or tap the calendar.' };
  }

  return (
    <div>
      <label htmlFor={id} className="label">
        Due date
      </label>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <CalendarIcon
            width={18}
            height={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            id={id}
            ref={input}
            className={`input pl-10 ${date ? 'pr-11' : ''}`}
            value={text}
            placeholder="No due date"
            autoComplete="off"
            enterKeyHint="done"
            aria-describedby={`${id}-hint`}
            aria-invalid={hint.error || undefined}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => (focused.current = true)}
            onBlur={() => {
              focused.current = false;
              commit();
            }}
            onKeyDown={onKeyDown}
          />
          {date && (
            <button
              type="button"
              className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              aria-label="Clear due date"
              onClick={() => {
                onChange({ date: null, time: null });
                setText('');
                input.current?.focus();
              }}
            >
              <CloseIcon width={16} height={16} />
            </button>
          )}
        </div>
        <button
          type="button"
          className="btn-secondary shrink-0 px-3"
          aria-label="Open calendar"
          aria-haspopup="dialog"
          title="Open calendar"
          onClick={() => {
            commit();
            setOpen(true);
          }}
        >
          <CalendarIcon />
        </button>
      </div>
      <p
        id={`${id}-hint`}
        className={`mt-1 text-xs ${hint.error ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}
        aria-live="polite"
      >
        {hint.text}
      </p>
      {open && (
        <DueDatePickerModal
          date={parsed?.date ?? date}
          time={parsed ? parsed.time : time}
          onClose={() => setOpen(false)}
          onDone={(due) => {
            onChange(due);
            setText(describeDue(due.date, due.time));
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
