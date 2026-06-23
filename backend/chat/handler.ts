import middy from '@middy/core';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import Anthropic from '@anthropic-ai/sdk';
import type { APIGatewayProxyResult } from 'aws-lambda';
import { makeSessionClient } from '@cineai/shared/clients/dynamo';
import { makeClaudeClient } from '@cineai/shared/clients/claude';
import { makeTMDBClient } from '@cineai/shared/clients/tmdb';
import { validateToken } from '@cineai/shared/middleware/validateToken';
import { errorHandler } from '@cineai/shared/middleware/errorHandler';
import { requestLogger } from '@cineai/shared/middleware/requestLogger';
import { logger } from '@cineai/shared/logger';
import type { Session, Mood } from '@cineai/shared/types/session';
import type { Message, ClaudeResponse } from '@cineai/shared/types/chat';
import type { MovieRecommendation } from '@cineai/shared/types/movie';

const json = { 'Content-Type': 'application/json' };
const MAX_MESSAGE_LENGTH = 500;

type SessionClient = ReturnType<typeof makeSessionClient>;
type ClaudeClient  = ReturnType<typeof makeClaudeClient>;
type TMDBClient    = ReturnType<typeof makeTMDBClient>;

type ChatBody = {
  message?:  string;
  surprise?: boolean;
  opener?:   boolean;
  mood?:     Mood;
};

const enrichMovie = async (movie: MovieRecommendation, tmdbClient: TMDBClient): Promise<MovieRecommendation> => {
  const result = await tmdbClient.search(movie.title, movie.year);
  if (result.isErr()) {
    logger.warn('TMDB lookup failed', { title: movie.title, year: movie.year, error: result.error });
    return movie;
  }
  const tmdb = result.value;
  if (!tmdb.poster) logger.warn('TMDB returned no poster', { title: movie.title, tmdbId: tmdb.tmdbId });
  else logger.info('TMDB enrichment ok', { title: movie.title, tmdbId: tmdb.tmdbId, poster: tmdb.poster });
  return { ...movie, tmdbId: tmdb.tmdbId, poster: tmdb.poster, rating: tmdb.rating, runtime: tmdb.runtime, genres: tmdb.genres };
};

const enrichResponse = async (response: ClaudeResponse, tmdbClient: TMDBClient): Promise<ClaudeResponse> => {
  if (response.type === 'recommendations') {
    const movies = await Promise.all(response.movies.map(m => enrichMovie(m, tmdbClient)));
    return { ...response, movies };
  }
  if (response.type === 'surprise') {
    const movie = await enrichMovie(response.movie, tmdbClient);
    return { ...response, movie };
  }
  return response;
};

export const chatHandler = (sessionClient: SessionClient, claudeClient: ClaudeClient, tmdbClient: TMDBClient) =>
  async (event: any): Promise<APIGatewayProxyResult> => {
    const session = event.session as Session;
    const body    = JSON.parse(event.body ?? '{}') as ChatBody;

    if (session.requestCount >= session.maxRequests) {
      return { statusCode: 429, headers: json, body: JSON.stringify({ error: 'BUDGET_EXCEEDED' }) };
    }

    if (!body.surprise && !body.opener && (body.message ?? '').length > MAX_MESSAGE_LENGTH) {
      return { statusCode: 400, headers: json, body: JSON.stringify({ error: 'MESSAGE_TOO_LONG' }) };
    }

    const mood = body.mood ?? { label: 'curious', raw: 'curious', capturedAt: new Date().toISOString() };

    const result = body.opener
      ? await claudeClient.opener(session, session.history)
      : body.surprise
        ? await claudeClient.surprise(session, session.history, mood)
        : await claudeClient.chat(session, session.history, body.message ?? '', mood);

    if (result.isErr()) {
      logger.error('Claude client error', { error: result.error });
      return { statusCode: 502, headers: json, body: JSON.stringify({ error: result.error }) };
    }

    const enriched = await enrichResponse(result.value, tmdbClient);

    const userMsg: Message      = {
      role: 'user',
      content: body.opener ? 'Returned to the app.' : body.surprise ? 'Surprise me.' : (body.message ?? ''),
      visit: session.openCount,
    };
    const assistantMsg: Message = { role: 'assistant', content: JSON.stringify(enriched), visit: session.openCount };

    await sessionClient.update(session.token, {
      requestCount: session.requestCount + 1,
      lastActiveAt: new Date().toISOString(),
      history:      [...session.history, userMsg, assistantMsg],
    });

    return { statusCode: 200, headers: json, body: JSON.stringify(enriched) };
  };

// Lambda entry point
const sessionClient = makeSessionClient(
  DynamoDBDocumentClient.from(new DynamoDBClient({})),
);
const claudeClient = makeClaudeClient(new Anthropic(), logger);
const tmdbClient   = makeTMDBClient(fetch);

export const handler = middy(chatHandler(sessionClient, claudeClient, tmdbClient))
  .use(requestLogger(logger))
  .use(validateToken(sessionClient))
  .use(errorHandler(logger));
