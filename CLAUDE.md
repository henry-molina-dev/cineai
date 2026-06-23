# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
pnpm install

# Frontend (no backend/AWS credentials needed)
pnpm --filter frontend dev:mock        # mock mode — two pre-wired tokens: ?token=first-visit, ?token=return-visit
pnpm --filter frontend dev             # real backend (requires VITE_API_URL in .env)

# Tests
pnpm --filter backend test             # run all backend + shared tests
pnpm --filter backend test:watch
pnpm --filter frontend test
pnpm --filter frontend test:watch

# Run a single test file (from repo root)
cd backend && npx vitest run shared/src/clients/dynamo.test.ts

# Type-check
cd backend/shared && npx tsc --noEmit
cd backend && npx tsc --noEmit
cd frontend && npx tsc --noEmit

# Magic link management
source .env && AWS_PROFILE=personal DYNAMODB_TABLE_NAME=$DYNAMODB_TABLE_NAME BASE_URL=$BASE_URL \
  pnpm --filter backend generate-token "Company" "domain.com" ["Role"] ["Name"]
source .env && AWS_PROFILE=personal DYNAMODB_TABLE_NAME=$DYNAMODB_TABLE_NAME \
  pnpm --filter backend update-token "<token>" <name|role> "<value>"
```

## Architecture

**Monorepo** via pnpm workspaces: `backend`, `backend/shared` (published as `@cineai/shared`), `frontend`, `infra`.

### Backend

Three Lambda handlers — no Express, no running servers. API Gateway handles routing; **Middy** handles the middleware chain.

```
POST /chat      → backend/chat/handler.ts
GET  /session   → backend/session/handler.ts     (also PATCH for watchlist toggles)
GET  /movies    → backend/movies/handler.ts
```

Each handler is exported as a plain function that takes its client dependencies (`chatHandler(sessionClient, claudeClient, tmdbClient)`) and is wrapped with `middy(...).use(requestLogger).use(validateToken).use(errorHandler)` at the module level for the Lambda entry point. This factory pattern keeps tests clean — no mocking of module internals.

**`backend/shared/`** (`@cineai/shared`) is consumed by all three handlers:

- `clients/dynamo.ts` — `makeSessionClient(DynamoDBDocumentClient)` → CRUD on DynamoDB sessions
- `clients/claude.ts` — `makeClaudeClient(Anthropic, logger)` with three methods: `chat`, `surprise`, `opener`
- `clients/tmdb.ts`  — `makeTMDBClient(fetch)` → TMDB search
- `middleware/validateToken.ts` — Middy middleware; reads token from query string, fetches session from DynamoDB, attaches `event.session`
- `middleware/errorHandler.ts` — maps domain errors to HTTP status codes
- `prompts/system.ts` — `buildSystemPrompt(session, mood)` builds the static system prompt layer
- `prompts/constants.ts` — `SURPRISE_MODE_PROMPT` and other static blocks
- `types/` — shared TypeScript types (`Session`, `Mood`, `Message`, `ClaudeResponse`, `WatchlistEntry`, error unions)

### Error handling

All external calls return `ResultAsync<T, DomainError>` via **neverthrow** — no thrown exceptions. Handlers use a single `if (result.isErr())` check at the edge. Raw AWS/API errors are mapped to typed domain errors at the client boundary:

```typescript
type DynamoError = 'TOKEN_NOT_FOUND' | 'TOKEN_EXPIRED' | 'BUDGET_EXCEEDED';
type TMDBError   = 'MOVIE_NOT_FOUND' | 'RATE_LIMITED'  | 'API_DOWN';
type ClaudeError = 'CONTEXT_TOO_LONG'| 'API_ERROR'     | 'TIMEOUT';
```

### Claude response types

```typescript
type ClaudeResponse =
  | { type: 'recommendations'; movies: MovieRecommendation[]; message: string }
  | { type: 'conversation';    message: string }
  | { type: 'surprise';        movie: MovieRecommendation; reasoning: string }
```

`parseClaudeResponse` in `makeClaudeClient` validates the shape before returning.

### Chat handler flow

1. Middy validates token → attaches `event.session`
2. Handler routes to `claudeClient.opener | .surprise | .chat`
3. Claude response is TMDB-enriched (parallel fetches for poster, rating, runtime, genres)
4. Both the user and assistant messages are appended to `session.history` with a `visit: openCount` tag
5. `sessionClient.update` persists the new history + incremented `requestCount`

### Frontend

React 18, no Redux. State lives in `SessionContext` (loaded once on mount via `GET /session`) and local hook state.

- **Mock mode** (`VITE_MOCK=true`): `makeMockApiClient()` replaces the real API client — use `?token=first-visit` or `?token=return-visit` to test both flows without AWS.
- `App.tsx` extracts `?token=` from the URL, passes it to `SessionProvider`, then renders `<Landing />` (first visit + no mood) or `<Chat />`.
- `api/client.ts` and `api/mock-client.ts` share the same interface — the factory swap happens at `App.tsx` module level.

### Return-visit history

- `session.history` stores every message tagged with `visit: openCount`.
- On a return visit, the frontend renders all prior messages via `parseHistory(session.history)`, stripping synthetic turns (`"Surprise me."` / `"Returned to the app."`).
- The `opener` Claude call sees only `history.filter(m => m.visit === session.openCount - 1)` — just the immediately preceding visit — so the recap never reaches further back than what the opener is opening on top of.
- Regular `chat` / `surprise` calls send the **full** history — no truncation.

### Infrastructure

CDK stack in `infra/lib/cineai-stack.ts`. AWS profile `personal`. After first deploy, copy `ApiUrl` → `VITE_API_URL` and `DistributionUrl` → `BASE_URL` into `.env`; copy the generated DynamoDB table name into `DYNAMODB_TABLE_NAME`.

## Key design decisions

- **`VITE_LOGO_DEV_API_KEY`** is intentionally in the frontend bundle — it's a publishable key (`pk_...`) that can only fetch logo images. Stored as a bare `https://img.logo.dev/{domain}` URL in DynamoDB; the frontend appends `?token=` at render time so rotating the key only needs a frontend redeploy, not a re-issue of all magic links.
- **Mood is never persisted** — it lives only for the current visit in React state.
- **`WatchlistEntry` stores full TMDB metadata** (not bare IDs) so `WatchlistSheet` entries are self-contained for `MovieSheet` display without a re-fetch. The `reasoning` field is excluded deliberately — it's session-specific and has no value as a durable taste signal.
- Tests are colocated with their modules — no top-level `__tests__/` folder. Backend environment is `node`, frontend is `jsdom`.
