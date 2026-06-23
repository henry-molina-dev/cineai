import { describe, it, expect, vi } from 'vitest';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { makeSessionClient } from './dynamo';
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
  openCount:     0,
  requestCount:  0,
  maxRequests:   20,
  watchlist:     [],
  history:       [],
};

const mockDoc = (response: unknown) =>
  ({ send: vi.fn().mockResolvedValue(response) }) as unknown as DynamoDBDocumentClient;

describe('makeSessionClient', () => {
  describe('get', () => {
    it('returns the session when found and not expired', async () => {
      const client = makeSessionClient(mockDoc({ Item: mockSession }));
      const result = await client.get('tok_abc');
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual(mockSession);
    });

    it('returns TOKEN_NOT_FOUND when the item does not exist', async () => {
      const client = makeSessionClient(mockDoc({ Item: undefined }));
      const result = await client.get('tok_abc');
      expect(result._unsafeUnwrapErr()).toBe('TOKEN_NOT_FOUND');
    });

    it('returns TOKEN_EXPIRED when expiresAt is in the past', async () => {
      const expired = { ...mockSession, expiresAt: '2020-01-01T00:00:00.000Z' };
      const client = makeSessionClient(mockDoc({ Item: expired }));
      const result = await client.get('tok_abc');
      expect(result._unsafeUnwrapErr()).toBe('TOKEN_EXPIRED');
    });
  });

  describe('update', () => {
    it('resolves ok on a successful update', async () => {
      const client = makeSessionClient(mockDoc({}));
      const result = await client.update('tok_abc', { openCount: 1 });
      expect(result.isOk()).toBe(true);
    });
  });

  describe('put', () => {
    it('resolves ok on a successful put', async () => {
      const client = makeSessionClient(mockDoc({}));
      const result = await client.put(mockSession);
      expect(result.isOk()).toBe(true);
    });
  });
});
