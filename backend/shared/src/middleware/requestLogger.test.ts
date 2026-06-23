import { describe, it, expect, vi } from 'vitest';
import { requestLogger } from './requestLogger';

const mockLogger = { info: vi.fn() };

const makeRequest = (overrides = {}) => ({
  event: {
    httpMethod: 'POST',
    path: '/chat',
    queryStringParameters: { token: 'tok_abc' },
    ...overrides,
  },
  context: {},
  response: null,
  error: null,
  internal: {},
});

describe('requestLogger', () => {
  it('logs the HTTP method and path', async () => {
    const request = makeRequest();
    await requestLogger(mockLogger as any).before!(request as any);
    expect(mockLogger.info).toHaveBeenCalledWith(
      'POST /chat',
      expect.objectContaining({ token: 'tok_abc' }),
    );
  });

  it('handles missing query string parameters gracefully', async () => {
    const request = makeRequest({ queryStringParameters: null });
    await expect(
      requestLogger(mockLogger as any).before!(request as any),
    ).resolves.toBeUndefined();
  });
});
