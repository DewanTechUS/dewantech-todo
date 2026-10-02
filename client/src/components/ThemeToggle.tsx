import { useTheme, type ThemePref } from '../context/ThemeContext';
import { MonitorIcon, MoonIcon, SunIcon } from './Icons';

const options: { value: ThemePref; label: string; short: string; Icon: typeof SunIcon }[] = [
  { value: 'light', label: 'Light theme', short: 'Light', Icon: SunIcon },
  { value: 'dark', label: 'Dark theme', short: 'Dark', Icon: MoonIcon },
  { value: 'system', label: 'Use system theme', short: 'Auto', Icon: MonitorIcon },
];

/** Light / dark / system switch. `labeled` shows text under each icon and fills the width (used in the mobile menu). */
export function ThemeToggle({ labeled = false }: { labeled?: boolean }) {
  const { pref, setPref } = useTheme();
  return (
    <div
      role="group"
      aria-label="Color theme"
      className={`rounded-xl bg-slate-100 p-1 dark:bg-slate-800 ${labeled ? 'grid w-full grid-cols-3 gap-1' : 'inline-flex'}`}
    >
      {options.map(({ value, label, short, Icon }) => (
        <button
          key={value}
          type="button"
          aria-label={label}
          title={label}
          aria-pressed={pref === value}
          onClick={() => setPref(value)}
          className={`flex items-center justify-center rounded-lg transition-colors ${
            labeled ? 'min-h-touch gap-2 text-sm font-medium' : 'min-h-[40px] min-w-[40px]'
          } ${
            pref === value
              ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-600 dark:text-white'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Icon />
          {labeled && <span aria-hidden>{short}</span>}
        </button>
      ))}
    </div>
  );
}
