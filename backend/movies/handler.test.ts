import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ok, err } from 'neverthrow';
import { moviesHandler } from './handler';
import type { MovieRecommendation } from '@cineai/shared/types/movie';

const mockMovie: MovieRecommendation = {
  tmdbId:    '27205',
  title:     'Inception',
  year:      2010,
  rating:    8.4,
  poster:    'https://image.tmdb.org/t/p/w500/path.jpg',
  runtime:   0,
  genres:    [],
  director:  '',
  cast:      [],
  overview:  'A thief who enters dreams.',
  reasoning: '',
};

const mockTMDB = { search: vi.fn() };

const makeEvent = (query?: string) =>
  ({ queryStringParameters: query ? { query } : null }) as any;

describe('moviesHandler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 200 with movie data on success', async () => {
    mockTMDB.search.mockResolvedValue(ok(mockMovie));
    const response = await moviesHandler(mockTMDB as any)(makeEvent('Inception'));
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).title).toBe('Inception');
  });

  it('returns 400 when query parameter is missing', async () => {
    const response = await moviesHandler(mockTMDB as any)(makeEvent());
    expect(response.statusCode).toBe(400);
    expect(mockTMDB.search).not.toHaveBeenCalled();
  });

  it('returns 404 when movie is not found', async () => {
    mockTMDB.search.mockResolvedValue(err('MOVIE_NOT_FOUND' as const));
    const response = await moviesHandler(mockTMDB as any)(makeEvent('xyzzy'));
    expect(response.statusCode).toBe(404);
  });

  it('returns 502 when TMDB is down', async () => {
    mockTMDB.search.mockResolvedValue(err('API_DOWN' as const));
    const response = await moviesHandler(mockTMDB as any)(makeEvent('Inception'));
    expect(response.statusCode).toBe(502);
  });
});
