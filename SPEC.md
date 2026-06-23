# CineAI — Project Blueprint

> A personalized AI-powered movie companion delivered via magic link.
> Each hiring manager gets their own link — pre-loaded with their name,
> company logo, and a Claude that knows who they are. The experience feels
> like a knowledgeable friend who listens, not an algorithm serving metrics.

---

## Table of Contents

1. [The Idea](#the-idea)
2. [Architecture](#architecture)
3. [Auth & Access](#auth--access)
4. [Cost Controls](#cost-controls)
5. [Personalization](#personalization)
6. [Prompt Design](#prompt-design)
7. [UI/UX](#uiux)
8. [Folder Structure](#folder-structure)
9. [Build Order](#build-order-weekend-plan)
10. [Post-MVP Roadmap](#post-mvp-roadmap)

---

## The Idea

**Core features (MVP):**
- Mood-based emotional check-in on landing
- Conversational discovery ("something like Parasite but less dark")
- Surprise Me with bold explanation
- Watchlist — save picks across sessions
- Return visit awareness — Claude remembers you came back

---

## Architecture

### Infrastructure
- **Frontend:** React → built → S3 + CloudFront → `cineai.henry-molina.dev`
- **Backend:** API Gateway → Lambda (Node.js/TypeScript)
- **Database:** DynamoDB
- **DNS:** Route 53 — `henry-molina.dev` hosted zone; `cineai` subdomain aliased to CloudFront
- **TLS:** ACM certificate for `cineai.henry-molina.dev`, DNS-validated automatically via Route 53
- **IaC:** AWS CDK
- **No running servers**

### Backend
- Lambda handler functions — no Express
- API Gateway handles routing
- **Middy** — middleware chain (token validation, error handling, logging)
- **AWS Lambda Powertools for TypeScript** — structured logging wrapper
- Log level drives destination: CloudWatch (debug/info) → S3 (warn/error)

### Lambda Functions

| Function  | Route              | Responsibility                                              |
|-----------|--------------------|-------------------------------------------------------------|
| `session` | `GET /session`     | Token validation, session bootstrap, return visit detection |
| `movies`  | `GET /movies?query=` | TMDB search                                               |
| `chat`    | `POST /chat`       | Claude + conversation history + watchlist updates           |

### Shared Internal Module

```
backend/shared/
├── clients/
│   ├── dynamo.ts       ← makeSessionClient(DynamoDBClient)  → ResultAsync
│   ├── claude.ts       ← makeClaudeClient(Anthropic)        → ResultAsync
│   └── tmdb.ts         ← makeTMDBClient(fetch)              → ResultAsync
├── middleware/
│   ├── validateToken.ts    ← attaches session to event context
│   ├── errorHandler.ts     ← maps domain errors → HTTP responses
│   └── requestLogger.ts    ← Powertools structured logging
├── prompts/
│   ├── system.ts           ← buildSystemPrompt(session, mood) → string
│   ├── system.test.ts      ← snapshot tests
│   └── constants.ts        ← SURPRISE_MODE_PROMPT + static blocks
├── logger.ts               ← Powertools wrapper
└── types/
    ├── session.ts
    ├── movie.ts
    ├── chat.ts
    └── errors.ts
```

### Error Handling
- **Result Pattern** via `neverthrow`
- All AWS SDK clients wrapped to return `ResultAsync`
- Raw AWS errors mapped to typed domain errors at the client boundary
- Handlers are clean pipelines — one `if (!result.ok)` at the edge only
- Middy middleware short-circuits with typed error if token invalid

```typescript
type DynamoError = 'TOKEN_NOT_FOUND' | 'TOKEN_EXPIRED' | 'BUDGET_EXCEEDED';
type TMDBError   = 'MOVIE_NOT_FOUND' | 'RATE_LIMITED'  | 'API_DOWN';
type ClaudeError = 'CONTEXT_TOO_LONG'| 'API_ERROR'     | 'TIMEOUT';
```

### Factory Pattern

```typescript
// Production
const sessionClient = makeSessionClient(new DynamoDBClient({}));

// Tests
const sessionClient = makeSessionClient(mockDynamoClient);
```

No DI framework — factory functions + Node module cache for singleton lifecycle.

### Frontend State
- Custom hooks + React Context
- No Redux
- `SessionContext` holds name, company, logo — loaded once on landing

### Testing
- **Vitest** — colocated tests, one per module
- Backend: `environment: 'node'`
- Frontend: `environment: 'jsdom'`
- Tests live next to what they test — no top-level `__tests__/` folder

---

## Auth & Access

### Magic Links
- Self-generated tokens via local `scripts/generate-token.ts`
- One token per hiring manager, generated before each application
- Usually only the company is known at apply-time — the role and the hiring manager's name surface later, if at all. Both `name` and `role` are optional at creation. The greeting and system prompt fall back gracefully (to the company name, or to no name/role at all), and Claude is explicitly told not to invent either. `scripts/update-token.ts <token> <name|role> <value>` patches them into an existing session later, in whatever order they're learned — the magic link itself never changes.
- Script output:

```
✓ Token created for Sarah Chen @ Stripe
✓ Expires: 2026-07-07
✓ Max requests: 20

Magic link:
https://cineai.henry-molina.dev?token=abc123xyz
```

### DynamoDB Session Record

```typescript
type Session = {
  token:          string;
  name:           string | null;  // unknown until update-token patches it
  company:        string;
  role:           string | null;  // unknown until update-token patches it
  domain:         string;
  logoUrl:        string;

  // Auth & lifecycle
  createdAt:      string;       // ISO
  expiresAt:      string;       // ISO — 30 days from creation

  // Tracking
  firstOpenedAt:  string | null;
  lastActiveAt:   string | null;
  openCount:      number;       // signals return visits

  // Cost control
  requestCount:   number;
  maxRequests:    number;       // default 25

  // Watchlist
  watchlist:      WatchlistEntry[];  // metadata snapshots, not bare IDs

  // Conversation
  history:        Message[];  // each entry tagged with `visit: openCount` at write time
}
```

---

## Cost Controls

| Item | Detail |
|---|---|
| Claude model | Haiku 4.5 — $1.00 input / $5.00 output per million tokens |
| Request cap | 20 exchanges per token |
| Token expiry | 30 days |
| Log routing | S3 for long-term retention, CloudWatch for transient logs |
| AWS free tier | Covers Lambda, DynamoDB, S3 at portfolio scale |
| Estimated monthly cost | Under $1 |

**Budget alerts:**
- Set AWS budget alert at $5
- Set Anthropic Console spend limit

---

## Personalization

- Hiring manager greeted by name — Playfair Display, 48px
- Company logo via Logo.dev — free publishable key, signup required. (Originally Clearbit's Logo API; discontinued December 2025.) `logoUrl` is stored as a bare `https://img.logo.dev/{domain}` with no key; the frontend appends `?token={VITE_LOGO_DEV_API_KEY}` at render time so a key rotation never invalidates an already-issued magic link.
- Claude system prompt pre-loaded with name, company, role

**First visit:**
> "I've been expecting you."
> Mood selector shown — the captured mood lives only for this visit, never written to the session record.

**Return visit:**
> Mood selector skipped. The frontend first rehydrates the full conversation — every past visit, not just the last one — via `parseHistory(session.history)`, dropping the synthetic `"Surprise me."` / `"Returned to the app."` turns that exist purely as Claude context, never as something a user typed. Claude then opens the conversation itself on top of that — a real Haiku call (`POST /chat` with `opener: true`) — but the opener's own context is deliberately narrower than the UI's: it only ever sees the immediately preceding visit (`history.filter(m => m.visit === session.openCount - 1)`), so a recap can't reference something from further back than what it's actually opening on top of. Regular `chat`/`surprise` calls, by contrast, see the *entire* history — no truncation — so whatever the user can see rendered, Claude can always reference, and vice versa. Their reply re-establishes a fresh mood for this visit; it's never carried over from the last one, since a snapshot from weeks ago is more likely stale than useful.

---

## Prompt Design

### Two Layers

| Layer | Built | Contains |
|---|---|---|
| Static | Once per session | Persona, user identity, capabilities, boundaries, format |
| Dynamic | Per request | Mood, session intent, movies discussed so far |

Dynamic context is prepended as a system update — never as a user message.

### Claude Persona
- Warm, knowledgeable friend — not an algorithm
- Addresses user by name naturally, not constantly
- Never formal, never sycophantic (no "Great question!")
- Only discusses movies — redirects gently otherwise
- Max 3 recommendations at a time — quality over quantity
- Always explains emotional reasoning — never just lists titles

### Response Format

```typescript
type ClaudeResponse =
  | { type: 'recommendations'; movies: MovieRecommendation[]; message: string }
  | { type: 'conversation';    message: string }
  | { type: 'surprise';        movie: MovieRecommendation; reasoning: string }
```

`parseClaudeResponse` in `makeClaudeClient` validates shape → `ClaudeResponse | ClaudeError`

### Surprise Me
- Separate `surprise()` method in `makeClaudeClient`
- Appends `SURPRISE_MODE_PROMPT` to static system prompt
- Claude commits to one bold pick — no clarifying questions
- Framed as a friend pushing back on your instincts

### WatchlistEntry Type

```typescript
type WatchlistEntry = {
  tmdbId:   string;
  title:    string;
  poster:   string;
  year:     number;
  rating:   number;
  runtime:  number;
  genres:   string[];
  overview: string;
  director: string;
  cast:     string[];
};
```

A full TMDB metadata snapshot, saved at toggle time. This makes WatchlistSheet entries self-contained for MovieSheet display — no re-fetch needed. The `reasoning` field is intentionally excluded: it's Claude-generated and session-specific, so it has no value as a durable taste signal.

### Watchlist as Context

The watchlist is woven into `buildSystemPrompt` as a supporting hint, not the primary driver — mood captures "what do I want right now?" while the watchlist reveals "what kind of films do I generally appreciate?"

When a session has saved films, the system prompt appends them as a readable list:

```
Their watchlist: Parasite (2019), Inception (2010), The Truman Show (1998)
```

This serves two purposes:
1. Claude avoids re-recommending saved films (they've expressed intent to watch them already)
2. The saved titles inform taste calibration — if someone is in a "light" mood but their watchlist is full of Bergman, Claude nudges toward intelligent comedy rather than pure popcorn

Claude can also answer direct questions about the watchlist ("What have I saved?", "Do I have anything similar to this?").

### Mood Type

```typescript
type Mood = {
  label:     string;  // "nostalgic", "stressed", "adventurous"
  raw:       string;  // exactly what they typed or selected
  capturedAt: string; // ISO timestamp
}
```

### TMDB Integration Flow
```
User asks → Claude responds with titles →
code fetches TMDB data for those titles →
enriched response sent to frontend
```

### Client Shape

```typescript
// shared/clients/claude.ts
export const makeClaudeClient = (anthropic: Anthropic) => ({

  // history is sent in full — no truncation. Whatever the user can see
  // rendered in the UI, Claude can always reference, and vice versa.
  chat: (
    session: Session,
    history: Message[],
    userMessage: string,
    mood: Mood,
  ): ResultAsync<ClaudeResponse, ClaudeError> => ...,

  surprise: (
    session: Session,
    history: Message[],
    mood: Mood,
  ): ResultAsync<ClaudeResponse, ClaudeError> => ...,

  // No mood param — mood isn't known yet; the reply to this message is what reveals it.
  // Unlike chat/surprise, this one filters `history` down to `visit ===
  // session.openCount - 1` (just the immediately preceding visit) before
  // sending — a recap should never reach further back than that, even though
  // regular chat/surprise calls can see the entire conversation.
  opener: (
    session: Session,
    history: Message[],
  ): ResultAsync<ClaudeResponse, ClaudeError> => ...,

});
```

---

## UI/UX

### Design Tokens

```
Colors:
  background:   #F7F5F0   warm off-white
  surface:      #EDEAE2   cards, sheets
  border:       #D8D4C8   soft neutral
  ink:          #1C1917   warm near-black
  ink-muted:    #78716C   secondary text
  ink-faint:    #A8A29E   placeholder, metadata
  accent:       #D97706   warm amber
  accent-soft:  #FEF3C7   amber tint for highlights

Typography:
  display: Playfair Display  ← hero moments (name, headlines)
  body:    Inter             ← chat, UI chrome
  mono:    JetBrains Mono    ← metadata, tags, ratings

Spacing: 4px base unit
Radius:  4px — restrained, editorial
Motion:  150ms ease-out — subtle, never bouncy
```

### Screen 1 — Landing (the delight moment)

**Animation sequence:**
1. Company logo fades in — 300ms
2. Name fades in — 500ms, Playfair Display 48px
3. "I've been expecting you." — warm, cinematic
4. Mood cards stagger in — 50ms apart

**Mood options:** Relaxed · Stressed · Nostalgic · Curious · Adventurous · Playful
+ free text fallback input

Selecting a mood triggers amber pulse on card → smooth transition to chat.

### Screen 2 — Chat

- Claude messages: warm amber left border
- User messages: right-aligned, no border
- Movie cards slide up below each Claude response (staggered 80ms apart)
- Cards show: TMDB poster, title, year, rating
- Hover reveals one-line emotional reason
- **Sticky bottom bar:** Surprise Me button + chat input
- `···` menu: budget indicator ("18 of 20 remaining")

### Screen 3 — Movie Card (expanded bottom sheet)

Opens on card tap — chat stays visible behind (dimmed).

- Full poster, title, year, runtime, rating, genre
- "Why CineAI picked this" — amber label + Claude's reasoning
- Director, cast, streaming info from TMDB

**Actions:**

| Action | Result |
|---|---|
| Tell me more | Auto-sends message to Claude |
| Not for me | Dismisses card, signals Claude |
| Find where to watch | Opens Google search |

### Screen 4 — Watchlist Panel

Triggered by a "★ Watchlist (n)" button in the chat header. Opens as a bottom sheet over the chat.

- Lists all saved films with poster thumbnail, title, and year
- Remove button (★ → ☆) on each entry — calls `PATCH /session` to toggle off
- Empty state: "Your watchlist is empty — save a film by tapping ★ on any recommendation"
- No pagination needed at portfolio scale

### Screen 5 — Surprise Me

Full screen transition — earns its own moment.

- Large poster fades in first
- Bold reasoning copy — friend pushing back on your instincts
- **Actions:** I love it · Surprise me again

### User Actions on Recommendations

| Action | Where | Result |
|---|---|---|
| Save | Inline card | TMDB ID added to watchlist in DynamoDB |
| Tell me more | Card + bottom sheet | Auto-sends message to Claude |
| Not for me | Card + bottom sheet | Dismisses, signals Claude |
| Find where to watch | Bottom sheet | Opens Google search |

### Micro-interactions

| Moment | Interaction |
|---|---|
| Page load | Logo → name → mood cards stagger in |
| Mood selection | Amber pulse → scale up → transition to chat |
| Claude typing | Three amber dots |
| Cards appearing | Slide up 20px, fade in, staggered 80ms |
| Surprise Me | Full screen transition, poster fades in first |
| Budget warning | Subtle amber banner at 3 requests remaining |
| Budget exhausted | Claude: *"That's our time for now, Sarah."* |

### Component Map

```
frontend/src/components/
├── Landing.tsx        ← Screen 1: logo, name, mood selector
├── MoodSelector.tsx   ← mood cards grid + free text fallback
├── Chat.tsx           ← Screen 2: message thread + sticky bar
├── MovieCard.tsx      ← inline card (poster, title, year, rating)
├── MovieSheet.tsx     ← Screen 3: expanded bottom sheet
├── WatchlistSheet.tsx ← Screen 4: saved films panel (bottom sheet)
├── SurpriseMe.tsx     ← Screen 5: full screen surprise moment
└── BudgetBadge.tsx    ← request counter in nav
```

---

## Folder Structure

```
cineai/
│
├── infra/
│   ├── bin/
│   │   └── app.ts                    ← CDK entry point
│   ├── lib/
│   │   ├── cineai-stack.ts           ← main stack
│   │   └── constructs/
│   │       ├── api.ts                ← API Gateway + Lambda functions
│   │       ├── database.ts           ← DynamoDB tables
│   │       ├── frontend.ts           ← S3 + CloudFront
│   │       └── observability.ts      ← CloudWatch + S3 log bucket
│   └── cdk.json
│
├── backend/
│   ├── shared/
│   │   ├── clients/
│   │   │   ├── dynamo.ts
│   │   │   ├── dynamo.test.ts
│   │   │   ├── claude.ts
│   │   │   ├── claude.test.ts
│   │   │   ├── tmdb.ts
│   │   │   └── tmdb.test.ts
│   │   ├── middleware/
│   │   │   ├── validateToken.ts
│   │   │   ├── validateToken.test.ts
│   │   │   ├── errorHandler.ts
│   │   │   ├── errorHandler.test.ts
│   │   │   ├── requestLogger.ts
│   │   │   └── requestLogger.test.ts
│   │   ├── prompts/
│   │   │   ├── system.ts
│   │   │   ├── system.test.ts
│   │   │   └── constants.ts
│   │   ├── logger.ts
│   │   ├── logger.test.ts
│   │   └── types/
│   │       ├── session.ts
│   │       ├── movie.ts
│   │       ├── chat.ts
│   │       └── errors.ts
│   │
│   ├── session/
│   │   ├── handler.ts
│   │   └── handler.test.ts
│   │
│   ├── movies/
│   │   ├── handler.ts
│   │   └── handler.test.ts
│   │
│   ├── chat/
│   │   ├── handler.ts
│   │   └── handler.test.ts
│   │
│   ├── vitest.config.ts              ← environment: node
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Landing.tsx + Landing.test.tsx
│   │   │   ├── Chat.tsx + Chat.test.tsx
│   │   │   ├── MovieCard.tsx + MovieCard.test.tsx
│   │   │   ├── MovieSheet.tsx + MovieSheet.test.tsx
│   │   │   ├── MoodSelector.tsx + MoodSelector.test.tsx
│   │   │   ├── SurpriseMe.tsx + SurpriseMe.test.tsx
│   │   │   └── BudgetBadge.tsx + BudgetBadge.test.tsx
│   │   ├── hooks/
│   │   │   ├── useSession.ts + useSession.test.ts
│   │   │   ├── useChat.ts + useChat.test.ts
│   │   │   └── useMovies.ts + useMovies.test.ts
│   │   ├── context/
│   │   │   └── SessionContext.tsx + SessionContext.test.tsx
│   │   ├── api/
│   │   │   └── client.ts + client.test.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── vitest.config.ts              ← environment: jsdom
│   ├── package.json
│   └── tsconfig.json
│
├── scripts/
│   ├── generate-token.ts
│   └── update-token.ts
│
├── .env.example
├── .gitignore
└── README.md
```

---

## Build Order

Steps follow dependency order. Tests are written alongside each module throughout phases 2–6.

### Phase 1 — Foundation

| Step | Task |
|---|---|
| 1 | Monorepo scaffold — pnpm workspaces, root configs, all `package.json` / `tsconfig.json` files, `@cineai/shared` as a named package |

### Phase 2 — Domain Types

| Step | Task |
|---|---|
| 2 | `shared/types/` — errors, session, movie, chat |

### Phase 3 — Shared Backend

| Step | Task |
|---|---|
| 3 | `shared/clients/` — dynamo, claude, tmdb (with tests) |
| 4 | `shared/middleware/` — validateToken, errorHandler, requestLogger (with tests) |
| 5 | `shared/prompts/` — system prompt + constants (with tests) |

### Phase 4 — Lambda Handlers

| Step | Task |
|---|---|
| 6 | `session/handler.ts` + `scripts/generate-token.ts` |
| 7 | `movies/handler.ts` |
| 8 | `chat/handler.ts` |

### Phase 5 — Frontend

| Step | Task |
|---|---|
| 9  | Design tokens + global styles |
| 10 | `api/client.ts` (mock-able via `VITE_API_URL`) + `SessionContext` + `useSession` |
| 11 | `Landing` + `MoodSelector` |
| 12 | `Chat` + `useChat` |
| 13 | `MovieCard` + `MovieSheet` |
| 14 | `SurpriseMe` + `BudgetBadge` |

### Phase 6 — Infrastructure

| Step | Task |
|---|---|
| 15 | CDK stack — DynamoDB → Lambdas → API Gateway → S3 + CloudFront |

> **Note:** IAM permission issues are common — budget extra time here.

### Phase 7 — Integration

| Step | Task |
|---|---|
| 16 | Set `VITE_API_URL` to the real API Gateway endpoint from CDK output |
| 17 | Deploy frontend to S3 + CloudFront |
| 18 | End-to-end test with a real token |

---

