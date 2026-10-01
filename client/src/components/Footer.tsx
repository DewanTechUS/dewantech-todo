import { Link } from 'react-router-dom';
import { LogoMark } from './Icons';

/** PLACEHOLDER: replace with your real DewanTech website URL. */
export const DEWANTECH_SITE_URL = 'https://dewantech.com';

export function Footer() {
  return (
    <footer className="safe-bottom mt-auto border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-4 py-6 text-sm text-slate-500 dark:text-slate-400 sm:flex-row sm:justify-between">
        <a href={DEWANTECH_SITE_URL} className="flex min-h-touch items-center gap-2 rounded-xl" rel="noopener">
          <LogoMark width={24} height={24} />
          <span>
            © {new Date().getFullYear()} <strong className="font-semibold text-slate-700 dark:text-slate-200">DewanTech</strong>. All
            rights reserved.
          </span>
        </a>
        <nav aria-label="Legal" className="flex gap-2">
          <Link to="/privacy" className="flex min-h-touch items-center rounded-xl px-3 hover:text-slate-900 dark:hover:text-white">
            Privacy Policy
          </Link>
          <Link to="/terms" className="flex min-h-touch items-center rounded-xl px-3 hover:text-slate-900 dark:hover:text-white">
            Terms of Service
          </Link>
        </nav>
      </div>
    </footer>
  );
}
