import middy from '@middy/core';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyResult } from 'aws-lambda';
import { makeSessionClient } from '@cineai/shared/clients/dynamo';
import { validateToken } from '@cineai/shared/middleware/validateToken';
import { errorHandler } from '@cineai/shared/middleware/errorHandler';
import { requestLogger } from '@cineai/shared/middleware/requestLogger';
import { logger } from '@cineai/shared/logger';
import type { Session, WatchlistEntry } from '@cineai/shared/types/session';

const json = { 'Content-Type': 'application/json' };

type SessionClient = ReturnType<typeof makeSessionClient>;

export const sessionHandler = (sessionClient: SessionClient) =>
  async (event: any): Promise<APIGatewayProxyResult> => {
    const method  = event.requestContext?.http?.method ?? event.httpMethod ?? 'GET';
    const session = event.session as Session;

    if (method === 'PATCH') {
      const { entry } = JSON.parse(event.body ?? '{}') as { entry?: WatchlistEntry };

      if (entry?.tmdbId) {
        const watchlist = session.watchlist.some(e => e.tmdbId === entry.tmdbId)
          ? session.watchlist.filter(e => e.tmdbId !== entry.tmdbId)
          : [...session.watchlist, entry];

        await sessionClient.update(session.token, { watchlist });
        return { statusCode: 200, headers: json, body: JSON.stringify({ watchlist }) };
      }

      return { statusCode: 400, headers: json, body: JSON.stringify({ error: 'Missing entry' }) };
    }

    // GET — session bootstrap
    const now = new Date().toISOString();
    const isFirstVisit = session.firstOpenedAt === null;

    await sessionClient.update(session.token, {
      lastActiveAt: now,
      openCount:    session.openCount + 1,
      ...(isFirstVisit && { firstOpenedAt: now }),
    });

    return {
      statusCode: 200,
      headers: json,
      body: JSON.stringify({
        name:         session.name,
        company:      session.company,
        logoUrl:      session.logoUrl,
        watchlist:    session.watchlist,
        openCount:    session.openCount + 1,
        requestCount: session.requestCount,
        maxRequests:  session.maxRequests,
        expiresAt:    session.expiresAt,
        isFirstVisit,
        history:      session.history,
      }),
    };
  };

// Lambda entry point
const sessionClient = makeSessionClient(
  DynamoDBDocumentClient.from(new DynamoDBClient({})),
);

export const handler = middy(sessionHandler(sessionClient))
  .use(requestLogger(logger))
  .use(validateToken(sessionClient))
  .use(errorHandler(logger));
