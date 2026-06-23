import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'cineai-theme';

const readStoredOverride = (): Theme | null => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : null;
};

export function useTheme() {
  const [override, setOverride] = useState<Theme | null>(readStoredOverride);
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  );

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (override) {
      document.documentElement.setAttribute('data-theme', override);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [override]);

  const resolved: Theme = override ?? (systemPrefersDark ? 'dark' : 'light');

  const toggle = () => {
    const next: Theme = resolved === 'dark' ? 'light' : 'dark';
    localStorage.setItem(STORAGE_KEY, next);
    setOverride(next);
  };

  return { resolved, toggle };
}
