import { useEffect, useRef, useState, type ComponentType, type ReactNode, type SVGProps } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useDialog } from '../hooks/useDialog';
import { APP_NAME, COMPANY_NAME, COMPANY_SITE_URL, COPYRIGHT, SLOGAN } from '../lib/brand';
import { Avatar } from './Avatar';
import { AppWordmark, CompanyLogo } from './Brand';
import {
  ChevronRightIcon,
  CloseIcon,
  DatabaseIcon,
  ExternalIcon,
  FileTextIcon,
  GlobeIcon,
  HelpIcon,
  ListIcon,
  MenuIcon,
  ShieldIcon,
  UsersIcon,
} from './Icons';
import { ThemeToggle } from './ThemeToggle';

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

interface NavItem {
  to: string;
  label: string;
  end: boolean;
  Icon: IconType;
}

const pages: NavItem[] = [
  { to: '/', label: 'My tasks', end: true, Icon: ListIcon },
  { to: '/people', label: 'People', end: false, Icon: UsersIcon },
  { to: '/data', label: 'Backup & data', end: false, Icon: DatabaseIcon },
];

const desktopNavClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-touch items-center rounded-xl px-3 font-medium transition-colors ${
    isActive
      ? 'bg-brand-50 text-brand-700 dark:bg-slate-800 dark:text-white'
      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
  }`;

export function Header() {
  const { store, me } = useApp();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => setOpen(false), [location.pathname]);

  // The menu is for phones and tablets; close it if the window grows to desktop width.
  useEffect(() => {
    const mq = window.matchMedia?.('(min-width: 1024px)');
    if (!mq) return;
    const onChange = () => mq.matches && setOpen(false);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const switchPerson = async () => {
    setOpen(false);
    await store?.selectProfile(null);
    navigate('/', { replace: true });
  };

  return (
    <header className="safe-top sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-2">
        <Link to="/" className="mr-auto flex min-h-touch items-center rounded-xl pr-2" aria-label={`${APP_NAME} home`}>
          <AppWordmark />
        </Link>

        {me && (
          <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
            {pages.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={desktopNavClass}>
                {l.label}
              </NavLink>
            ))}
          </nav>
        )}
        <div className="hidden lg:block">
          <ThemeToggle />
        </div>
        {me && (
          <button
            type="button"
            onClick={() => void switchPerson()}
            className="hidden min-h-touch items-center gap-2 rounded-xl px-2 hover:bg-slate-100 dark:hover:bg-slate-800 lg:flex"
            title="Switch person"
            aria-label={`${me.name} — switch person`}
          >
            <Avatar profile={me} size={32} />
          </button>
        )}

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
      {open &&
        createPortal(<MobileMenu onClose={() => setOpen(false)} onSwitchPerson={() => void switchPerson()} />, document.body)}
    </header>
  );
}

const rowClass =
  'flex min-h-touch items-center gap-3 px-3 text-[15px] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800';
const activeRowClass = 'flex min-h-touch items-center gap-3 bg-brand-50 px-3 text-[15px] font-medium text-brand-700 dark:bg-slate-800 dark:text-white';

/** A group of rows in one rounded card. */
function MenuGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <ul aria-label={label} className="card divide-y divide-slate-100 overflow-hidden dark:divide-slate-800">
      {children}
    </ul>
  );
}

function MenuLink({ to, end, label, Icon }: { to: string; end?: boolean; label: string; Icon: IconType }) {
  return (
    <li>
      <NavLink to={to} end={end} className={({ isActive }) => (isActive ? activeRowClass : rowClass)}>
        <Icon className="shrink-0 text-slate-400" width={18} height={18} />
        <span className="flex-1">{label}</span>
        <ChevronRightIcon className="text-slate-300 dark:text-slate-600" width={16} height={16} />
      </NavLink>
    </li>
  );
}

/** Phone/tablet menu: who's using the app, pages, theme, help & legal, then a one-line company credit. */
function MobileMenu({ onClose, onSwitchPerson }: { onClose: () => void; onSwitchPerson: () => void }) {
  const { me, profiles } = useApp();
  const panel = useRef<HTMLDivElement>(null);
  useDialog(panel, onClose, 'button[data-close]');

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
        className="safe-top safe-bottom absolute inset-y-0 right-0 flex w-[84%] max-w-xs flex-col bg-slate-50 shadow-2xl dark:bg-slate-950"
      >
        <div className="flex items-center justify-between border-b border-slate-200 bg-white py-1.5 pl-4 pr-2 dark:border-slate-800 dark:bg-slate-900">
          <AppWordmark size={28} />
          <button type="button" data-close className="btn-ghost" aria-label="Close menu" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3 [&>*]:shrink-0">
          {me && (
            <div className="card flex items-center gap-3 py-2.5 pl-3 pr-2">
              <Avatar profile={me} size={40} />
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-[15px] font-semibold">{me.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {profiles.length > 1 ? `${profiles.length} people on this device` : 'Saved on this device'}
                </p>
              </div>
              <button type="button" className="btn-secondary min-h-[40px] px-3 text-sm" onClick={onSwitchPerson}>
                Switch
              </button>
            </div>
          )}

          {me && (
            <MenuGroup label="Pages">
              {pages.map((l) => (
                <MenuLink key={l.to} {...l} />
              ))}
            </MenuGroup>
          )}

          <div className="card flex items-center justify-between gap-2 py-1 pl-3 pr-1">
            <span className="text-[15px] font-medium text-slate-700 dark:text-slate-200">Theme</span>
            <ThemeToggle />
          </div>

          <MenuGroup label="Help and legal">
            <MenuLink to="/support" label="Help & Support" Icon={HelpIcon} />
            <MenuLink to="/privacy" label="Privacy Policy" Icon={ShieldIcon} />
            <MenuLink to="/terms" label="Terms of Service" Icon={FileTextIcon} />
            <li>
              <a href={COMPANY_SITE_URL} target="_blank" rel="noopener noreferrer" className={rowClass}>
                <GlobeIcon className="shrink-0 text-slate-400" width={18} height={18} />
                <span className="flex-1">DewanTech.com</span>
                <ExternalIcon className="text-slate-300 dark:text-slate-600" width={16} height={16} />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
          </MenuGroup>

          <div className="mt-auto pt-2 text-center text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
            <a href={COMPANY_SITE_URL} rel="noopener" className="mb-1 inline-block rounded" aria-label={`${COMPANY_NAME} website`}>
              <CompanyLogo size={24} />
            </a>
            <p>{COPYRIGHT}</p>
            <p className="italic">{SLOGAN}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
