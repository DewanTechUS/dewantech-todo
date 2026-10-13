import { todayISO } from './filters';
import type { Priority } from './types';

/**
 * Smart suggestions: reads a task title such as "milk eggs and bread" or "pay rent tomorrow 5pm"
 * and suggests a cleaner title, category, priority, due date/time and sub-items.
 *
 * Runs entirely on the device with simple rules — no AI service, no network, no cost —
 * so it also works offline and in the live demo.
 */
export interface Suggestion {
  title?: string;
  category?: string;
  priority?: Priority;
  dueDate?: string;
  dueTime?: string;
  subtasks?: string[];
}

interface CategoryRule {
  name: string;
  words: string[];
}

// Order matters on a tie: earlier categories win ("water bill" → Bills, "buy milk" → Groceries).
const CATEGORIES: CategoryRule[] = [
  {
    name: 'Bills',
    words: ['bill', 'rent', 'mortgage', 'invoice', 'electricity', 'utilities', 'insurance', 'tax', 'taxes', 'credit card', 'loan', 'subscription', 'bank', 'pay'],
  },
  {
    name: 'Groceries',
    words: [
      'grocery', 'groceries', 'supermarket', 'milk', 'egg', 'bread', 'butter', 'cheese', 'yogurt', 'rice', 'pasta', 'flour', 'sugar',
      'salt', 'coffee', 'tea', 'juice', 'fruit', 'apple', 'banana', 'orange', 'grape', 'berries', 'vegetable', 'veggies', 'tomato',
      'tomatoes', 'onion', 'potato', 'potatoes', 'garlic', 'lettuce', 'spinach', 'carrot', 'chicken', 'beef', 'fish', 'meat', 'cereal',
      'oats', 'snack', 'water', 'honey', 'cream', 'lentils', 'beans',
    ],
  },
  {
    name: 'Health',
    words: ['doctor', 'dentist', 'pharmacy', 'medicine', 'meds', 'prescription', 'gym', 'workout', 'exercise', 'yoga', 'checkup', 'hospital', 'vitamin', 'therapy', 'appointment'],
  },
  {
    name: 'Work',
    words: ['meeting', 'email', 'report', 'client', 'presentation', 'deadline', 'project', 'boss', 'office', 'proposal', 'standup', 'slides', 'interview', 'resume'],
  },
  {
    name: 'Home',
    words: ['clean', 'cleaning', 'laundry', 'dishes', 'vacuum', 'trash', 'garbage', 'repair', 'fix', 'plumber', 'mow', 'lawn', 'garden', 'organize', 'move', 'moving'],
  },
  {
    name: 'Family',
    words: ['mom', 'dad', 'mother', 'father', 'kid', 'kids', 'son', 'daughter', 'wife', 'husband', 'grandma', 'grandpa', 'family', 'birthday', 'anniversary', 'school'],
  },
  {
    name: 'Travel',
    words: ['flight', 'trip', 'travel', 'hotel', 'pack', 'passport', 'visa', 'airport', 'vacation', 'holiday'],
  },
  { name: 'Car', words: ['car', 'oil change', 'tire', 'tires', 'car wash', 'mechanic', 'registration'] },
  { name: 'Learning', words: ['study', 'homework', 'exam', 'course', 'class', 'learn', 'lesson', 'read', 'library'] },
  { name: 'Shopping', words: ['buy', 'order', 'amazon', 'return', 'gift', 'clothes', 'shoes', 'shop', 'shopping'] },
  { name: 'Errands', words: ['post office', 'mail', 'package', 'pick up', 'drop off'] },
];

