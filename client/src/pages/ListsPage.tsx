import { useId, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Avatar } from '../components/Avatar';
import { CloseIcon, EditIcon, MailIcon, PlusIcon } from '../components/Icons';
import { Modal } from '../components/Modal';
import { Spinner } from '../components/Spinner';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../context/TasksContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { api, IS_DEMO } from '../lib/api';
import type { SharedList } from '../lib/types';

type Message = { kind: 'success' | 'error'; text: string } | null;

/** Shared lists: invitations, create, invite people, manage members. Needs a connection. */
export default function ListsPage() {
  const { token, user } = useAuth();
  const { store, lists, invites, tasks } = useTasks();
  const online = useOnlineStatus();
  const [message, setMessage] = useState<Message>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [confirm, setConfirm] = useState<{ kind: 'delete' | 'leave'; list: SharedList } | null>(null);
  const nameId = useId();

  if (!token || !user || !store) return null;

  /** Runs a list action online, then syncs so lists and tasks update everywhere. */
  const act = async <T,>(key: string, fn: () => Promise<T>, success?: string | ((result: T) => string)) => {
    setBusy(key);
    setMessage(null);
    try {
      const result = await fn();
      await store.syncNow();
      if (success) setMessage({ kind: 'success', text: typeof success === 'function' ? success(result) : success });
      return true;
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : 'Something went wrong. Please try again.' });
      return false;
    } finally {
      setBusy(null);
    }
  };

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const ok = await act('create', () => api.lists.create(token, newName.trim()), `“${newName.trim()}” created. Now invite people by email.`);
    if (ok) setNewName('');
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Shared lists</h1>
        <p className="text-slate-600 dark:text-slate-400">
          Share a list with family, friends or your team. Everyone in a list sees its tasks on all their devices.
        </p>
      </div>

      {!online && <Alert kind="warning">You're offline. Connect to the internet to create lists or manage invitations.</Alert>}
      {message && (
        <Alert kind={message.kind} onDismiss={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      {invites.length > 0 && (
        <section aria-labelledby="inv-h" className="space-y-2">
          <h2 id="inv-h" className="text-lg font-semibold">
            Invitations
          </h2>
          <ul className="space-y-2">
            {invites.map((inv) => (
              <li key={inv.listId} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <span className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-slate-800 dark:text-brand-300">
                    <MailIcon />
                  </span>
                  <span>
                    <strong>{inv.invitedBy}</strong> invited you to <strong>“{inv.listName}”</strong>
                  </span>
                </span>
                <span className="flex gap-2">
                  <button
                    type="button"
                    className="btn-primary flex-1"
                    disabled={!online || busy !== null}
                    onClick={() => void act(`acc-${inv.listId}`, () => api.lists.accept(token, inv.listId), `You joined “${inv.listName}”.`)}
                  >
                    {busy === `acc-${inv.listId}` && <Spinner className="h-4 w-4" />}
                    Accept
                  </button>
                  <button
                    type="button"
                    className="btn-secondary flex-1"
                    disabled={!online || busy !== null}
                    onClick={() => void act(`dec-${inv.listId}`, () => api.lists.decline(token, inv.listId))}
                  >
                    Decline
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <form onSubmit={onCreate} className="card flex flex-col gap-2 p-4 sm:flex-row sm:items-end" noValidate>
        <div className="flex-1">
          <label htmlFor={nameId} className="label">
            New shared list
          </label>
          <input
            id={nameId}
            className="input"
            placeholder="e.g. Family, Groceries, Team"
            maxLength={60}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-primary" disabled={!online || busy !== null || !newName.trim()}>
          {busy === 'create' ? <Spinner className="h-4 w-4" /> : <PlusIcon />} Create list
        </button>
      </form>

      {lists.length === 0 ? (
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">You're not in any shared lists yet.</p>
      ) : (
        <ul className="space-y-4" aria-label="Your shared lists">
          {lists.map((list) => (
            <ListCard
              key={list.id}
              list={list}
              meId={user.id}
              taskCount={tasks.filter((t) => t.listId === list.id).length}
              disabled={!online || busy !== null}
              busy={busy}
              act={act}
              token={token}
              onDelete={() => setConfirm({ kind: 'delete', list })}
              onLeave={() => setConfirm({ kind: 'leave', list })}
            />
          ))}
        </ul>
      )}

      <p className="text-center text-sm">
        <Link to="/" className="font-semibold text-brand-700 underline dark:text-brand-300">
          Back to my tasks
        </Link>
      </p>

      {confirm && (
        <Modal title={confirm.kind === 'delete' ? `Delete “${confirm.list.name}”?` : `Leave “${confirm.list.name}”?`} onClose={() => setConfirm(null)}>
          <p className="mb-5 text-slate-700 dark:text-slate-300">
            {confirm.kind === 'delete'
              ? 'The list and all of its tasks will be deleted for everyone in it. This can’t be undone.'
              : 'You’ll stop seeing this list and its tasks. Tasks you added stay in the list for the others.'}
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn-secondary" onClick={() => setConfirm(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-danger"
              onClick={() => {
                const { kind, list } = confirm;
                setConfirm(null);
                void act(
                  kind,
                  () => (kind === 'delete' ? api.lists.remove(token, list.id) : api.lists.leave(token, list.id)),
                  kind === 'delete' ? `“${list.name}” was deleted.` : `You left “${list.name}”.`,
                );
              }}
            >
              {confirm.kind === 'delete' ? 'Delete list' : 'Leave list'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

interface ListCardProps {
  list: SharedList;
  meId: string;
  taskCount: number;
  disabled: boolean;
  busy: string | null;
  token: string;
  act: <T>(key: string, fn: () => Promise<T>, success?: string | ((result: T) => string)) => Promise<boolean>;
  onDelete: () => void;
  onLeave: () => void;
}

function ListCard({ list, meId, taskCount, disabled, busy, token, act, onDelete, onLeave }: ListCardProps) {
  const owner = list.role === 'owner';
  const [email, setEmail] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(list.name);
  const emailId = useId();
  const renameId = useId();

  const onInvite = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return;
    const to = email.trim();
    const ok = await act(`inv-${list.id}`, () => api.lists.invite(token, list.id, to), (r) =>
      r.emailSent
        ? `Invitation emailed to ${to}. They can accept it after logging in.`
        : `${to} is invited. They'll see the invitation when they log in or sign up with that email. Email notifications are coming soon.`,
    );
    if (ok) setEmail('');
  };

  return (
    <li className="card space-y-4 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        {renaming ? (
          <form
            className="flex flex-1 flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              void act(`ren-${list.id}`, () => api.lists.rename(token, list.id, name.trim())).then((ok) => ok && setRenaming(false));
            }}
          >
            <label htmlFor={renameId} className="sr-only">
              List name
            </label>
            <input id={renameId} className="input flex-1" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
            <button type="submit" className="btn-primary" disabled={disabled || !name.trim()}>
              Save
            </button>
          </form>
        ) : (
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">{list.name}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {list.members.length} {list.members.length === 1 ? 'person' : 'people'} · {taskCount} task(s) · {owner ? 'You own this list' : 'Member'}
            </p>
          </div>
        )}
        {owner && !renaming && (
          <button type="button" className="btn-ghost" aria-label={`Rename ${list.name}`} onClick={() => setRenaming(true)} disabled={disabled}>
            <EditIcon />
          </button>
        )}
      </div>

      <ul className="divide-y divide-slate-100 dark:divide-slate-800" aria-label={`People in ${list.name}`}>
        {list.members.map((m) => (
          <li key={m.id} className="flex items-center gap-3 py-2">
            <Avatar name={m.name} seed={m.id} size={36} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">
                {m.name} {m.id === meId && <span className="font-normal text-slate-500">(you)</span>}
              </span>
              <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                {m.email} · {m.role === 'owner' ? 'Owner' : 'Member'}
              </span>
            </span>
            {owner && m.id !== meId && (
              <button
                type="button"
                className="btn-ghost hover:text-red-600"
                aria-label={`Remove ${m.name} from ${list.name}`}
                disabled={disabled}
                onClick={() => void act(`rm-${m.id}`, () => api.lists.removeMember(token, list.id, m.id), `${m.name} was removed.`)}
              >
                <CloseIcon />
              </button>
            )}
          </li>
        ))}
        {list.invites.map((i) => (
          <li key={i.email} className="flex items-center gap-3 py-2 text-slate-500 dark:text-slate-400">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600">
              <MailIcon width={16} height={16} />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm">
              {i.email} · <em>invited</em>
            </span>
            <button
              type="button"
              className="btn-ghost text-sm"
              disabled={disabled}
              onClick={() => void act(`ci-${i.email}`, () => api.lists.cancelInvite(token, list.id, i.email))}
            >
              Cancel
            </button>
          </li>
        ))}
      </ul>

      {owner && (
        <form onSubmit={onInvite} className="flex flex-col gap-2 sm:flex-row sm:items-end" noValidate>
          <div className="flex-1">
            <label htmlFor={emailId} className="label">
              Invite by email
            </label>
            <input
              id={emailId}
              type="email"
              className="input"
              placeholder="name@example.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {IS_DEMO && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Email invitations are coming soon to the demo. For now, invites stay in this browser.</p>
            )}
          </div>
          <button type="submit" className="btn-secondary" disabled={disabled || !/^\S+@\S+\.\S+$/.test(email.trim())}>
            {busy === `inv-${list.id}` ? <Spinner className="h-4 w-4" /> : <MailIcon />} Send invite
          </button>
        </form>
      )}

      <div className="flex justify-end border-t border-slate-100 pt-3 dark:border-slate-800">
        {owner ? (
          <button type="button" className="btn-ghost text-sm text-red-600 dark:text-red-400" disabled={disabled} onClick={onDelete}>
            Delete list
          </button>
        ) : (
          <button type="button" className="btn-ghost text-sm text-red-600 dark:text-red-400" disabled={disabled} onClick={onLeave}>
            Leave list
          </button>
        )}
      </div>
    </li>
  );
}
