import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ResultAsync, err, ok } from 'neverthrow';
import type { Session } from '../types/session';
import type { DynamoError } from '../types/errors';

const table = () => process.env.DYNAMODB_TABLE_NAME!;

export const makeSessionClient = (dynamo: DynamoDBDocumentClient) => ({

  get: (token: string): ResultAsync<Session, DynamoError> =>
    ResultAsync.fromPromise(
      dynamo.send(new GetCommand({ TableName: table(), Key: { token } })),
      (): DynamoError => 'TOKEN_NOT_FOUND',
    ).andThen(({ Item }) => {
      if (!Item) return err<Session, DynamoError>('TOKEN_NOT_FOUND');
      if (new Date(Item.expiresAt as string) < new Date()) return err<Session, DynamoError>('TOKEN_EXPIRED');
      return ok(Item as Session);
    }),

  put: (session: Session): ResultAsync<void, DynamoError> =>
    ResultAsync.fromPromise(
      dynamo.send(new PutCommand({ TableName: table(), Item: session })),
      (): DynamoError => 'TOKEN_NOT_FOUND',
    ).map(() => undefined),

  update: (token: string, attrs: Partial<Session>): ResultAsync<void, DynamoError> => {
    const entries = Object.entries(attrs);
    const UpdateExpression = 'SET ' + entries.map(([k], i) => `#k${i} = :v${i}`).join(', ');
    const ExpressionAttributeNames = Object.fromEntries(entries.map(([k], i) => [`#k${i}`, k]));
    const ExpressionAttributeValues = Object.fromEntries(entries.map(([, v], i) => [`:v${i}`, v]));

    return ResultAsync.fromPromise(
      dynamo.send(new UpdateCommand({
        TableName: table(),
        Key: { token },
        UpdateExpression,
        ExpressionAttributeNames,
        ExpressionAttributeValues,
      })),
      (): DynamoError => 'TOKEN_NOT_FOUND',
    ).map(() => undefined);
  },

});
