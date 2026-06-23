import { describe, it, expect, vi } from 'vitest';
import { errorHandler } from './errorHandler';

const mockLogger = { error: vi.fn() } as any;

const makeRequest = (error: unknown) => ({
  event: {},
  context: {},
  response: null,
  error,
  internal: {},
});

describe('errorHandler', () => {
  it('maps TOKEN_NOT_FOUND to 404', async () => {
    const request = makeRequest('TOKEN_NOT_FOUND');
    await errorHandler(mockLogger).onError!(request as any);
    expect((request.response as any).statusCode).toBe(404);
  });

  it('maps TOKEN_EXPIRED to 401', async () => {
    const request = makeRequest('TOKEN_EXPIRED');
    await errorHandler(mockLogger).onError!(request as any);
    expect((request.response as any).statusCode).toBe(401);
  });

  it('maps BUDGET_EXCEEDED to 429', async () => {
    const request = makeRequest('BUDGET_EXCEEDED');
    await errorHandler(mockLogger).onError!(request as any);
    expect((request.response as any).statusCode).toBe(429);
  });

  it('maps API_DOWN to 502', async () => {
    const request = makeRequest('API_DOWN');
    await errorHandler(mockLogger).onError!(request as any);
    expect((request.response as any).statusCode).toBe(502);
  });

  it('maps unknown errors to 500', async () => {
    const request = makeRequest(new Error('something unexpected'));
    await errorHandler(mockLogger).onError!(request as any);
    expect((request.response as any).statusCode).toBe(500);
  });
});
