import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SessionContext } from '../context/SessionContext';
import Chat from './Chat';
import type { SessionData, ClaudeResponse } from '../types';

const session: SessionData = {
  name: 'Sarah', company: 'Stripe', logoUrl: '...', watchlist: [],
  openCount: 2, requestCount: 3, maxRequests: 20, expiresAt: '2026-07-17T00:00:00.000Z', isFirstVisit: false, history: [],
};

const conversationResponse: ClaudeResponse = { type: 'conversation', message: 'Try Parasite!' };

const makeCtx = (overrides?: { sendChat?: ReturnType<typeof vi.fn>; sendSurprise?: ReturnType<typeof vi.fn>; sendOpener?: ReturnType<typeof vi.fn> }) => ({
  apiClient: {
    sendChat:    vi.fn().mockResolvedValue(conversationResponse),
    sendSurprise: vi.fn().mockResolvedValue({ type: 'surprise', movie: {}, reasoning: 'Bold.' }),
    sendOpener:  vi.fn().mockResolvedValue(conversationResponse),
    getSession:  vi.fn(),
    searchMovies: vi.fn(),
    ...overrides,
  } as any,
  token:     'tok-1',
  session,
  mood:      { label: 'Curious', raw: 'Curious', capturedAt: '2026-01-01T00:00:00Z' },
  isLoading:       false,
  error:           null,
  setMood:         vi.fn(),
  toggleWatchlist: vi.fn(),
});

function wrap(ctx: ReturnType<typeof makeCtx>) {
  return ({ children }: { children: React.ReactNode }) => (
    <SessionContext.Provider value={ctx}>{children}</SessionContext.Provider>
  );
}

