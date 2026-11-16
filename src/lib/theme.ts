import { useState, useEffect } from 'react';

export type ThemeMode = 'system' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'stator_theme';
export const FALLBACK_THEME_STORAGE_KEY = 'omniconvert_theme';

export function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  try {
    const saved =
      localStorage.getItem(THEME_STORAGE_KEY) ||
      localStorage.getItem(FALLBACK_THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
  } catch (err) {
    console.warn('Unable to read theme from localStorage:', err);
  }
  return 'system';
}

function updateMetaThemeColor(isDark: boolean) {
  if (typeof document === 'undefined') return;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', isDark ? '#0D0E11' : '#F5F6F7');
  }
}

export function applyTheme(theme: ThemeMode): boolean {
  if (typeof document === 'undefined') return false;

  const root = document.documentElement;
  const prefersDark =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);

  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  updateMetaThemeColor(isDark);
  return isDark;
}

export function isDarkActive(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains('dark');
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(() => getStoredTheme());
  const [isDark, setIsDark] = useState<boolean>(() => isDarkActive());

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (err) {
      console.warn('Unable to persist theme to localStorage:', err);
    }
    const darkNow = applyTheme(newTheme);
    setIsDark(darkNow);
  };

  const toggleTheme = () => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.add('theme-transition');
    const currentIsDark = root.classList.contains('dark');
    const nextTheme: ThemeMode = currentIsDark ? 'light' : 'dark';
    setTheme(nextTheme);
    window.setTimeout(() => {
      root.classList.remove('theme-transition');
    }, 240);
  };

  useEffect(() => {
    const darkNow = applyTheme(theme);
    setIsDark(darkNow);

    if (theme !== 'system' || typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        document.documentElement.classList.add('dark');
        setIsDark(true);
        updateMetaThemeColor(true);
      } else {
        document.documentElement.classList.remove('dark');
        setIsDark(false);
        updateMetaThemeColor(false);
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [theme]);

  return { theme, setTheme, toggleTheme, isDark };
}
