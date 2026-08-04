---
name: Playwright testing gates in this app
description: localStorage flags and redirects that block automated UI tests from reaching authenticated pages
---

The SPA has three client-side gates that block Playwright/browser tests:

1. **Terms gate** — a first-time agreement overlay covers every page until accepted.
2. **Splash** — a fixed ~4.5s splash timer.
3. **Onboarding redirect** — authenticated users are bounced to `/voice-onboarding` unless onboarding is complete; this check reads localStorage, not the server flag.

**How to apply:** before `page.goto`, seed the context:
```js
await ctx.addInitScript(() => {
  localStorage.setItem("dw_terms_accepted", "true");
  localStorage.setItem("dw_splash_shown", "true");
  localStorage.setItem("dw_onboarding_completed", "1");
});
```
Log in via API instead of the UI form (cookies land in the context):
`GET /api/csrf-token` → `POST /api/auth/login` with `x-csrf-token` header via `ctx.request`.

**Why:** clicking through the terms overlay routes into the onboarding flow, not the login form, so UI-driven login is unreliable in tests.

Also: drizzle/pg unique-violation errors surface the Postgres code at `err.cause.code` (not always `err.code`) — check both when catching `23505`.
