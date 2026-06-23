import { describe, it, expect, vi } from 'vitest';
import { makeTMDBClient } from './tmdb';

const mockFetch = (response: { ok: boolean; json?: () => Promise<unknown> }): any =>
  vi.fn().mockResolvedValue({
    ok: response.ok,
    json: response.json ?? (() => Promise.resolve({})),
  });

describe('makeTMDBClient', () => {
  describe('search', () => {
    it('returns a MovieRecommendation on success', async () => {
      const fetchFn = mockFetch({
        ok: true,
        json: () => Promise.resolve({
          results: [{
            id: 27205,
            title: 'Inception',
            release_date: '2010-07-16',
            vote_average: 8.4,
            poster_path: '/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
            overview: 'A thief who enters dreams.',
          }],
        }),
      });

      const result = await makeTMDBClient(fetchFn).search('Inception');
      expect(result.isOk()).toBe(true);
      const movie = result._unsafeUnwrap();
      expect(movie.title).toBe('Inception');
      expect(movie.year).toBe(2010);
      expect(movie.tmdbId).toBe('27205');
    });

    it('returns MOVIE_NOT_FOUND when results are empty', async () => {
      const fetchFn = mockFetch({ ok: true, json: () => Promise.resolve({ results: [] }) });
      const result = await makeTMDBClient(fetchFn).search('xyzzy');
      expect(result._unsafeUnwrapErr()).toBe('MOVIE_NOT_FOUND');
    });

    it('returns API_DOWN when fetch throws', async () => {
      const fetchFn: any = vi.fn().mockRejectedValue(new Error('network error'));
      const result = await makeTMDBClient(fetchFn).search('Inception');
      expect(result._unsafeUnwrapErr()).toBe('API_DOWN');
    });

    it('passes year as a separate query parameter when provided', async () => {
      const fetchFn = mockFetch({ ok: true, json: () => Promise.resolve({ results: [] }) });
      await makeTMDBClient(fetchFn).search('Inception', 2010);
      const calledUrl = (fetchFn as any).mock.calls[0][0] as string;
      expect(calledUrl).toContain('query=Inception');
      expect(calledUrl).toContain('year=2010');
      expect(calledUrl).not.toContain('query=Inception+2010');
    });
  });
});