/** Ready-made checklists for common tasks. */
const TEMPLATES: Array<{ match: RegExp; subtasks: string[] }> = [
  { match: /\b(trip|travel|vacation|holiday)\b/, subtasks: ['Book tickets', 'Book a place to stay', 'Pack bag', 'Passport / ID', 'Chargers'] },
  { match: /\bclean\w*\b.*\b(house|home|apartment|flat|room)\b/, subtasks: ['Kitchen', 'Bathroom', 'Vacuum floors', 'Take out trash'] },
  { match: /\b(party|birthday)\b/, subtasks: ['Guest list', 'Invitations', 'Food & drinks', 'Decorations', 'Gift'] },
  { match: /\b(meeting|presentation)\b/, subtasks: ['Prepare agenda', 'Make slides', 'Send invite'] },
  { match: /\b(moving|move (house|out|in|apartments?))\b/, subtasks: ['Boxes and tape', 'Change address', 'Book movers', 'Set up utilities'] },
  { match: /\b(job application|apply for|resume)\b/, subtasks: ['Update resume', 'Write cover letter', 'Submit application'] },
  { match: /^(buy |get )?groceries$/, subtasks: ['Milk', 'Eggs', 'Bread', 'Fruit', 'Vegetables'] },
];

const HIGH = /\b(urgent|asap|important|critical|immediately|high priority)\b|!{2,}/;
const LOW = /\b(someday|maybe|eventually|whenever|no rush|low priority)\b/;
// Words that only express urgency and are dropped from the title.
const PRIORITY_NOISE = /\b(urgent(ly)?|asap|high priority|low priority|medium priority|no rush|someday|eventually|whenever)\b|!+/g;

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_RX = /\b(?:on |this |next )?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/;

const pad = (n: number) => String(n).padStart(2, '0');
const addDays = (now: Date, days: number) => {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, 12);
  return todayISO(d);
};
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const wordRx = (w: string) => new RegExp(`\\b${w.replace(/ /g, '\\s+')}(e?s)?\\b`, 'i');

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTH = '(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?';

/** A real calendar date as YYYY-MM-DD, or undefined (e.g. Feb 30). Without a year: this year, or next year if it's well past. */
function makeDate(month: number, day: number, year: number | undefined, now: Date): string | undefined {
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  let y = year === undefined ? now.getFullYear() : year < 100 ? 2000 + year : year;
  let d = new Date(y, month - 1, day, 12);
  if (year === undefined && now.getTime() - d.getTime() > 7 * 86_400_000) {
    y += 1;
    d = new Date(y, month - 1, day, 12);
  }
  return d.getMonth() === month - 1 ? todayISO(d) : undefined;
}

