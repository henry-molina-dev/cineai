import type { MiddlewareObj } from '@middy/core';
import { Logger } from '@aws-lambda-powertools/logger';

const STATUS_MAP: Record<string, number> = {
  TOKEN_NOT_FOUND:  404,
  TOKEN_EXPIRED:    401,
  BUDGET_EXCEEDED:  429,
  MOVIE_NOT_FOUND:  404,
  RATE_LIMITED:     429,
  API_DOWN:         502,
  CONTEXT_TOO_LONG: 422,
  API_ERROR:        502,
  TIMEOUT:          504,
};

export const errorHandler = (logger: Logger): MiddlewareObj => ({
  onError: async (request) => {
    const raw = request.error;
    const key = typeof raw === 'string' ? raw : (raw as Error)?.message ?? 'UNKNOWN';
    const statusCode = STATUS_MAP[key] ?? 500;

    logger.error('Unhandled error', { error: key, statusCode });

    request.response = {
      statusCode,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: key }),
    };
  },
});
