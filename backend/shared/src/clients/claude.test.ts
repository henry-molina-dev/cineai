import { describe, it, expect, vi } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import { makeClaudeClient } from './claude';
import type { Session } from '../types/session';
import type { Mood } from '../types/session';

const mockSession: Session = {
  token:         'tok_abc',
  name:          'Sarah Chen',
  company:       'Stripe',
  role:          'Engineering Manager',
  domain:        'stripe.com',
  logoUrl:       'https://logo.clearbit.com/stripe.com',
  createdAt:     '2026-06-01T00:00:00.000Z',
  expiresAt:     '2026-07-01T00:00:00.000Z',
  ttl:           1751328000,
  firstOpenedAt: null,
  lastActiveAt:  null,
  openCount:     1,
  requestCount:  3,
  maxRequests:   20,
  watchlist:     [],
  history:       [],
};

const mockMood: Mood = {
  label:      'curious',
  raw:        'curious',
  capturedAt: '2026-06-01T00:00:00.000Z',
};

const mockLogger = { error: vi.fn() } as any;

const anthropicWith = (text: string) =>
  ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text }],
      }),
    },
  }) as unknown as Anthropic;

describe('makeClaudeClient', () => {
  describe('chat', () => {
    it('returns a conversation response when Claude replies with valid JSON', async () => {
      const payload = JSON.stringify({ type: 'conversation', message: 'Tell me more.' });
      const result = await makeClaudeClient(anthropicWith(payload), mockLogger).chat(mockSession, [], 'Hello', mockMood);
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap().type).toBe('conversation');
    });

    it('returns a recommendations response with movies array', async () => {
      const payload = JSON.stringify({ type: 'recommendations', message: 'Here are my picks.', movies: [] });
      const result = await makeClaudeClient(anthropicWith(payload), mockLogger).chat(mockSession, [], 'Suggest something', mockMood);
      expect(result._unsafeUnwrap()).toMatchObject({ type: 'recommendations', movies: [] });
    });

    it('returns API_ERROR when Anthropic throws', async () => {
      const anthropic = {
        messages: { create: vi.fn().mockRejectedValue(new Error('rate limit')) },
      } as unknown as Anthropic;
      const result = await makeClaudeClient(anthropic, mockLogger).chat(mockSession, [], 'Hello', mockMood);
      expect(result._unsafeUnwrapErr()).toBe('API_ERROR');
    });

    it('parses valid JSON wrapped in markdown code fences', async () => {
      const inner = JSON.stringify({ type: 'conversation', message: 'Here you go.' });
      const fenced = `\`\`\`json\n${inner}\n\`\`\``;
      const result = await makeClaudeClient(anthropicWith(fenced), mockLogger).chat(mockSession, [], 'Hello', mockMood);
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toMatchObject({ type: 'conversation', message: 'Here you go.' });
    });
  });

  it('sends the full history without truncation, spanning multiple visits', async () => {
    const payload = JSON.stringify({ type: 'conversation', message: 'Ok.' });
    const anthropic = anthropicWith(payload);
    const longHistory = Array.from({ length: 8 }, (_, i) => [
      { role: 'user'      as const, content: `Message ${i}`,  visit: i },
      { role: 'assistant' as const, content: `Response ${i}`, visit: i },
    ]).flat(); // 16 messages, spread across 8 different visits
    await makeClaudeClient(anthropic, mockLogger).chat(mockSession, longHistory, 'Hello', mockMood);
    const sent = (anthropic.messages.create as any).mock.calls[0][0].messages;
    // all 16 history messages + 1 current user message
    expect(sent.length).toBe(17);
    expect(sent[0]).toEqual({ role: 'user', content: 'Message 0' });
    expect(sent[sent.length - 1].content).toBe('Hello');
  });

  it('strips internal history metadata (visit) before sending to Anthropic', async () => {
    const payload = JSON.stringify({ type: 'conversation', message: 'Ok.' });
    const anthropic = anthropicWith(payload);
    const history = [{ role: 'user' as const, content: 'Suggest something', visit: 1 }];
    await makeClaudeClient(anthropic, mockLogger).chat(mockSession, history, 'Hello', mockMood);
    const sent = (anthropic.messages.create as any).mock.calls[0][0].messages;
    expect(sent[0]).toEqual({ role: 'user', content: 'Suggest something' });
  });

  describe('surprise', () => {
    it('returns a surprise response', async () => {
      const payload = JSON.stringify({
        type: 'surprise',
        movie: { tmdbId: '1', title: 'Mulholland Drive', year: 2001, rating: 7.9, poster: '', runtime: 147, genres: [], director: 'Lynch', cast: [], overview: '', reasoning: '' },
        reasoning: 'This will shake you.',
      });
      const result = await makeClaudeClient(anthropicWith(payload), mockLogger).surprise(mockSession, [], mockMood);
      expect(result._unsafeUnwrap().type).toBe('surprise');
    });

    it('sends the full history without truncation', async () => {
      const payload = JSON.stringify({ type: 'surprise', movie: {}, reasoning: 'Bold.' });
      const anthropic = anthropicWith(payload);
      const history = [
        { role: 'user' as const, content: 'From visit 1', visit: 1 },
        { role: 'assistant' as const, content: 'Reply from visit 1', visit: 1 },
        { role: 'user' as const, content: 'From visit 2', visit: 2 },
        { role: 'assistant' as const, content: 'Reply from visit 2', visit: 2 },
      ];
      await makeClaudeClient(anthropic, mockLogger).surprise(mockSession, history, mockMood);
      const sent = (anthropic.messages.create as any).mock.calls[0][0].messages;
      expect(sent.length).toBe(5);
      expect(sent[0]).toEqual({ role: 'user', content: 'From visit 1' });
      expect(sent[sent.length - 1]).toEqual({ role: 'user', content: 'Surprise me.' });
    });
  });

  describe('opener', () => {
    it('returns a conversation response without requiring a mood', async () => {
      const payload = JSON.stringify({ type: 'conversation', message: 'Last time you mentioned Parasite — how are you feeling today?' });
      const result = await makeClaudeClient(anthropicWith(payload), mockLogger).opener(mockSession, []);
      expect(result._unsafeUnwrap().type).toBe('conversation');
    });

    it("sends the immediately preceding visit's messages plus a synthetic return-visit user turn", async () => {
      const payload = JSON.stringify({ type: 'conversation', message: 'Ok.' });
      const anthropic = anthropicWith(payload);
      // mockSession.openCount is 1, so the preceding visit is visit 0
      const history = [
        { role: 'user' as const, content: 'Suggest something', visit: 0 },
        { role: 'assistant' as const, content: 'How about Parasite?', visit: 0 },
      ];
      await makeClaudeClient(anthropic, mockLogger).opener(mockSession, history);
      const sent = (anthropic.messages.create as any).mock.calls[0][0].messages;
      expect(sent.length).toBe(3);
      expect(sent[0]).toEqual({ role: 'user', content: 'Suggest something' });
      expect(sent[sent.length - 1]).toEqual({ role: 'user', content: 'Returned to the app.' });
    });

    it('excludes messages from visits before the immediately preceding one, and strips visit metadata', async () => {
      const payload = JSON.stringify({ type: 'conversation', message: 'Ok.' });
      const anthropic = anthropicWith(payload);
      const session = { ...mockSession, openCount: 2 };
      const history = [
        { role: 'user' as const, content: 'Two visits ago', visit: 0 },
        { role: 'assistant' as const, content: 'Two visits ago reply', visit: 0 },
        { role: 'user' as const, content: 'Last visit', visit: 1 },
        { role: 'assistant' as const, content: 'Last visit reply', visit: 1 },
      ];
      await makeClaudeClient(anthropic, mockLogger).opener(session, history);
      const sent = (anthropic.messages.create as any).mock.calls[0][0].messages;
      expect(sent.length).toBe(3);
      expect(sent[0]).toEqual({ role: 'user', content: 'Last visit' });
    });

    it('sends no prior messages when the last visit had no interactions', async () => {
      const payload = JSON.stringify({ type: 'conversation', message: 'Ok.' });
      const anthropic = anthropicWith(payload);
      const history = [
        { role: 'user' as const, content: 'Two visits ago', visit: -1 },
        { role: 'assistant' as const, content: 'Two visits ago reply', visit: -1 },
      ];
      await makeClaudeClient(anthropic, mockLogger).opener(mockSession, history);
      const sent = (anthropic.messages.create as any).mock.calls[0][0].messages;
      expect(sent).toEqual([{ role: 'user', content: 'Returned to the app.' }]);
    });
  });
});
