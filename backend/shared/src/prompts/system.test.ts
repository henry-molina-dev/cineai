import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from './system';
import type { Session, Mood, WatchlistEntry } from '../types/session';

const baseSession: Session = {
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
  requestCount:  5,
  maxRequests:   20,
  watchlist:     [],
  history:       [],
};

const mood: Mood = { label: 'Nostalgic', raw: 'feeling nostalgic', capturedAt: '2026-06-01T12:00:00.000Z' };

const parasite: WatchlistEntry = {
  tmdbId: '496243', title: 'Parasite', poster: '/par.jpg', year: 2019,
  rating: 8.5, runtime: 132, genres: ['Thriller'], overview: 'Two families.',
  director: 'Bong Joon-ho', cast: ['Song Kang-ho'],
};

const inception: WatchlistEntry = {
  tmdbId: '27205', title: 'Inception', poster: '/inc.jpg', year: 2010,
  rating: 8.8, runtime: 148, genres: ['Action'], overview: 'Dream heist.',
  director: 'Christopher Nolan', cast: ['Leonardo DiCaprio'],
};

describe('buildSystemPrompt', () => {
  it('includes user identity', () => {
    const prompt = buildSystemPrompt(baseSession, null);
    expect(prompt).toContain('Sarah Chen');
    expect(prompt).toContain('Engineering Manager');
    expect(prompt).toContain('Stripe');
  });

  it('omits a name reference and avoids inventing one when the name is unknown', () => {
    const session = { ...baseSession, name: null };
    const prompt = buildSystemPrompt(session, null);
    expect(prompt).not.toContain('null');
    expect(prompt).toContain('Engineering Manager');
    expect(prompt).toContain('Stripe');
    expect(prompt).toContain("don't address them by name");
  });

  it('omits a role reference when the role is unknown', () => {
    const session = { ...baseSession, role: null };
    const prompt = buildSystemPrompt(session, null);
    expect(prompt).not.toContain('null');
    expect(prompt).toContain('Sarah Chen');
    expect(prompt).toContain('Stripe');
  });

  it('avoids inventing either name or role when both are unknown', () => {
    const session = { ...baseSession, name: null, role: null };
    const prompt = buildSystemPrompt(session, null);
    expect(prompt).not.toContain('null');
    expect(prompt).toContain('Stripe');
    expect(prompt).toContain("don't address them by name");
  });

  it('includes budget remaining', () => {
    const prompt = buildSystemPrompt(baseSession, null);
    expect(prompt).toContain('15');
  });

  it('includes mood when provided', () => {
    const prompt = buildSystemPrompt(baseSession, mood);
    expect(prompt).toContain('Nostalgic');
    expect(prompt).toContain('feeling nostalgic');
  });

  it('omits mood block when null', () => {
    const prompt = buildSystemPrompt(baseSession, null);
    expect(prompt).not.toContain('Their current mood:');
  });

  it('includes return visit note when openCount > 1', () => {
    const session = { ...baseSession, openCount: 3 };
    const prompt = buildSystemPrompt(session, null);
    expect(prompt).toContain('return visit');
    expect(prompt).toContain('3');
  });

  it('omits return visit note on first visit', () => {
    const prompt = buildSystemPrompt(baseSession, null);
    expect(prompt).not.toContain('return visit');
  });

  it('omits watchlist block when empty', () => {
    const prompt = buildSystemPrompt(baseSession, null);
    expect(prompt).not.toContain('Their watchlist:');
  });

  it('includes watchlist titles when non-empty', () => {
    const session = { ...baseSession, watchlist: [parasite, inception] };
    const prompt = buildSystemPrompt(session, null);
    expect(prompt).toContain('Parasite (2019)');
    expect(prompt).toContain('Inception (2010)');
  });

  it('instructs Claude to treat watchlist as taste signal, not a re-recommendation block', () => {
    const session = { ...baseSession, watchlist: [parasite] };
    const prompt = buildSystemPrompt(session, null);
    expect(prompt).toContain('taste');
  });
});
