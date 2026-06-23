import { describe, it, expect } from 'vitest';
import { parseHistory } from './parseHistory';
import type { HistoryMessage, ClaudeResponse } from '../types';

const recommendation: ClaudeResponse = {
  type: 'recommendations',
  message: "Here's where I'd take you:",
  movies: [{ tmdbId: '1', title: 'Parasite', year: 2019, rating: 8.5, poster: '/p.jpg', runtime: 132, genres: ['Thriller'], director: 'Bong Joon-ho', cast: ['Song Kang-ho'], overview: 'A family.', reasoning: 'Because.' }],
};

describe('parseHistory', () => {
  it('parses a real user/assistant pair into ChatMessages', () => {
    const history: HistoryMessage[] = [
      { role: 'user', content: 'Something like Parasite but less dark', visit: 2 },
      { role: 'assistant', content: JSON.stringify(recommendation), visit: 2 },
    ];

    expect(parseHistory(history)).toEqual([
      { role: 'user', content: 'Something like Parasite but less dark' },
      { role: 'assistant', response: recommendation },
    ]);
  });

  it('drops the synthetic "Surprise me." user turn but keeps the assistant reply', () => {
    const history: HistoryMessage[] = [
      { role: 'user', content: 'Surprise me.', visit: 2 },
      { role: 'assistant', content: JSON.stringify(recommendation), visit: 2 },
    ];

    expect(parseHistory(history)).toEqual([
      { role: 'assistant', response: recommendation },
    ]);
  });

  it('drops the synthetic "Returned to the app." user turn but keeps the assistant reply', () => {
    const history: HistoryMessage[] = [
      { role: 'user', content: 'Returned to the app.', visit: 1 },
      { role: 'assistant', content: JSON.stringify({ type: 'conversation', message: 'How are you feeling?' }), visit: 1 },
    ];

    expect(parseHistory(history)).toEqual([
      { role: 'assistant', response: { type: 'conversation', message: 'How are you feeling?' } },
    ]);
  });

  it('skips an assistant entry that fails to parse as JSON, without throwing', () => {
    const history: HistoryMessage[] = [
      { role: 'user', content: 'Hello', visit: 2 },
      { role: 'assistant', content: 'not valid json', visit: 2 },
    ];

    expect(parseHistory(history)).toEqual([
      { role: 'user', content: 'Hello' },
    ]);
  });

  it('returns an empty array for empty history', () => {
    expect(parseHistory([])).toEqual([]);
  });
});
