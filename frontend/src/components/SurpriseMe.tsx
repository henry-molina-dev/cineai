import type { MovieRecommendation } from '../types';
import LoadingDots from './LoadingDots';

type Props = {
  movie:           MovieRecommendation;
  reasoning:       string;
  isLoading:       boolean;
  isExhausted:     boolean;
  onClose:         () => void;
  onSurpriseAgain: () => void;
};

export default function SurpriseMe({ movie, reasoning, isLoading, isExhausted, onClose, onSurpriseAgain }: Props) {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#1C1917',
      zIndex: 20,
      overflowY: 'auto',
    }}>
      <button
        aria-label="Close"
        onClick={onClose}
        style={{
          position: 'fixed', top: 'var(--space-6)', right: 'var(--space-6)',
          fontSize: 24,
          color: '#A8A29E',
          padding: 'var(--space-2)',
          zIndex: 21,
        }}
      >
        ×
      </button>

      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-8)',
        gap: 'var(--space-8)',
      }}>
        {movie.poster && (
          <img
            src={movie.poster}
            alt={movie.title}
            style={{ width: 180, height: 270, objectFit: 'cover', borderRadius: 'var(--radius)', boxShadow: '0 32px 64px rgba(0,0,0,0.5)' }}
          />
        )}

        <div style={{ textAlign: 'center', maxWidth: 480 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 400, color: '#F7F5F0', marginBottom: 'var(--space-2)' }}>
            {movie.title}
          </h2>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#78716C', marginBottom: 'var(--space-6)' }}>
            {movie.year} · {movie.director}
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: '#A8A29E' }}>
            {reasoning}
          </p>
          {isExhausted && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-accent)', marginTop: 'var(--space-4)' }}>
              That's our time for now — hope you love this one.
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button
            aria-label="I love it"
            onClick={onClose}
            disabled={isLoading}
            style={{
              padding: 'var(--space-4) var(--space-8)',
              background: 'var(--color-accent)',
              color: '#fff',
              borderRadius: 'var(--radius)',
              fontSize: 15,
              fontWeight: 500,
              opacity: isLoading ? 0.4 : 1,
            }}
          >
            I love it
          </button>
          <button
            aria-label="Surprise me again"
            onClick={onSurpriseAgain}
            disabled={isLoading || isExhausted}
            style={{
              padding: 'var(--space-4) var(--space-8)',
              background: 'transparent',
              color: 'var(--color-ink-faint)',
              border: '1px solid var(--color-ink-muted)',
              borderRadius: 'var(--radius)',
              fontSize: 15,
              minWidth: 168,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: (isLoading || isExhausted) ? 0.4 : 1,
            }}
          >
            {isLoading ? <LoadingDots color="var(--color-ink-faint)" /> : 'Surprise me again'}
          </button>
        </div>
      </div>
    </div>
  );
}
