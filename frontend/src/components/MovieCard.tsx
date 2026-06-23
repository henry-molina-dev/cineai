import type { MovieRecommendation, WatchlistEntry } from '../types';

type Props = {
  movie:             MovieRecommendation;
  onSelect:          (movie: MovieRecommendation) => void;
  isInWatchlist:     boolean;
  onToggleWatchlist: (entry: WatchlistEntry) => void;
};

export default function MovieCard({ movie, onSelect, isInWatchlist, onToggleWatchlist }: Props) {
  return (
    <button
      onClick={() => onSelect(movie)}
      style={{
        display: 'flex',
        gap: 'var(--space-4)',
        padding: 'var(--space-4)',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius)',
        textAlign: 'left',
        width: '100%',
        transition: 'border-color var(--ease)',
      }}
    >
      {movie.poster && (
        <img
          src={movie.poster}
          alt={movie.title}
          style={{ width: 56, height: 84, objectFit: 'cover', borderRadius: 'var(--radius)', flexShrink: 0 }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 500, fontSize: 15, color: 'var(--color-ink)', marginBottom: 'var(--space-1)' }}>
          {movie.title}
        </p>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-ink-faint)', marginBottom: 'var(--space-2)' }}>
          {movie.year} · {movie.rating.toFixed(1)}
        </p>
        <p style={{ fontSize: 13, color: 'var(--color-ink-muted)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {movie.reasoning}
        </p>
      </div>
      <button
        aria-label={isInWatchlist ? 'Remove from watchlist' : 'Save to watchlist'}
        onClick={e => { e.stopPropagation(); onToggleWatchlist({ tmdbId: movie.tmdbId, title: movie.title, poster: movie.poster, year: movie.year, rating: movie.rating, runtime: movie.runtime, genres: movie.genres, overview: movie.overview, director: movie.director, cast: movie.cast }); }}
        style={{
          alignSelf: 'flex-start',
          flexShrink: 0,
          fontSize: 18,
          color: isInWatchlist ? 'var(--color-accent)' : 'var(--color-ink-faint)',
          padding: 'var(--space-1)',
          transition: 'color var(--ease)',
        }}
      >
        {isInWatchlist ? '★' : '☆'}
      </button>
    </button>
  );
}
