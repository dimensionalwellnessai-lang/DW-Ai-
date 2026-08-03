# Accessibility Baseline — Batch 3

_Product UX + Performance + Release Hardening Sprint_

## Scope

This document defines the accessibility baseline for DW.ai as of Batch 3. It records what is expected, what was improved, and what is deferred.

We target **WCAG 2.1 Level AA** as the long-term goal. Batch 3 delivers a practical baseline across core user flows.

---

## Core Principles

1. **Screen-reader announcements for state changes** — loading, error, and success states must be announced without requiring focus to move.
2. **Icon buttons must have accessible names** — every icon-only button needs either `aria-label` or visually-hidden text.
3. **Toggle/selection state must be exposed** — use `aria-pressed` for toggle buttons, `aria-selected` for tabs, `aria-current="page"` for active nav items.
4. **Minimum tap targets** — 44×44 CSS points for all primary interactive controls (WCAG 2.5.5).
5. **Color is never the only signal** — active states use both color and shape/ring changes.

---

## Changes Made in Batch 3

### `client/src/components/ui/state-screen.tsx` (new)

- `LoadingScreen`: `role="status"` + `aria-live="polite"` + `<span className="sr-only">Loading…</span>`
- `ErrorScreen`: `role="alert"` + `aria-live="assertive"` — alerts interrupt assistive tech to announce errors
- `EmptyScreen`: `role="region"` + `aria-label={title}`

### `client/src/App.tsx`

- `PageLoadingFallback`: Added `aria-live="polite"` and `<span className="sr-only">Loading…</span>`; decorative spinner marked `aria-hidden="true"`

### `client/src/components/splash-screen.tsx`

- Added `role="status"` + `aria-live="polite"` + `aria-label="Loading Dimensional Wellness AI"` to the splash wrapper

### `client/src/components/mood-picker.tsx`

- Compact mood buttons: added `aria-pressed={isSelected}` and `aria-hidden="true"` on decorative icons
- Full-view mood buttons: added `aria-pressed={isSelected}` + `aria-label="{name} mood, selected/unselected"` + `aria-hidden="true"` on icon containers

### `client/src/components/onboarding-wizard.tsx`

- `PhaseProgress`: Added `role="progressbar"` + `aria-valuemin/max/now` + `aria-label` describing current phase

### `client/src/pages/talk-it-out.tsx`

- Send button: added `aria-label={isTyping ? "Waiting for response" : "Send message"}`
- Decorative icons in send button marked `aria-hidden="true"`

### `client/src/pages/goals.tsx` + `habits.tsx`

- Loading skeleton regions: added `role="status"` + `aria-live="polite"` + `aria-label` + sr-only text

---

## Already In Place (pre-Batch 3)

- `BottomNav`: `aria-label="Main navigation"`, `aria-current="page"`, `aria-label` on each nav item
- `PageHeader`: `aria-label="Go back"`, `aria-label` on menu toggle
- `FloatingAIWidget`: `aria-label="Ask DW anything"`
- Voice mode buttons: `aria-label` toggling dynamically with state
- `DemoModeBanner`: `role="status"` + `aria-live="polite"`

---

## Tap Target Compliance

All `Button` variants from shadcn/ui meet 44px minimum height (size `sm` = 36px is the exception for secondary/tertiary compact buttons — these are supplementary and not primary actions).

Bottom navigation items: 48×48px hit area (h-12 w-14) ✅

Primary send/voice buttons in chat: 48×48px (h-12 w-12) ✅

---

## Color Contrast

The existing design uses Tailwind's semantic tokens (`text-foreground`, `text-muted-foreground`, `bg-background`, etc.) via CSS variables, so contrast ratios adapt to both light and dark modes. Custom color classes (e.g., `text-blue-500`) are used for dimensional icons only — these are decorative and are accompanied by text labels.

---

## Deferred / Follow-up

| Item | Priority | Notes |
|------|----------|-------|
| Full keyboard navigation audit | Medium | Tab order in complex dialogs/drawers |
| Screen-reader test on iOS VoiceOver | High | Capacitor WebView may have scroll-focus issues |
| Focus management after modal close | Medium | Focus should return to trigger element |
| `aria-expanded` on collapsible sections | Low | Accordion/collapsible in goals/habits detail |
| Reduce motion support | Low | Respect `prefers-reduced-motion` in framer-motion animations |
| Color contrast audit for muted text | Medium | Some `text-muted-foreground` may be below 4.5:1 in light mode |
