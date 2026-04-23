# Unauthenticated POST endpoint inventory

This document is the running audit produced by task #110 ("Roll Plaid
webhook signature checks out to the operator alerting endpoints too"). It
catalogues every public `POST` (and write-method) HTTP endpoint that can run
without an authenticated session, and records the defence each one relies
on. Every new unauthenticated mutating endpoint must be added here with one
of the three approved defences:

1. **Provider signature verification** — the request carries a JWT or HMAC
   signature we verify against a provider-issued key. Use the helpers in
   `server/webhook-signature.ts` (`verifyJwtWebhookSignature` /
   `verifyHmacWebhookSignature`) so we have one well-tested implementation
   to maintain instead of hand-rolling another.
2. **Per-IP rate limit** — the endpoint is intentionally callable by guests
   (e.g. login, public AI demo). The handler chains an `express-rate-limit`
   middleware so a single abuser can't burn through OpenAI quota or spam
   the support inbox.
3. **No state mutation** — the handler reads only and is safe to expose
   without throttling. Such endpoints are still listed below for completeness
   so future audits can confirm nothing has crept in.

Operator alerting endpoints (`/api/admin/monitoring-alerts*`,
`/api/admin/scheduler-slots`, the rest of `/api/admin/*`) all sit behind
`requireAdmin` and are therefore _not_ in this document — they aren't
unauthenticated. They're called out in the task title because the original
worry was that a future operator-facing webhook (paging service callbacks,
push provider status updates) would need the same signature treatment as
Plaid; the helper module exists so that work is a one-import job when it
arrives.

## Provider-signed webhooks

| Route                  | Method | Verifier                                        |
| ---------------------- | ------ | ----------------------------------------------- |
| `/api/plaid/webhook`   | POST   | `verifyPlaidWebhook` (JWT, ES256, body-hash)    |
| `/api/billing/webhook` | POST   | `stripe.webhooks.constructEvent` (HMAC, t+v1)   |

Both verify the signature **before** any DB write, return 401/400 on
failure, and rely on the raw request body captured by the JSON parser
(Plaid) or `express.raw` (Stripe) so the hash matches what the provider
signed.

## Public, intentionally-unauthenticated, rate-limited

| Route                              | Method | Limiter                | Why public                      |
| ---------------------------------- | ------ | ---------------------- | ------------------------------- |
| `/api/auth/register`               | POST   | `authLimiter`          | account creation                |
| `/api/auth/login`                  | POST   | `authLimiter`          | sign-in                         |
| `/api/auth/forgot-password`        | POST   | `passwordResetLimiter` | sends reset email               |
| `/api/auth/reset-password`         | POST   | `passwordResetLimiter` | consumes reset token            |
| `/api/feedback`                    | POST   | `feedbackLimiter`      | guest bug reports               |
| `/api/support/report`              | POST   | `feedbackLimiter`      | guest support form              |
| `/api/support/detailed-report`     | POST   | `supportReportLimiter` | guest detailed support form     |
| `/api/elevation-plans/preview`     | POST   | `elevationPlanLimiter` | marketing-page demo             |
| `/api/dw/processConversation/preview` | POST | `dwProcessLimiter`    | marketing-page demo             |
| `/api/routines/generate-steps`     | POST   | `aiContentLimiter`     | guest routine builder           |
| `/api/tts`                         | POST   | `ttsLimiter`           | guest text-to-speech preview    |
| `/api/transcribe`                  | POST   | `publicAiLimiter`      | guest Whisper transcription     |
| `/api/workout/generate`            | POST   | `publicAiLimiter`      | guest workout suggestions       |
| `/api/meditation/suggest`          | POST   | `publicAiLimiter`      | guest meditation suggestions    |
| `/api/learn-mode/question`         | POST   | `publicAiLimiter`      | guest learn-mode prompt         |
| `/api/ai/explain`                  | POST   | `publicAiLimiter`      | guest "explain this" helper     |
| `/api/ai/fix-transcript`           | POST   | `publicAiLimiter`      | guest transcript correction     |
| `/api/ingredient-substitutes`      | POST   | `publicAiLimiter`      | guest cooking helper            |
| `/api/alternatives`                | POST   | `publicAiLimiter`      | guest alternatives helper       |
| `/api/ai/cook-session`             | POST   | `publicAiLimiter`      | guest CookSession recipe        |
| `/api/analytics/events`            | POST   | `analyticsLimiter`     | unauth client telemetry         |
| `/api/auth/google`, `/google/callback`, `/facebook`, `/facebook/callback` | GET | `oauthCallbackLimiter` | OAuth flow |

The five new limiters introduced by this task (`authLimiter`,
`passwordResetLimiter`, `feedbackLimiter`, `publicAiLimiter`, plus the
existing reuse of `supportReportLimiter` etc.) are all defined inline in
`registerRoutes` in `server/routes.ts` next to the other inline limiters.

## Unauthenticated reads (no DB write, no third-party call) — safe as-is

- `/api/auth/logout` — destroys the caller's own session only.
- `/api/billing/restore` — read of the caller's own subscription tier.
- `/api/astrology/calculate` — pure ephemeris computation.
- `/api/local-resources/search` — proxies a third-party search API but
  does not persist state. (If usage explodes we should add a limiter.)
- `/api/search`, `/api/assistant/log` — log-only / proxy reads.
- `/api/auth/google`, `/api/auth/facebook` initiation — redirects only.

## Helper module

`server/webhook-signature.ts` is the single home for inbound webhook
signature verification. It exposes:

- `verifyJwtWebhookSignature(jwt, rawBody, fetchKey, options)` — generalised
  Plaid pattern. Caches keys per provider, enforces algorithm, freshness,
  and a body-hash claim.
- `verifyHmacWebhookSignature(header, rawBody, options)` — timing-safe
  HMAC-SHA256/512 check for shared-secret providers (push notification
  status callbacks, SMS / email vendor webhooks). Strips an optional
  `sha256=` prefix.

`server/plaid-webhook-verify.ts` is now a thin wrapper that pins the
algorithm, max-age, and body-hash claim for Plaid, so existing call sites
and tests keep working. New webhook handlers should import directly from
`server/webhook-signature.ts`.
