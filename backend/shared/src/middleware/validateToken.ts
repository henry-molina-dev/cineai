import type { MiddlewareObj } from '@middy/core';
import type { APIGatewayProxyResult } from 'aws-lambda';
import type { makeSessionClient } from '../clients/dynamo';
import type { DynamoError } from '../types/errors';

type SessionClient = ReturnType<typeof makeSessionClient>;

const STATUS_MAP: Record<DynamoError, number> = {
  TOKEN_NOT_FOUND: 404,
  TOKEN_EXPIRED:   401,
  BUDGET_EXCEEDED: 429,
};

const errorResponse = (statusCode: number, error: string): APIGatewayProxyResult => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ error }),
});

export const validateToken = (sessionClient: SessionClient): MiddlewareObj => ({
  before: async (request) => {
    const token = (request.event as any).queryStringParameters?.token as string | undefined;
    if (!token) return errorResponse(401, 'TOKEN_NOT_FOUND');

    const result = await sessionClient.get(token);
    if (result.isErr()) return errorResponse(STATUS_MAP[result.error], result.error);

    (request.event as any).session = result.value;
  },
});
