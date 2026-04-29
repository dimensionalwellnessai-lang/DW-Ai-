# Threat Model

## Project Overview

DW Wellness AI is a full-stack Express + React + PostgreSQL app that gives users a personal wellness assistant, chat features, calendar tools, imports, finance coaching, wearable integrations, and other life-system features. In production, the main server entry point is `server/index.ts`, route registration is centered in `server/routes.ts`, and several larger features also live under `server/routes/`.

The app stores sensitive personal data: account details, chat history, uploaded files, calendar data, financial data from Plaid, wearable data, imported documents, and tokens for external services. Production assumptions for this repo: `NODE_ENV=production`, TLS is handled by the platform, and mockup sandbox code is not deployed.

## Assets

- **User accounts and sessions** — email addresses, hashed passwords, password reset tokens, session cookies, OAuth-linked identities. If these are mishandled, attackers can sign in as other users.
- **Sensitive personal data** — chats, onboarding answers, moods, routines, goals, reminders, calendar events, uploaded documents, imported conversations, and profile details. This is private user data and should not leak across users or into logs.
- **Financial and health-related data** — Plaid items, financial accounts, transactions, holdings, savings goals, and wearable data. This data is especially sensitive and can cause real harm if exposed.
- **Application secrets and third-party credentials** — session secret, OpenAI credentials, Plaid secrets, OAuth secrets, email provider secrets, push keys, and any long-lived API keys. Exposure can let attackers abuse external services or impersonate the app.
- **User-generated files and imports** — uploaded plan files, imported document items, imported chat transcripts, and derived excerpts/summaries. These must stay scoped to the owning user.

## Trust Boundaries

- **Browser / mobile client to Express API** — every request from the client is untrusted until the server validates auth, ownership, and input.
- **Express API to PostgreSQL** — the API has broad database access, so broken authorization or unsafe queries can expose or modify many users' records.
- **Express API to external providers** — the server talks to OpenAI, Plaid, Google/Facebook OAuth, wearable providers, email delivery, and object storage. Tokens crossing this boundary must never leak in logs or client code.
- **Public routes vs authenticated routes** — some endpoints are intentionally public, but most data-bearing routes must require a valid session and then enforce per-user ownership.
- **Production code vs dev-only/supporting code** — `server/**`, `client/**`, `shared/**`, migrations, and runtime config files are production-relevant. Local skills, mockups, and sandbox-only helpers should usually be ignored unless production reachability is shown.

## Scan Anchors

- **Production entry points:** `server/index.ts`, `server/routes.ts`, feature route files under `server/routes/`, `server/storage.ts`, `shared/schema.ts`.
- **Highest-risk areas:** auth/session setup in `server/routes.ts`; response logging in `server/index.ts`; finance/Plaid/realtime routes in `server/routes/finances.ts`, `server/routes/plaid.ts`, and `server/routes/realtime.ts`; object ownership checks in `server/routes.ts` plus `server/storage.ts`.
- **Public surface:** login/register/reset, OAuth entry/callbacks, AI helper endpoints, content browse endpoints, webhook-style/public token endpoints such as calendar ICS.
- **Authenticated surface:** nearly all user data, imports, plans, calendar, finances, wearables, tasks, chats, and profile routes.
- **Usually out of scope unless proven reachable in production:** `.agents/**`, `.local/**` skills, mockup/sandbox-only code, and development-only tooling.

## Threat Categories

### Spoofing

This app relies on cookie sessions plus optional OAuth providers. The server must make sure session identifiers are strong, session state changes are saved safely, and OAuth identities are only linked to the right local account. Password reset and OAuth flows must not let an attacker claim another user's account.

Required guarantees:
- Authenticated routes MUST require a valid server-side session.
- OAuth account linking MUST be based on a trustworthy identity check, not just a hopeful email match.
- Password reset tokens MUST be high-entropy, one-time use, and never logged.

### Tampering

The client can send IDs, nested item lists, imported content, and many update payloads. The server must not trust user-supplied IDs without checking ownership. Any route that updates or deletes records by ID must tie that action back to `req.session.userId` or another trusted ownership rule.

Required guarantees:
- Every update/delete route MUST enforce record ownership server-side.
- Batch update endpoints MUST verify each child record belongs to the authenticated user's parent object.
- Client input MUST be validated and ignored if it tries to set protected ownership fields.

### Information Disclosure

The app handles very private wellness, finance, calendar, and chat data. The biggest risk is over-broad reads or secrets/PII being written into logs, source control, or client-visible responses. Logging is especially sensitive because many integrations return tokens or financial records.

Required guarantees:
- Secrets and API keys MUST NOT be committed to source control.
- Sensitive API responses MUST NOT be logged in production.
- Read endpoints MUST scope data to the authenticated user before returning it.
- Error responses and telemetry MUST avoid exposing tokens, private URLs, or internal secrets.

### Denial of Service

Several public endpoints trigger LLM calls, document processing, email sends, uploads, or external API calls. These can burn money or degrade service if they are left unbounded.

Required guarantees:
- Public AI and auth endpoints MUST have practical rate limits.
- Upload and body sizes MUST stay bounded.
- Expensive external calls SHOULD be protected from easy unauthenticated abuse.

### Elevation of Privilege

Because most data belongs to individual end users, the main privilege-escalation risk is broken object-level authorization: one user reading, changing, or deleting another user's records. A second risk is secret leakage that lets an attacker act as the app against outside services.

Required guarantees:
- Any route using `:id` or child item IDs MUST verify ownership before read, update, or delete.
- Storage helpers SHOULD support user-scoped reads/writes for sensitive objects instead of raw ID-only access.
- Third-party secrets MUST stay in environment storage and out of tracked files and logs.
