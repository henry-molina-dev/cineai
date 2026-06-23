import { useTheme } from '../hooks/useTheme';

export default function ThemeToggle() {
  const { resolved, toggle } = useTheme();

  return (
    <button
      aria-label="Toggle theme"
      onClick={toggle}
      style={{
        fontSize: 14,
        color: 'var(--color-ink-muted)',
        padding: 'var(--space-1) var(--space-2)',
      }}
    >
      {resolved === 'dark' ? '☀' : '☾'}
    </button>
  );
}
