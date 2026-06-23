import type { MovieRecommendation, WatchlistEntry } from '../types';

type Props = {
  movie:             MovieRecommendation;
  onClose:           () => void;
  isInWatchlist:     boolean;
  onToggleWatchlist: (entry: WatchlistEntry) => void;
};

export default function MovieSheet({ movie, onClose, isInWatchlist, onToggleWatchlist }: Props) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(28,25,23,0.5)',
          zIndex: 10,
        }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--color-bg)',
        borderRadius: '12px 12px 0 0',
        padding: 'var(--space-6)',
        zIndex: 11,
        maxHeight: '85dvh',
        overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-6)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
            {movie.poster && (
              <img src={movie.poster} alt={movie.title} style={{ width: 80, height: 120, objectFit: 'cover', borderRadius: 'var(--radius)' }} />
            )}
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 400, marginBottom: 'var(--space-1)' }}>
                {movie.title}
              </h2>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-ink-faint)' }}>
                {movie.year}{movie.runtime ? ` · ${movie.runtime} min` : ''}{movie.rating ? ` · ${movie.rating.toFixed(1)}` : ''}
              </p>
              {movie.genres.length > 0 && (
                <p style={{ fontSize: 13, color: 'var(--color-ink-muted)', marginTop: 'var(--space-2)' }}>
                  {movie.genres.join(', ')}
                </p>
              )}
            </div>
          </div>
          <button
            aria-label="Close"
            onClick={onClose}
            style={{ fontSize: 20, color: 'var(--color-ink-muted)', padding: 'var(--space-1)' }}
          >
            ×
          </button>
        </div>

        {movie.reasoning && (
          <div style={{ borderLeft: '3px solid var(--color-accent)', paddingLeft: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
            <p style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', marginBottom: 'var(--space-2)', textTransform: 'uppercase', letterSpacing: 1 }}>
              Why CineAI picked this
            </p>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--color-ink)' }}>
              {movie.reasoning}
            </p>
          </div>
        )}

        {movie.overview && (
          <p style={{ fontSize: 14, color: 'var(--color-ink-muted)', lineHeight: 1.6, marginBottom: 'var(--space-6)' }}>
            {movie.overview}
          </p>
        )}

        {(movie.director || movie.cast.length > 0) && (
          <div style={{ fontSize: 13, color: 'var(--color-ink-muted)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {movie.director && <p><strong>Director:</strong> {movie.director}</p>}
            {movie.cast.length > 0 && <p><strong>Cast:</strong> {movie.cast.join(', ')}</p>}
          </div>
        )}

        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
          <button
            onClick={() => onToggleWatchlist({ tmdbId: movie.tmdbId, title: movie.title, poster: movie.poster, year: movie.year, rating: movie.rating, runtime: movie.runtime, genres: movie.genres, overview: movie.overview, director: movie.director, cast: movie.cast })}
            style={{
              padding: 'var(--space-3) var(--space-4)',
              background: isInWatchlist ? 'var(--color-accent-soft)' : 'var(--color-surface)',
              border: `1px solid ${isInWatchlist ? 'var(--color-accent)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius)',
              fontSize: 14,
              color: isInWatchlist ? 'var(--color-accent)' : 'var(--color-ink)',
              transition: 'all var(--ease)',
            }}
          >
            {isInWatchlist ? '★ Saved' : '☆ Save'}
          </button>
          <button
            onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(movie.title + ' streaming')}`, '_blank')}
            style={{
              padding: 'var(--space-3) var(--space-4)',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius)',
              fontSize: 14,
              color: 'var(--color-ink)',
            }}
          >
            Find where to watch
          </button>
        </div>
      </div>
    </>
  );
}
