# Reliability Foundation

## Architecture boundaries
- Web entrypoints remain in `/client`.
- Mobile entrypoints remain in `/apps/mobile`.
- Shared code in `/shared` must stay platform-neutral and must not import `react-native`, `expo`, or web UI modules.
- TypeScript aliases:
  - `@web/*` → `client/src/*`
  - `@mobile/*` / `@/*` in mobile → `apps/mobile/src/*`
  - `@shared/*` → `shared/*`
- Mobile lint guardrails block imports from `@web/*`, `client/*`, and `server/*`.
- Regression guardrails live in `/server/__tests__/platform-boundaries.test.ts`.

## Mobile bootstrap lifecycle
1. Restore the secure session and authenticated user.
2. Initialize RevenueCat and resolve entitlement state.
3. Resolve the initial route (`/(tabs)` vs `/auth/welcome`).
4. Prefetch essential mobile data (`morning-briefing`, `mood-context`, `subscription-offering`).
5. On foreground resume, revalidate auth + entitlements and refresh core queries.

If startup exceeds the timeout budget, the app shows an explicit retry state instead of an indefinite loader.

## Network and error handling contract
- Mobile requests use `apps/mobile/src/services/api.ts`.
- Defaults:
  - timeout: 15s
  - AI timeout: 30s
  - retry: exponential backoff for idempotent/transient failures only
  - correlation id: `X-Correlation-ID` on every request
- Errors are normalized as `NormalizedApiError` with:
  - `kind`
  - `status`
  - `code`
  - `correlationId`
  - `requestId`

## Degraded-mode UX rules
- **AI unavailable**: keep the chat usable, show a clear inline notice, and offer a retry action.
- **Subscription service unavailable**: preserve last-known entitlement from local cache, mark it stale, and retry on next refresh/resume.
- **Telemetry failures**: swallow safely and never block user actions.
- **Bootstrap failure**: show retry UI instead of a stuck splash/loading state.

## Observability baseline
- Sentry initializes with environment + release tags from Expo app version/build metadata.
- Reliability/critical funnel events are emitted through the mobile analytics wrapper and mirrored to Sentry breadcrumbs.
- Current event taxonomy includes:
  - `app_bootstrap_started`
  - `app_bootstrap_stage_success`
  - `app_bootstrap_success`
  - `app_bootstrap_failure`
  - `auth_restore_success`
  - `auth_restore_failure`
  - `entitlement_fetch_started`
  - `entitlement_fetch_success`
  - `entitlement_fetch_failure`
  - `paywall_shown`
  - `purchase_attempt`
  - `purchase_success`
  - `purchase_failure`
  - `purchase_cancel`
  - `restore_purchases_attempt`
  - `restore_purchases_success`
  - `restore_purchases_failure`
  - `core_ai_action_start`
  - `core_ai_action_success`
  - `core_ai_action_failure`

Sensitive fields such as emails, passwords, tokens, cookies, session identifiers, and message bodies are redacted before telemetry is emitted.

## Validation checklist
- [ ] `npm run check`
- [ ] `npm run test:run -- server/__tests__/mobile-reliability.test.ts server/__tests__/platform-boundaries.test.ts`
- [ ] Verify existing web build/start flow still uses the current root scripts unchanged.
- [ ] In mobile, verify startup routes correctly for signed-in and signed-out users.
- [ ] Put the app in the background and foreground again; confirm auth/subscription revalidation does not log the user out unexpectedly.
- [ ] Simulate AI failure and confirm the inline retry message appears without blocking the screen.
- [ ] Simulate RevenueCat failure and confirm cached entitlement is preserved with a warning.
