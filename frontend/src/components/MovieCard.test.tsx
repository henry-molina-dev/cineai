import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MovieCard from './MovieCard';
import type { MovieRecommendation } from '../types';

const movie: MovieRecommendation = {
  tmdbId: '496243', title: 'Parasite', year: 2019, rating: 8.5,
  poster: '/parasite.jpg', runtime: 132, genres: ['Thriller', 'Comedy'],
  director: 'Bong Joon-ho', cast: ['Song Kang-ho'], overview: 'A tale of...', reasoning: 'Because you seem tense.',
};

describe('MovieCard', () => {
  it('renders title and year', () => {
    render(<MovieCard movie={movie} onSelect={vi.fn()} isInWatchlist={false} onToggleWatchlist={vi.fn()} />);
    expect(screen.getByText('Parasite')).toBeInTheDocument();
    expect(screen.getByText(/2019/)).toBeInTheDocument();
  });

  it('renders rating', () => {
    render(<MovieCard movie={movie} onSelect={vi.fn()} isInWatchlist={false} onToggleWatchlist={vi.fn()} />);
    expect(screen.getByText(/8\.5/)).toBeInTheDocument();
  });

  it('calls onSelect with the movie when clicked', () => {
    const onSelect = vi.fn();
    render(<MovieCard movie={movie} onSelect={onSelect} isInWatchlist={false} onToggleWatchlist={vi.fn()} />);
    fireEvent.click(screen.getByText('Parasite'));
    expect(onSelect).toHaveBeenCalledWith(movie);
  });
});
