import type { WatchlistEntry, MovieRecommendation } from '../types';

type Props = {
  watchlist: WatchlistEntry[];
  onClose:   () => void;
  onRemove:  (entry: WatchlistEntry) => void;
  onSelect:  (movie: MovieRecommendation) => void;
};

const toMovie = (entry: WatchlistEntry): MovieRecommendation => ({
  tmdbId:    entry.tmdbId,
  title:     entry.title,
  poster:    entry.poster,
  year:      entry.year,
  rating:    entry.rating,
  runtime:   entry.runtime,
  genres:    entry.genres,
  overview:  entry.overview,
  director:  entry.director,
  cast:      entry.cast,
  reasoning: '',
});

export default function WatchlistSheet({ watchlist, onClose, onRemove, onSelect }: Props) {
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(28,25,23,0.5)',
          zIndex: 10,
        }}
      />

      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--color-bg)',
        borderRadius: '12px 12px 0 0',
        padding: 'var(--space-6)',
        zIndex: 11,
        maxHeight: '75dvh',
        overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 400 }}>
            Watchlist
          </h2>
          <button
            aria-label="Close"
            onClick={onClose}
            style={{ fontSize: 20, color: 'var(--color-ink-muted)', padding: 'var(--space-1)' }}
          >
            ×
          </button>
        </div>

        {watchlist.length === 0 ? (
          <p style={{ color: 'var(--color-ink-muted)', fontStyle: 'italic', textAlign: 'center', padding: 'var(--space-8) 0' }}>
            Your watchlist is empty — save a film by tapping ☆ on any recommendation.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {watchlist.map(entry => (
              <div
                key={entry.tmdbId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-4)',
                  padding: 'var(--space-3)',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                }}
                onClick={() => onSelect(toMovie(entry))}
              >
                {entry.poster && (
                  <img
                    src={entry.poster}
                    alt={entry.title}
                    style={{ width: 40, height: 60, objectFit: 'cover', borderRadius: 'var(--radius)', flexShrink: 0 }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 500, fontSize: 15, color: 'var(--color-ink)' }}>{entry.title}</p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-ink-faint)', marginTop: 'var(--space-1)' }}>
                    {entry.year}{entry.rating ? ` · ${entry.rating.toFixed(1)}` : ''}
                  </p>
                </div>
                <button
                  aria-label="Remove from watchlist"
                  onClick={e => { e.stopPropagation(); onRemove(entry); }}
                  style={{
                    fontSize: 18,
                    color: 'var(--color-accent)',
                    padding: 'var(--space-1)',
                    flexShrink: 0,
                  }}
                >
                  ★
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
