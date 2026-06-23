import middy from '@middy/core';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyResult } from 'aws-lambda';
import { makeSessionClient } from '@cineai/shared/clients/dynamo';
import { makeTMDBClient } from '@cineai/shared/clients/tmdb';
import { validateToken } from '@cineai/shared/middleware/validateToken';
import { errorHandler } from '@cineai/shared/middleware/errorHandler';
import { requestLogger } from '@cineai/shared/middleware/requestLogger';
import { logger } from '@cineai/shared/logger';

const json = { 'Content-Type': 'application/json' };

type TMDBClient = ReturnType<typeof makeTMDBClient>;

export const moviesHandler = (tmdbClient: TMDBClient) =>
  async (event: any): Promise<APIGatewayProxyResult> => {
    const query = event.queryStringParameters?.query as string | undefined;

    if (!query) {
      return { statusCode: 400, headers: json, body: JSON.stringify({ error: 'Missing query parameter' }) };
    }

    const result = await tmdbClient.search(query);

    if (result.isErr()) {
      const statusCode = result.error === 'MOVIE_NOT_FOUND' ? 404 : 502;
      logger.error('TMDB client error', { error: result.error });
      return { statusCode, headers: json, body: JSON.stringify({ error: result.error }) };
    }

    return { statusCode: 200, headers: json, body: JSON.stringify(result.value) };
  };

// Lambda entry point
const sessionClient = makeSessionClient(
  DynamoDBDocumentClient.from(new DynamoDBClient({})),
);

export const handler = middy(moviesHandler(makeTMDBClient(fetch)))
  .use(requestLogger(logger))
  .use(validateToken(sessionClient))
  .use(errorHandler(logger));
