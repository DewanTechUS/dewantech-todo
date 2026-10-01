import { useTasks } from '../context/TasksContext';
import { CloudIcon, CloudOffIcon } from './Icons';
import { Spinner } from './Spinner';

export function SyncIndicator() {
  const { store, sync } = useTasks();
  if (!store) return null;

  let text: string;
  let icon = <CloudIcon />;
  let tone = 'text-slate-500 dark:text-slate-400';
  if (sync.status === 'syncing') {
    text = 'Syncing…';
    icon = <Spinner className="h-4 w-4" label="Syncing" />;
  } else if (sync.status === 'offline') {
    text = sync.pending ? `Offline · ${sync.pending} to sync` : 'Offline';
    icon = <CloudOffIcon />;
    tone = 'text-amber-700 dark:text-amber-400';
  } else if (sync.status === 'error') {
    text = 'Sync problem';
    icon = <CloudOffIcon />;
    tone = 'text-red-600 dark:text-red-400';
  } else {
    text = sync.pending ? `${sync.pending} to sync` : 'Synced';
  }

  return (
    <button
      type="button"
      onClick={() => void store.syncNow()}
      className={`btn-ghost min-h-[40px] gap-1.5 text-sm ${tone}`}
      title={sync.lastSyncedAt ? `Last synced ${new Date(sync.lastSyncedAt).toLocaleString()} — tap to sync now` : 'Tap to sync now'}
      aria-label={`Sync status: ${text}. Sync now`}
    >
      {icon}
      <span className="hidden sm:inline" aria-live="polite">
        {text}
      </span>
    </button>
  );
}
