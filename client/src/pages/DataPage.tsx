import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { DownloadIcon, UploadIcon } from '../components/Icons';
import { Modal } from '../components/Modal';
import { useApp } from '../context/AppContext';

type Persist = 'unknown' | 'persisted' | 'not-persisted' | 'unsupported';

/** Backup, restore and erase — the only way data leaves or enters this device. */
export default function DataPage() {
  const { store, profiles, tasks } = useApp();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ kind: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [erasing, setErasing] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [persist, setPersist] = useState<Persist>('unknown');
  const confirmId = useId();

  useEffect(() => {
    if (!navigator.storage?.persisted) return setPersist('unsupported');
    void navigator.storage.persisted().then((p) => setPersist(p ? 'persisted' : 'not-persisted'));
  }, []);

  if (!store) return null;

  const download = () => {
    const blob = new Blob([JSON.stringify(store.exportBackup(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `donext-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage({ kind: 'success', text: 'Backup downloaded. Keep the file somewhere safe (e.g. cloud storage or email it to yourself).' });
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('This file is too large to be a DoNext backup.');
      const data = JSON.parse(await file.text());
      const result = await store.importBackup(data);
      setMessage({
        kind: 'success',
        text:
          result.profiles + result.tasks === 0
            ? 'Everything in that backup is already on this device.'
            : `Imported ${result.tasks} task(s) and ${result.profiles} person/people. Newer versions already on this device were kept.`,
      });
    } catch (err) {
      setMessage({
        kind: 'error',
        text: err instanceof SyntaxError ? "That file isn't a valid DoNext backup." : err instanceof Error ? err.message : 'Import failed.',
      });
    }
  };

  const requestPersist = async () => {
    const granted = await navigator.storage.persist();
    setPersist(granted ? 'persisted' : 'not-persisted');
    setMessage(
      granted
        ? { kind: 'success', text: 'Done — your browser will keep DoNext’s data even when storage runs low.' }
        : { kind: 'info', text: 'Your browser didn’t allow it right now. Installing DoNext (Add to Home Screen) usually helps. Keep regular backups.' },
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Backup & data</h1>
        <p className="text-slate-600 dark:text-slate-400">
          DoNext keeps everything on this device: {profiles.length} {profiles.length === 1 ? 'person' : 'people'}, {tasks.length} task(s).
          Nothing is sent to a server.
        </p>
      </div>

      {message && (
        <Alert kind={message.kind === 'error' ? 'error' : message.kind === 'info' ? 'info' : 'success'} onDismiss={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <section className="card space-y-3 p-5" aria-labelledby="backup-h">
        <h2 id="backup-h" className="text-lg font-semibold">
          Backup
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          If this browser’s data is cleared or the device is lost, your tasks are gone. Download a backup regularly. You can also use it
          to copy your tasks to another device.
        </p>
        <button type="button" className="btn-primary w-full sm:w-auto" onClick={download}>
          <DownloadIcon /> Download backup
        </button>
      </section>

      <section className="card space-y-3 p-5" aria-labelledby="import-h">
        <h2 id="import-h" className="text-lg font-semibold">
          Import backup
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Adds the people and tasks from a backup file to this device. Nothing here is deleted; if a task exists in both, the most recently
          changed version is kept.
        </p>
        <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" onChange={(e) => void onFile(e)} aria-label="Choose backup file" />
        <button type="button" className="btn-secondary w-full sm:w-auto" onClick={() => fileRef.current?.click()}>
          <UploadIcon /> Choose backup file
        </button>
      </section>

      {persist !== 'unsupported' && (
        <section className="card space-y-3 p-5" aria-labelledby="persist-h">
          <h2 id="persist-h" className="text-lg font-semibold">
            Protect storage
          </h2>
          {persist === 'persisted' ? (
            <p className="text-sm text-success-600 dark:text-success-500">✓ This browser will keep DoNext’s data even when storage runs low.</p>
          ) : (
            <>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Ask the browser not to clear DoNext’s data automatically when the device runs low on space.
              </p>
              <button type="button" className="btn-secondary w-full sm:w-auto" onClick={() => void requestPersist()}>
                Keep my data
              </button>
            </>
          )}
        </section>
      )}

      <section className="card space-y-3 border-red-300 p-5 dark:border-red-900" aria-labelledby="erase-h">
        <h2 id="erase-h" className="text-lg font-semibold text-red-700 dark:text-red-400">
          Erase everything
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">Deletes all people and tasks from this device. This can’t be undone.</p>
        <button type="button" className="btn-danger w-full sm:w-auto" onClick={() => setErasing(true)}>
          Erase everything
        </button>
      </section>

      {erasing && (
        <Modal title="Erase everything?" onClose={() => setErasing(false)}>
          <p className="mb-3 text-slate-700 dark:text-slate-300">
            All {profiles.length} people and {tasks.length} tasks on this device will be permanently deleted. Download a backup first if
            you might need them.
          </p>
          <label htmlFor={confirmId} className="label">
            Type ERASE to confirm
          </label>
          <input id={confirmId} className="input mb-5" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn-secondary" onClick={() => setErasing(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-danger"
              disabled={confirmText.trim().toUpperCase() !== 'ERASE'}
              onClick={() => {
                setErasing(false);
                void store.eraseEverything().then(() => navigate('/', { replace: true }));
              }}
            >
              Erase everything
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
