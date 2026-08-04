# Release Runbook — DW.ai

_Batch 3 — Product UX + Performance + Release Hardening Sprint_

> **Audience:** Engineering, QA, and the on-call responder.  
> **Purpose:** Operational guide for deploying, monitoring, and rolling back DW.ai across web (Replit/cloud) and mobile (iOS App Store / TestFlight).

---

## 1. Pre-Release Checklist

### 1.1 Code

- [ ] All feature branches merged and PR approved
- [ ] `npm run check` passes (TypeScript)
- [ ] `npm run format:check` passes (Prettier)
- [ ] `npm run test:run` passes (Vitest)
- [ ] No secrets committed (run `npm run format:check` / scan with `git diff --cached`)
- [ ] `.env.example` updated if new env vars were added
- [ ] `CHANGELOG_APP_STORE.md` updated

### 1.2 Database

- [ ] `npm run db:push` tested against staging database
- [ ] Any schema migrations are backward-compatible (no destructive drops without rollback plan)
- [ ] New indexes verified (EXPLAIN ANALYZE on affected queries)

### 1.3 Environment variables required

| Variable | Purpose | Required |
|----------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `SESSION_SECRET` | Express session signing | ✅ |
| `OPENAI_API_KEY` | AI chat / analysis | ✅ |
| `RESEND_API_KEY` | Transactional email | For email flows |
| `STRIPE_SECRET_KEY` | Subscription billing | For paid features |
| `STRIPE_WEBHOOK_SECRET` | Webhook validation | For Stripe webhooks |
| `CSRF_SECRET` | CSRF token signing | ✅ |
| `GOOGLE_CLIENT_ID/SECRET` | OAuth login | For social login |
| `FACEBOOK_APP_ID/SECRET` | OAuth login | For social login |
| `GOOGLE_VISION_API_KEY` | OCR fallback | Optional |
| `REVENUECAT_API_KEY` | Mobile entitlements | Mobile only |

### 1.4 Mobile (iOS / Android)

- [ ] `npm run sync:ios` or `npm run sync:android` completed without errors
- [ ] Capacitor plugins are up to date (`@capacitor/core`, `@capacitor/ios`, `@capacitor/android`)
- [ ] Deep link configurations verified in `capacitor.config.ts`
- [ ] Push notification entitlements present in Xcode capabilities
- [ ] Privacy manifest (`PrivacyInfo.xcprivacy`) reflects all API usage types
- [ ] TestFlight build uploaded and invited testers notified

---

## 2. Deployment Steps

### 2.1 Web (Replit / production server)

```bash
# 1. Pull latest main
git pull origin main

# 2. Install dependencies
npm install

# 3. Run database migrations
npm run db:push

# 4. Build production bundle
npm run build

# 5. Start/restart server
npm start
# or restart via platform (Replit deploy button / PM2 restart / systemd reload)
```

**Expected startup time:** < 10 seconds.  
**Health check:** GET `/api/csrf-token` should return `{ token: "..." }` with HTTP 200.

### 2.2 Mobile (iOS)

```bash
# Build + sync
npm run sync:ios

# Open in Xcode for archive/export
npx cap open ios
# → Product → Archive → Distribute App → App Store Connect
```

**TestFlight:** After upload, allow ~15 min for processing before inviting testers.

---

## 3. Rollback Procedures

### 3.1 Web rollback

```bash
# Identify last stable commit
git log --oneline -10

# Reset to it (fast — no migration needed if schema-compatible)
git checkout <stable-sha>
npm run build
npm start
```

**If a database migration was applied and must be reverted:**

1. Identify the migration file in `migrations/`
2. Write a manual inverse SQL (Drizzle does not auto-generate rollback scripts)
3. Apply via `psql $DATABASE_URL -f rollback.sql`
4. Re-deploy the previous server build

> ⚠️  **Always test rollback SQL on a staging database first.**

### 3.2 Mobile rollback

**TestFlight:** In App Store Connect → TestFlight → Builds, stop distribution of the problematic build and promote the previous build to testers.

**App Store:** Submit an expedited review request explaining the issue. Apple typically processes in < 24h for critical bugs. Alternatively, use a server-side feature flag to disable the affected feature without a new binary.

---

## 4. High-Risk Areas & Mitigation

### 4.1 Authentication

**Risk:** Session corruption, OAuth token mismatch, CSRF invalidation.

**Indicators:**
- Spike in `401` responses on `/api/auth/me`
- Users reporting being logged out repeatedly
- `[CSRF]` errors in server logs

