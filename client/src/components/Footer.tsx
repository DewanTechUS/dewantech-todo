import { Link } from 'react-router-dom';
import { COMPANY_SITE_URL } from '../lib/brand';
import { CompanyCredit } from './Brand';

const linkClass =
  'flex min-h-touch items-center rounded-xl px-3 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white';

export function Footer() {
  return (
    // On phones and tablets the footer lives in the header's menu instead.
    <footer className="safe-bottom mt-auto hidden border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 lg:block">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-4 py-6">
        <CompanyCredit />
        <nav aria-label="Legal" className="flex shrink-0 gap-1">
          <Link to="/support" className={linkClass}>
            Help & Support
          </Link>
          <Link to="/privacy" className={linkClass}>
            Privacy Policy
          </Link>
          <Link to="/terms" className={linkClass}>
            Terms of Service
          </Link>
          <a href={COMPANY_SITE_URL} rel="noopener" className={linkClass}>
            DewanTech.com
          </a>
        </nav>
      </div>
    </footer>
  );
}
