import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { FilterBar } from '../components/FilterBar';
import { PlusIcon } from '../components/Icons';
import { Modal } from '../components/Modal';
import { PageLoader } from '../components/Spinner';
import { TaskForm } from '../components/TaskForm';
import { TaskItem } from '../components/TaskItem';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../context/TasksContext';
import { categoriesOf, defaultFilters, filterTasks, type TaskFilters } from '../lib/filters';
import type { Task } from '../lib/types';

export default function TasksPage() {
  const { user } = useAuth();
  const { store, tasks, sync, loading, storageError } = useTasks();
  const [filters, setFilters] = useState<TaskFilters>(defaultFilters);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const location = useLocation();
  const [passwordReset, setPasswordReset] = useState(() => Boolean((location.state as { passwordReset?: boolean } | null)?.passwordReset));

  const categories = useMemo(() => categoriesOf(tasks), [tasks]);
  const visible = useMemo(() => filterTasks(tasks, filters), [tasks, filters]);
  const activeCount = tasks.filter((t) => !t.completed).length;

  const run = async (fn: () => Promise<unknown>) => {
    try {
      setActionError(null);
      await fn();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  };

  if (storageError) return <Alert>{storageError}</Alert>;
  if (loading || !store) return <PageLoader label="Loading your tasks…" />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {user ? `Hi, ${user.name.split(' ')[0]}` : 'My tasks'}
          </h1>
          <p className="text-slate-600 dark:text-slate-400" aria-live="polite">
            {tasks.length === 0
              ? 'No tasks yet.'
              : `${activeCount} active · ${tasks.length - activeCount} done`}
          </p>
        </div>
        <button type="button" className="btn-primary w-full sm:w-auto" onClick={() => setCreating(true)}>
          <PlusIcon /> New task
        </button>
      </div>

      {sync.error && (
        <Alert kind="warning">
          {sync.error}{' '}
          <button type="button" className="font-semibold underline" onClick={() => void store.syncNow()}>
            Retry
          </button>
        </Alert>
      )}
      {passwordReset && (
        <Alert kind="success" onDismiss={() => setPasswordReset(false)}>
          Your password has been changed and you're signed in. Other devices have been signed out.
        </Alert>
      )}
      {actionError && <Alert onDismiss={() => setActionError(null)}>{actionError}</Alert>}

      {tasks.length > 0 && <FilterBar filters={filters} categories={categories} onChange={setFilters} />}

      {tasks.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
          <p className="text-lg font-semibold">Your list is empty</p>
          <p className="max-w-sm text-slate-600 dark:text-slate-400">
            Add your first task by typing or with the microphone. Tasks are saved on this device and synced to your account.
          </p>
          <button type="button" className="btn-primary mt-2" onClick={() => setCreating(true)}>
            <PlusIcon /> Add a task
          </button>
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
              onToggle={() => void run(() => store.toggle(task.id))}
              onEdit={() => setEditing(task)}
              onDelete={() => setDeleting(task)}
            />
          ))}
        </ul>
      )}

      {creating && (
        <Modal title="New task" onClose={() => setCreating(false)}>
          <TaskForm
            voice
            categories={categories}
            submitLabel="Add task"
            onCancel={() => setCreating(false)}
            onSubmit={async (fields) => {
              await store.create(fields);
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
            submitLabel="Save changes"
            onCancel={() => setEditing(null)}
            onSubmit={async (fields) => {
              await store.update(editing.id, fields);
              setEditing(null);
            }}
          />
        </Modal>
      )}

      {deleting && (
        <Modal title="Delete task?" onClose={() => setDeleting(null)}>
          <p className="mb-5 text-slate-700 dark:text-slate-300">
            “{deleting.title}” will be deleted from all your devices. This can't be undone.
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
                void run(() => store.remove(id));
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
