import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ok } from 'neverthrow';
import { sessionHandler } from './handler';
import type { Session, WatchlistEntry } from '@cineai/shared/types/session';

const mockSession: Session = {
  token:         'tok_abc',
  name:          'Sarah Chen',
  company:       'Stripe',
  role:          'Engineering Manager',
  domain:        'stripe.com',
  logoUrl:       'https://logo.clearbit.com/stripe.com',
  createdAt:     '2026-06-01T00:00:00.000Z',
  expiresAt:     '2026-07-01T00:00:00.000Z',
  ttl:           1751328000,
  firstOpenedAt: null,
  lastActiveAt:  null,
  openCount:     0,
  requestCount:  3,
  maxRequests:   20,
  watchlist:     [],
  history:       [],
};

const mockClient = {
  get:    vi.fn(),
  put:    vi.fn(),
  update: vi.fn().mockResolvedValue(ok(undefined)),
};

const makeEvent = (session: Session = mockSession, method = 'GET', body?: object) => ({
  session,
  queryStringParameters: { token: 'tok_abc' },
  requestContext: { http: { method } },
  body: body ? JSON.stringify(body) : undefined,
}) as any;

describe('sessionHandler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 200 with session data', async () => {
    const response = await sessionHandler(mockClient as any)(makeEvent());
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.name).toBe('Sarah Chen');
    expect(body.requestCount).toBe(3);
    expect(body.maxRequests).toBe(20);
  });

  it('sets firstOpenedAt on first visit', async () => {
    await sessionHandler(mockClient as any)(makeEvent());
    expect(mockClient.update).toHaveBeenCalledWith(
      'tok_abc',
      expect.objectContaining({ firstOpenedAt: expect.any(String) }),
    );
  });

  it('does not overwrite firstOpenedAt on return visit', async () => {
    const returning = { ...mockSession, firstOpenedAt: '2026-06-10T00:00:00.000Z', openCount: 2 };
    await sessionHandler(mockClient as any)(makeEvent(returning));
    expect(mockClient.update).toHaveBeenCalledWith(
      'tok_abc',
      expect.not.objectContaining({ firstOpenedAt: expect.anything() }),
    );
  });

  it('increments openCount on every visit', async () => {
    const session = { ...mockSession, openCount: 4 };
    await sessionHandler(mockClient as any)(makeEvent(session));
    expect(mockClient.update).toHaveBeenCalledWith(
      'tok_abc',
      expect.objectContaining({ openCount: 5 }),
    );
  });

  const inception: WatchlistEntry = { tmdbId: '27205', title: 'Inception', poster: '/inc.jpg', year: 2010, rating: 8.8, runtime: 148, genres: ['Action'], overview: 'A thief who steals corporate secrets.', director: 'Christopher Nolan', cast: ['Leonardo DiCaprio'] };
  const parasite:  WatchlistEntry = { tmdbId: '496243', title: 'Parasite',  poster: '/par.jpg', year: 2019, rating: 8.5, runtime: 132, genres: ['Thriller'], overview: 'A tale of two families.', director: 'Bong Joon-ho', cast: ['Song Kang-ho'] };

  it('PATCH adds an entry to the watchlist', async () => {
    const response = await sessionHandler(mockClient as any)(
      makeEvent(mockSession, 'PATCH', { entry: inception }),
    );
    expect(response.statusCode).toBe(200);
    const { watchlist } = JSON.parse(response.body);
    expect(watchlist).toContainEqual(inception);
    expect(mockClient.update).toHaveBeenCalledWith(
      'tok_abc',
      expect.objectContaining({ watchlist: [inception] }),
    );
  });

  it('PATCH removes an entry that is already in the watchlist', async () => {
    const session = { ...mockSession, watchlist: [inception, parasite] };
    const response = await sessionHandler(mockClient as any)(
      makeEvent(session, 'PATCH', { entry: inception }),
    );
    expect(response.statusCode).toBe(200);
    const { watchlist } = JSON.parse(response.body);
    expect(watchlist).not.toContainEqual(inception);
    expect(watchlist).toContainEqual(parasite);
  });

  it('PATCH returns 400 when entry is missing', async () => {
    const response = await sessionHandler(mockClient as any)(
      makeEvent(mockSession, 'PATCH', {}),
    );
    expect(response.statusCode).toBe(400);
  });

  it('GET returns the full history, spanning every past visit', async () => {
    const session = {
      ...mockSession,
      openCount: 2,
      history: [
        { role: 'user' as const, content: 'Two visits ago', visit: 1 },
        { role: 'assistant' as const, content: 'Two visits ago reply', visit: 1 },
        { role: 'user' as const, content: 'Last visit', visit: 2 },
        { role: 'assistant' as const, content: 'Last visit reply', visit: 2 },
      ],
    };
    const response = await sessionHandler(mockClient as any)(makeEvent(session));
    const body = JSON.parse(response.body);
    expect(body.history).toEqual(session.history);
  });

  it('GET returns an empty history on a first visit', async () => {
    const response = await sessionHandler(mockClient as any)(makeEvent(mockSession));
    const body = JSON.parse(response.body);
    expect(body.history).toEqual([]);
  });
});
