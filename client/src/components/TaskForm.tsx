import { useId, useRef, useState, type FormEvent } from 'react';
import { PRIORITIES, type Priority, type Profile, type TaskFields } from '../lib/types';
import { LockIcon, UsersIcon } from './Icons';
import { Alert } from './Alert';
import { Spinner } from './Spinner';
import { VoiceInput } from './VoiceInput';
import type { SpeechService } from '../lib/speech';

export const emptyFields: TaskFields = {
  title: '',
  description: '',
  dueDate: null,
  priority: 'medium',
  category: '',
  completed: false,
  shared: false,
  assigneeId: null,
};

export function validateTask(f: TaskFields): Partial<Record<keyof TaskFields, string>> {
  const errors: Partial<Record<keyof TaskFields, string>> = {};
  if (!f.title.trim()) errors.title = 'Please enter a title.';
  else if (f.title.trim().length > 200) errors.title = 'Title must be 200 characters or fewer.';
  if (f.description.length > 2000) errors.description = 'Description must be 2000 characters or fewer.';
  if (f.category.trim().length > 50) errors.category = 'Category must be 50 characters or fewer.';
  if (f.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(f.dueDate)) errors.dueDate = 'Please choose a valid date.';
  return errors;
}

interface TaskFormProps {
  initial?: TaskFields;
  categories: string[];
  /** People on this device (for sharing and assigning). */
  people?: Profile[];
  /** The person using the app right now. */
  meId?: string;
  submitLabel: string;
  onSubmit: (fields: TaskFields) => Promise<void>;
  onCancel?: () => void;
  /**
   * Voice composer mode (for new tasks): a centred mic and a chat-style box that fills in
   * as you speak, with a send arrow. Other fields are tucked behind "Add details".
   */
  voice?: boolean;
  speech?: SpeechService;
}

