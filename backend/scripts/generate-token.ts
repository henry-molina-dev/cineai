#!/usr/bin/env tsx
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { makeSessionClient } from '@cineai/shared/clients/dynamo';
import type { Session } from '@cineai/shared/types/session';
import crypto from 'crypto';

const [,, company, domain, role, name] = process.argv;

if (!company || !domain) {
  console.error('Usage: pnpm generate-token <company> <domain> [role] [name]');
  console.error('Example: pnpm generate-token "Stripe" "stripe.com" "Engineering Manager" "Sarah Chen"');
  console.error('role and name are optional — omit whichever isn\'t known yet, and patch it in later with update-token.');
  process.exit(1);
}

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sessionClient = makeSessionClient(dynamo);

const token     = crypto.randomBytes(16).toString('hex');
const now       = new Date();
const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

const session: Session = {
  token,
  name: name ?? null,
  company,
  role: role ?? null,
  domain,
  logoUrl:       `https://img.logo.dev/${domain}`,
  createdAt:     now.toISOString(),
  expiresAt:     expiresAt.toISOString(),
  ttl:           Math.floor(expiresAt.getTime() / 1000),
  firstOpenedAt: null,
  lastActiveAt:  null,
  openCount:     0,
  requestCount:  0,
  maxRequests:   25,
  watchlist:     [],
  history:       [],
};

void (async () => {
  const result = await sessionClient.put(session);

  if (result.isErr()) {
    console.error('✗ Failed to create token:', result.error);
    process.exit(1);
  }

  const baseUrl   = process.env.BASE_URL ?? 'http://localhost:5173';
  const magicLink = `${baseUrl}?token=${token}`;

  console.log(`
✓ Token created for ${name ?? '(name unknown)'} ${role ? `— ${role} ` : ''}@ ${company}
✓ Expires: ${expiresAt.toLocaleDateString()}
✓ Max requests: ${session.maxRequests}

Magic link:
${magicLink}
`);
})();
