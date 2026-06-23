import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SessionProvider, useSession } from './SessionContext';
import type { SessionData } from '../types';

const session: SessionData = {
  name: 'Sarah', company: 'Stripe', logoUrl: 'https://logo.clearbit.com/stripe.com',
  watchlist: [], openCount: 1, requestCount: 0, maxRequests: 20, expiresAt: '2026-07-17T00:00:00.000Z', isFirstVisit: true, history: [],
};

type ClientOverrides = { getSession?: ReturnType<typeof vi.fn> };

const makeClient = (overrides?: ClientOverrides) => ({
  getSession:      vi.fn().mockResolvedValue(session),
  sendChat:        vi.fn(),
  sendSurprise:    vi.fn(),
  sendOpener:      vi.fn(),
  searchMovies:    vi.fn(),
  toggleWatchlist: vi.fn(),
  ...overrides,
});

function Inspector() {
  const { session: s, isLoading, error } = useSession();
  if (isLoading) return <div>loading</div>;
  if (error)     return <div>error: {error}</div>;
  return <div>name: {s?.name}</div>;
}

describe('SessionProvider', () => {
  it('shows loading then renders session data', async () => {
    const client = makeClient();
    render(
      <SessionProvider apiClient={client as any} token="tok-1">
        <Inspector />
      </SessionProvider>,
    );

    expect(screen.getByText('loading')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('name: Sarah')).toBeInTheDocument());
    expect(client.getSession).toHaveBeenCalledWith('tok-1');
  });

  it('shows error when getSession rejects', async () => {
    const client = makeClient({ getSession: vi.fn().mockRejectedValue(new Error('Failed')) });
    render(
      <SessionProvider apiClient={client as any} token="bad">
        <Inspector />
      </SessionProvider>,
    );

    await waitFor(() => expect(screen.getByText(/error/)).toBeInTheDocument());
  });

  it('starts with no mood, even on a return visit', async () => {
    const returnVisit = { ...session, isFirstVisit: false };
    const client = makeClient({ getSession: vi.fn().mockResolvedValue(returnVisit) });

    function MoodInspector() {
      const { mood, isLoading } = useSession();
      if (isLoading) return <div>loading</div>;
      return <div>mood: {mood?.label ?? 'none'}</div>;
    }

    render(
      <SessionProvider apiClient={client as any} token="tok-2">
        <MoodInspector />
      </SessionProvider>,
    );

    await waitFor(() => expect(screen.getByText('mood: none')).toBeInTheDocument());
  });

  it('setMood updates local state only, with no backend persistence', async () => {
    const client = makeClient();
    const newMood = { label: 'Playful', raw: 'playful', capturedAt: '2026-06-21T08:00:00.000Z' };

    function MoodSetter() {
      const { mood, setMood } = useSession();
      return (
        <div>
          <div>mood: {mood?.label ?? 'none'}</div>
          <button onClick={() => setMood(newMood)}>select</button>
        </div>
      );
    }

    render(
      <SessionProvider apiClient={client as any} token="tok-1">
        <MoodSetter />
      </SessionProvider>,
    );

    await waitFor(() => expect(screen.getByText('mood: none')).toBeInTheDocument());
    screen.getByText('select').click();

    await waitFor(() => expect(screen.getByText('mood: Playful')).toBeInTheDocument());
    expect(client.sendChat).not.toHaveBeenCalled();
  });
});
