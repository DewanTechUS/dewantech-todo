import { describe, expect, it } from 'vitest';
import { googleCalendarUrl, icsEscape, icsFile, icsFileName, icsFold, type CalendarEvent } from './calendar';

const event = (extra: Partial<CalendarEvent> = {}): CalendarEvent => ({
  title: 'Dentist, 2nd floor; bring card',
  description: 'Line 1\nLine 2',
  date: '2026-10-15',
  time: '09:30',
  durationMinutes: 30,
  reminderMinutes: 60,
  uid: 'task-123',
  ...extra,
});

describe('Google Calendar link', () => {
  it('pre-fills title, local start/end, details and time zone', () => {
    const url = new URL(googleCalendarUrl(event(), 'America/New_York'));
    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(url.searchParams.get('action')).toBe('TEMPLATE');
    expect(url.searchParams.get('text')).toBe('Dentist, 2nd floor; bring card');
    expect(url.searchParams.get('dates')).toBe('20261015T093000/20261015T100000');
    expect(url.searchParams.get('details')).toBe('Line 1\nLine 2');
    expect(url.searchParams.get('ctz')).toBe('America/New_York');
  });

  it('rolls the end time over midnight', () => {
    const url = new URL(googleCalendarUrl(event({ time: '23:45' }), 'UTC'));
    expect(url.searchParams.get('dates')).toBe('20261015T234500/20261016T001500');
  });
});

describe('.ics file (Apple Calendar, Outlook)', () => {
  it('is a valid single-event calendar with a reminder', () => {
    const ics = icsFile(event(), new Date('2026-10-12T08:00:00.000Z'));
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.split('\r\n').every((l) => !l.includes('\n'))).toBe(true); // only CRLF line breaks
    expect(ics).toContain('UID:task-123@donext');
    expect(ics).toContain('DTSTAMP:20261012T080000Z');
    expect(ics).toContain('DTSTART:20261015T093000');
    expect(ics).toContain('DTEND:20261015T100000');
    expect(ics).toContain('SUMMARY:Dentist\\, 2nd floor\\; bring card');
    expect(ics).toContain('DESCRIPTION:Line 1\\nLine 2');
    expect(ics).toMatch(/BEGIN:VALARM\r\nACTION:DISPLAY\r\n.*\r\nTRIGGER:-PT60M\r\nEND:VALARM/);
  });

  it('uses PT0M for a reminder at the start time', () => {
    expect(icsFile(event({ reminderMinutes: 0 }))).toContain('TRIGGER:PT0M');
  });

  it('escapes special characters and folds long lines', () => {
    expect(icsEscape('a\\b;c,d\ne')).toBe('a\\\\b\\;c\\,d\\ne');
    const folded = icsFold(`SUMMARY:${'x'.repeat(200)}`);
    for (const line of folded.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(folded.split('\r\n').slice(1).every((l) => l.startsWith(' '))).toBe(true);
    // Multi-byte characters are never split.
    const emoji = icsFold(`SUMMARY:${'🎙️'.repeat(40)}`);
    expect(emoji.replace(/\r\n /g, '')).toBe(`SUMMARY:${'🎙️'.repeat(40)}`);
  });

  it('makes safe file names', () => {
    expect(icsFileName('Call Mom @ 5pm!!')).toBe('call-mom-5pm.ics');
    expect(icsFileName('🎙️')).toBe('task.ics');
  });
});
