export type Mood = {
  label:      string;
  raw:        string;
  capturedAt: string;
};

export type WatchlistEntry = {
  tmdbId:   string;
  title:    string;
  poster:   string;
  year:     number;
  rating:   number;
  runtime:  number;
  genres:   string[];
  overview: string;
  director: string;
  cast:     string[];
};

export type MovieRecommendation = {
  tmdbId:    string;
  title:     string;
  year:      number;
  rating:    number;
  poster:    string;
  runtime:   number;
  genres:    string[];
  director:  string;
  cast:      string[];
  overview:  string;
  reasoning: string;
};

export type MoodUpdate = {
  label: string;
  raw:   string;
};

export type ClaudeResponse =
  | { type: 'recommendations'; movies: MovieRecommendation[]; message: string; moodUpdate?: MoodUpdate }
  | { type: 'conversation';    message: string;                              moodUpdate?: MoodUpdate }
  | { type: 'surprise';        movie: MovieRecommendation; reasoning: string; moodUpdate?: MoodUpdate };

export type HistoryMessage = {
  role:    'user' | 'assistant';
  content: string;
  visit:   number;
};

export type SessionData = {
  name:         string | null;
  company:      string;
  logoUrl:      string;
  watchlist:    WatchlistEntry[];
  openCount:    number;
  requestCount: number;
  maxRequests:  number;
  expiresAt:    string;   // ISO — link expiry date
  isFirstVisit: boolean;
  history:      HistoryMessage[];
};

export type ChatMessage =
  | { role: 'user';      content: string }
  | { role: 'assistant'; response: ClaudeResponse };
