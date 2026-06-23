import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SessionContext } from '../context/SessionContext';
import Landing from './Landing';
import type { SessionData } from '../types';

const session: SessionData = {
  name: 'Sarah', company: 'Stripe', logoUrl: 'https://img.logo.dev/stripe.com',
  watchlist: [], openCount: 1, requestCount: 0, maxRequests: 20, expiresAt: '2026-07-17T00:00:00.000Z', isFirstVisit: true, history: [],
};

vi.stubEnv('VITE_LOGO_DEV_API_KEY', 'pk_test_key');

const mockCtx = (overrides?: Partial<SessionData>) => ({
  apiClient: {} as any,
  token: 'tok-1',
  session: { ...session, ...overrides },
  mood: null,
  isLoading:       false,
  error:           null,
  setMood:         vi.fn(),
  toggleWatchlist: vi.fn(),
});

function wrap(ctx: ReturnType<typeof mockCtx>) {
  return ({ children }: { children: React.ReactNode }) => (
    <SessionContext.Provider value={ctx}>{children}</SessionContext.Provider>
  );
}

describe('Landing', () => {
  it('renders the hiring manager name', async () => {
    render(<Landing />, { wrapper: wrap(mockCtx()) });
    await waitFor(() => expect(screen.getByText(/Sarah/)).toBeInTheDocument());
  });

  it('renders company logo', async () => {
    render(<Landing />, { wrapper: wrap(mockCtx()) });
    await waitFor(() => {
      const img = screen.getByRole('img', { name: /stripe/i });
      expect(img).toHaveAttribute('src', 'https://img.logo.dev/stripe.com?token=pk_test_key&format=png&theme=light');
    });
  });

  it('calls setMood when a mood is selected', async () => {
    const ctx = mockCtx();
    const { findByText } = render(<Landing />, { wrapper: wrap(ctx) });

    const card = await findByText('Nostalgic');
    card.click();

    expect(ctx.setMood).toHaveBeenCalledWith(expect.objectContaining({ label: 'Nostalgic' }));
  });

  it('shows first-visit greeting', async () => {
    render(<Landing />, { wrapper: wrap(mockCtx()) });
    await waitFor(() => expect(screen.getByText(/expecting you/i)).toBeInTheDocument());
  });

  it('falls back to the company name when the hiring manager name is unknown', async () => {
    render(<Landing />, { wrapper: wrap(mockCtx({ name: null })) });
    await waitFor(() => expect(screen.getByText('Stripe')).toBeInTheDocument());
  });
});
