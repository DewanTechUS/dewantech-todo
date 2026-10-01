import { useId, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Modal } from '../components/Modal';
import { Spinner } from '../components/Spinner';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../context/TasksContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export default function AccountPage() {
  const { user, logout, logoutEverywhere, deleteAccount } = useAuth();
  const { sync } = useTasks();
  const online = useOnlineStatus();
  const navigate = useNavigate();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [busy, setBusy] = useState<null | 'all' | 'delete'>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [understood, setUnderstood] = useState(false);
  const pwId = useId();
  const ackId = useId();

  if (!user) return null;

  const doLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const onLogout = () => (sync.pending > 0 ? setConfirmLogout(true) : void doLogout());

  const onLogoutAll = async () => {
    setBusy('all');
    setError(null);
    try {
      await logoutEverywhere();
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log out of all devices.');
    } finally {
      setBusy(null);
    }
  };

  const onDelete = async (e: FormEvent) => {
    e.preventDefault();
    if (!password) return setError('Enter your password to confirm.');
    if (!understood) return setError('Please confirm that you understand this cannot be undone.');
    setBusy('delete');
    setError(null);
    try {
      await deleteAccount(password);
      navigate('/signup', { replace: true, state: { deleted: true } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete your account.');
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Account</h1>
      {error && <Alert onDismiss={() => setError(null)}>{error}</Alert>}

      <section className="card p-5" aria-labelledby="profile-h">
        <h2 id="profile-h" className="mb-3 text-lg font-semibold">
          Profile
        </h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-[8rem_1fr]">
          <dt className="text-slate-500 dark:text-slate-400">Name</dt>
          <dd className="font-medium">{user.name}</dd>
          <dt className="text-slate-500 dark:text-slate-400">Email</dt>
          <dd className="break-all font-medium">{user.email}</dd>
          <dt className="text-slate-500 dark:text-slate-400">Member since</dt>
          <dd className="font-medium">{new Date(user.createdAt).toLocaleDateString()}</dd>
          <dt className="text-slate-500 dark:text-slate-400">Sync</dt>
          <dd className="font-medium">
            {sync.pending ? `${sync.pending} change(s) waiting to sync` : 'All changes synced'}
            {sync.lastSyncedAt && (
              <span className="block text-slate-500 dark:text-slate-400">
                Last synced {new Date(sync.lastSyncedAt).toLocaleString()}
              </span>
            )}
          </dd>
        </dl>
      </section>

      <section className="card space-y-3 p-5" aria-labelledby="session-h">
        <h2 id="session-h" className="text-lg font-semibold">
          Sessions
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Logging out removes your offline copy of tasks from this device. Your tasks stay safe in your account.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" className="btn-secondary" onClick={onLogout}>
            Log out
          </button>
          <button type="button" className="btn-secondary" onClick={() => void onLogoutAll()} disabled={!online || busy !== null}>
            {busy === 'all' && <Spinner className="h-4 w-4" />}
            Log out of all devices
          </button>
        </div>
      </section>

      <section className="card space-y-4 border-red-300 p-5 dark:border-red-900" aria-labelledby="delete-h">
        <h2 id="delete-h" className="text-lg font-semibold text-red-700 dark:text-red-400">
          Delete account
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          This permanently deletes your account and every task in it from our servers and this device. It cannot be undone.
        </p>
        {!online && <Alert kind="warning">You need to be online to delete your account.</Alert>}
        <form onSubmit={onDelete} className="space-y-3" noValidate>
          <div>
            <label htmlFor={pwId} className="label">
              Confirm your password
            </label>
            <input
              id={pwId}
              type="password"
              className="input"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="flex items-start gap-3">
            <input
              id={ackId}
              type="checkbox"
              className="mt-1 h-6 w-6 shrink-0 accent-red-600"
              checked={understood}
              onChange={(e) => setUnderstood(e.target.checked)}
            />
            <label htmlFor={ackId} className="text-sm">
              I understand my account and all my tasks will be permanently deleted.
            </label>
          </div>
          <button type="submit" className="btn-danger w-full sm:w-auto" disabled={!online || busy !== null}>
            {busy === 'delete' && <Spinner className="h-4 w-4" />}
            Delete my account
          </button>
        </form>
      </section>

      {confirmLogout && (
        <Modal title="Unsynced changes" onClose={() => setConfirmLogout(false)}>
          <p className="mb-5 text-slate-700 dark:text-slate-300">
            You have {sync.pending} change(s) that haven't synced yet. If you log out now, they will be lost. Connect to the
            internet and wait for syncing to finish to keep them.
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn-secondary" onClick={() => setConfirmLogout(false)}>
              Stay logged in
            </button>
            <button type="button" className="btn-danger" onClick={() => void doLogout()}>
              Log out and discard
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
