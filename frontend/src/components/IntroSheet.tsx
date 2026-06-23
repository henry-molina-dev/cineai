type Props = {
  onDismiss: () => void;
};

const TIPS = [
  { label: 'Talk naturally', body: "Ask for recommendations, describe a mood, or say what didn't land." },
  { label: 'Save what catches your eye', body: 'Tap ☆ on any film to add it to your watchlist — Claude remembers it.' },
  { label: 'Stuck? Hit Surprise Me', body: 'One bold, unexpected pick — no clarifying questions.' },
];

export default function IntroSheet({ onDismiss }: Props) {
  return (
    <>
      <div
        onClick={onDismiss}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(28,25,23,0.5)',
          zIndex: 30,
        }}
      />

      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--color-bg)',
        borderRadius: '12px 12px 0 0',
        padding: 'var(--space-6)',
        zIndex: 31,
      }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, marginBottom: 'var(--space-6)' }}>
          A few things to know
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
          {TIPS.map(tip => (
            <p key={tip.label} style={{ fontSize: 14, color: 'var(--color-ink-muted)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--color-accent)' }}>{tip.label}</strong> — {tip.body}
            </p>
          ))}
        </div>

        <button
          onClick={onDismiss}
          style={{
            width: '100%',
            padding: 'var(--space-3) var(--space-4)',
            background: 'var(--color-accent)',
            color: '#fff',
            borderRadius: 'var(--radius)',
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          Got it
        </button>
      </div>
    </>
  );
}
