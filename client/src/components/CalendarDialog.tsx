import { useId, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { googleCalendarUrl, icsFile, icsFileName, REMINDER_OPTIONS, type CalendarEvent } from '../lib/calendar';
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

/** Lets the user add a task to Google Calendar or Apple Calendar (or Outlook) with a reminder. */
export function CalendarDialog({ task, onClose }: { task: Task; onClose: () => void }) {
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

  const onApple = async () => {
    try {
      const how = await saveIcs(icsFileName(task.title), icsFile(event));
      setMessage({
        kind: 'success',
        text:
          how === 'shared'
            ? 'Choose your Calendar app to add the event.'
            : 'Calendar file downloaded. Open it to add the event — on iPhone, tap “Add to Calendar”.',
      });
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return; // user closed the share sheet
      setMessage({ kind: 'error', text: 'Could not create the calendar file. Please try again.' });
    }
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

        <div className="grid gap-2 sm:grid-cols-2">
          <a
            href={valid ? googleCalendarUrl(event) : undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!valid}
            onClick={(e) => !valid && e.preventDefault()}
            className={`btn-primary ${valid ? '' : 'pointer-events-none opacity-60'}`}
          >
            <CalendarIcon /> Google Calendar
            <span className="sr-only">(opens in a new tab)</span>
          </a>
          <button type="button" className="btn-secondary" disabled={!valid} onClick={() => void onApple()}>
            <CalendarIcon /> Apple Calendar / Outlook
          </button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Google Calendar uses your default notification settings. The Apple / Outlook option downloads a calendar file (.ics) with the
          reminder built in; it also works with Google Calendar on Android.
        </p>
      </div>
    </Modal>
  );
}
