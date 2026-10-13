import { useState } from 'react';
import { formatDueDate, formatTime, formatTimestamp, isOverdue, todayISO } from '../lib/filters';
import type { Task } from '../lib/types';
import { Avatar } from './Avatar';
import { CalendarIcon, CheckIcon, ClockIcon, EditIcon, FlagIcon, TagIcon, TrashIcon, UsersIcon } from './Icons';

interface Person {
  id: string;
  name: string;
}

const priorityStyle = {
  high: { stripe: 'bg-red-500', text: 'text-red-700 dark:text-red-300', label: 'High' },
  medium: { stripe: 'bg-amber-400', text: 'text-amber-700 dark:text-amber-300', label: 'Medium' },
  low: { stripe: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300', label: 'Low' },
};

/** Sub-items shown before "Show more". */
const SUBTASK_PREVIEW = 4;

interface TaskItemProps {
  task: Task;
  /** Name of the shared list, shown when tasks from several lists are mixed. */
  listName?: string;
  /** Who added the task, when it wasn't me. */
  addedBy?: Person;
  /** Who it's assigned to. */
  assignee?: Person;
  meId?: string;
  onToggle: () => void;
  /** Ticks or unticks one sub-item. */
  onToggleSubtask?: (subtaskId: string) => void;
  onEdit: () => void;
  /** Opens "Add to calendar" (reminder). */
  onCalendar?: () => void;
  /** Omit when I'm not allowed to delete this task. */
  onDelete?: () => void;
}

const meta = 'inline-flex items-center gap-1 whitespace-nowrap';
const personChip = 'inline-flex items-center gap-1 rounded-full bg-slate-100 py-0.5 pl-0.5 pr-2 text-slate-700 dark:bg-slate-800 dark:text-slate-300';

export function TaskItem({ task, listName, addedBy, assignee, meId, onToggle, onToggleSubtask, onEdit, onCalendar, onDelete }: TaskItemProps) {
  const [expanded, setExpanded] = useState(false);
  const overdue = isOverdue(task);
  const dueToday = task.dueDate === todayISO();
  const p = priorityStyle[task.priority];
  const subtasks = task.subtasks ?? [];
  const doneCount = subtasks.filter((s) => s.done).length;
  const shown = expanded ? subtasks : subtasks.slice(0, SUBTASK_PREVIEW);

  return (
    <li className="card relative grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 overflow-hidden p-3 pl-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:p-4 sm:pl-5">
      {/* Priority stripe */}
      <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${task.completed ? 'bg-slate-300 dark:bg-slate-700' : p.stripe}`} />

      <button
        type="button"
        role="checkbox"
        aria-checked={task.completed}
        aria-label={`Mark “${task.title}” as ${task.completed ? 'not done' : 'done'}`}
        onClick={onToggle}
        className="-m-1 flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-xl"
      >
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors ${
            task.completed
              ? 'border-success-500 bg-success-500 text-white'
              : 'border-slate-300 bg-white hover:border-success-500 dark:border-slate-500 dark:bg-transparent'
          }`}
        >
          {task.completed && <CheckIcon width={16} height={16} strokeWidth={3} />}
        </span>
      </button>

      <div className="min-w-0 flex-1 pt-2">
        <p
          className={`break-words font-semibold leading-snug ${task.completed ? 'text-slate-400 line-through dark:text-slate-500' : ''}`}
        >
          {task.title}
        </p>
        {task.description && (
          <p className="mt-1 line-clamp-3 whitespace-pre-wrap break-words text-sm text-slate-600 dark:text-slate-400">
            {task.description}
          </p>
        )}

        {/* Date, time, priority and category */}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-slate-600 dark:text-slate-400">
          {task.dueDate && (
            <span
              className={`${meta} ${
                overdue ? 'font-semibold text-red-600 dark:text-red-400' : dueToday && !task.completed ? 'text-brand-700 dark:text-brand-300' : ''
              }`}
            >
              <CalendarIcon width={14} height={14} />
              {overdue ? 'Overdue · ' : <span className="sr-only">Due </span>}
              <time dateTime={task.dueTime ? `${task.dueDate}T${task.dueTime}` : task.dueDate}>
                {formatDueDate(task.dueDate)}
              </time>
              {task.dueTime && (
                <>
                  <ClockIcon width={14} height={14} className="ml-1.5" />
                  {formatTime(task.dueTime)}
                </>
              )}
            </span>
          )}
          <span className={`${meta} ${task.completed ? '' : p.text}`}>
            <FlagIcon width={14} height={14} />
            <span className="sr-only">Priority: </span>
            {p.label}
          </span>
          {task.category && (
            <span className={meta}>
              <TagIcon width={14} height={14} />
              <span className="sr-only">Category: </span>
              {task.category}
            </span>
          )}
        </div>

        {/* Sub-items */}
        {subtasks.length > 0 && (
          <div className="mt-3">
            <div className="mb-1 flex max-w-sm items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>
                {doneCount} of {subtasks.length} done
              </span>
              <span
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                role="progressbar"
                aria-label="Sub-items done"
                aria-valuemin={0}
                aria-valuemax={subtasks.length}
                aria-valuenow={doneCount}
              >
                <span
                  className="block h-full rounded-full bg-success-500 transition-[width]"
                  style={{ width: `${(doneCount / subtasks.length) * 100}%` }}
                />
              </span>
            </div>
            <ul aria-label={`Sub-items of “${task.title}”`}>
              {shown.map((s) => (
                <li key={s.id}>
                  <label className="-mx-1 flex min-h-[36px] cursor-pointer items-center gap-2.5 rounded-lg px-1 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <input
                      type="checkbox"
                      className="h-4 w-4 shrink-0 cursor-pointer rounded accent-success-500"
                      checked={s.done}
                      onChange={() => onToggleSubtask?.(s.id)}
                      disabled={!onToggleSubtask}
                    />
                    <span className={`break-words ${s.done ? 'text-slate-400 line-through dark:text-slate-500' : 'text-slate-700 dark:text-slate-300'}`}>
                      {s.title}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            {subtasks.length > SUBTASK_PREVIEW && (
              <button
                type="button"
                className="mt-1 text-xs font-semibold text-brand-700 hover:underline dark:text-brand-300"
                aria-expanded={expanded}
                onClick={() => setExpanded((e) => !e)}
              >
                {expanded ? 'Show less' : `Show ${subtasks.length - SUBTASK_PREVIEW} more`}
              </button>
            )}
          </div>
        )}

        {/* Sharing */}
        {(listName || addedBy || assignee) && (
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium">
            {listName && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-1 text-brand-700 dark:bg-slate-800 dark:text-brand-300">
                <UsersIcon width={12} height={12} />
                <span className="sr-only">List: </span>
                {listName}
              </span>
            )}
            {addedBy && (
              <span className={personChip}>
                <Avatar name={addedBy.name} seed={addedBy.id} size={20} /> From {addedBy.name}
              </span>
            )}
            {assignee && (
              <span className={personChip}>
                <Avatar name={assignee.name} seed={assignee.id} size={20} />
                {assignee.id === meId ? 'Assigned to you' : `For ${assignee.name}`}
              </span>
            )}
          </div>
        )}

        <p className="mt-2 hidden text-[11px] text-slate-400 dark:text-slate-500 sm:block">
          Added <time dateTime={task.createdAt}>{formatTimestamp(task.createdAt)}</time>
        </p>
      </div>

      <div className="col-start-2 mt-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-1 dark:border-slate-800 sm:col-start-3 sm:row-start-1 sm:mt-0 sm:border-0 sm:pt-0">
        <p className="text-[11px] text-slate-400 dark:text-slate-500 sm:hidden">
          Added <time dateTime={task.createdAt}>{formatTimestamp(task.createdAt)}</time>
        </p>
        <div className="-mr-1 flex shrink-0 gap-1">
          {onCalendar && !task.completed && (
            <button type="button" onClick={onCalendar} className="btn-ghost" aria-label={`Add “${task.title}” to calendar`} title="Add to calendar">
              <CalendarIcon />
            </button>
          )}
          <button type="button" onClick={onEdit} className="btn-ghost" aria-label={`Edit “${task.title}”`} title="Edit">
            <EditIcon />
          </button>
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="btn-ghost hover:text-red-600 dark:hover:text-red-400"
              aria-label={`Delete “${task.title}”`}
              title="Delete"
            >
              <TrashIcon />
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
