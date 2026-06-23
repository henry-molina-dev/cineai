import type { MiddlewareObj } from '@middy/core';
import type { Logger } from '@aws-lambda-powertools/logger';

export const requestLogger = (logger: Logger): MiddlewareObj => ({
  before: async (request) => {
    const event = request.event as any;
    const method = event.requestContext?.http?.method ?? event.httpMethod ?? 'UNKNOWN';
    const path   = event.requestContext?.http?.path   ?? event.rawPath    ?? event.path ?? '/';
    const token  = event.queryStringParameters?.token ?? null;

    logger.info(`${method} ${path}`, { token });
  },
});
