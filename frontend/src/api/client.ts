import type { SessionData, ClaudeResponse, MovieRecommendation, WatchlistEntry, Mood } from '../types';

export type ApiClient = ReturnType<typeof makeApiClient>;

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export const makeApiClient = (
  baseUrl: string,
  fetchFn: typeof fetch = globalThis.fetch,
) => {
  const request = async <T>(url: string, init?: RequestInit): Promise<T> => {
    const res = await fetchFn(url, init);
    if (!res.ok) throw new ApiError(res.status, await res.text());
    return res.json() as Promise<T>;
  };

  return {
    getSession: (token: string) =>
      request<SessionData>(`${baseUrl}/session?token=${token}`),

    sendChat: (token: string, message: string, mood: Mood | null) =>
      request<ClaudeResponse>(`${baseUrl}/chat?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, mood }),
      }),

    sendSurprise: (token: string, mood: Mood | null) =>
      request<ClaudeResponse>(`${baseUrl}/chat?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ surprise: true, mood }),
      }),

    sendOpener: (token: string) =>
      request<ClaudeResponse>(`${baseUrl}/chat?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opener: true }),
      }),

    searchMovies: (token: string, query: string) =>
      request<MovieRecommendation>(
        `${baseUrl}/movies?token=${token}&query=${encodeURIComponent(query)}`,
      ),

    toggleWatchlist: (token: string, entry: WatchlistEntry) =>
      request<{ watchlist: WatchlistEntry[] }>(`${baseUrl}/session?token=${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry }),
      }),
  };
};
