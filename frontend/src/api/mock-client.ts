import type { ApiClient } from './client';
import type { SessionData, ClaudeResponse, MovieRecommendation, WatchlistEntry } from '../types';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

const POSTER_BASE = 'https://image.tmdb.org/t/p/w500';

const MOVIES: MovieRecommendation[] = [
  {
    tmdbId: '496243',
    title: 'Parasite',
    year: 2019,
    rating: 8.5,
    poster: `${POSTER_BASE}/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg`,
    runtime: 132,
    genres: ['Thriller', 'Comedy', 'Drama'],
    director: 'Bong Joon-ho',
    cast: ['Song Kang-ho', 'Lee Sun-kyun', 'Cho Yeo-jeong'],
    overview: "All unemployed, Ki-taek's family takes a keen interest in the wealthy and glamorous Parks for their livelihood — until they encounter an unexpected intruder.",
    reasoning: "You mentioned feeling tense — this film turns that into something electric. It's a masterclass in sustained dread that somehow makes you laugh.",
  },
  {
    tmdbId: '389',
    title: '12 Angry Men',
    year: 1957,
    rating: 9.0,
    poster: `${POSTER_BASE}/ppd84D2i9W8jXmsyInGyihiSyqz.jpg`,
    runtime: 96,
    genres: ['Crime', 'Drama'],
    director: 'Sidney Lumet',
    cast: ['Henry Fonda', 'Lee J. Cobb', 'Martin Balsam'],
    overview: 'A jury holdout attempts to prevent a miscarriage of justice by forcing his colleagues to reconsider the evidence.',
    reasoning: 'One room, twelve men, ninety-six minutes — and you will be gripping the armrest. The best argument I know for why movies need no spectacle at all.',
  },
  {
    tmdbId: '37165',
    title: 'The Truman Show',
    year: 1998,
    rating: 8.1,
    poster: `${POSTER_BASE}/vuza0WqY239yBXOadKlGwJsZJFE.jpg`,
    runtime: 103,
    genres: ['Comedy', 'Drama'],
    director: 'Peter Weir',
    cast: ['Jim Carrey', 'Ed Harris', 'Laura Linney'],
    overview: 'An insurance salesman discovers his whole life is actually a reality TV show.',
    reasoning: "Feels light, hits hard. There's a quiet dread underneath every sunny frame that you won't shake for days.",
  },
];

const SURPRISE_MOVIE: MovieRecommendation = {
  tmdbId: '77338',
  title: 'The Artist',
  year: 2011,
  rating: 8.0,
  poster: `${POSTER_BASE}/hF4AJ5cBPSM8X8YDlmjxFy4OxA0.jpg`,
  runtime: 100,
  genres: ['Comedy', 'Drama', 'Romance'],
  director: 'Michel Hazanavicius',
  cast: ['Jean Dujardin', 'Bérénice Bejo', 'John Goodman'],
  overview: 'Hollywood, 1927. As silent movie star George Valentin wonders if talking pictures will cause his star to fade, he meets Peppy Miller, a young dancer.',
  reasoning: "You didn't ask for a silent film. That's exactly why you need one. This will disarm you in the first ten minutes.",
};

const firstVisitSession: SessionData = {
  name: 'Sarah Chen',
  company: 'Stripe',
  logoUrl: 'https://placehold.co/64/0a66c2/ffffff?text=S',
  watchlist: [],
  openCount: 1,
  requestCount: 0,
  maxRequests: 25,
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  isFirstVisit: true,
  history: [],
};

const LAST_VISIT_RECOMMENDATION: ClaudeResponse = {
  type: 'recommendations',
  message: "Given how you're feeling, here are three films that might hit differently tonight:",
  movies: MOVIES,
};

const returnVisitSession: SessionData = {
  name: 'Sarah Chen',
  company: 'Stripe',
  logoUrl: 'https://placehold.co/64/0a66c2/ffffff?text=S',
  watchlist: [{ tmdbId: '496243', title: 'Parasite', poster: `${POSTER_BASE}/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg`, year: 2019, rating: 8.5, runtime: 132, genres: ['Thriller', 'Comedy', 'Drama'], overview: "All unemployed, Ki-taek's family takes a keen interest in the wealthy and glamorous Parks for their livelihood.", director: 'Bong Joon-ho', cast: ['Song Kang-ho', 'Lee Sun-kyun', 'Cho Yeo-jeong'] }],
  openCount: 3,
  requestCount: 5,
  maxRequests: 25,
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  isFirstVisit: false,
  history: [
    { role: 'user', content: 'Surprise me.', visit: 1 },
    { role: 'assistant', content: JSON.stringify({ type: 'surprise', movie: SURPRISE_MOVIE, reasoning: SURPRISE_MOVIE.reasoning }), visit: 1 },
    { role: 'user', content: 'Something like Parasite but less dark', visit: 2 },
    { role: 'assistant', content: JSON.stringify(LAST_VISIT_RECOMMENDATION), visit: 2 },
  ],
};

const OPENER_RESPONSE: ClaudeResponse = {
  type: 'conversation',
  message: "Last time you were eyeing Parasite — did you ever get to it? Either way, how are you feeling tonight?",
};

const CHAT_RESPONSES: ClaudeResponse[] = [
  {
    type: 'conversation',
    message: "Tell me more about what you're in the mood for. Are you looking for something to absorb you completely, or something lighter you can half-watch?",
  },
  {
    type: 'recommendations',
    message: 'Given how you\'re feeling, here are three films that might hit differently tonight:',
    movies: MOVIES,
  },
  {
    type: 'conversation',
    message: "Parasite is a great call — Bong Joon-ho has this gift for making you laugh and squirm at exactly the same moment. Have you seen his earlier work, or is this your starting point?",
  },
  {
    type: 'recommendations',
    message: "If Parasite resonated, here's where I'd take you next:",
    movies: [MOVIES[1], MOVIES[2]],
  },
];

export const makeMockApiClient = (): ApiClient => {
  let chatCallCount = 0;
  let watchlist: WatchlistEntry[] = [];

  return {
    getSession: async (token: string) => {
      await delay(600);
      const base = token === 'return-visit' ? returnVisitSession : firstVisitSession;
      return { ...base, watchlist };
    },

    sendChat: async (_token, _message, _mood) => {
      await delay(1200);
      return CHAT_RESPONSES[chatCallCount++ % CHAT_RESPONSES.length];
    },

    sendSurprise: async (_token, _mood) => {
      await delay(1500);
      return { type: 'surprise', movie: SURPRISE_MOVIE, reasoning: SURPRISE_MOVIE.reasoning };
    },

    sendOpener: async (_token) => {
      await delay(1000);
      return OPENER_RESPONSE;
    },

    searchMovies: async (_token, _query) => {
      await delay(400);
      return MOVIES[0];
    },

    toggleWatchlist: async (_token, entry) => {
      await delay(200);
      watchlist = watchlist.some(e => e.tmdbId === entry.tmdbId)
        ? watchlist.filter(e => e.tmdbId !== entry.tmdbId)
        : [...watchlist, entry];
      return { watchlist };
    },
  };
};
