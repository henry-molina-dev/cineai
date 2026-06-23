type Props = { used: number; max: number };

export default function BudgetBadge({ used, max }: Props) {
  const remaining = max - used;
  const isWarning = remaining <= 3;

  return (
    <span style={{
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      color: isWarning ? 'var(--color-accent)' : 'var(--color-ink-faint)',
    }}>
      {remaining} of {max} messages remaining
    </span>
  );
}
