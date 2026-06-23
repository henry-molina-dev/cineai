import Anthropic from '@anthropic-ai/sdk';
import { ResultAsync, err, ok } from 'neverthrow';
import { buildSystemPrompt } from '../prompts/system';
import { SURPRISE_MODE_PROMPT, OPENER_PROMPT } from '../prompts/constants';
import type { Session, Mood } from '../types/session';
import type { Message, ClaudeResponse } from '../types/chat';
import type { ClaudeError } from '../types/errors';
import { Logger } from '@aws-lambda-powertools/logger';

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_HISTORY_MESSAGES = 10;

const stripCodeFences = (text: string): string => {
  const match = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return match ? match[1] : text.trim();
};

const parseClaudeResponse = (text: string): ClaudeResponse | null => {
  try {
    const parsed = JSON.parse(stripCodeFences(text));
    if (parsed.type === 'recommendations' && Array.isArray(parsed.movies) && typeof parsed.message === 'string') {
      return parsed as ClaudeResponse;
    }
    if (parsed.type === 'conversation' && typeof parsed.message === 'string') {
      return parsed as ClaudeResponse;
    }
    if (parsed.type === 'surprise' && parsed.movie && typeof parsed.reasoning === 'string') {
      return parsed as ClaudeResponse;
    }
    return null;
  } catch {
    return null;
  }
};

const extractText = (response: Anthropic.Message): string =>
  response.content[0]?.type === 'text' ? response.content[0].text : '';

// Message carries internal-only metadata (visit) that Anthropic's API
// rejects as an unrecognized field — only role/content may cross the wire.
const toAnthropicMessage = (m: Message) => ({ role: m.role, content: m.content });

export const makeClaudeClient = (anthropic: Anthropic, logger: Logger) => ({

  chat: (
    session: Session,
    history: Message[],
    userMessage: string,
    mood: Mood,
  ): ResultAsync<ClaudeResponse, ClaudeError> =>
    ResultAsync.fromPromise(
      anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: buildSystemPrompt(session, mood),
        messages: [...history.map(toAnthropicMessage), { role: 'user', content: userMessage }],
      }),
      (e): ClaudeError => { logger.error('Anthropic API error', { error: String(e) }); return 'API_ERROR'; },
    ).andThen(response => {
      const text   = extractText(response);
      const parsed = parseClaudeResponse(text);
      if (!parsed) logger.error('Claude response parse failed', { text });
      return parsed ? ok(parsed) : err<ClaudeResponse, ClaudeError>('API_ERROR');
    }),

  surprise: (
    session: Session,
    history: Message[],
    mood: Mood,
  ): ResultAsync<ClaudeResponse, ClaudeError> =>
    ResultAsync.fromPromise(
      anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: buildSystemPrompt(session, mood) + '\n\n' + SURPRISE_MODE_PROMPT,
        messages: [...history.map(toAnthropicMessage), { role: 'user', content: 'Surprise me.' }],
      }),
      (e): ClaudeError => { logger.error('Anthropic API error', { error: String(e) }); return 'API_ERROR'; },
    ).andThen(response => {
      const text   = extractText(response);
      const parsed = parseClaudeResponse(text);
      if (!parsed) logger.error('Claude response parse failed', { text });
      return parsed ? ok(parsed) : err<ClaudeResponse, ClaudeError>('API_ERROR');
    }),

  // Scoped to the immediately preceding visit, not a generic tail window —
  // a recap should only ever reference what actually happened last time.
  opener: (
    session: Session,
    history: Message[],
  ): ResultAsync<ClaudeResponse, ClaudeError> => {
    const lastVisit = history.filter(m => m.visit === session.openCount - 1).slice(-MAX_HISTORY_MESSAGES);
    return ResultAsync.fromPromise(
      anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: buildSystemPrompt(session, null) + '\n\n' + OPENER_PROMPT,
        messages: [...lastVisit.map(toAnthropicMessage), { role: 'user', content: 'Returned to the app.' }],
      }),
      (e): ClaudeError => { logger.error('Anthropic API error', { error: String(e) }); return 'API_ERROR'; },
    ).andThen(response => {
      const text   = extractText(response);
      const parsed = parseClaudeResponse(text);
      if (!parsed) logger.error('Claude response parse failed', { text });
      return parsed ? ok(parsed) : err<ClaudeResponse, ClaudeError>('API_ERROR');
    });
  },

});
