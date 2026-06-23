import { describe, it, expect, vi } from 'vitest';
import { makeApiClient, ApiError } from './client';
import type { SessionData } from '../types';

const mockFetch = (status: number, body: unknown) =>
  vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });

const BASE = 'http://localhost:3000';

const session: SessionData = {
  name: 'Sarah', company: 'Stripe', logoUrl: 'https://logo.clearbit.com/stripe.com',
  watchlist: [], openCount: 1, requestCount: 0, maxRequests: 20, expiresAt: '2026-07-17T00:00:00.000Z', isFirstVisit: true, history: [],
};

describe('makeApiClient', () => {
  describe('getSession', () => {
    it('calls GET /session?token= and returns session data', async () => {
      const fetch = mockFetch(200, session);
      const result = await makeApiClient(BASE, fetch as any).getSession('tok-1');

      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/session?token=tok-1', undefined);
      expect(result).toEqual(session);
    });

    it('throws ApiError on non-OK response', async () => {
      const fetch = mockFetch(404, { error: 'TOKEN_NOT_FOUND' });
      await expect(makeApiClient(BASE, fetch as any).getSession('bad')).rejects.toBeInstanceOf(ApiError);
    });

    it('ApiError carries HTTP status code', async () => {
      const fetch = mockFetch(410, { error: 'TOKEN_EXPIRED' });
      await expect(makeApiClient(BASE, fetch as any).getSession('x')).rejects.toMatchObject({ status: 410 });
    });
  });

  const mood = { label: 'Relaxed', raw: 'relaxed', capturedAt: '2026-06-21T08:00:00.000Z' };

  describe('sendChat', () => {
    it('POSTs message and mood to /chat?token= and returns ClaudeResponse', async () => {
      const response = { type: 'conversation', message: 'Hello!' };
      const fetch = mockFetch(200, response);
      const result = await makeApiClient(BASE, fetch as any).sendChat('tok-1', 'What should I watch?', mood);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/chat?token=tok-1',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ message: 'What should I watch?', mood }),
        }),
      );
      expect(result).toEqual(response);
    });
  });

  describe('sendSurprise', () => {
    it('POSTs surprise flag and mood to /chat?token=', async () => {
      const fetch = mockFetch(200, { type: 'surprise', movie: {}, reasoning: 'Bold.' });
      await makeApiClient(BASE, fetch as any).sendSurprise('tok-1', mood);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/chat?token=tok-1',
        expect.objectContaining({ body: JSON.stringify({ surprise: true, mood }) }),
      );
    });
  });

  describe('sendOpener', () => {
    it('POSTs opener flag to /chat?token=', async () => {
      const fetch = mockFetch(200, { type: 'conversation', message: 'How are you feeling today?' });
      await makeApiClient(BASE, fetch as any).sendOpener('tok-1');

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/chat?token=tok-1',
        expect.objectContaining({ body: JSON.stringify({ opener: true }) }),
      );
    });
  });

  describe('searchMovies', () => {
    it('calls GET /movies?token=&query= with encoded query', async () => {
      const fetch = mockFetch(200, { tmdbId: '1', title: 'Parasite' });
      await makeApiClient(BASE, fetch as any).searchMovies('tok-1', 'Parasite & more');

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/movies?token=tok-1&query=Parasite%20%26%20more',
        undefined,
      );
    });
  });
});
