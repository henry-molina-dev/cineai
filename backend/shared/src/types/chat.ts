import type { MovieRecommendation } from './movie';

export type Message = {
  role:    'user' | 'assistant';
  content: string;
  visit:   number;  // session.openCount at the time this message was written
};

export type MoodUpdate = {
  label: string;
  raw:   string;
};

export type ClaudeResponse =
  | { type: 'recommendations'; movies: MovieRecommendation[]; message: string; moodUpdate?: MoodUpdate | null }
  | { type: 'conversation';    message: string;                              moodUpdate?: MoodUpdate | null }
  | { type: 'surprise';        movie: MovieRecommendation;    reasoning: string; moodUpdate?: MoodUpdate | null };
