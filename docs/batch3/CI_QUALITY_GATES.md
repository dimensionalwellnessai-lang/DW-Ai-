# CI & Quality Gates — DW.ai

_Batch 3 — Product UX + Performance + Release Hardening Sprint_

## Overview

This document describes the CI/quality gate scripts available in DW.ai, their intended use, and the lightweight checks enforced as of Batch 3.

---

## Scripts Reference

All scripts are defined in `package.json`:

```bash
# Type checking (TypeScript strict)
npm run check

# Code formatting check (Prettier — no writes)
npm run format:check

# Auto-format all source files
npm run format

# Run all tests (watch mode)
npm test

# Run tests once (CI mode)
npm run test:run

# Run tests with coverage report
npm run test:coverage

# Build production bundle (server + client)
npm run build

# Start production server
npm start
```

---

## Recommended Pre-Commit Sequence

The repo uses Husky to run git hooks. The pre-commit hook runs Prettier on staged files automatically.

For a full pre-push validation, run:

```bash
npm run check && npm run format:check && npm run test:run
```

---

## TypeScript Check

```bash
npm run check
```

**What it does:** Runs `tsc` against `tsconfig.json` which covers both `client/` and `server/`.

**Expected output:** No errors (exit code 0). Any TypeScript errors are blocking and must be fixed before merge.

**When to run:** Before every PR merge.

---

## Format Check

```bash
npm run format:check
```

**What it does:** Runs Prettier in check mode — reports files that would be reformatted without writing them.

**Configuration:** `.prettierrc` and `.prettierignore` at repo root.

**When to run:** CI gate on every PR. The pre-commit hook runs format automatically on staged files via Husky.

---

## Tests (Vitest)

```bash
npm run test:run
```

**What it does:** Runs all tests under `client/src/test/` and `server/__tests__/` in non-watch mode.

**Test files:**
- `client/src/test/analytics.test.ts` — analytics event tracking
- `client/src/test/conversationInsights.test.ts` — insight capture logic
- `client/src/test/featureFlags.test.ts` — feature flag evaluation
- `client/src/test/guardrails.test.ts` — API guardrail middleware
- `client/src/test/onboarding.test.ts` — onboarding completion flags
- `client/src/test/regression.test.ts` — regression scenarios
- And others in `tests/e2e/`

**Coverage:** Run `npm run test:coverage` to generate a V8 coverage report.

**Philosophy:** Prioritize reliable unit + integration tests over brittle E2E tests. Heavy E2E tests live in `tests/e2e/` and are run manually or on-demand, not as blocking CI gates.

---

## Build

```bash
npm run build
```

**What it does:** Runs `tsx script/build.ts` which:
1. Builds the Vite client bundle into `dist/public/`
2. Bundles the Express server with esbuild into `dist/index.cjs`

**When to run:** Before deploying to production, and before syncing to iOS/Android.

**Expected output:** Success with no errors. Bundle sizes are not currently gated.

---

## Mobile Sync

```bash
npm run sync:ios     # builds + syncs to iOS Capacitor
npm run sync:android # builds + syncs to Android Capacitor
```

These run `npm run build` first, then `npx cap sync`.

---

## Lightweight CI Gate Summary

| Check | Blocks merge? | Notes |
|-------|-------------|-------|
| `npm run check` (TypeScript) | Yes | Must exit 0 |
| `npm run format:check` (Prettier) | Yes | Auto-fixed in pre-commit |
| `npm run test:run` (Vitest) | Yes | Must pass all tests |
| `npm run build` | Recommended | Catches bundler/import errors |
| Secret scanning | Yes | Pre-commit scan via git hooks |

---

## Adding New Checks (Guidelines)

1. **Keep it fast:** A gate that takes > 2 minutes will be bypassed. Target < 30s for unit tests.
2. **Only add checks for things that have broken before:** Don't add speculative checks.
3. **Prefer unit tests over integration tests for logic:** Integration tests are valuable but flaky — keep them in a separate optional step.
4. **Document new scripts here** so the team knows they exist.

---

## Known Pre-Existing Issues

No known non-blocking TypeScript issues are currently documented. Any `npm run check` errors should be treated as blocking and remediated before merge.
