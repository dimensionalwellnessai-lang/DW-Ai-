# UX State Conventions

_Batch 3 — Product UX + Performance + Release Hardening Sprint_

## Overview

Every data-driven screen in DW.ai should handle four distinct UI states:

| State | When to show | Component |
|-------|-------------|-----------|
| **Loading** | Data fetch is in-flight | `<LoadingScreen />` |
| **Error** | Fetch failed (network/server) | `<ErrorScreen onRetry={…} />` |
| **Empty** | Fetch succeeded, no items yet | `<EmptyScreen title={…} actionLabel={…} onAction={…} />` |
| **Success** | Data is present | Render content as normal |

## Shared Components

All state screens live in `client/src/components/ui/state-screen.tsx`.

```tsx
import { LoadingScreen, EmptyScreen, ErrorScreen } from "@/components/ui/state-screen";

// Loading — use role="status" + aria-live="polite"
{isLoading && <LoadingScreen rows={3} label="Loading habits…" />}

// Error — use role="alert" + aria-live="assertive"
{isError && !isLoading && (
  <ErrorScreen
    message="We couldn't load your habits right now."
    onRetry={() => void refetch()}
  />
)}

// Empty — use role="region" + aria-label
{!isLoading && !isError && items.length === 0 && (
  <EmptyScreen
    icon={CheckSquare}
    title="No habits yet"
    description="Small consistent actions create lasting change."
    actionLabel="Add your first habit"
    onAction={() => setShowForm(true)}
  />
)}
```

## Conventions

### Loading state
- Always include `role="status"` and `aria-live="polite"` for screen-reader announcements.
- Use `<span className="sr-only">Loading…</span>` for a screen-reader-only announcement.
- Show `Skeleton` rows matching the shape of expected content (prevents layout shift).
- Default: 3 skeleton rows at `h-20` height.
- Do **not** show loading state if data is already cached (stale) — React Query handles this.

### Error state
- Use `role="alert"` and `aria-live="assertive"` so screen-readers interrupt to announce.
- Always provide a **retry** action (`onRetry`) — never leave a dead-end error screen.
- Message should be calm and user-focused: "We couldn't load your X right now."
- Do **not** expose raw error codes or stack traces to users.

### Empty state
- Show only after the loading state has resolved **and** no items exist.
- Always include a clear primary CTA that removes the empty state (e.g., "Add your first goal").
- Use a visual icon at reduced opacity (`text-muted-foreground/40`) to soften the empty feeling.
- Optionally include a secondary dismiss/skip action for optional features.

### Success state
- Rendered as normal content — no wrapper needed.
- If content might disappear (e.g., filtered to zero results), reuse the `EmptyScreen` with a filter-specific message.

## Guiding principle

> Silence is a design tool, but a dead-end is a trap. Every state should either show data, explain the situation, or provide a clear path forward.

## Pages updated in Batch 3

- `client/src/pages/goals.tsx` — added `isError` + `ErrorScreen`
- `client/src/pages/habits.tsx` — added `isError` + `ErrorScreen`
- `client/src/pages/dw-home.tsx` — performance callbacks memoized
- `client/src/App.tsx` — `PageLoadingFallback` now has `aria-live`

## Follow-ups (deferred)

- Apply `ErrorScreen` to remaining data-heavy pages (journal, plans, routines, etc.)
- Consider a global React Query `onError` callback in `queryClient.ts` to surface toast for unexpected errors
- Investigate adding optimistic updates for habit/goal mutations to reduce perceived loading
