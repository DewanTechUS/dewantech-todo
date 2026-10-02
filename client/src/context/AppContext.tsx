import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { AppStore, type AppState } from '../lib/appStore';
import { LocalDB } from '../lib/db';

interface AppContextValue {
  store: AppStore | null;
  error: string | null;
}

const AppContext = createContext<AppContextValue>({ store: null, error: null });

/** Opens the on-device database once and shares the store with the whole app. */
export function AppProvider({ children, dbName }: { children: ReactNode; dbName?: string }) {
  const [value, setValue] = useState<AppContextValue>({ store: null, error: null });

  useEffect(() => {
    let db: LocalDB | null = null;
    let cancelled = false;
    LocalDB.open(dbName)
      .then(async (opened) => {
        if (cancelled) return opened.close();
        db = opened;
        const store = new AppStore(opened);
        await store.init();
        if (!cancelled) setValue({ store, error: null });
      })
      .catch(() => {
        if (!cancelled)
          setValue({
            store: null,
            error: "DoNext can't save data in this browser (private browsing may block it). Open it in a normal window to keep your tasks.",
          });
      });
    return () => {
      cancelled = true;
      db?.close();
    };
  }, [dbName]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

const EMPTY: AppState = { ready: false, profiles: [], tasks: [], activeProfileId: null };
const noop = () => () => undefined;

export function useApp() {
  const { store, error } = useContext(AppContext);
  const state = useSyncExternalStore(store?.subscribe ?? noop, store?.getState ?? (() => EMPTY));
  const me = state.profiles.find((p) => p.id === state.activeProfileId) ?? null;
  return { store, error, ...state, me, loading: !store && !error };
}
