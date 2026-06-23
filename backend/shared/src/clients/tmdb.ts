import { ResultAsync, err, ok } from 'neverthrow';
import type { MovieRecommendation } from '../types/movie';
import type { TMDBError } from '../types/errors';

const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

type TMDBMovie = {
  id:            number;
  title:         string;
  release_date:  string;
  vote_average:  number;
  poster_path:   string | null;
  overview:      string;
};

export const makeTMDBClient = (fetchFn: typeof fetch) => ({

  search: (title: string, year?: number): ResultAsync<MovieRecommendation, TMDBError> => {
    const yearParam = year ? `&year=${year}` : '';
    const url = `${BASE_URL}/search/movie?query=${encodeURIComponent(title)}${yearParam}&api_key=${process.env.TMDB_API_KEY}`;

    return ResultAsync.fromPromise(
      fetchFn(url).then(res => {
        if (!res.ok) throw new Error(`TMDB ${res.status}`);
        return res.json() as Promise<{ results: TMDBMovie[] }>;
      }),
      (): TMDBError => 'API_DOWN',
    ).andThen(({ results }) => {
      if (!results || results.length === 0) return err<MovieRecommendation, TMDBError>('MOVIE_NOT_FOUND');

      const r = results[0];
      return ok<MovieRecommendation, TMDBError>({
        tmdbId:    String(r.id),
        title:     r.title,
        year:      new Date(r.release_date).getFullYear(),
        rating:    r.vote_average,
        poster:    r.poster_path ? `${IMAGE_BASE}${r.poster_path}` : '',
        runtime:   0,
        genres:    [],
        director:  '',
        cast:      [],
        overview:  r.overview ?? '',
        reasoning: '',
      });
    });
  },

});
