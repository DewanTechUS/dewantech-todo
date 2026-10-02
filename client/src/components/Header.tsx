import { useEffect, useRef, useState, type ComponentType, type ReactNode, type SVGProps } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../context/TasksContext';
import { useDialog } from '../hooks/useDialog';
import { APP_NAME, COMPANY_SITE_URL } from '../lib/brand';
import { AppWordmark, CompanyCredit } from './Brand';
import {
  ChevronRightIcon,
  CloseIcon,
  CloudIcon,
  CloudOffIcon,
  ExternalIcon,
  FileTextIcon,
  GlobeIcon,
  ListIcon,
  LogoutIcon,
  MenuIcon,
  RefreshIcon,
  ShieldIcon,
  UserIcon,
} from './Icons';
import { Spinner } from './Spinner';
import { SyncIndicator } from './SyncIndicator';
import { ThemeToggle } from './ThemeToggle';

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

interface NavItem {
  to: string;
  label: string;
  end: boolean;
  Icon: IconType;
}

const desktopNavClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-touch items-center rounded-xl px-3 font-medium transition-colors ${
    isActive
      ? 'bg-brand-50 text-brand-700 dark:bg-slate-800 dark:text-white'
      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
  }`;

export function Header() {
  const { status } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);

  // The menu is for phones and tablets; close it if the window grows to desktop width.
  useEffect(() => {
    const mq = window.matchMedia?.('(min-width: 1024px)');
    if (!mq) return;
    const onChange = () => mq.matches && setOpen(false);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const links: NavItem[] =
    status === 'authenticated'
      ? [
          { to: '/', label: 'My tasks', end: true, Icon: ListIcon },
          { to: '/account', label: 'Account', end: false, Icon: UserIcon },
        ]
      : [];

  return (
    <header className="safe-top sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-2">
        <Link to="/" className="mr-auto flex min-h-touch items-center rounded-xl pr-2" aria-label={`${APP_NAME} home`}>
          <AppWordmark />
        </Link>

        {status === 'authenticated' && (
          <div className="hidden lg:block">
            <SyncIndicator />
          </div>
        )}

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {status === 'authenticated' ? (
            links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={desktopNavClass}>
                {l.label}
              </NavLink>
            ))
          ) : (
            <>
              <NavLink to="/login" className={desktopNavClass}>
                Log in
              </NavLink>
              <Link to="/signup" className="btn-primary">
                Sign up
              </Link>
            </>
          )}
        </nav>
        <div className="hidden lg:block">
          <ThemeToggle />
        </div>

        <button
          type="button"
          className="btn-ghost lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
        >
          <MenuIcon width={24} height={24} />
        </button>
      </div>

      {/* Portal: the header's backdrop blur would otherwise trap the fixed-position drawer inside it. */}
      {open && createPortal(<MobileMenu links={links} onClose={() => setOpen(false)} />, document.body)}
    </header>
  );
}

const sectionTitle = 'mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400';
const rowClass =
  'flex min-h-[52px] items-center gap-3 px-4 font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800';
const activeRowClass = 'flex min-h-[52px] items-center gap-3 bg-brand-50 px-4 font-medium text-brand-700 dark:bg-slate-800 dark:text-white';

function MenuSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <h2 className={sectionTitle}>{title}</h2>
      <ul className="card divide-y divide-slate-100 overflow-hidden dark:divide-slate-800">{children}</ul>
    </section>
  );
}

function MenuLink({ to, end, label, Icon }: { to: string; end?: boolean; label: string; Icon: IconType }) {
  return (
    <li>
      <NavLink to={to} end={end} className={({ isActive }) => (isActive ? activeRowClass : rowClass)}>
        <Icon className="shrink-0" />
        <span className="flex-1">{label}</span>
        <ChevronRightIcon className="text-slate-400" />
      </NavLink>
    </li>
  );
}

/** Phone/tablet menu, organised into sections: profile, navigation, settings, legal, then company credit. */
function MobileMenu({ links, onClose }: { links: NavItem[]; onClose: () => void }) {
  const { user, logout } = useAuth();
  const { sync } = useTasks();
  const navigate = useNavigate();
  const panel = useRef<HTMLDivElement>(null);
  useDialog(panel, onClose, 'button[data-close]');

  const onLogout = async () => {
    if (
      sync.pending > 0 &&
      !window.confirm(`You have ${sync.pending} change(s) that haven't synced yet. Log out anyway and lose them?`)
    ) {
      return;
    }
    onClose();
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        id="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        tabIndex={-1}
        className="safe-top safe-bottom absolute inset-y-0 right-0 flex w-[88%] max-w-sm flex-col bg-slate-50 shadow-2xl dark:bg-slate-950"
      >
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          <AppWordmark size={32} />
          <button type="button" data-close className="btn-ghost" aria-label="Close menu" onClick={onClose}>
            <CloseIcon width={24} height={24} />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4 [&>*]:shrink-0">
          {user ? (
            <ProfileCard name={user.name} email={user.email} />
          ) : (
            <div className="card space-y-3 p-4 text-center">
              <p className="font-semibold">Welcome to {APP_NAME}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Capture tasks by voice or typing — online or offline.</p>
              <div className="grid gap-2">
                <Link to="/signup" className="btn-primary">
                  Create free account
                </Link>
                <Link to="/login" className="btn-secondary">
                  Log in
                </Link>
              </div>
            </div>
          )}

          {links.length > 0 && (
            <MenuSection title="Navigate">
              {links.map((l) => (
                <MenuLink key={l.to} {...l} />
              ))}
            </MenuSection>
          )}

          <section aria-label="Settings">
            <h2 className={sectionTitle}>Settings</h2>
            <div className="card p-3">
              <p className="mb-2 px-1 text-sm font-medium text-slate-700 dark:text-slate-200">Theme</p>
              <ThemeToggle labeled />
            </div>
          </section>

          <MenuSection title="Legal & about">
            <MenuLink to="/privacy" label="Privacy Policy" Icon={ShieldIcon} />
            <MenuLink to="/terms" label="Terms of Service" Icon={FileTextIcon} />
            <li>
              <a href={COMPANY_SITE_URL} target="_blank" rel="noopener noreferrer" className={rowClass}>
                <GlobeIcon className="shrink-0" />
                <span className="flex-1">DewanTech.com</span>
                <ExternalIcon className="text-slate-400" width={18} height={18} />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
          </MenuSection>

          {user && (
            <button
              type="button"
              onClick={() => void onLogout()}
              className="card flex min-h-[52px] items-center justify-center gap-2 font-semibold text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              <LogoutIcon /> Log out
            </button>
          )}

          <div className="mt-auto border-t border-slate-200 pt-4 dark:border-slate-800">
            <CompanyCredit compact />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Avatar, name and email, plus sync status with a "Sync now" button. */
