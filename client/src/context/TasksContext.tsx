import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { api } from '../lib/api';
import { LocalStore } from '../lib/db';
import { TaskStore, type SyncState } from '../lib/taskStore';
import type { Task } from '../lib/types';
import { useAuth } from './AuthContext';

const TasksContext = createContext<{ store: TaskStore | null; error: string | null }>({ store: null, error: null });

export function TasksProvider({ children }: { children: ReactNode }) {
  const { user, token, sessionExpired, markExpired } = useAuth();
  const [store, setStore] = useState<TaskStore | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tokenRef = useRef(token);
  tokenRef.current = token;

  useEffect(() => {
    if (!user) return;
    let local: LocalStore | null = null;
    let stop: (() => void) | undefined;
    let cancelled = false;

    LocalStore.open(user.id)
      .then(async (opened) => {
        if (cancelled) return opened.close();
        local = opened;
        const ts = new TaskStore({
          store: opened,
          sync: (req) => api.sync(tokenRef.current ?? '', req),
          onUnauthorized: markExpired,
        });
        await ts.init();
        if (cancelled) return;
        if (!sessionExpired) stop = ts.start();
        setStore(ts);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) setError('Offline storage is unavailable (private browsing may block it). Your tasks cannot be saved on this device.');
      });

    return () => {
      cancelled = true;
      stop?.();
      local?.close();
      setStore(null);
    };
  }, [user?.id, sessionExpired, markExpired]); // eslint-disable-line react-hooks/exhaustive-deps

  return <TasksContext.Provider value={{ store, error }}>{children}</TasksContext.Provider>;
}

const EMPTY: Task[] = [];
const IDLE: SyncState = { status: 'idle', pending: 0, lastSyncedAt: null, error: null };
const noop = () => () => undefined;

export function useTasks() {
  const { store, error } = useContext(TasksContext);
  const subscribe = store?.subscribe ?? noop;
  const tasks = useSyncExternalStore(subscribe, () => store?.tasks ?? EMPTY);
  const sync = useSyncExternalStore(subscribe, () => store?.state ?? IDLE);
  return { store, tasks, sync, loading: !store && !error, storageError: error };
}
