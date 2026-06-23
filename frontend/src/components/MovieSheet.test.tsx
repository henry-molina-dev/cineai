import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MovieSheet from './MovieSheet';
import type { MovieRecommendation } from '../types';

const movie: MovieRecommendation = {
  tmdbId: '496243', title: 'Parasite', year: 2019, rating: 8.5,
  poster: '/parasite.jpg', runtime: 132, genres: ['Thriller'],
  director: 'Bong Joon-ho', cast: ['Song Kang-ho', 'Lee Sun-kyun'],
  overview: 'A tale of two families.', reasoning: 'Because you seem tense.',
};

describe('MovieSheet', () => {
  it('renders full movie details', () => {
    render(<MovieSheet movie={movie} onClose={vi.fn()} isInWatchlist={false} onToggleWatchlist={vi.fn()} />);
    expect(screen.getByText('Parasite')).toBeInTheDocument();
    expect(screen.getByText('Bong Joon-ho')).toBeInTheDocument();
    expect(screen.getByText(/132/)).toBeInTheDocument();
    expect(screen.getByText(/Thriller/)).toBeInTheDocument();
  });

  it("shows Claude's reasoning", () => {
    render(<MovieSheet movie={movie} onClose={vi.fn()} isInWatchlist={false} onToggleWatchlist={vi.fn()} />);
    expect(screen.getByText('Because you seem tense.')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<MovieSheet movie={movie} onClose={onClose} isInWatchlist={false} onToggleWatchlist={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
