import type { ReactNode } from 'react';
import { CloseIcon } from './Icons';

const styles = {
  error: 'border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/60 dark:text-red-100',
  info: 'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-100',
  warning: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-100',
  success: 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-100',
};

interface AlertProps {
  kind?: keyof typeof styles;
  children: ReactNode;
  onDismiss?: () => void;
  className?: string;
}

export function Alert({ kind = 'error', children, onDismiss, className = '' }: AlertProps) {
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${styles[kind]} ${className}`}
    >
      <div className="flex-1 pt-0.5">{children}</div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="-m-2 min-h-touch min-w-touch rounded-lg p-2" aria-label="Dismiss message">
          <CloseIcon className="mx-auto" />
        </button>
      )}
    </div>
  );
}
