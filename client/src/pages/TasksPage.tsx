import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { FilterBar } from '../components/FilterBar';
import { PlusIcon, UsersIcon } from '../components/Icons';
import { Modal } from '../components/Modal';
import { PageLoader } from '../components/Spinner';
import { TaskForm, emptyFields } from '../components/TaskForm';
import { TaskItem } from '../components/TaskItem';
import { useApp } from '../context/AppContext';
import { categoriesOf, defaultFilters, filterTasks, type TaskFilters } from '../lib/filters';
import type { Task } from '../lib/types';
import { canDelete, tasksForView, type TaskView } from '../lib/visibility';

const views: { value: TaskView; label: string }[] = [
  { value: 'mine', label: 'My tasks' },
  { value: 'shared', label: 'Shared' },
  { value: 'all', label: 'All tasks' },
];

export default function TasksPage() {
  const { store, tasks, profiles, me } = useApp();
  const [view, setView] = useState<TaskView>('mine');
  const [filters, setFilters] = useState<TaskFilters>(defaultFilters);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const multi = profiles.length > 1;
  const byId = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);
  const profileIds = useMemo(() => new Set(profiles.map((p) => p.id)), [profiles]);
  const inView = useMemo(() => (me ? tasksForView(tasks, me.id, multi ? view : 'mine') : []), [tasks, me, view, multi]);
  const categories = useMemo(() => categoriesOf(inView), [inView]);
  const visible = useMemo(() => filterTasks(inView, filters), [inView, filters]);
  const activeCount = inView.filter((t) => !t.completed).length;

  if (!store || !me) return <PageLoader label="Loading your tasks…" />;

  const run = async (fn: () => Promise<unknown>) => {
    try {
      setActionError(null);
      await fn();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  };

  const showSharedEmpty = multi && view === 'shared';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Hi, {me.name.split(' ')[0]}</h1>
          <p className="text-slate-600 dark:text-slate-400" aria-live="polite">
            {inView.length === 0 ? 'Nothing here yet.' : `${activeCount} active · ${inView.length - activeCount} done`}
          </p>
        </div>
        <button type="button" className="btn-primary w-full sm:w-auto" onClick={() => setCreating(true)}>
          <PlusIcon /> New task
        </button>
      </div>

      {multi && (
        <div role="group" aria-label="Which tasks to show" className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800 sm:inline-grid">
          {views.map((v) => (
            <button
              key={v.value}
              type="button"
              aria-pressed={view === v.value}
              onClick={() => setView(v.value)}
              className={`min-h-[40px] rounded-lg px-4 text-sm font-medium ${
                view === v.value ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-600 dark:text-white' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      )}

      {actionError && <Alert onDismiss={() => setActionError(null)}>{actionError}</Alert>}

      {inView.length > 0 && <FilterBar filters={filters} categories={categories} onChange={setFilters} />}

      {inView.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
          <p className="text-lg font-semibold">{showSharedEmpty ? 'No shared tasks yet' : 'Your list is empty'}</p>
          <p className="max-w-sm text-slate-600 dark:text-slate-400">
            {showSharedEmpty
              ? 'Shared tasks are visible to everyone who uses DoNext on this device. Choose “Everyone” when you create a task.'
              : 'Add your first task by typing or with the microphone.'}
          </p>
          <button type="button" className="btn-primary mt-2" onClick={() => setCreating(true)}>
            <PlusIcon /> Add a task
          </button>
          {!multi && (
            <Link
              to="/people"
              className="mt-1 inline-flex min-h-touch items-center gap-2 text-sm font-semibold text-brand-700 underline dark:text-brand-300"
            >
              <UsersIcon width={16} height={16} /> Share this device? Add people
            </Link>
          )}
        </div>
      ) : visible.length === 0 ? (
        <div className="card px-6 py-10 text-center">
          <p className="font-medium">No tasks match your search or filters.</p>
          <button type="button" className="btn-secondary mt-4" onClick={() => setFilters(defaultFilters)}>
            Clear filters
          </button>
        </div>
      ) : (
        <ul className="space-y-3" aria-label="Tasks">
          {visible.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              meId={me.id}
              owner={byId.get(task.ownerId)}
              assignee={task.assigneeId ? byId.get(task.assigneeId) : undefined}
              onToggle={() => void run(() => store.toggleTask(task.id))}
              onEdit={() => setEditing(task)}
              onDelete={canDelete(task, me.id, profileIds) ? () => setDeleting(task) : undefined}
            />
          ))}
        </ul>
      )}

      {creating && (
        <Modal title="New task" onClose={() => setCreating(false)}>
          <TaskForm
            voice
            initial={{ ...emptyFields, shared: view === 'shared' && multi }}
            categories={categories}
            people={profiles}
            meId={me.id}
            submitLabel="Add task"
            onCancel={() => setCreating(false)}
            onSubmit={async (fields) => {
              await store.createTask(fields);
              setCreating(false);
            }}
          />
        </Modal>
      )}

      {editing && (
        <Modal title="Edit task" onClose={() => setEditing(null)}>
          <TaskForm
            initial={editing}
            categories={categories}
            people={profiles}
            meId={me.id}
            submitLabel="Save changes"
            onCancel={() => setEditing(null)}
            onSubmit={async (fields) => {
              await store.updateTask(editing.id, fields);
              setEditing(null);
            }}
          />
        </Modal>
      )}

      {deleting && (
        <Modal title="Delete task?" onClose={() => setDeleting(null)}>
          <p className="mb-5 text-slate-700 dark:text-slate-300">
            “{deleting.title}” will be deleted{deleting.shared ? ' for everyone on this device' : ''}. This can’t be undone.
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn-secondary" onClick={() => setDeleting(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-danger"
              onClick={() => {
                const id = deleting.id;
                setDeleting(null);
                void run(() => store.deleteTask(id));
              }}
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
