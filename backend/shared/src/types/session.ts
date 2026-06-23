import type { Message } from './chat';

export type Mood = {
  label:      string;  // "nostalgic", "stressed", "adventurous"
  raw:        string;  // exactly what they typed or selected
  capturedAt: string;  // ISO timestamp
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

export type Session = {
  token:   string;
  name:    string | null;  // unknown until update-token patches it
  company: string;
  role:    string | null;  // unknown until update-token patches it
  domain:  string;
  logoUrl: string;

  createdAt: string;  // ISO
  expiresAt: string;  // ISO — 30 days from creation
  ttl:       number;  // Unix seconds — used by DynamoDB TTL for auto-deletion

  firstOpenedAt: string | null;
  lastActiveAt:  string | null;
  openCount:     number;

  requestCount: number;
  maxRequests:  number;  // default 25

  watchlist: WatchlistEntry[];
  history:   Message[];
};