function ProfileCard({ name, email }: { name: string; email: string }) {
  const { store, sync } = useTasks();
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join('') || '?';

  const busy = sync.status === 'syncing';
  const plural = (n: number) => `${n} change${n > 1 ? 's' : ''}`;
  const label =
    sync.status === 'syncing'
      ? 'Syncing…'
      : sync.status === 'offline'
        ? sync.pending
          ? `Offline · ${plural(sync.pending)} waiting`
          : 'Offline'
        : sync.status === 'error'
          ? 'Sync problem'
          : sync.pending
            ? `${plural(sync.pending)} to sync`
            : 'All changes synced';
  const tone =
    sync.status === 'offline'
      ? 'text-amber-700 dark:text-amber-400'
      : sync.status === 'error'
        ? 'text-red-600 dark:text-red-400'
        : 'text-success-600 dark:text-success-500';

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <span
          aria-hidden
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-900 text-lg font-bold text-white"
        >
          {initials}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold">{name}</p>
          <p className="truncate text-sm text-slate-500 dark:text-slate-400">{email}</p>
        </div>
      </div>
      {store && (
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-2 dark:border-slate-800 dark:bg-slate-800/40">
          <span
            className={`flex min-w-0 items-center gap-2 text-sm font-medium ${tone}`}
            aria-live="polite"
            title={sync.lastSyncedAt ? `Last synced ${new Date(sync.lastSyncedAt).toLocaleString()}` : undefined}
          >
            {busy ? (
              <Spinner className="h-4 w-4" label="Syncing" />
            ) : sync.status === 'offline' || sync.status === 'error' ? (
              <CloudOffIcon width={18} height={18} />
            ) : (
              <CloudIcon width={18} height={18} />
            )}
            <span className="truncate">{label}</span>
          </span>
          <button
            type="button"
            className="btn-ghost min-h-[40px] gap-1.5 px-2 text-sm"
            disabled={busy}
            onClick={() => void store.syncNow()}
          >
            <RefreshIcon width={16} height={16} /> Sync now
          </button>
        </div>
      )}
    </div>
  );
}
