# DW Architecture Blueprint

> This document describes the canonical 5-layer architecture for DW. All engineering decisions should map to one of these layers.

---

## 1. Layer Overview

```
┌──────────────────────────────────────────────────────┐
│  Layer 1 · Experience Layer                          │
│  React + TypeScript + Tailwind + shadcn/ui           │
├──────────────────────────────────────────────────────┤
│  Layer 2 · Orchestration Layer                       │
│  Express.js API · Route Handlers · Auth Middleware   │
├──────────────────────────────────────────────────────┤
│  Layer 3 · Intelligence Layer                        │
│  OpenAI-compatible LLM · Prompt Engineering          │
├──────────────────────────────────────────────────────┤
│  Layer 4 · Data Layer                                │
│  PostgreSQL · Drizzle ORM · Schema Definitions       │
├──────────────────────────────────────────────────────┤
│  Layer 5 · Integration Layer                         │
│  Resend (email) · Capacitor (mobile) · Deep Links    │
└──────────────────────────────────────────────────────┘
```

---

## 2. Layer Responsibilities

### Layer 1 — Experience Layer

**What it owns:** Rendering, user interaction, progressive disclosure.

- React 18 functional components with hooks
- TanStack React Query for server-state caching and mutations
- Wouter for client-side routing
- Tailwind CSS v4 + shadcn/ui (Radix primitives) for styling
- Lazy-loaded page components with Suspense boundaries

**Rules:**
- No business logic or data transformation in components.
- Feature flags evaluated in hooks/config before reaching JSX.
- Dark mode support is mandatory for every new component.

---

### Layer 2 — Orchestration Layer

**What it owns:** API surface, authentication, request validation, response shaping.

- Express.js route handlers in `server/routes.ts`
- Session-based authentication via `express-session`
- Input validation using Zod schemas (shared with frontend via `shared/schema.ts`)
- Domain-based endpoint grouping (e.g., `/api/goals`, `/api/insights`, `/api/dimensions`)

**Rules:**
- Every protected endpoint checks `req.session.userId` before proceeding.
- All inputs are validated with a Zod schema before use.
- Responses use explicit, documented JSON shapes per endpoint; avoid introducing a new global `{ data, error, meta }` envelope unless the existing routes are refactored to match.
- No raw SQL strings — always use Drizzle query builders.

---

### Layer 3 — Intelligence Layer

**What it owns:** AI prompt construction, response parsing, insight generation.

- OpenAI-compatible API client in `server/openai.ts`
- Prompt templates composed from user context (dimensions, goals, recent mood)
- Structured output parsing — AI responses are stored as typed objects, not raw strings
- Graceful degradation when AI is unavailable

**Rules:**
- AI outputs are **never** treated as system-of-record facts directly.
- Every AI-generated insight is stored with a `source` pointer (model, timestamp, input context hash).
- Prompts must not include PII beyond what is strictly necessary for the response.
- All AI calls have timeout + retry guards.

---

### Layer 4 — Data Layer

**What it owns:** Schema definitions, database access, migrations.

- PostgreSQL managed via Drizzle ORM
- All schemas defined in `shared/schema.ts` (single source of truth)
- Migrations via `npm run db:push`
- Two categories of stored data:

| Category | Examples | Rules |
|----------|----------|-------|
| **System-of-record facts** | Goals, events, mood logs, user profile | Authoritative; never overwritten by AI |
| **AI interpretations** | Insights, suggestions, reframes | Always stored with source metadata; can be dismissed |

**Rules:**
- Schema changes must be backward-compatible or include a migration path.
- Indexes must be added for any column used in a `WHERE` or `ORDER BY` clause at scale.
- Guest users store equivalent data in `localStorage`; schema must mirror the DB shape.

---

### Layer 5 — Integration Layer

**What it owns:** External services and native platform bridges.

- **Resend** — transactional email (password reset, notifications)
- **Capacitor** — iOS and Android native wrapper; deep-link handling
- **Web Speech API** — STT/TTS for voice interaction
- **Siri / Google Assistant** — deep-link protocol (`dwai://action?type=...`)

**Rules:**
- All third-party API keys in environment variables; never committed.
- Integration failures are caught and surfaced as user-facing errors, not silent crashes.
- Capacitor plugins are only invoked inside platform-detection guards.

---

## 3. Home Aggregator Service Principle

The **Today Hub** (`/today`) is the conceptual home aggregator for DW: it is responsible for surfacing lightweight summaries from each domain (goals, habits, calendar, mood, insights) in one place.

**Current state:** `today-hub` currently fans out to multiple domain-specific endpoints on initial load (e.g., `/api/auth/me`, `/api/mood/today`, `/api/calendar`, `/api/schedule`, `/api/routines`, `/api/goals`) using parallel React Query calls. There is **no** `/api/today-summary` route implemented in `server/routes.ts` yet.

**Target design:** introduce a consolidated `/api/today-summary` endpoint that:

1. Queries each domain service in parallel.
2. Merges results into a unified summary object.
3. Returns a single response so the UI does not need to fan out on initial load.

Moving toward this aggregator pattern is intended to keep the home screen fast, simplify client data-fetching logic, and prevent waterfall fetches.

---

## 4. Data Flow Diagram

```
User Action
    │
    ▼
Experience Layer (React component)
    │  dispatches mutation / query
    ▼
Orchestration Layer (Express route)
    │  validates input · checks auth
    ├──► Intelligence Layer (if AI needed)
    │         │ returns structured AI output
    │         ▼
    └──► Data Layer (Drizzle ORM)
              │ reads / writes PostgreSQL
              ▼
         Response shaped & returned to client
```

---

## 5. Cross-Cutting Concerns

| Concern | Implementation |
|---------|---------------|
| **Authentication** | `express-session` + bcrypt password hashing |
| **Error handling** | Centralized Express error middleware; React error boundaries |
| **Logging** | Server-side `console.error` with request context (no PII) |
| **Feature flags** | Config object in `client/src/config/`; evaluated at hook level |
| **Caching** | React Query for client; no server-side caching layer yet |
| **Mobile** | Capacitor wraps the Vite build; `webDir: dist/public` |
