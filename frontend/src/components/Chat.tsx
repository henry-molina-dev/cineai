import { useRef, useEffect, useState } from 'react';
import { useSession } from '../context/SessionContext';
import { useChat } from '../hooks/useChat';
import { getTimeOfDayPhrase } from '../utils/timeOfDay';
import { parseHistory } from '../utils/parseHistory';
import MovieCard from './MovieCard';
import MovieSheet from './MovieSheet';
import WatchlistSheet from './WatchlistSheet';
import SurpriseMe from './SurpriseMe';
import BudgetBadge from './BudgetBadge';
import ThemeToggle from './ThemeToggle';
import IntroSheet from './IntroSheet';
import LoadingDots from './LoadingDots';

const INTRO_SEEN_KEY = 'cineai-intro-seen';
import type { MovieRecommendation, ClaudeResponse } from '../types';

export default function Chat() {
  const { session, mood, setMood, apiClient, token, toggleWatchlist } = useSession();
  const { messages, isLoading, error, send, surprise, openReturn, newResponseCount } = useChat(
    apiClient, token, session ? parseHistory(session.history) : [],
  );
  const [input,           setInput]           = useState('');
  const [selectedMovie,   setSelectedMovie]   = useState<MovieRecommendation | null>(null);
  const [surpriseResult,  setSurpriseResult]  = useState<ClaudeResponse | null>(null);
  const [showWatchlist,   setShowWatchlist]   = useState(false);
  const [showIntro,       setShowIntro]       = useState(() => !localStorage.getItem(INTRO_SEEN_KEY));
  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (session && !session.isFirstVisit && !isExhausted) openReturn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.role === 'assistant' && last.response.moodUpdate) {
      setMood({ ...last.response.moodUpdate, capturedAt: new Date().toISOString() });
    }
  }, [messages]);

  if (!session) return null;

  const budgetUsed  = session.requestCount + newResponseCount;
  const budgetLeft  = session.maxRequests - budgetUsed;
  const isExhausted = budgetLeft <= 0;
  const isInWatchlist = (tmdbId: string) => session.watchlist.some(e => e.tmdbId === tmdbId);

  const daysUntilExpiry = Math.ceil(
    (new Date(session.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  const expiryLabel = daysUntilExpiry <= 7
    ? `Link expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}`
    : `Link expires ${new Date(session.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  const submitMessage = () => {
    if (!input.trim() || isLoading || isExhausted) return;
    send(input.trim(), mood);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMessage();
  };

  const dismissIntro = () => {
    localStorage.setItem(INTRO_SEEN_KEY, 'true');
    setShowIntro(false);
  };

  const handleSurprise = async () => {
    const result = await surprise(mood);
    if (result?.type === 'surprise') setSurpriseResult(result);
  };

  const isReturn = !session.isFirstVisit;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      {/* Header */}
      <header style={{
        padding: 'var(--space-4) var(--space-6)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--color-bg)',
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>CineAI</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <button
            onClick={() => setShowWatchlist(true)}
            style={{
              fontSize: 13,
              color: session.watchlist.length > 0 ? 'var(--color-accent)' : 'var(--color-ink-faint)',
              fontFamily: 'var(--font-mono)',
              padding: 'var(--space-1) var(--space-2)',
            }}
          >
            ★ Watchlist{session.watchlist.length > 0 ? ` (${session.watchlist.length})` : ''}
          </button>
          <BudgetBadge used={budgetUsed} max={session.maxRequests} />
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: daysUntilExpiry <= 7 ? 'var(--color-accent)' : 'var(--color-ink-faint)',
          }}>
            {expiryLabel}
          </span>
          <ThemeToggle />
        </div>
      </header>

      {/* Thread */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-6)' }}>
        {/* Greeting */}
        {!isReturn && (
          <div style={{ marginBottom: 'var(--space-8)', textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 20, color: 'var(--color-ink-muted)' }}>
              {`Hi ${session.name ?? session.company} — you're feeling ${mood?.label?.toLowerCase() ?? 'ready'} ${getTimeOfDayPhrase()}. Let's find your next watch.`}
            </p>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => {
          if (msg.role === 'user') {
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-4)' }}>
                <p style={{
                  maxWidth: '70%',
                  padding: 'var(--space-3) var(--space-4)',
                  background: 'var(--color-surface)',
                  borderRadius: 'var(--radius)',
                  fontSize: 15,
                }}>
                  {msg.content}
                </p>
              </div>
            );
          }

          const res = msg.response;
          return (
            <div key={i} style={{ marginBottom: 'var(--space-6)', borderLeft: '3px solid var(--color-accent)', paddingLeft: 'var(--space-4)' }}>
              {(res.type === 'recommendations' || res.type === 'conversation') && (
                <p style={{ color: 'var(--color-ink)', fontSize: 15, lineHeight: 1.6, marginBottom: 'var(--space-4)' }}>
                  {res.message}
                </p>
              )}
              {res.type === 'recommendations' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {res.movies.map(movie => (
                    <MovieCard
                      key={movie.tmdbId}
                      movie={movie}
                      onSelect={setSelectedMovie}
                      isInWatchlist={isInWatchlist(movie.tmdbId)}
                      onToggleWatchlist={toggleWatchlist}
                    />
                  ))}
                </div>
              )}
              {res.type === 'surprise' && (
                <div>
                  <p style={{ color: 'var(--color-ink)', fontSize: 15, lineHeight: 1.6, marginBottom: 'var(--space-4)' }}>
                    {res.reasoning}
                  </p>
                  <MovieCard
                    movie={res.movie}
                    onSelect={setSelectedMovie}
                    isInWatchlist={isInWatchlist(res.movie.tmdbId)}
                    onToggleWatchlist={toggleWatchlist}
                  />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div style={{ borderLeft: '3px solid var(--color-accent)', paddingLeft: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
            <LoadingDots />
          </div>
        )}

        {error && !isLoading && (
          <div style={{ borderLeft: '3px solid var(--color-accent)', paddingLeft: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
            <p style={{ color: 'var(--color-ink-muted)', fontStyle: 'italic', fontSize: 15 }}>{error}</p>
          </div>
        )}

        {isExhausted && (
          <p style={{ textAlign: 'center', color: 'var(--color-ink-muted)', fontStyle: 'italic', marginTop: 'var(--space-8)' }}>
            That&apos;s our time for now, {session.name ?? session.company}.
            {session.watchlist.length > 0 && (
              <> Your watchlist has {session.watchlist.length} film{session.watchlist.length > 1 ? 's' : ''} waiting.</>
            )}
          </p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Sticky bottom bar */}
      <form
        role="form"
        onSubmit={handleSubmit}
        style={{
          borderTop: '1px solid var(--color-border)',
          padding: 'var(--space-4) var(--space-6)',
          background: 'var(--color-bg)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
        }}
      >
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => {
            setInput(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submitMessage();
            }
          }}
          disabled={isExhausted}
          maxLength={500}
          rows={1}
          placeholder="Ask me anything about movies…"
          style={{
            width: '100%',
            padding: 'var(--space-3) var(--space-4)',
            background: 'var(--color-surface)',
            border: 'none',
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            color: 'var(--color-ink)',
            outline: 'none',
            boxSizing: 'border-box',
            resize: 'none',
            overflowY: 'hidden',
            maxHeight: 160,
            lineHeight: 1.5,
          }}
        />

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--color-border)' }} />

        {/* Buttons row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleSurprise}
            disabled={isLoading || isExhausted}
            style={{
              padding: 'var(--space-2) var(--space-3)',
              background: 'var(--color-accent)',
              color: '#fff',
              borderRadius: 'var(--radius)',
              fontSize: 13,
              fontWeight: 500,
              opacity: (isLoading || isExhausted) ? 0.4 : 1,
            }}
          >
            Surprise Me
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            {input.length >= 400 && (
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: input.length >= 480 ? 'var(--color-accent)' : 'var(--color-ink-faint)',
              }}>
                {500 - input.length} characters remaining
              </span>
            )}
            <button
              type="submit"
              disabled={!input.trim() || isLoading || isExhausted}
              style={{
                padding: 'var(--space-2) var(--space-3)',
                background: 'var(--color-accent)',
                color: '#fff',
                borderRadius: 'var(--radius)',
                fontSize: 14,
                fontWeight: 500,
                opacity: (!input.trim() || isLoading || isExhausted) ? 0.4 : 1,
              }}
            >
              →
            </button>
          </div>
        </div>
      </form>

      {/* Movie detail sheet */}
      {selectedMovie && (
        <MovieSheet
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
          isInWatchlist={isInWatchlist(selectedMovie.tmdbId)}
          onToggleWatchlist={toggleWatchlist}
        />
      )}

      {/* Watchlist sheet */}
      {showWatchlist && (
        <WatchlistSheet
          watchlist={session.watchlist}
          onClose={() => setShowWatchlist(false)}
          onRemove={toggleWatchlist}
          onSelect={movie => { setSelectedMovie(movie); setShowWatchlist(false); }}
        />
      )}

      {/* Surprise Me overlay */}
      {surpriseResult?.type === 'surprise' && (
        <SurpriseMe
          movie={surpriseResult.movie}
          reasoning={surpriseResult.reasoning}
          isLoading={isLoading}
          isExhausted={isExhausted}
          onClose={() => setSurpriseResult(null)}
          onSurpriseAgain={handleSurprise}
        />
      )}

      {/* First-visit intro */}
      {showIntro && <IntroSheet onDismiss={dismissIntro} />}
    </div>
  );
}
