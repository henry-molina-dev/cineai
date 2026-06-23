import type { HistoryMessage, ChatMessage, ClaudeResponse } from '../types';

const SYNTHETIC_CONTENTS = ['Surprise me.', 'Returned to the app.'];

export const parseHistory = (history: HistoryMessage[]): ChatMessage[] =>
  history
    .filter(m => m.role === 'assistant' || !SYNTHETIC_CONTENTS.includes(m.content))
    .flatMap((m): ChatMessage[] => {
      if (m.role === 'user') return [{ role: 'user', content: m.content }];
      try {
        return [{ role: 'assistant', response: JSON.parse(m.content) as ClaudeResponse }];
      } catch {
        return [];
      }
    });
