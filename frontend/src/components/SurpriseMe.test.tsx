import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SurpriseMe from './SurpriseMe';
import type { MovieRecommendation } from '../types';

const movie: MovieRecommendation = {
  tmdbId: '1', title: 'Stalker', year: 1979, rating: 8.1,
  poster: '/stalker.jpg', runtime: 163, genres: ['Drama', 'Sci-Fi'],
  director: 'Andrei Tarkovsky', cast: ['Aleksandr Kaydanovskiy'],
  overview: 'A guide leads two men into a forbidden zone.', reasoning: 'You need something that stays with you.',
};

describe('SurpriseMe', () => {
  it('renders the movie title and reasoning', () => {
    render(<SurpriseMe movie={movie} reasoning="You need something that stays with you." isLoading={false} isExhausted={false} onClose={vi.fn()} onSurpriseAgain={vi.fn()} />);
    expect(screen.getByText('Stalker')).toBeInTheDocument();
    expect(screen.getByText('You need something that stays with you.')).toBeInTheDocument();
  });

  it('calls onClose when dismissed', () => {
    const onClose = vi.fn();
    render(<SurpriseMe movie={movie} reasoning="..." isLoading={false} isExhausted={false} onClose={onClose} onSurpriseAgain={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /love it/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onSurpriseAgain when surprise again is clicked', () => {
    const onSurpriseAgain = vi.fn();
    render(<SurpriseMe movie={movie} reasoning="..." isLoading={false} isExhausted={false} onClose={vi.fn()} onSurpriseAgain={onSurpriseAgain} />);
    fireEvent.click(screen.getByRole('button', { name: /surprise me again/i }));
    expect(onSurpriseAgain).toHaveBeenCalledOnce();
  });

  it('disables both buttons and hides the label while loading', () => {
    render(<SurpriseMe movie={movie} reasoning="..." isLoading={true} isExhausted={false} onClose={vi.fn()} onSurpriseAgain={vi.fn()} />);
    expect(screen.getByRole('button', { name: /surprise me again/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /love it/i })).toBeDisabled();
    expect(screen.queryByText('Surprise me again')).not.toBeInTheDocument();
  });

  it('disables "Surprise me again" and explains why when the budget is exhausted', () => {
    render(<SurpriseMe movie={movie} reasoning="..." isLoading={false} isExhausted={true} onClose={vi.fn()} onSurpriseAgain={vi.fn()} />);
    expect(screen.getByRole('button', { name: /surprise me again/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /love it/i })).not.toBeDisabled();
    expect(screen.getByText(/that's our time for now/i)).toBeInTheDocument();
  });
});
