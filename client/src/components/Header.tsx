import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CloseIcon, LogoMark, MenuIcon } from './Icons';
import { SyncIndicator } from './SyncIndicator';
import { ThemeToggle } from './ThemeToggle';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-touch items-center rounded-xl px-3 font-medium transition-colors ${
    isActive
      ? 'bg-brand-50 text-brand-700 dark:bg-slate-800 dark:text-white'
      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
  }`;

export function Header() {
  const { status, user } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);

  const links =
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
          type="button"
          className="btn-ghost md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      {open && (
        <div id="mobile-menu" className="border-t border-slate-200 px-4 pb-4 pt-2 dark:border-slate-800 md:hidden">
          {user && <p className="px-3 pb-2 text-sm text-slate-500 dark:text-slate-400">Signed in as {user.email}</p>}
          <nav aria-label="Mobile" className="flex flex-col gap-1">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={navClass}>
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-3 flex items-center justify-between px-3">
            <span className="text-sm text-slate-500 dark:text-slate-400">Theme</span>
            <ThemeToggle />
          </div>
        </div>
      )}
    </header>
  );
}
