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

interface CalendarDialogProps {
  task: Task;
  onClose: () => void;
  /** Override detection (tests). */
  platform?: CalendarPlatform;
}

/** Lets the user add a task to their calendar with a reminder — their device's calendar is offered first. */
export function CalendarDialog({ task, onClose, platform = currentPlatform() }: CalendarDialogProps) {
  const [date, setDate] = useState(task.dueDate ?? todayISO());
  const [time, setTime] = useState('09:00');
  const [reminder, setReminder] = useState(30);
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
    const cls = `${isPrimary ? 'btn-primary w-full text-lg' : 'btn-secondary text-sm'} ${valid ? '' : 'pointer-events-none opacity-60'}`;
    const label = isPrimary ? `Add to ${LABELS[option]}` : LABELS[option];
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
          <CalendarIcon /> {label}
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      );
    }
    return (
      <button key={option} type="button" className={cls} disabled={!valid} onClick={() => void onIcs(option)}>
        <CalendarIcon /> {label}
      </button>
    );
  };

  return (
    <Modal title="Add to calendar" onClose={onClose}>
      <div className="space-y-4">
        <p className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
          <BellIcon className="mt-0.5 shrink-0 text-brand-600" />
          <span>
            Get a reminder for <strong>“{task.title}”</strong>. Your calendar app will notify you.
          </span>
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

        <div>
          <p className="mb-2 text-center text-xs font-medium text-slate-500 dark:text-slate-400">Use a different calendar</p>
          <div className="grid gap-2 sm:grid-cols-2">{others.map((o) => renderOption(o, false))}</div>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Google Calendar uses your usual notification settings. Apple Calendar and Outlook get a calendar file (.ics) with the reminder
          built in.
        </p>
      </div>
    </Modal>
  );
}