/** "2026-10-20", "Oct 20", "20 October 2026", "10/20", "10/20/2026" (month first, unless that's impossible). */
function explicitDate(take: (rx: RegExp) => RegExpMatchArray | null, now: Date): string | undefined {
  let m = take(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (m) return makeDate(Number(m[2]), Number(m[3]), Number(m[1]), now);
  m = take(new RegExp(`\\b(?:on )?${MONTH}\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(\\d{4}))?\\b`, 'i'));
  if (m) return makeDate(MONTHS.indexOf(m[1].toLowerCase()) + 1, Number(m[2]), m[3] ? Number(m[3]) : undefined, now);
  m = take(new RegExp(`\\b(?:on )?(?:the )?(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of )?${MONTH}(?:,?\\s*(\\d{4}))?\\b`, 'i'));
  if (m) return makeDate(MONTHS.indexOf(m[2].toLowerCase()) + 1, Number(m[1]), m[3] ? Number(m[3]) : undefined, now);
  m = take(/\b(?:on )?(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?\b/);
  if (m) {
    let [a, b] = [Number(m[1]), Number(m[2])];
    if (a > 12 && b <= 12) [a, b] = [b, a]; // 20/10 → Oct 20
    return makeDate(a, b, m[3] ? Number(m[3]) : undefined, now);
  }
  return undefined;
}

/**
 * Reads a typed due date such as "tomorrow 5pm", "Oct 20", "10/20 3:30 pm" or "friday evening".
 * Returns null when the text isn't (only) a date; an empty box means "no due date".
 */
export function parseDue(text: string, now = new Date()): { date: string | null; time: string | null } | null {
  const t = text.trim();
  if (!t || /^(none|no( due)? date|clear)$/i.test(t)) return { date: null, time: null };
  const w = parseWhen(t, now);
  const leftover = w.text.replace(/\b(due|on|at|by|the|of|this)\b|[,.@–-]/gi, ' ').trim();
  if (!w.dueDate || leftover) return null;
  return { date: w.dueDate, time: w.dueTime ?? null };
}

function parseWhen(text: string, now: Date): { text: string; dueDate?: string; dueTime?: string } {
  let t = ` ${text} `;
  let dueDate: string | undefined;
  let dueTime: string | undefined;
  const take = (rx: RegExp): RegExpMatchArray | null => {
    const m = t.match(rx);
    if (m) t = t.replace(m[0], ' ');
    return m;
  };

  // Time first, so "5pm" isn't confused with a date.
  let m = take(/\b(?:at |by |@ ?)?(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.?|p\.m\.?)(?![a-z])/i);
  if (m) {
    let h = Number(m[1]) % 12;
    if (m[3].toLowerCase().startsWith('p')) h += 12;
    const min = Number(m[2] ?? 0);
    if (h < 24 && min < 60) dueTime = `${pad(h)}:${pad(min)}`;
  } else if ((m = take(/\b(?:at |by )?([01]?\d|2[0-3]):([0-5]\d)\b/i))) {
    dueTime = `${pad(Number(m[1]))}:${m[2]}`;
  } else if ((m = take(/\bin (\d{1,2}) (hours?|hrs?|minutes?|mins?)\b/i))) {
    const at = new Date(now.getTime() + Number(m[1]) * (/^h/i.test(m[2]) ? 3_600_000 : 60_000));
    dueTime = `${pad(at.getHours())}:${pad(at.getMinutes())}`;
    dueDate = todayISO(at);
  } else if (take(/\b(?:at )?noon\b/i)) dueTime = '12:00';
  else if (take(/\b(?:this |in the )?morning\b/i)) dueTime = '09:00';
  else if (take(/\b(?:this |in the )?afternoon\b/i)) dueTime = '14:00';
  else if (take(/\b(?:this |in the )?evening\b/i)) dueTime = '18:00';

  const explicit = dueDate ? undefined : explicitDate(take, now);
  if (dueDate) {
    // already set by "in 3 hours"
  } else if (explicit) {
    dueDate = explicit;
    take(new RegExp(DAY_RX.source, 'i')); // "Friday, Oct 16": the weekday is redundant
  } else if (take(/\btonight\b/i)) {
    dueDate = addDays(now, 0);
    dueTime ??= '20:00';
  } else if (take(/\btoday\b/i)) dueDate = addDays(now, 0);
  else if (take(/\b(tomorrow|tmrw|tmr)\b/i)) dueDate = addDays(now, 1);
  else if (take(/\bnext week\b/i)) dueDate = addDays(now, 7);
  else if (take(/\b(this )?weekend\b/i)) dueDate = addDays(now, [0, 6].includes(now.getDay()) ? 0 : 6 - now.getDay());
  else if ((m = take(/\bin (\d{1,2}) days?\b/i))) dueDate = addDays(now, Number(m[1]));
  else if ((m = take(new RegExp(DAY_RX.source, 'i')))) {
    const target = DAYS.indexOf(m[1].toLowerCase());
    let diff = (target - now.getDay() + 7) % 7;
    if (diff === 0 && /next/i.test(m[0])) diff = 7;
    dueDate = addDays(now, diff);
  }

  // A time with no day: today if it's still ahead, otherwise tomorrow.
  if (dueTime && !dueDate) {
    dueDate = dueTime > `${pad(now.getHours())}:${pad(now.getMinutes())}` ? addDays(now, 0) : addDays(now, 1);
  }
  return { text: t, dueDate, dueTime };
}

function categorize(lower: string, existing: string[]): string | undefined {
  let best: { name: string; score: number } | undefined;
  for (const c of CATEGORIES) {
    const score = c.words.filter((w) => wordRx(w).test(lower)).length;
    if (score > 0 && (!best || score > best.score)) best = { name: c.name, score };
  }
  // Reuse the user's own categories (e.g. "groceries" or a custom one) when the name matches.
  for (const e of existing) {
    if (e.trim() && wordRx(e.trim().toLowerCase()).test(lower)) return e;
  }
  if (!best) return undefined;
  return existing.find((e) => e.trim().toLowerCase() === best!.name.toLowerCase()) ?? best.name;
}

const GROCERY_WORDS = CATEGORIES.find((c) => c.name === 'Groceries')!.words;
// Describing words allowed in a grocery item ("oat milk", "brown rice").
const FOOD_ADJECTIVES = new Set(['fresh', 'organic', 'whole', 'brown', 'white', 'green', 'red', 'almond', 'soy', 'peanut', 'olive', 'oat', 'frozen', 'sparkling', 'greek']);
const isFoodWord = (w: string) => FOOD_ADJECTIVES.has(w) || GROCERY_WORDS.some((g) => !g.includes(' ') && wordRx(g).test(w));
/** Every word is food (or describes it): "oat milk" yes, "pack snacks" no. */
const isGrocery = (item: string) => {
  const words = item.toLowerCase().split(/\s+/).filter(Boolean);
  return words.length > 0 && words.length <= 3 && words.every(isFoodWord) && words.some((w) => !FOOD_ADJECTIVES.has(w));
};

/** "milk, eggs and bread" / "milk eggs bread" → ['Milk', 'Eggs', 'Bread'] (only when every item is food). */
function groceryItems(text: string): string[] | undefined {
  const body = text
    .toLowerCase()
    .replace(/^\s*(buy|get|grab|pick up|need|we need|i need)\s+/, '')
    .replace(/\b(some|the|a|an|more)\b/g, ' ')
    .trim();
  const items = body
    .split(/\s*(?:,|\band\b|&|\+)\s*/)
    .map((s) => s.trim())
    .filter(Boolean)
    // Spoken lists often have no commas ("milk eggs and bread"): split a part into words
    // when every word is a food on its own. "oat milk" stays one item.
    .flatMap((part) => {
      const words = part.split(/\s+/);
      return words.length >= 2 && words.every((w) => isGrocery(w)) ? words : [part];
    });
  if (items.length < 2 || !items.every(isGrocery)) return undefined;
  return [...new Set(items)].map(capitalize);
}

export function suggestTask(input: string, opts: { now?: Date; categories?: string[] } = {}): Suggestion {
  const now = opts.now ?? new Date();
  const raw = input.trim();
  if (raw.length < 2) return {};
  const s: Suggestion = {};

  const when = parseWhen(raw, now);
  if (when.dueDate) s.dueDate = when.dueDate;
  if (when.dueTime) s.dueTime = when.dueTime;

  const lower = raw.toLowerCase();
  if (HIGH.test(lower)) s.priority = 'high';
  else if (LOW.test(lower)) s.priority = 'low';
  else if (s.dueDate === todayISO(now)) s.priority = 'high';

  let title = when.text
    .replace(PRIORITY_NOISE, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+(on|at|by|for|this|next)\s*$/i, '')
    .trim()
    .replace(/[\s,.;:-]+$/, '');

  s.category = categorize(title.toLowerCase(), opts.categories ?? []);

  const items = groceryItems(title);
  if (items) {
    s.category = categorize('groceries', opts.categories ?? []);
    s.subtasks = items;
    title = 'Buy groceries';
  } else {
    if (s.category && /^groceries$/i.test(s.category) && isGrocery(title)) title = `Buy ${title.toLowerCase()}`; // "milk" → "Buy milk"
    const template = TEMPLATES.find((tpl) => tpl.match.test(title.toLowerCase()));
    if (template) s.subtasks = template.subtasks;
  }

  if (title) {
    title = capitalize(title);
    if (title.toLowerCase() !== raw.toLowerCase()) s.title = title; // not just a capital letter
  }
  if (!s.category) delete s.category;
  return s;
}
