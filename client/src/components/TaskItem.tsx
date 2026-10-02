import { formatDueDate, isOverdue } from '../lib/filters';
import type { Task } from '../lib/types';
import { CheckIcon, EditIcon, TrashIcon } from './Icons';

const priorityStyle = {
  high: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  low: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
};

interface TaskItemProps {
  task: Task;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function TaskItem({ task, onToggle, onEdit, onDelete }: TaskItemProps) {
  const overdue = isOverdue(task);
  return (
    <li className="card flex items-start gap-3 p-3 sm:p-4">
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
          className={`break-words font-medium ${task.completed ? 'text-slate-400 line-through dark:text-slate-500' : ''}`}
        >
          {task.title}
        </p>
        {task.description && (
          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-600 dark:text-slate-400">{task.description}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium">
          <span className={`rounded-full px-2 py-1 ${priorityStyle[task.priority]}`}>
            <span className="sr-only">Priority: </span>
            {task.priority[0].toUpperCase() + task.priority.slice(1)}
          </span>
          {task.category && (
            <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <span className="sr-only">Category: </span>
              {task.category}
            </span>
          )}
          {task.dueDate && (
            <span
              className={`rounded-full px-2 py-1 ${
                overdue
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {overdue ? 'Overdue · ' : 'Due '}
              <time dateTime={task.dueDate}>{formatDueDate(task.dueDate)}</time>
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 gap-1">
        <button type="button" onClick={onEdit} className="btn-ghost" aria-label={`Edit “${task.title}”`}>
          <EditIcon />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="btn-ghost hover:text-red-600 dark:hover:text-red-400"
          aria-label={`Delete “${task.title}”`}
        >
          <TrashIcon />
        </button>
      </div>
    </li>
  );
}
