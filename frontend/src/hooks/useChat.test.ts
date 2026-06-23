import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChat } from './useChat';
import type { ClaudeResponse } from '../types';

const conversationResponse: ClaudeResponse = { type: 'conversation', message: 'Great choice!' };
const recommendationsResponse: ClaudeResponse = {
  type: 'recommendations',
  message: 'Here are some picks.',
  movies: [{ tmdbId: '1', title: 'Parasite', year: 2019, rating: 8.5, poster: '/poster.jpg', runtime: 132, genres: ['Thriller'], director: 'Bong Joon-ho', cast: ['Song Kang-ho'], overview: 'A family...', reasoning: 'Because...' }],
};

const mood = { label: 'Curious', raw: 'curious', capturedAt: '2026-01-01T00:00:00Z' };

const makeClient = (overrides?: object) => ({
  getSession: vi.fn(),
  sendChat:    vi.fn().mockResolvedValue(conversationResponse),
  sendSurprise: vi.fn().mockResolvedValue({ type: 'surprise', movie: recommendationsResponse.movies[0], reasoning: 'Bold pick.' }),
  sendOpener:  vi.fn().mockResolvedValue(conversationResponse),
  searchMovies: vi.fn(),
  ...overrides,
});

describe('useChat', () => {
  it('starts with empty messages and not loading', () => {
    const { result } = renderHook(() => useChat(makeClient() as any, 'tok-1'));
    expect(result.current.messages).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('seeds messages from initialMessages when provided', () => {
    const seeded = [{ role: 'assistant' as const, response: conversationResponse }];
    const { result } = renderHook(() => useChat(makeClient() as any, 'tok-1', seeded));
    expect(result.current.messages).toEqual(seeded);
  });

  it('newResponseCount starts at 0 regardless of seeded initialMessages', () => {
    const seeded = [
      { role: 'assistant' as const, response: conversationResponse },
      { role: 'assistant' as const, response: conversationResponse },
    ];
    const { result } = renderHook(() => useChat(makeClient() as any, 'tok-1', seeded));
    expect(result.current.newResponseCount).toBe(0);
  });

  it('newResponseCount increments once per successful send/surprise/openReturn call', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useChat(client as any, 'tok-1'));

    await act(() => result.current.send('Hello', mood));
    expect(result.current.newResponseCount).toBe(1);

    await act(() => result.current.surprise(mood));
    expect(result.current.newResponseCount).toBe(2);

    await act(() => result.current.openReturn());
    expect(result.current.newResponseCount).toBe(3);
  });

  it('newResponseCount does not increment when a call fails', async () => {
    const client = makeClient({ sendChat: vi.fn().mockRejectedValue(new Error('502')) });
    const { result } = renderHook(() => useChat(client as any, 'tok-1'));

    await act(() => result.current.send('Hello', mood));
    expect(result.current.newResponseCount).toBe(0);
  });

  it('send() appends user and assistant messages', async () => {
    const client = makeClient({ sendChat: vi.fn().mockResolvedValue(conversationResponse) });
    const { result } = renderHook(() => useChat(client as any, 'tok-1'));

    await act(() => result.current.send('What should I watch?', mood));

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0]).toEqual({ role: 'user', content: 'What should I watch?' });
    expect(result.current.messages[1]).toEqual({ role: 'assistant', response: conversationResponse });
  });

  it('send() calls apiClient.sendChat with token and message', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useChat(client as any, 'tok-1'));

    await act(() => result.current.send('Hello', mood));

    expect(client.sendChat).toHaveBeenCalledWith('tok-1', 'Hello', mood);
  });

  it('send() sets isLoading while in flight', async () => {
    let resolve!: (v: ClaudeResponse) => void;
    const client = makeClient({ sendChat: vi.fn().mockReturnValue(new Promise(r => { resolve = r; })) });
    const { result } = renderHook(() => useChat(client as any, 'tok-1'));

    act(() => { result.current.send('test', mood); });
    expect(result.current.isLoading).toBe(true);

    await act(() => { resolve(conversationResponse); });
    expect(result.current.isLoading).toBe(false);
  });

  it('surprise() calls sendSurprise and appends assistant message', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useChat(client as any, 'tok-1'));

    await act(() => result.current.surprise(mood));

    expect(client.sendSurprise).toHaveBeenCalledWith('tok-1', mood);
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]).toMatchObject({ role: 'assistant' });
  });

  it('surprise() sets an error and clears isLoading when the API call rejects', async () => {
    const client = makeClient({ sendSurprise: vi.fn().mockRejectedValue(new Error('502')) });
    const { result } = renderHook(() => useChat(client as any, 'tok-1'));

    await act(() => result.current.surprise(mood));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeTruthy();
    expect(result.current.messages).toHaveLength(0);
  });

  it('send() sets an error and clears isLoading when the API call rejects', async () => {
    const client = makeClient({ sendChat: vi.fn().mockRejectedValue(new Error('502')) });
    const { result } = renderHook(() => useChat(client as any, 'tok-1'));

    await act(() => result.current.send('Hello', mood));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeTruthy();
  });

  it('a successful call clears a previous error', async () => {
    const client = makeClient({ sendSurprise: vi.fn().mockRejectedValueOnce(new Error('502')).mockResolvedValueOnce({ type: 'surprise', movie: recommendationsResponse.movies[0], reasoning: 'Bold.' }) });
    const { result } = renderHook(() => useChat(client as any, 'tok-1'));

    await act(() => result.current.surprise(mood));
    expect(result.current.error).toBeTruthy();

    await act(() => result.current.surprise(mood));
    expect(result.current.error).toBeNull();
  });

  it('openReturn() calls sendOpener and appends an assistant message', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useChat(client as any, 'tok-1'));

    await act(() => result.current.openReturn());

    expect(client.sendOpener).toHaveBeenCalledWith('tok-1');
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]).toMatchObject({ role: 'assistant' });
  });

  it('openReturn() sets an error and clears isLoading when the API call rejects', async () => {
    const client = makeClient({ sendOpener: vi.fn().mockRejectedValue(new Error('502')) });
    const { result } = renderHook(() => useChat(client as any, 'tok-1'));

    await act(() => result.current.openReturn());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeTruthy();
  });
});
