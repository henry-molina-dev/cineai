#!/usr/bin/env tsx
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { makeSessionClient } from '@cineai/shared/clients/dynamo';

const VALID_FIELDS = ['name', 'role'] as const;
type Field = typeof VALID_FIELDS[number];

const [,, token, field, value] = process.argv;

if (!token || !field || !value || !VALID_FIELDS.includes(field as Field)) {
  console.error('Usage: pnpm update-token <token> <name|role> <value>');
  console.error('Example: pnpm update-token abc123xyz name "Sarah Chen"');
  console.error('Example: pnpm update-token abc123xyz role "Engineering Manager"');
  console.error('Use this once you learn the hiring manager\'s name or role — the magic link itself never changes.');
  process.exit(1);
}

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sessionClient = makeSessionClient(dynamo);

void (async () => {
  const result = await sessionClient.update(token, { [field as Field]: value });

  if (result.isErr()) {
    console.error('✗ Failed to update token:', result.error);
    process.exit(1);
  }

  console.log(`✓ ${field} updated to "${value}" for token ${token}`);
})();
