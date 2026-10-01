import { useTheme, type ThemePref } from '../context/ThemeContext';
import { MonitorIcon, MoonIcon, SunIcon } from './Icons';

const options: { value: ThemePref; label: string; Icon: typeof SunIcon }[] = [
  { value: 'light', label: 'Light theme', Icon: SunIcon },
  { value: 'dark', label: 'Dark theme', Icon: MoonIcon },
  { value: 'system', label: 'Use system theme', Icon: MonitorIcon },
];

export function ThemeToggle() {
  const { pref, setPref } = useTheme();
  return (
    <div role="group" aria-label="Color theme" className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
      {options.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          aria-label={label}
          title={label}
          aria-pressed={pref === value}
          onClick={() => setPref(value)}
          className={`flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg transition-colors ${
            pref === value
              ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-600 dark:text-white'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Icon />
        </button>
      ))}
    </div>
  );
}
