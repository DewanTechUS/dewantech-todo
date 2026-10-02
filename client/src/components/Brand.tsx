import companyLogo from '../assets/dewantech-logo.png';
import appLogo from '../assets/donext-logo.png';
import { APP_NAME, COMPANY_NAME, COMPANY_SITE_URL, COPYRIGHT, SLOGAN } from '../lib/brand';

/** DoNext app icon. Decorative by default; pass `alt` when it is the only label. */
export function AppLogo({ size = 36, alt = '' }: { size?: number; alt?: string }) {
  return (
    <img
      src={appLogo}
      width={size}
      height={size}
      alt={alt}
      className="shrink-0 rounded-[22%] shadow-sm"
      draggable={false}
    />
  );
}

/** "DoNext" word mark next to the app icon. */
export function AppWordmark({ size = 36 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <AppLogo size={size} />
      <span className="text-xl font-extrabold tracking-tight text-brand-900 dark:text-white">
        Do<span className="text-brand-600 dark:text-brand-400">Next</span>
      </span>
    </span>
  );
}

export function CompanyLogo({ size = 40 }: { size?: number }) {
  return (
    <img
      src={companyLogo}
      width={size}
      height={size}
      alt=""
      className="shrink-0 rounded-xl ring-1 ring-slate-200 dark:ring-slate-700"
      draggable={false}
    />
  );
}

/** Company credit block: DewanTech logo, name, slogan and copyright. */
export function CompanyCredit({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${compact ? '' : 'text-left'}`}>
      <a href={COMPANY_SITE_URL} rel="noopener" className="rounded-xl" aria-label={`${COMPANY_NAME} website`}>
        <CompanyLogo size={compact ? 40 : 44} />
      </a>
      <div className="min-w-0 leading-tight">
        <p className="font-semibold text-slate-800 dark:text-slate-100">
          {APP_NAME} <span className="font-normal text-slate-500 dark:text-slate-400">by</span> {COMPANY_NAME}
        </p>
        <p className="text-sm italic text-slate-500 dark:text-slate-400">{SLOGAN}</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{COPYRIGHT}</p>
      </div>
    </div>
  );
}
