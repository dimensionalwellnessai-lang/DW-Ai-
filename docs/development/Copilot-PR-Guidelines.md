# Copilot & AI-Agent PR Guidelines

> These rules apply to every PR authored by GitHub Copilot, an AI coding agent, or any automated contributor. Human reviewers should verify compliance before merging.

---

## 1. Progressive Disclosure in UI

**Rule:** New UI must default to a minimal, calm state and reveal complexity on demand.

- Components must not render more than 3 primary actions without a disclosure pattern (expand, drawer, modal).
- Use `useState` + conditional rendering or Radix-based collapsibles — not permanent multi-panel layouts.
- Every new page/component must be tested in both light and dark mode before the PR is opened.
- New screens must include a visible empty state (not just a blank div).

---

## 2. No Heavy Business Logic in UI Components

**Rule:** React components render derived data — they do not compute it.

- Data transformation, filtering, sorting, and aggregation belong in custom hooks or server handlers.
- Never call `JSON.parse`, date arithmetic, or domain validation inline in JSX.
- Feature-flag evaluation must happen in a hook or config module, not inside component bodies.
- If a component file exceeds ~150 lines of JSX, extract logic into a hook.

**Good pattern:**
```ts
// hook: useGoalSummary.ts
export function useGoalSummary(goals: Goal[]) {
  return useMemo(() => computeSummary(goals), [goals]);
}

// component: GoalCard.tsx
const summary = useGoalSummary(goals);
return <div>{summary.completedCount} of {summary.total} done</div>;
```

---

## 3. Store AI Outputs as Structured Objects with Source Pointers

**Rule:** Raw AI strings must never land in the database or localStorage without structure.

Every persisted AI output must include:

```ts
interface AIOutput {
  content: string;           // the generated text
  sourceModel: string;       // e.g. "gpt-4o"
  generatedAt: string;       // ISO 8601 timestamp
  inputContextHash?: string; // hash of the prompt context (no PII)
  dismissed?: boolean;       // user has dismissed this suggestion
}
```

- Use the `conversation_insights` table and `InsightSource` type as the reference implementation.
- AI outputs are never system-of-record facts — they are advisory and dismissible.
- When an AI suggestion is accepted, create a proper domain record (e.g., a `Goal`) and link back to the originating insight ID.

---

## 4. Prefer Domain-Based Endpoints and Shared Schemas

**Rule:** API surface must follow domain groupings; schemas must be shared.

- Group endpoints by domain: `/api/goals`, `/api/habits`, `/api/insights`, `/api/dimensions`.
- Avoid generic catch-all endpoints (e.g., `/api/data?type=...`).
- All Zod schemas used for validation belong in `shared/schema.ts` so both client and server share the same type.
- New endpoints must export their Zod input schema so the client can use it for form validation.

```ts
// shared/schema.ts
export const insertGoalSchema = z.object({
  title: z.string().min(1).max(200),
  dimensionId: z.number().int().positive(),
  targetDate: z.string().datetime().optional(),
});

// server/routes.ts
const body = insertGoalSchema.parse(req.body); // throws 400 on invalid input
```

---

## 5. Feature-Flag Gating Standards

**Rule:** All new user-facing features must ship behind a feature flag initially.

- Feature flags are defined in `client/src/config/featureFlags.ts` as `FEATURE_FLAGS` (uppercase const, typed via the `FeatureFlags` interface).
- Flags follow the naming pattern: `<DOMAIN>_<NAME>` in UPPER_SNAKE_CASE (e.g., `GOALS_AI_SUGGESTIONS`). No `FEATURE_` prefix.
- Flag evaluation uses the shared `isFeatureEnabled()` helper — never ad-hoc inline boolean checks in JSX:

```ts
// client/src/config/featureFlags.ts
export const FEATURE_FLAGS: FeatureFlags = {
  GOALS_AI_SUGGESTIONS: false,
  // ... other flags
};

export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return FEATURE_FLAGS[feature] === true;
}

// usage in a component or hook
import { isFeatureEnabled } from "@/config/featureFlags";

const isGoalsAISuggestionsEnabled = isFeatureEnabled("GOALS_AI_SUGGESTIONS");
```

- A PR that ships a disabled flag is acceptable; a PR that ships an untested enabled flag is not.
- Remove the flag and config entry once the feature is stable and fully enabled.

---

## 6. Testing Expectations for New Features

**Rule:** Every new feature must include tests before the PR is merged.

### Minimum requirements

| Feature type | Required tests |
|-------------|----------------|
| Data parsing / transformation | Unit tests covering valid input, edge cases, and malformed input |
| Bounds / validation logic | Unit tests for min, max, boundary values, and rejection cases |
| New API endpoint | Integration test or manual test evidence (documented in PR description) |
| New React component | At minimum: renders without crash, empty-state renders |
| AI prompt / output parsing | Unit tests for structured output parser against sample responses |

### Test file conventions

- Client test files live in `client/src/test/`. Server-side tests are not yet established; when added, they should live in `server/test/`.
- Test files are named `<module>.test.ts`.
- Use Vitest for client tests; import production helpers directly (do not duplicate logic).
- Tests must pass `npm run check` (TypeScript) before merging.

### What is not acceptable

- PRs with 0 tests for new parsing or bounds logic.
- Tests that only check `toBeDefined()` or `not.toThrow()` without asserting actual output.
- Skipped or commented-out tests without a linked issue explaining why.

---

## 7. General Checklist for Every AI-Generated PR

Before requesting a human review, verify:

- [ ] All new files use TypeScript (`.ts` / `.tsx`).
- [ ] No hardcoded colors — only Tailwind semantic tokens or CSS variables.
- [ ] Dark mode visually verified (screenshot in PR description).
- [ ] No secrets, API keys, or PII in committed code.
- [ ] New UI components include ARIA labels for interactive elements.
- [ ] Feature is behind a flag if not yet ready for all users.
- [ ] At least one test covers the core logic introduced.
- [ ] `npm run check` passes with no new TypeScript errors.
- [ ] PR description includes: what changed, why, and how to test it manually.
