import { useId, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  detectCalendarPlatform,
  googleCalendarUrl,
  icsFile,
  icsFileName,
  REMINDER_OPTIONS,
  type CalendarEvent,
  type CalendarPlatform,
} from '../lib/calendar';
import { todayISO } from '../lib/filters';
import type { Task } from '../lib/types';
import { Alert } from './Alert';
import { BellIcon, CalendarIcon } from './Icons';
import { Modal } from './Modal';

/** Download (web) or share (native apps) the .ics file so the user can add it to their calendar. */
async function saveIcs(name: string, content: string): Promise<'shared' | 'downloaded'> {
  const file = new File([content], name, { type: 'text/calendar' });
  // In the iOS/Android apps there's no download folder; the share sheet offers "Calendar".
  if (Capacitor.isNativePlatform() && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: name });
    return 'shared';
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}

type CalendarOption = 'google' | 'apple' | 'outlook';

const LABELS: Record<CalendarOption, string> = {
  google: 'Google Calendar',
  apple: 'Apple Calendar',
  outlook: 'Outlook / Windows Calendar',
};

const PRIMARY: Record<CalendarPlatform, CalendarOption> = {
  apple: 'apple',
  android: 'google',
  windows: 'outlook',
  other: 'google',
};

/** Detects this device's platform once (iPhone/iPad/Mac, Android, Windows…). */
function currentPlatform(): CalendarPlatform {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  return detectCalendarPlatform({
    nativePlatform: Capacitor.getPlatform(),
    userAgent: nav.userAgent,
    uaPlatform: nav.userAgentData?.platform,
    maxTouchPoints: nav.maxTouchPoints,
  });
}

/** 9:00 AM, or — if that has already passed today — the next whole hour (so the reminder isn't in the past). */
export function defaultTime(date: string, now = new Date()): string {
  if (date !== todayISO(now) || now.getHours() < 9) return '09:00';
  return `${String(Math.min(now.getHours() + 1, 23)).padStart(2, '0')}:00`;
}

interface CalendarDialogProps {
  task: Task;
  onClose: () => void;
  /** Override detection (tests). */
  platform?: CalendarPlatform;
}

/** Lets the user add a task to their calendar with a reminder — their device's calendar is offered first. */
export function CalendarDialog({ task, onClose, platform = currentPlatform() }: CalendarDialogProps) {
  const [date, setDate] = useState(task.dueDate ?? todayISO());
  const [time, setTime] = useState(() => defaultTime(task.dueDate ?? todayISO()));
  const [reminder, setReminder] = useState(30);
  const [showOthers, setShowOthers] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const id = useId();

  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{2}:\d{2}$/.test(time);
  const event: CalendarEvent = {
    title: task.title,
    description: [task.description, 'Added from DoNext'].filter(Boolean).join('\n\n'),
    date,
    time,
    durationMinutes: 30,
    reminderMinutes: reminder,
    uid: task.id,
  };

  const onIcs = async (option: CalendarOption) => {
    try {
      const how = await saveIcs(icsFileName(task.title), icsFile(event));
      setMessage({
        kind: 'success',
        text:
          how === 'shared'
            ? 'Choose your Calendar app to add the event.'
            : option === 'outlook'
              ? 'Calendar file downloaded. Open it to add the event to Outlook or Windows Calendar.'
              : 'Calendar file downloaded. Open it and tap “Add to Calendar”.',
      });
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return; // user closed the share sheet
      setMessage({ kind: 'error', text: 'Could not create the calendar file. Please try again.' });
    }
  };

  // The calendar this device most likely uses comes first.
  const primary: CalendarOption = PRIMARY[platform];
  const others = (['google', 'apple', 'outlook'] as CalendarOption[]).filter((o) => o !== primary);

  const renderOption = (option: CalendarOption, isPrimary: boolean) => {
    const cls = isPrimary
      ? `btn-primary w-full text-lg ${valid ? '' : 'pointer-events-none opacity-60'}`
      : 'inline-flex min-h-touch items-center rounded-lg px-2 text-sm font-semibold text-brand-700 underline dark:text-brand-300';
    const label = isPrimary ? `Add to ${LABELS[option]}` : LABELS[option];
    const icon = isPrimary ? <CalendarIcon /> : null;
    if (option === 'google') {
      return (
        <a
          key={option}
          href={valid ? googleCalendarUrl(event) : undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!valid}
          onClick={(e) => !valid && e.preventDefault()}
          className={cls}
        >
          {icon} {label}
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      );
    }
    return (
      <button key={option} type="button" className={cls} disabled={!valid} onClick={() => void onIcs(option)}>
        {icon} {label}
      </button>
    );
  };

  return (
    <Modal title="Add reminder" onClose={onClose}>
      <div className="space-y-4">
        <p className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-100">
          <BellIcon className="shrink-0 text-brand-600" />
          <span className="min-w-0 truncate">{task.title}</span>
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${id}-date`} className="label">
              Date
            </label>
            <input id={`${id}-date`} type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label htmlFor={`${id}-time`} className="label">
              Time
            </label>
            <input id={`${id}-time`} type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
        <div>
          <label htmlFor={`${id}-reminder`} className="label">
            Remind me
          </label>
          <select id={`${id}-reminder`} className="input" value={reminder} onChange={(e) => setReminder(Number(e.target.value))}>
            {REMINDER_OPTIONS.map((o) => (
              <option key={o.minutes} value={o.minutes}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {message && (
          <Alert kind={message.kind} onDismiss={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}

        {renderOption(primary, true)}

        <div className="text-center">
          {showOthers ? (
            <div className="flex flex-wrap items-center justify-center gap-x-2 text-sm text-slate-500 dark:text-slate-400">
              <span>Other calendars:</span>
              {others.map((o) => renderOption(o, false))}
            </div>
          ) : (
            <button
              type="button"
              className="min-h-touch rounded-lg px-3 text-sm text-slate-500 underline hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
              onClick={() => setShowOthers(true)}
            >
              Use another calendar
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
