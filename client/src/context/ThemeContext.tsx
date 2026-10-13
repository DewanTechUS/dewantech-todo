import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { KEYS, storage } from '../lib/storage';

export type ThemePref = 'light' | 'dark' | 'system';

interface ThemeValue {
  pref: ThemePref;
  resolved: 'light' | 'dark';
  setPref: (p: ThemePref) => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

const systemDark = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(() => storage.get<ThemePref>(KEYS.theme) ?? 'system');
  const [sysDark, setSysDark] = useState<boolean>(() => !!systemDark());

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const onChange = () => setSysDark(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const resolved = pref === 'system' ? (sysDark ? 'dark' : 'light') : pref;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#0f172a' : '#012360');
    // In the iOS/Android apps, keep status-bar icons readable on the header (white in light mode, dark in dark mode).
    if (Capacitor.isNativePlatform()) {
      void SystemBars.setStyle({ style: resolved === 'dark' ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => undefined);
    }
  }, [resolved]);

  const setPref = (p: ThemePref) => {
    setPrefState(p);
    storage.set(KEYS.theme, p);
  };

  return <ThemeContext.Provider value={{ pref, resolved, setPref }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
