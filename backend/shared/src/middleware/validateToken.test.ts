import { describe, it, expect, vi } from 'vitest';
import { ok as okResult, err as errResult } from 'neverthrow';
import { validateToken } from './validateToken';
import type { Session } from '../types/session';

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

const mockClient = (getResult: any) => ({
  get: vi.fn().mockResolvedValue(getResult),
  put: vi.fn(),
  update: vi.fn(),
});

const makeRequest = (token?: string) => ({
  event: { queryStringParameters: token ? { token } : null },
  context: {},
  response: null,
  error: null,
  internal: {},
});

describe('validateToken', () => {
  it('attaches session to event when token is valid', async () => {
    const client = mockClient(okResult(mockSession));
    const request = makeRequest('tok_abc');
    const response = await validateToken(client as any).before!(request as any);
    expect(response).toBeUndefined();
    expect((request.event as any).session).toEqual(mockSession);
  });

  it('short-circuits with 401 when no token is provided', async () => {
    const client = mockClient(okResult(mockSession));
    const request = makeRequest();
    const response = await validateToken(client as any).before!(request as any);
    expect((response as any).statusCode).toBe(401);
  });

  it('short-circuits with 404 when token is not found', async () => {
    const client = mockClient(errResult('TOKEN_NOT_FOUND' as const));
    const request = makeRequest('tok_abc');
    const response = await validateToken(client as any).before!(request as any);
    expect((response as any).statusCode).toBe(404);
  });

  it('short-circuits with 401 when token is expired', async () => {
    const client = mockClient(errResult('TOKEN_EXPIRED' as const));
    const request = makeRequest('tok_abc');
    const response = await validateToken(client as any).before!(request as any);
    expect((response as any).statusCode).toBe(401);
  });

  it('short-circuits with 429 when budget is exceeded', async () => {
    const client = mockClient(errResult('BUDGET_EXCEEDED' as const));
    const request = makeRequest('tok_abc');
    const response = await validateToken(client as any).before!(request as any);
    expect((response as any).statusCode).toBe(429);
  });
});