describe('Chat', () => {
  it('renders the greeting with the user name on a first visit', () => {
    const ctx = makeCtx();
    ctx.session = { ...session, isFirstVisit: true };
    render(<Chat />, { wrapper: wrap(ctx) });
    expect(screen.getByText(/Sarah/)).toBeInTheDocument();
  });

  it('sends a message on form submit', async () => {
    const ctx = makeCtx();
    ctx.session = { ...session, isFirstVisit: true };
    render(<Chat />, { wrapper: wrap(ctx) });

    fireEvent.change(screen.getByPlaceholderText(/ask/i), { target: { value: 'What to watch?' } });
    fireEvent.submit(screen.getByRole('form'));

    await waitFor(() => expect(ctx.apiClient.sendChat).toHaveBeenCalledWith('tok-1', 'What to watch?', ctx.mood));
  });

  it('displays assistant response after send', async () => {
    const ctx = makeCtx();
    ctx.session = { ...session, isFirstVisit: true };
    render(<Chat />, { wrapper: wrap(ctx) });

    fireEvent.change(screen.getByPlaceholderText(/ask/i), { target: { value: 'suggestions?' } });
    fireEvent.submit(screen.getByRole('form'));

    await waitFor(() => expect(screen.getByText('Try Parasite!')).toBeInTheDocument());
  });

  it('shows budget indicator', () => {
    render(<Chat />, { wrapper: wrap(makeCtx()) });
    expect(screen.getByText(/17 of 20/)).toBeInTheDocument();
  });

  it('disables input when budget is exhausted', () => {
    const ctx = makeCtx();
    ctx.session = { ...session, requestCount: 20, maxRequests: 20 };
    render(<Chat />, { wrapper: wrap(ctx) });
    expect(screen.getByPlaceholderText(/ask/i)).toBeDisabled();
  });

  it('does not auto-fire the opener when the budget is already exhausted', () => {
    const ctx = makeCtx();
    ctx.session = { ...session, requestCount: 20, maxRequests: 20 };
    render(<Chat />, { wrapper: wrap(ctx) });
    expect(ctx.apiClient.sendOpener).not.toHaveBeenCalled();
  });

  it('does not double-count rehydrated history when computing the budget', () => {
    const ctx = makeCtx();
    ctx.session = {
      ...session,
      isFirstVisit: true, // skip the async auto-opener so newResponseCount can't shift mid-test
      requestCount: 3,
      maxRequests: 20,
      history: [
        { role: 'user', content: 'From last visit', visit: 1 },
        { role: 'assistant', content: JSON.stringify(conversationResponse), visit: 1 },
      ],
    };
    render(<Chat />, { wrapper: wrap(ctx) });
    expect(screen.getByText(/17 of 20/)).toBeInTheDocument();
  });

  it('falls back to the company name in the greeting when the hiring manager name is unknown', () => {
    const ctx = makeCtx();
    ctx.session = { ...session, name: null, isFirstVisit: true };
    render(<Chat />, { wrapper: wrap(ctx) });
    expect(screen.getByText(/Stripe/)).toBeInTheDocument();
  });

  it('omits the static greeting and auto-fires the opener on a return visit', async () => {
    const ctx = makeCtx();
    ctx.apiClient.sendOpener = vi.fn().mockResolvedValue({ type: 'conversation', message: 'Last time you mentioned Parasite — how are you feeling today?' });
    render(<Chat />, { wrapper: wrap(ctx) });

    expect(screen.queryByText(/you're feeling/)).not.toBeInTheDocument();
    await waitFor(() => expect(ctx.apiClient.sendOpener).toHaveBeenCalledWith('tok-1'));
    await waitFor(() => expect(screen.getByText(/Last time you mentioned Parasite/)).toBeInTheDocument());
  });

  it('does not auto-fire the opener on a first visit', () => {
    const ctx = makeCtx();
    ctx.session = { ...session, isFirstVisit: true };
    render(<Chat />, { wrapper: wrap(ctx) });
    expect(ctx.apiClient.sendOpener).not.toHaveBeenCalled();
  });

  it("renders rehydrated history cards before the opener's message", async () => {
    const ctx = makeCtx();
    ctx.session = {
      ...session,
      history: [
        { role: 'user', content: 'Something like Parasite but less dark', visit: 1 },
        { role: 'assistant', content: JSON.stringify({ type: 'conversation', message: 'How about 12 Angry Men?' }), visit: 1 },
      ],
    };
    ctx.apiClient.sendOpener = vi.fn().mockResolvedValue({ type: 'conversation', message: 'How are you feeling today?' });
    render(<Chat />, { wrapper: wrap(ctx) });

    expect(screen.getByText('Something like Parasite but less dark')).toBeInTheDocument();
    expect(screen.getByText('How about 12 Angry Men?')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('How are you feeling today?')).toBeInTheDocument());

    const order = screen.getAllByText(/12 Angry Men|How are you feeling/).map(el => el.textContent);
    expect(order).toEqual(['How about 12 Angry Men?', 'How are you feeling today?']);
  });

  it('rehydrates history spanning multiple past visits, not just the most recent one', () => {
    const ctx = makeCtx();
    ctx.session = {
      ...session,
      history: [
        { role: 'user', content: 'From two visits ago', visit: 1 },
        { role: 'assistant', content: JSON.stringify({ type: 'conversation', message: 'Reply from two visits ago' }), visit: 1 },
        { role: 'user', content: 'From last visit', visit: 2 },
        { role: 'assistant', content: JSON.stringify({ type: 'conversation', message: 'Reply from last visit' }), visit: 2 },
      ],
    };
    render(<Chat />, { wrapper: wrap(ctx) });
    expect(screen.getByText('Reply from two visits ago')).toBeInTheDocument();
    expect(screen.getByText('Reply from last visit')).toBeInTheDocument();
  });

  it('omits the synthetic "Returned to the app." user turn from rehydrated history', () => {
    const ctx = makeCtx();
    ctx.session = {
      ...session,
      history: [
        { role: 'user', content: 'Returned to the app.', visit: 1 },
        { role: 'assistant', content: JSON.stringify({ type: 'conversation', message: 'How are you feeling today?' }), visit: 1 },
      ],
    };
    render(<Chat />, { wrapper: wrap(ctx) });
    expect(screen.queryByText('Returned to the app.')).not.toBeInTheDocument();
  });

  it('updates mood from a moodUpdate on an assistant response', async () => {
    const ctx = makeCtx();
    ctx.session = { ...session, isFirstVisit: true };
    ctx.apiClient.sendChat = vi.fn().mockResolvedValue({
      type: 'conversation',
      message: 'Got it.',
      moodUpdate: { label: 'Exhausted', raw: 'pretty exhausted' },
    });
    render(<Chat />, { wrapper: wrap(ctx) });

    fireEvent.change(screen.getByPlaceholderText(/ask/i), { target: { value: 'Pretty exhausted today' } });
    fireEvent.submit(screen.getByRole('form'));

    await waitFor(() => expect(ctx.setMood).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'Exhausted', raw: 'pretty exhausted' }),
    ));
  });
});
