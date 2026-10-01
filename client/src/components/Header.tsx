import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../hooks/useDialog';
import { DEWANTECH_SITE_URL } from './Footer';
import { CloseIcon, LogoMark, MenuIcon } from './Icons';
import { SyncIndicator } from './SyncIndicator';
import { ThemeToggle } from './ThemeToggle';

interface NavItem {
  to: string;
  label: string;
  end: boolean;
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-touch items-center rounded-xl px-3 font-medium transition-colors ${
    isActive
      ? 'bg-brand-50 text-brand-700 dark:bg-slate-800 dark:text-white'
      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
  }`;

export function Header() {
  const { status } = useAuth();
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);

  // The menu is phone-only; close it if the window grows to desktop width.
  useEffect(() => {
    const mq = window.matchMedia?.('(min-width: 768px)');
    if (!mq) return;
    const onChange = () => mq.matches && setOpen(false);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const links: NavItem[] =
    status === 'authenticated'
      ? [
          { to: '/', label: 'My tasks', end: true },
          { to: '/account', label: 'Account', end: false },
        ]
      : [
          { to: '/login', label: 'Log in', end: false },
          { to: '/signup', label: 'Sign up', end: false },
        ];

  return (
    <header className="safe-top sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-2">
        <Link to="/" className="mr-auto flex min-h-touch items-center gap-2 rounded-xl pr-2" aria-label="DewanTech To-Do home">
          <LogoMark />
          <span className="text-lg font-bold tracking-tight">
            DewanTech <span className="text-brand-600 dark:text-brand-400">To-Do</span>
          </span>
        </Link>

        {status === 'authenticated' && <SyncIndicator />}

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={navClass}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden md:block">
          <ThemeToggle />
        </div>

        <button
          ref={menuButton}
          type="button"
          className="btn-ghost md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
        >
          <MenuIcon />
        </button>
      </div>

      {/* Portal: the header's backdrop blur would otherwise trap the fixed-position drawer inside it. */}
      {open && createPortal(<MobileMenu links={links} onClose={() => setOpen(false)} />, document.body)}
    </header>
  );
}

const sectionTitle = 'px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500';

/** Phone menu: header navigation, settings and the footer's links in one slide-in panel. */
function MobileMenu({ links, onClose }: { links: NavItem[]; onClose: () => void }) {
  const { user } = useAuth();
  const panel = useRef<HTMLDivElement>(null);
  useDialog(panel, onClose, 'a[href], button:not([data-close])');

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-slate-900/60" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        id="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        tabIndex={-1}
        className="safe-top safe-bottom absolute inset-y-0 right-0 flex w-[85%] max-w-xs flex-col overflow-y-auto bg-white shadow-2xl dark:bg-slate-900"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2 dark:border-slate-800">
          <span className="flex items-center gap-2 font-bold">
            <LogoMark width={28} height={28} />
            Menu
          </span>
          <button type="button" data-close className="btn-ghost" aria-label="Close menu" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-6 px-3 py-4">
          {user && (
            <div className="rounded-2xl bg-slate-100 px-4 py-3 dark:bg-slate-800">
              <p className="font-semibold">{user.name}</p>
              <p className="break-all text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
            </div>
          )}

          <nav aria-label="Mobile">
            <p className={sectionTitle}>Menu</p>
            <div className="flex flex-col gap-1">
              {links.map((l) => (
                <NavLink key={l.to} to={l.to} end={l.end} className={navClass}>
                  {l.label}
                </NavLink>
              ))}
            </div>
          </nav>

          <div>
            <p className={sectionTitle}>Appearance</p>
            <div className="flex items-center justify-between px-3">
              <span className="text-slate-600 dark:text-slate-300">Theme</span>
              <ThemeToggle />
            </div>
          </div>

          <nav aria-label="Legal" className="mt-auto border-t border-slate-200 pt-4 dark:border-slate-800">
            <p className={sectionTitle}>About</p>
            <div className="flex flex-col gap-1">
              <NavLink to="/privacy" className={navClass}>
                Privacy Policy
              </NavLink>
              <NavLink to="/terms" className={navClass}>
                Terms of Service
              </NavLink>
              <a href={DEWANTECH_SITE_URL} rel="noopener" className={navClass({ isActive: false })}>
                DewanTech website
              </a>
            </div>
            <p className="mt-4 flex items-center gap-2 px-3 text-sm text-slate-500 dark:text-slate-400">
              <LogoMark width={20} height={20} />© {new Date().getFullYear()} DewanTech. All rights reserved.
            </p>
          </nav>
        </div>
      </div>
    </div>
  );
}
