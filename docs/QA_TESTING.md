# QA Testing Guide – Dimensional Wellness AI

## Overview

This document describes the end-to-end QA strategy for the DW-Ai application, covering:

- **Component Tests** – all Home Command Center cards (Vitest + React Testing Library)
- **Regression Tests** – key application flows and utility logic
- **Seed Scripts** – reliable test-data provisioning
- **Coverage Reporting** – automated via Vitest coverage
- **Failure Modes** – how failures are surfaced and logged

---

## Test Infrastructure

| Tool | Purpose |
|---|---|
| **Vitest 1.6** | Test runner for unit and component tests |
| **@testing-library/react** | Component rendering + user interaction |
| **@vitest/coverage-v8** | Code coverage via V8 (text, JSON, HTML) |
| **jsdom** | Browser-like DOM environment for Vitest |

---

## Quick Start

```bash
# Install dependencies
npm install

# Run all tests once (CI mode)
npm run test:run

# Run tests in watch mode (development)
npm test

# Run tests with coverage report
npm run test:coverage

# Open interactive test UI
npm run test:ui
```

---

## Test Files

### Home Card Component Tests

Located in `client/src/features/home/components/__tests__/`

| File | Cards Covered | Test Count |
|---|---|---|
| `MomentumCard.test.tsx` | MomentumCard | 25 |
| `FollowUpCard.test.tsx` | FollowUpCard | 18 |
| `PlanInMotionCard.test.tsx` | PlanInMotionCard | 19 |
| `DailyCheckinCard.test.tsx` | DailyCheckinCard | 17 |

#### Scenarios covered per card

**MomentumCard** (`MomentumCard.test.tsx`)
- Legacy mode (Elevation Engine OFF): empty state, habit streak messages (7+, 1–6, 0), goals-only, habits+goals
- Elevation Engine mode: green/yellow/red status, reason bullets, suggested focus, loading state
- `checkNow` button: clickable, disabled while loading, calls the callback
- Guest mode: empty state, CTA rendering
- Navigation: `/habits` via both the "View habits" button and "Set up your first habit" CTA
- "Chat with DW about this" footer link present

**FollowUpCard** (`FollowUpCard.test.tsx`)
- No active follow-up (guest/default): `DW check-in` heading, generic copy, `Start a conversation` CTA
- Prefill branches: `activeFollowUp` → `latestInsight` → `activeGoals[0]` → `nextEvent` → generic
- `src=home_followup_chat` appended to all navigation URLs
- Active AI follow-up: `DW Follow-up` heading, prompt text, `Take action` and `Chat with DW` buttons
- `Take action` → `/action-center`, `Chat with DW` → `/talk?prefill=<prompt>`
- Guest mode: no crash, correct headings

**PlanInMotionCard** (`PlanInMotionCard.test.tsx`)
- Empty state: "no active goals" prompt, `View all goals` button, "Chat with DW about this" link
- Goals present: title rendering, progress percentage, progress bar, up to 3 rows, `+N more` overflow
- Elevation Engine CTA: appears for yellow+no goals, red+no goals; absent for green or when goals exist
- CTA navigates to `/talk?prefill=<elevation>&src=elevation_prompt`
- Navigation: clicking a goal row → `/goals`
- Guest mode: no crash

**DailyCheckinCard** (`DailyCheckinCard.test.tsx`)
- Loading state: component returns `null`
- Step 1 form: `Daily Check-in` heading, mood buttons (1–5 with aria-labels), step progression
- Step 2 form: constraint picker, `Save check-in` disabled without constraint, enabled after selection
- Save: calls `submitCheckin` with `{ date, moodScore, constraintType, constraintNote }`
- `Other` constraint: shows free-text input
- Completed state: energy score + constraint label, edit button
- Edit mode: switches back to form
- Guest mode: no crash, form shown

### Regression Test Suite

`client/src/test/regression.test.ts` – 54 tests across 10 areas:

1. **Entitlement limits** – message/session caps, DW Plus bypass, daily reset, counter increments
2. **Conversation insight lifecycle** – `shouldCaptureInsight`, `buildInsight`, save/retrieve, multiple insights
3. **Daily check-in signal derivation** – empty, high-energy, low-energy, steady mood hints
4. **Interaction engine intent detection** – `general_chat`, `planning`, `exploration`, `research`, `update_check`
5. **FollowUpCard prefill branches** – all 5 branches of `buildFollowUpPrefill` as pure logic
6. **`buildElevationPlanPrefill`** – with/without reasons, semicolon separator
7. **`getMomentumMessage` logic** – all 7 branches (empty, streaks, mixed, goals-only, habits-only, singular/plural)
8. **Guest daily check-in storage** – `getTodayGuestCheckin`, `upsertGuestDailyCheckin`, upsert idempotency, `getRecentGuestCheckins`
9. **Feature flags** – `FEATURE_FLAGS` object shape, `isFeatureEnabled`, unknown flag returns `false`
10. **`parseJumpToMessageIndex`** – valid, absent, negative, float, non-numeric, without leading `?`

### Pre-existing Unit Tests

