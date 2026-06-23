import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ok, err } from 'neverthrow';
import { chatHandler } from './handler';
import type { Session } from '@cineai/shared/types/session';
import type { MovieRecommendation } from '@cineai/shared/types/movie';

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
  firstOpenedAt: '2026-06-01T00:00:00.000Z',
  lastActiveAt:  '2026-06-01T00:00:00.000Z',
  openCount:     2,
  requestCount:  3,
  maxRequests:   20,
  watchlist:     [],
  history:       [],
};

const mockMovie: MovieRecommendation = {
  tmdbId: '', title: 'Mulholland Drive', year: 2001, rating: 8.0,
  poster: '', runtime: 147, genres: [], director: 'David Lynch',
  cast: [], overview: '', reasoning: 'This will challenge you.',
};

const mockSessionClient = {
  get:    vi.fn(),
  put:    vi.fn(),
  update: vi.fn().mockResolvedValue(ok(undefined)),
};

const mockClaudeClient = {
  chat:     vi.fn(),
  surprise: vi.fn(),
  opener:   vi.fn(),
};

// By default TMDB fails — enrichMovie falls back to Claude's data
const mockTMDBClient = {
  search: vi.fn().mockResolvedValue(err('MOVIE_NOT_FOUND')),
};

const makeEvent = (body: object, session: Session = mockSession) =>
  ({ session, body: JSON.stringify(body), queryStringParameters: { token: 'tok_abc' } }) as any;

const handler = () => chatHandler(mockSessionClient as any, mockClaudeClient as any, mockTMDBClient as any);

describe('chatHandler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 200 with Claude response on a valid message', async () => {
    mockClaudeClient.chat.mockResolvedValue(ok({ type: 'conversation', message: 'Great pick!' }));
    const response = await handler()(makeEvent({ message: 'Suggest something' }));
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).type).toBe('conversation');
  });

  it('returns 429 when the session budget is exhausted', async () => {
    const exhausted = { ...mockSession, requestCount: 20, maxRequests: 20 };
    const response = await handler()(makeEvent({ message: 'One more?' }, exhausted));
    expect(response.statusCode).toBe(429);
    expect(mockClaudeClient.chat).not.toHaveBeenCalled();
  });

  it('calls surprise() when surprise flag is set', async () => {
    mockClaudeClient.surprise.mockResolvedValue(ok({ type: 'surprise', movie: mockMovie, reasoning: 'Bold pick.' }));
    const response = await handler()(makeEvent({ surprise: true }));
    expect(response.statusCode).toBe(200);
    expect(mockClaudeClient.surprise).toHaveBeenCalled();
    expect(mockClaudeClient.chat).not.toHaveBeenCalled();
  });

  it('returns 502 when Claude fails', async () => {
    mockClaudeClient.chat.mockResolvedValue(err('API_ERROR' as const));
    const response = await handler()(makeEvent({ message: 'Hello' }));
    expect(response.statusCode).toBe(502);
  });

  it('increments requestCount after a successful response', async () => {
    mockClaudeClient.chat.mockResolvedValue(ok({ type: 'conversation', message: 'Sure!' }));
    await handler()(makeEvent({ message: 'Hello' }));
    expect(mockSessionClient.update).toHaveBeenCalledWith(
      'tok_abc',
      expect.objectContaining({ requestCount: 4 }),
    );
  });

  it('returns 400 when message exceeds the character limit', async () => {
    const response = await handler()(makeEvent({ message: 'x'.repeat(501) }));
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).error).toBe('MESSAGE_TOO_LONG');
    expect(mockClaudeClient.chat).not.toHaveBeenCalled();
  });

  it('enriches movie posters from TMDB on recommendations', async () => {
    const tmdbMovie = { ...mockMovie, tmdbId: '777', poster: 'https://image.tmdb.org/t/p/w500/abc.jpg', runtime: 147, genres: ['Drama'] };
    mockTMDBClient.search.mockResolvedValue(ok(tmdbMovie));
    mockClaudeClient.chat.mockResolvedValue(ok({ type: 'recommendations', message: 'Here you go.', movies: [mockMovie] }));
    const response = await handler()(makeEvent({ message: 'Suggest something' }));
    const body = JSON.parse(response.body);
    expect(body.movies[0].poster).toBe('https://image.tmdb.org/t/p/w500/abc.jpg');
    expect(body.movies[0].tmdbId).toBe('777');
    expect(body.movies[0].reasoning).toBe(mockMovie.reasoning);
  });

  it('passes mood from the request body to claudeClient.chat', async () => {
    mockClaudeClient.chat.mockResolvedValue(ok({ type: 'conversation', message: 'Sure!' }));
    const mood = { label: 'Exhausted', raw: 'pretty exhausted', capturedAt: '2026-06-22T00:00:00.000Z' };
    await handler()(makeEvent({ message: 'Hello', mood }));
    expect(mockClaudeClient.chat).toHaveBeenCalledWith(mockSession, mockSession.history, 'Hello', mood);
  });

  it('falls back to a default mood when none is provided in the body', async () => {
    mockClaudeClient.chat.mockResolvedValue(ok({ type: 'conversation', message: 'Sure!' }));
    await handler()(makeEvent({ message: 'Hello' }));
    expect(mockClaudeClient.chat).toHaveBeenCalledWith(
      mockSession, mockSession.history, 'Hello',
      expect.objectContaining({ label: 'curious' }),
    );
  });

  it('calls opener() when the opener flag is set, without requiring a message', async () => {
    mockClaudeClient.opener.mockResolvedValue(ok({ type: 'conversation', message: 'How are you feeling today?' }));
    const response = await handler()(makeEvent({ opener: true }));
    expect(response.statusCode).toBe(200);
    expect(mockClaudeClient.opener).toHaveBeenCalledWith(mockSession, mockSession.history);
    expect(mockClaudeClient.chat).not.toHaveBeenCalled();
    expect(mockClaudeClient.surprise).not.toHaveBeenCalled();
  });

  it('stores a synthetic user turn for opener requests', async () => {
    mockClaudeClient.opener.mockResolvedValue(ok({ type: 'conversation', message: 'How are you feeling today?' }));
    await handler()(makeEvent({ opener: true }));
    expect(mockSessionClient.update).toHaveBeenCalledWith(
      'tok_abc',
      expect.objectContaining({
        history: expect.arrayContaining([{ role: 'user', content: 'Returned to the app.', visit: mockSession.openCount }]),
      }),
    );
  });

  it("stamps stored messages with the session's current openCount as visit", async () => {
    mockClaudeClient.chat.mockResolvedValue(ok({ type: 'conversation', message: 'Sure!' }));
    await handler()(makeEvent({ message: 'Hello' }));
    expect(mockSessionClient.update).toHaveBeenCalledWith(
      'tok_abc',
      expect.objectContaining({
        history: [
          { role: 'user', content: 'Hello', visit: mockSession.openCount },
          { role: 'assistant', content: expect.any(String), visit: mockSession.openCount },
        ],
      }),
    );
  });
});
