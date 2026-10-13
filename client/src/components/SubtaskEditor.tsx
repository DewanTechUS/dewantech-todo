import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { uuid } from '../lib/id';
import type { Subtask } from '../lib/types';
import { CloseIcon, PlusIcon } from './Icons';

export const MAX_SUBTASKS = 50;

interface SubtaskEditorProps {
  value: Subtask[];
  onChange: (subtasks: Subtask[]) => void;
}

/** Edits a task's checklist: tick, rename or remove items, and add new ones (Enter adds). */
export function SubtaskEditor({ value, onChange }: SubtaskEditorProps) {
  const [draft, setDraft] = useState('');
  const newRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const full = value.length >= MAX_SUBTASKS;

  const add = () => {
    const title = draft.trim();
    if (!title || full) return;
    onChange([...value, { id: uuid(), title: title.slice(0, 200), done: false }]);
    setDraft('');
    newRef.current?.focus();
  };

  const patch = (sid: string, p: Partial<Subtask>) => onChange(value.map((s) => (s.id === sid ? { ...s, ...p } : s)));

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // don't submit the whole form
      add();
    }
  };

  return (
    <fieldset>
      <legend className="label">
        Sub-items{' '}
        {value.length > 0 && (
          <span className="font-normal text-slate-500 dark:text-slate-400">
            ({value.filter((s) => s.done).length}/{value.length} done)
          </span>
        )}
      </legend>

      {value.length > 0 && (
        <ul className="mb-2 divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
          {value.map((s, i) => (
            <li key={s.id} className="flex items-center gap-2 px-2 py-1">
              <input
                type="checkbox"
                className="h-5 w-5 shrink-0 cursor-pointer rounded accent-success-500"
                checked={s.done}
                onChange={(e) => patch(s.id, { done: e.target.checked })}
                aria-label={`Mark sub-item ${i + 1} as ${s.done ? 'not done' : 'done'}`}
              />
              <input
                className={`min-h-touch min-w-0 flex-1 bg-transparent px-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-md ${
                  s.done ? 'text-slate-400 line-through dark:text-slate-500' : ''
                }`}
                value={s.title}
                maxLength={200}
                onChange={(e) => patch(s.id, { title: e.target.value })}
                aria-label={`Sub-item ${i + 1}`}
              />
              <button
                type="button"
                className="btn-ghost shrink-0 hover:text-red-600 dark:hover:text-red-400"
                onClick={() => onChange(value.filter((x) => x.id !== s.id))}
                aria-label={`Remove sub-item “${s.title || i + 1}”`}
              >
                <CloseIcon width={16} height={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <label htmlFor={`${id}-new`} className="sr-only">
          New sub-item
        </label>
        <input
          id={`${id}-new`}
          ref={newRef}
          className="input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          maxLength={200}
          disabled={full}
          enterKeyHint="enter"
          autoComplete="off"
          placeholder={full ? `Up to ${MAX_SUBTASKS} sub-items` : 'Add a sub-item, e.g. “Milk”'}
        />
        <button type="button" className="btn-secondary shrink-0" onClick={add} disabled={!draft.trim() || full}>
          <PlusIcon width={18} height={18} /> Add
        </button>
      </div>
    </fieldset>
  );
}
