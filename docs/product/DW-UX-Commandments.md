# DW UX Commandments

> These commandments govern every UI decision in DW. When in doubt, return here.

---

## I. Progressive Disclosure

**Show only what the user needs right now.**

- Default views are calm and minimal.
- Complexity reveals itself on demand (tap, expand, explore).
- Never surface more than 3 primary actions at a time.
- Advanced options live behind a secondary affordance (e.g., "More options…").

---

## II. Clarity Over Complexity

**If it requires explanation, simplify the UI first.**

- Labels are plain language, not product jargon.
- Icons always have accessible text alternatives (ARIA labels).
- Error messages tell the user what to do next, not just what went wrong.
- Empty states are helpful, not blank.

---

## III. Silence as a Design Tool

**The default state is calm.**

- No auto-playing animations in resting state.
- Notifications are opt-in; nudges respect user energy state.
- White space is intentional, not accidental.
- Sound is off by default.

---

## IV. Consent Before Action

**Never save, schedule, or share without explicit user confirmation.**

- AI suggestions are proposals, not commands.
- Confirmations are clear: show what will happen, not just "Are you sure?".
- Destructive actions require a two-step confirm.
- Users can always undo or dismiss.

---

## V. Energy-Aware Adaptation

**Match the UI to the user's stated or inferred energy level.**

- High energy → richer detail, more options visible.
- Low energy → simplified view, gentle prompts only.
- Never escalate cognitive load during low-energy moments.
- Transition states (e.g., loading) are smooth and non-jarring.

---

## VI. Semantic Color & Theme

**Color carries meaning — use it consistently.**

- Use CSS custom properties (e.g., `text-foreground`, `bg-background`), never hardcoded hex values.
- Dark mode is a first-class citizen, tested on every UI change.
- Dimension-specific accent colors are defined in the design token system.
- Status colors: success = green, warning = amber, error = red, neutral = muted.

---

## VII. Touch-First, Not Touch-Only

**Optimize for mobile; don't break desktop.**

- Minimum tap target size: 44×44 px.
- Interactive elements are reachable with one thumb on a standard phone.
- Keyboard navigation must work on all interactive elements.
- Hover states are enhancements, not requirements.

---

## VIII. Accessible by Default

**Accessibility is not an afterthought.**

- All images and icons have descriptive `alt` / `aria-label` attributes.
- Focus order follows visual order.
- Color contrast meets WCAG AA minimum (4.5:1 for body text).
- Screen reader announcements fire on dynamic content changes.

---

## IX. Feedback Is Immediate

**The UI always acknowledges user action.**

- Form submissions show a loading state within 100 ms.
- Success / error toasts appear within 300 ms of response.
- Long operations have progress indicators.
- Optimistic updates are used where safe; rollbacks are graceful.

---

## X. No Business Logic in UI Components

**UI components render; they do not decide.**

- Computation, validation, and data transformation live in hooks or server handlers.
- Components receive derived data, not raw API responses to parse.
- Feature flags are evaluated in hooks/config, not inline in JSX.
- Side effects (mutations, navigation) are triggered by handlers, not render cycles.
