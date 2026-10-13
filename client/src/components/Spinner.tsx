export function Spinner({ label = 'Loading…', className = 'h-5 w-5' }: { label?: string; className?: string }) {
  return (
    <span role="status" className="inline-flex items-center">
      <svg className={`animate-spin-slow ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
        <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-500 dark:text-slate-400">
      <Spinner className="h-8 w-8 text-brand-600" label={label} />
      <p aria-hidden>{label}</p>
    </div>
  );
}