**Mitigation:**
1. Check `SESSION_SECRET` is set and unchanged between deploys.
2. Check `connect-pg-simple` session table (`sessions`) is accessible.
3. If CSRF tokens are rejected, `csrfToken` client-side cache clears automatically on `403`; most users recover on next action.
4. If widespread session loss: extend session TTL in `express-session` config temporarily.

### 4.2 Subscription / Entitlement gating

**Risk:** Users unable to access paid features, or free users gaining access.

**Indicators:**
- Stripe webhook failures (`STRIPE_WEBHOOK_SECRET` mismatch)
- RevenueCat entitlement fetch returning stale/wrong data on mobile
- `/api/billing/status` returning incorrect tier

**Mitigation:**
1. Verify `STRIPE_WEBHOOK_SECRET` matches in Stripe dashboard.
2. On mobile: RevenueCat caches last-known entitlement; users are not immediately downgraded on cache miss — safe 24h window.
3. Emergency: Set `FORCE_PAID_ACCESS=true` env var to temporarily bypass gating if billing service is down (remove immediately after fix).

### 4.3 AI API degradation / outage

**Risk:** Chat unresponsive, analysis features broken.

**Indicators:**
- `[openai]` errors in server logs
- Chat messages stuck in "loading" state
- `/api/chat` returning 503 or 429

**Mitigation:**
1. The chat page (`talk-it-out.tsx`) shows an inline error state with a retry button — users are not stuck.
2. AI is never on the critical path for navigation or data writes.
3. If prolonged outage: disable AI features via `featureFlags.ts` (`AI_CHAT: false`).
4. Monitor OpenAI status at https://status.openai.com

### 4.4 Database connection pool exhaustion

**Risk:** API requests timing out, all data endpoints returning errors.

**Indicators:**
- pg error `remaining connection slots reserved for replication`
- Long response times across all `/api/*` endpoints

**Mitigation:**
1. Reduce `pg` pool size in `server/db.ts` if connections are exhausted.
2. Restart the server to flush idle connections.
3. Check for N+1 query loops introduced by recent changes.

---

## 5. Privacy & Data Safety

- User PII (email addresses) is **never logged in production**. The email logging in auth flows is gated to `NODE_ENV === "development"` as of Batch 3.
- Passwords are hashed with `bcrypt` before storage — never logged.
- OAuth tokens are stored only in the session; never in logs.
- File uploads go to `attached_assets/` — not publicly served without authentication.
- All database queries use parameterized inputs via Drizzle ORM.

---

## 6. Monitoring Baseline

| Signal | Expected | Alert threshold |
|--------|----------|-----------------|
| `/api/csrf-token` response time | < 200ms | > 2s |
| `/api/auth/me` 401 rate | < 5% | > 20% |
| `/api/chat` 5xx rate | < 2% | > 10% |
| `/api/billing/status` 5xx rate | < 1% | > 5% |
| DB query time (p95) | < 500ms | > 3s |

---

## 7. QA Validation Steps (Batch 3)

### A) UX states

1. Open the Goals page while offline → should show `ErrorScreen` with "Try again" button
2. Tap "Try again" → request retries and either shows data or error again (no dead-end)
3. Create a fresh account with no goals/habits → empty state cards appear with clear CTAs
4. Loading state shows skeleton rows, not a blank screen

### B) Performance

1. Open Home screen → verify no visible jank when tapping energy/time selectors
2. Open Goals page → note paint time; navigate away and back → data loads from cache (no re-fetch)

### C) Accessibility

1. Enable VoiceOver (iOS) / TalkBack (Android)
2. Navigate to Home → splash screen should announce "Loading Dimensional Wellness AI"
3. Open Guidance/Chat → send button should read "Send message" when idle, "Waiting for response" while loading
4. Open mood picker → each mood button should announce its name and selected state

### D) Release hardening

1. Check server logs after login → email address should NOT appear in production logs
2. Verify `STRIPE_WEBHOOK_SECRET` env var is set in production environment
3. Trigger a simulated AI failure (invalid key) → chat shows error + retry, app does not crash

---

## 8. Known Follow-ups (Deferred from Batch 3)

| Item | Owner | Priority |
|------|-------|----------|
| Apply `ErrorScreen` to remaining data pages | Engineering | Medium |
| VoiceOver / TalkBack full regression test | QA | High |
| Focus management on modal close | Engineering | Medium |
| Reduce-motion support in framer-motion | Engineering | Low |
| Color contrast audit in light mode | Design | Medium |
| Virtualize long lists (goals, journal entries) | Engineering | Low |