export function TaskForm({
  initial = emptyFields,
  categories,
  people = [],
  meId,
  submitLabel,
  onSubmit,
  onCancel,
  voice,
  speech,
}: TaskFormProps) {
  const [fields, setFields] = useState<TaskFields>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof TaskFields, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const titleRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const id = useId();
  const ids = {
    title: `${id}-title`,
    description: `${id}-description`,
    dueDate: `${id}-due`,
    priority: `${id}-priority`,
    category: `${id}-category`,
    categories: `${id}-categories`,
    details: `${id}-details`,
    assignee: `${id}-assignee`,
    visibility: `${id}-visibility`,
  };

  const set = <K extends keyof TaskFields>(key: K, value: TaskFields[K]) => {
    setFields((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const v = validateTask(fields);
    setErrors(v);
    if (Object.keys(v).length) {
      if (!v.title) setShowDetails(true); // the problem is in one of the detail fields
      titleRef.current?.focus();
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await onSubmit(fields);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save the task. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const errProps = (key: keyof TaskFields) =>
    errors[key] ? { 'aria-invalid': true as const, 'aria-describedby': `${id}-${key}-error` } : {};

  const titleField = voice ? (
    <VoiceInput
      ref={(el) => {
        titleRef.current = el;
      }}
      inputId={ids.title}
      value={fields.title}
      onChange={(text) => set('title', text)}
      error={errors.title}
      submitting={saving}
      speech={speech}
    />
  ) : (
    <div>
      <label htmlFor={ids.title} className="label">
        Title <span aria-hidden className="text-red-600">*</span>
      </label>
      <input
        id={ids.title}
        ref={(el) => {
          titleRef.current = el;
        }}
        className="input"
        value={fields.title}
        onChange={(e) => set('title', e.target.value)}
        maxLength={200}
        required
        autoComplete="off"
        enterKeyHint="done"
        placeholder="What needs doing?"
        {...errProps('title')}
      />
      {errors.title && (
        <p id={`${id}-title-error`} className="field-error">
          {errors.title}
        </p>
      )}
    </div>
  );

  const segment = (active: boolean) =>
    `flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors ${
      active ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-600 dark:text-white' : 'text-slate-600 dark:text-slate-300'
    }`;
  const assigneeName = people.find((p) => p.id === fields.assigneeId)?.name;

  // Sharing only makes sense when more than one person uses this device.
  const sharingFields =
    people.length > 1 ? (
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <span className="label" id={ids.visibility}>
            Who can see it
          </span>
          <div role="group" aria-labelledby={ids.visibility} className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button type="button" aria-pressed={!fields.shared} className={segment(!fields.shared)} onClick={() => set('shared', false)}>
              <LockIcon width={16} height={16} /> Only me
            </button>
            <button type="button" aria-pressed={fields.shared} className={segment(fields.shared)} onClick={() => set('shared', true)}>
              <UsersIcon width={16} height={16} /> Everyone
            </button>
          </div>
        </div>
        <div>
          <label htmlFor={ids.assignee} className="label">
            Assign to
          </label>
          <select
            id={ids.assignee}
            className="input"
            value={fields.assigneeId ?? ''}
            onChange={(e) => set('assigneeId', e.target.value || null)}
          >
            <option value="">Nobody</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.id === meId ? `${p.name} (me)` : p.name}
              </option>
            ))}
          </select>
        </div>
        {!fields.shared && fields.assigneeId && fields.assigneeId !== meId && (
          <p className="text-xs text-slate-500 dark:text-slate-400 sm:col-span-2">
            Private, but {assigneeName ?? 'the assignee'} can also see it because it's assigned to them.
          </p>
        )}
      </div>
    ) : null;

  const detailFields = (
    <div id={ids.details} className="space-y-4">
      <div>
        <label htmlFor={ids.description} className="label">
          Description
        </label>
        <textarea
          id={ids.description}
          className="input min-h-[88px]"
          value={fields.description}
          onChange={(e) => set('description', e.target.value)}
          maxLength={2000}
          placeholder="Optional details"
          {...errProps('description')}
        />
        {errors.description && (
          <p id={`${id}-description-error`} className="field-error">
            {errors.description}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor={ids.dueDate} className="label">
            Due date
          </label>
          <input
            id={ids.dueDate}
            type="date"
            className="input"
            value={fields.dueDate ?? ''}
            onChange={(e) => set('dueDate', e.target.value || null)}
            {...errProps('dueDate')}
          />
          {errors.dueDate && (
            <p id={`${id}-dueDate-error`} className="field-error">
              {errors.dueDate}
            </p>
          )}
        </div>
        <div>
          <label htmlFor={ids.priority} className="label">
            Priority
          </label>
          <select
            id={ids.priority}
            className="input"
            value={fields.priority}
            onChange={(e) => set('priority', e.target.value as Priority)}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p[0].toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={ids.category} className="label">
            Category
          </label>
          <input
            id={ids.category}
            className="input"
            list={ids.categories}
            value={fields.category}
            onChange={(e) => set('category', e.target.value)}
            maxLength={50}
            placeholder="e.g. Work"
            {...errProps('category')}
          />
          <datalist id={ids.categories}>
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          {errors.category && (
            <p id={`${id}-category-error`} className="field-error">
              {errors.category}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {formError && <Alert onDismiss={() => setFormError(null)}>{formError}</Alert>}

      {titleField}

      {sharingFields}

      {voice ? (
        <>
          <div className="flex justify-center">
            <button
              type="button"
              className="btn-ghost text-sm"
              aria-expanded={showDetails}
              aria-controls={ids.details}
              onClick={() => setShowDetails((s) => !s)}
            >
              {showDetails ? 'Hide details' : '+ Add details (due date, priority, category)'}
            </button>
          </div>
          {showDetails && detailFields}
        </>
      ) : (
        <>
          {detailFields}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {onCancel && (
              <button type="button" className="btn-secondary" onClick={onCancel}>
                Cancel
              </button>
            )}
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving && <Spinner label="Saving" className="h-4 w-4" />}
              {submitLabel}
            </button>
          </div>
        </>
      )}
    </form>
  );
}
