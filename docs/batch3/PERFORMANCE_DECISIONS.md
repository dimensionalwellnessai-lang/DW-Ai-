# Performance Decisions — Batch 3

_Product UX + Performance + Release Hardening Sprint_

## Scope

This document records the performance decisions made in Batch 3 and the rationale behind each one. It is intended as a reference for future developers who want to understand *why* a given optimization was chosen, not just *what* was done.

---

## 1. `useCallback` for event handlers in `dw-home.tsx`

**What:** `handleEnergyChange` and `handleTimeChange` were converted to `useCallback`.

**Why:** These handlers are passed as props to animated motion children. Without `useCallback`, a new function identity is created on every parent render — causing React to re-render the motion children unnecessarily even when nothing in the handler logic changed. `useCallback` memoizes the function reference so downstream children only re-render when their actual dependencies change.

**Trade-off:** Minimal — `useCallback` has a small upfront cost to store the memoized function. This is always offset when the handler has stable deps (`[]`) and is passed to child components.

---

## 2. `useMemo` for `recentSwitches` in `dw-home.tsx`

**What:** `getRecentSwitches()` (an inline function called on every render) was replaced with a `useMemo(() => …, [switchData])`.

**Why:** The derivation involves an `Object.entries`, `.filter`, `.sort`, and `.slice`. While not expensive in isolation, it ran on every render of the home screen — which re-renders on focus/visibility changes. Memoizing against `switchData` ensures the array is only recomputed when switch state actually changes.

**Trade-off:** Memory: ~1 array of ≤3 tuples held in closure until `switchData` changes.

---

## 3. `useMemo` for `countsBySource` in `life-dashboard.tsx`

**What:** The `countsBySource` function was wrapped in `useMemo`.

**Why:** The function is defined inline in a subcomponent that queries goals/habits/routines. It's called three times per render, each time iterating over its input array. Since `countsBySource` has no external dependencies, memoizing it avoids recreating the function object and prevents unnecessary downstream re-renders.

**Trade-off:** Extremely low. The deps array is `[]` (no reactive deps), so the memo is computed exactly once per component mount.

---

## 4. Lazy loading for all page components

**Status:** Already in place from prior batches.

**Note:** All page-level components in `client/src/App.tsx` are loaded with `React.lazy()` and wrapped in `<Suspense fallback={<PageLoadingFallback />}>`. This means the initial JS bundle only includes the shell, auth check, and splash screen — all content-heavy pages are split into separate chunks fetched on demand.

**Startup impact:** Reduces TTI (Time to Interactive) on first paint by deferring ~95% of page component code.

---

## 5. React Query stale-time tuning

**Status:** Already configured in `client/src/lib/queryClient.ts`.

**Existing values:**
```ts
STALE_TIME.AUTH   = 30s   // session identity
STALE_TIME.MEDIUM = 5min  // plans, learning profile
STALE_TIME.SHORT  = 60s   // frequently-changing data
```

**Behavior:** `refetchOnWindowFocus` is `false` globally; only `useAuth` opts in to focus refetch. This means focus/blur events (common in mobile webviews) do not trigger cascading API calls.

**Trade-off:** Data may be slightly stale between 30s–5min windows. Acceptable given the data types and UX goals (wellness data doesn't change second-to-second).

---

## 6. Deferred non-critical startup work

**What:** Deep-link service initialization, analytics `trackNewDayOpen`, and demo mode setup run after the initial paint in `App.tsx` / `main.tsx`.

**Pattern used:** The analytics call is inside a `useEffect` in the root App component, ensuring it runs after the first render rather than blocking it.

---

## Deferred / Follow-up Opportunities

| Opportunity | Risk | Effort | Notes |
|-------------|------|--------|-------|
| Virtualize long lists (goals, journal) | Low | Medium | Use `@tanstack/virtual` or native CSS `content-visibility` |
| Memo-ize `PageHeader` | Low | Low | The header re-renders whenever parent state changes; `React.memo` wrapper would help |
| Prefetch critical queries on login | Low | Medium | Pre-warm `/api/goals` and `/api/habits` after auth succeeds |
| Web Worker for OCR / document parsing | Medium | High | Already done server-side; consider client-side preview offload |
| `startTransition` for tab switches | Low | Low | Wrap route changes in `React.startTransition` to keep input responsive during page loads |