| File | Tests |
|---|---|
| `src/lib/entitlement.test.ts` | 29 |
| `src/test/conversationInsights.test.ts` | 14 |
| `src/test/dailyCheckinSignals.test.ts` | 9 |
| `src/test/interactionEngine.test.ts` | 12 |
| `src/test/jumpToMoment.test.ts` | 12 |
| `src/components/interactive-tour.test.ts` | 8 |
| `src/stores/user-store.test.ts` | 4 |

**Total: 221 tests across 12 test files** (all green).

---

## Seed Scripts

### Demo Account (`npm run seed:demo`)

Creates `demo@dimensionalwellness.app` / `DemoWellness2026!` with comprehensive
pre-populated data for App Store review. See `server/seed-demo.ts`.

### Test Data (`npm run seed:test`)

Creates `test@dimensionalwellness.test` / `TestWellness2026!` with predictable,
minimal data to exercise all Home Card scenarios:

```bash
npm run seed:test
```

**What gets seeded:**

| Area | Data |
|---|---|
| Habits | 3 habits: 7-day streak, 3-day streak, 0-day streak |
| Goals | 4 active goals with varying progress (65%, 40%, 20%, 10%) |
| Mood log | 1 log entry |
| Daily check-in | ⚠️ Skipped — server-side `/api/daily-checkins` not yet implemented; guests use localStorage automatically |

**Idempotency**: Running `seed:test` multiple times is safe — the script deletes
any existing test user before recreating everything from scratch.

**Failure logging**: Each step emits `✅ step — detail` on success or `❌ step — error`
on failure. The script exits with code `1` if a critical step fails, making it
CI-parseable.

---

## Coverage Reporting

Coverage is collected using V8 and configured in `vite.config.ts`:

```ts
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
}
```

### Run coverage

```bash
npm run test:coverage
```

This outputs:
- **Console**: text table with % statements / branches / functions / lines
- **`coverage/` directory**: `index.html` (visual browser report), `coverage-summary.json`

### Current coverage highlights

| Module | Statements | Branches |
|---|---|---|
| `src/core` (conversationInsights, interactionEngine) | ~84% | ~72% |
| `src/lib/entitlement.ts` | ~100% | ~100% |
| `src/features/home/components` | ~72% | ~60% |
| `src/lib/jumpToMoment.ts` | ~100% | ~100% |
| `src/lib/daily-checkin-signals.ts` | ~100% | ~100% |

---

## Failure Modes

### Test failures

- Vitest exits with code `1` on any test failure
- Each failing test prints an assertion diff:
  ```
  ❌ MomentumCard – legacy mode > shows streak message for 7+ day streak
  Expected: /7-day streak/i to match
  Received: "Every journey starts with one step..."
  ```
- In CI, the `test:run` script produces structured output; use `--reporter=verbose`
  for per-test detail

### Seed script failures

- Each step is logged with `✅` or `❌`
- Critical failures (user creation) call `process.exit(1)`
- Non-critical failures (habit logs, mood logs) are logged but do not abort

### Coverage failures

- Coverage thresholds are not enforced automatically (yet) — use the HTML report
  to identify untested paths
- To add thresholds, add to `vite.config.ts`:
  ```ts
  coverage: {
    thresholds: { statements: 80, branches: 70 }
  }
  ```

---

## Adding New Tests

### Component tests

1. Create `__tests__/MyCard.test.tsx` next to the component
2. Mock `wouter` (for navigation) and any custom hooks via `vi.mock(...)`
3. Use `render()` from `@testing-library/react`, query with `screen.getBy*`
4. Cover: empty state, data-present state, guest mode, key interactions
5. Run `npm run test:run` to validate

### Regression tests

Add new `describe` blocks to `client/src/test/regression.test.ts` following
the numbered section format. Keep tests focused on pure logic or library
functions; avoid rendering components (use component test files for that).

### Seed data

If a new feature needs seeded data, add a new step to `script/seed-test-data.ts`
following the pattern:

```ts
try {
  // ... create data ...
  log("Seed my-feature data", true, `detail`);
} catch (err) {
  log("Seed my-feature data", false, String(err));
  // mark as fatal: process.exit(1) if critical
}
```

---

## CI Integration

The following commands are suitable for CI pipelines:

```yaml
# GitHub Actions / CI
- name: Install dependencies
  run: npm install

- name: Type check
  run: npm run check

- name: Run tests
  run: npm run test:run

- name: Run tests with coverage
  run: npm run test:coverage
```

The `test:run` script runs all tests once and exits with code `0` (all pass)
or `1` (any failure). Coverage artifacts are in `client/coverage/`.

---

## Acceptance Criteria Checklist

- [x] Coverage report generated (`npm run test:coverage`)
- [x] All 4 Home cards tested (MomentumCard, FollowUpCard, PlanInMotionCard, DailyCheckinCard)
- [x] Both guest and authenticated modes covered per card
- [x] Regression suite covers 10 key application flows (54 tests)
- [x] Reliable, idempotent seed script (`npm run seed:test`)
- [x] Failure modes logged (test diffs + seed step logs)
- [x] 221 total tests, all green
- [x] Documentation (this file)
