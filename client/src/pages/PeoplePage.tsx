import { useId, useState, type FormEvent } from 'react';
import { Alert } from '../components/Alert';
import { Avatar } from '../components/Avatar';
import { EditIcon, PlusIcon, TrashIcon } from '../components/Icons';
import { Modal } from '../components/Modal';
import { useApp } from '../context/AppContext';
import { PROFILE_COLORS } from '../lib/appStore';
import type { Profile } from '../lib/types';

/** Manage the people who use DoNext on this device. */
export default function PeoplePage() {
  const { store, profiles, tasks, me } = useApp();
  const [editing, setEditing] = useState<Profile | 'new' | null>(null);
  const [removing, setRemoving] = useState<Profile | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  if (!store || !me) return null;

  const counts = (p: Profile) => {
    const own = tasks.filter((t) => t.ownerId === p.id);
    return { private: own.filter((t) => !t.shared).length, shared: own.filter((t) => t.shared).length };
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">People</h1>
          <p className="text-slate-600 dark:text-slate-400">Everyone who uses DoNext on this device.</p>
        </div>
        <button type="button" className="btn-primary w-full sm:w-auto" onClick={() => setEditing('new')}>
          <PlusIcon /> Add person
        </button>
      </div>

      {message && (
        <Alert kind="success" onDismiss={() => setMessage(null)}>
          {message}
        </Alert>
      )}

      <ul className="card divide-y divide-slate-100 dark:divide-slate-800" aria-label="People">
        {profiles.map((p) => {
          const c = counts(p);
          return (
            <li key={p.id} className="flex items-center gap-3 p-3 sm:p-4">
              <Avatar profile={p} size={44} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {p.name} {p.id === me.id && <span className="font-normal text-slate-500 dark:text-slate-400">(you)</span>}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {c.private} private · {c.shared} shared
                </p>
              </div>
              {p.id !== me.id && (
                <button type="button" className="btn-secondary min-h-[40px] px-3 text-sm" onClick={() => void store.selectProfile(p.id)}>
                  Switch
                </button>
              )}
              <button type="button" className="btn-ghost" aria-label={`Edit ${p.name}`} onClick={() => setEditing(p)}>
                <EditIcon />
              </button>
              <button
                type="button"
                className="btn-ghost hover:text-red-600 dark:hover:text-red-400"
                aria-label={`Remove ${p.name}`}
                onClick={() => setRemoving(p)}
              >
                <TrashIcon />
              </button>
            </li>
          );
        })}
      </ul>

      <div className="rounded-xl bg-slate-100 p-4 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
        <p className="mb-1 font-semibold text-slate-800 dark:text-slate-100">How sharing works</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Only me</strong> tasks are visible to the person who made them (and to anyone they’re assigned to).
          </li>
          <li>
            <strong>Everyone</strong> tasks appear under “Shared” for everyone on this device.
          </li>
          <li>Profiles aren’t password-protected, and everything stays on this device. To move tasks to another device, use Backup.</li>
        </ul>
      </div>

      {editing && (
        <ProfileEditor
          profile={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(text) => {
            setEditing(null);
            setMessage(text);
          }}
        />
      )}

      {removing && (
        <Modal title={`Remove ${removing.name}?`} onClose={() => setRemoving(null)}>
          <p className="mb-2 text-slate-700 dark:text-slate-300">
            {removing.name}’s <strong>{counts(removing).private} private task(s)</strong> will be deleted. Their{' '}
            {counts(removing).shared} shared task(s) stay for everyone, and tasks assigned to them become unassigned.
          </p>
          <p className="mb-5 text-slate-700 dark:text-slate-300">This can’t be undone. Consider downloading a backup first.</p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn-secondary" onClick={() => setRemoving(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-danger"
              onClick={() => {
                const p = removing;
                setRemoving(null);
                void store.removeProfile(p.id).then(() => setMessage(`${p.name} was removed.`));
              }}
            >
              Remove
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ProfileEditor({ profile, onClose, onSaved }: { profile: Profile | null; onClose: () => void; onSaved: (msg: string) => void }) {
  const { store } = useApp();
  const [name, setName] = useState(profile?.name ?? '');
  const [color, setColor] = useState(profile?.color ?? '');
  const [error, setError] = useState<string | null>(null);
  const nameId = useId();
  const colorId = useId();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!store) return;
    try {
      if (profile) {
        await store.updateProfile(profile.id, { name, color: color || undefined });
        onSaved('Saved.');
      } else {
        const p = await store.addProfile(name, color || undefined);
        onSaved(`${p.name} was added. They can pick their name from “Switch person”.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    }
  };

  return (
    <Modal title={profile ? `Edit ${profile.name}` : 'Add person'} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && <Alert>{error}</Alert>}
        <div>
          <label htmlFor={nameId} className="label">
            Name
          </label>
          <input id={nameId} className="input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <span id={colorId} className="label">
            Colour
          </span>
          <div role="radiogroup" aria-labelledby={colorId} className="flex flex-wrap gap-2">
            {PROFILE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={(color || profile?.color) === c}
                aria-label={`Colour ${c}`}
                onClick={() => setColor(c)}
                className={`h-10 w-10 rounded-full ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ${
                  (color || profile?.color) === c ? 'ring-2 ring-slate-900 dark:ring-white' : ''
                }`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={!name.trim()}>
            {profile ? 'Save' : 'Add person'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
