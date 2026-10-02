import { useId, useState, type FormEvent } from 'react';
import { Alert } from '../components/Alert';
import { Avatar } from '../components/Avatar';
import { AppLogo } from '../components/Brand';
import { PlusIcon } from '../components/Icons';
import { Spinner } from '../components/Spinner';
import { useApp } from '../context/AppContext';
import { APP_NAME } from '../lib/brand';

/** "Who's using DoNext?" — pick a person, or add the first one. */
export default function WelcomePage() {
  const { store, profiles } = useApp();
  const [adding, setAdding] = useState(profiles.length === 0);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameId = useId();
  if (!store) return null;

  const onAdd = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const p = await store.addProfile(name);
      await store.selectProfile(p.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add this person.');
      setBusy(false);
    }
  };

  const firstRun = profiles.length === 0;

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center py-6 text-center sm:py-12">
      <AppLogo size={firstRun ? 88 : 64} />
      {firstRun ? (
        <>
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-brand-900 dark:text-white sm:text-4xl">
            Welcome to Do<span className="text-brand-600 dark:text-brand-400">Next</span>
          </h1>
          <p className="mt-3 max-w-md text-slate-600 dark:text-slate-300">
            The to-do list you can talk to. Everything stays on this device — no account, no sign-up. Add people to share tasks with
            everyone who uses this device.
          </p>
        </>
      ) : (
        <h1 className="mt-6 text-2xl font-bold tracking-tight sm:text-3xl">Who’s using {APP_NAME}?</h1>
      )}

      {!firstRun && (
        <ul className="mt-8 grid w-full grid-cols-2 gap-3 sm:grid-cols-3" aria-label="People">
          {profiles.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => void store.selectProfile(p.id)}
                className="card flex w-full flex-col items-center gap-2 p-4 transition-colors hover:border-brand-400 hover:bg-brand-50/50 dark:hover:bg-slate-800"
              >
                <Avatar profile={p} size={56} />
                <span className="w-full truncate font-semibold">{p.name}</span>
              </button>
            </li>
          ))}
          {!adding && (
            <li>
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="flex h-full min-h-[118px] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 p-4 text-slate-500 hover:border-brand-400 hover:text-brand-700 dark:border-slate-700 dark:text-slate-400"
              >
                <PlusIcon width={28} height={28} />
                <span className="font-semibold">Add person</span>
              </button>
            </li>
          )}
        </ul>
      )}

      {adding && (
        <form onSubmit={onAdd} className="card mt-8 w-full space-y-3 p-5 text-left" noValidate>
          {error && <Alert>{error}</Alert>}
          <label htmlFor={nameId} className="label">
            {firstRun ? 'What’s your name?' : 'New person’s name'}
          </label>
          <input
            id={nameId}
            className="input"
            value={name}
            maxLength={40}
            autoComplete="given-name"
            autoFocus
            placeholder="e.g. Rocky"
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {!firstRun && (
              <button type="button" className="btn-secondary" onClick={() => setAdding(false)}>
                Cancel
              </button>
            )}
            <button type="submit" className="btn-primary" disabled={busy || !name.trim()}>
              {busy && <Spinner className="h-4 w-4" />}
              {firstRun ? 'Get started' : 'Add and continue'}
            </button>
          </div>
        </form>
      )}

      <p className="mt-8 max-w-md text-xs text-slate-500 dark:text-slate-400">
        Profiles help people who share this device keep their own lists. They aren’t password-protected — anyone using this device can
        switch between them.
      </p>
    </div>
  );
}
