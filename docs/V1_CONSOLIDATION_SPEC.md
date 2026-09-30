# DWAI V1 Consolidation Specification

**Status:** Proposed — planning only  
**Branch:** `planning/v1-consolidation-spec`  
**Purpose:** Define the smallest coherent, reliable V1 from the existing DWAI codebase before implementation begins.

> This document does **not** propose rebuilding DWAI or deleting the broader vision. It defines which existing systems become authoritative for V1, which capabilities move behind those systems, which experiments remain hidden, and what must pass before release.

---

## 1. V1 product definition

**DWAI V1 is an AI life-management companion that learns what is happening in a user's real life, helps them build a realistic personal system, puts that system into action, and helps them maintain and adapt it over time.**

The core loop is:

```
Talk to DW
   ↓
DW understands context
   ↓
DW proposes a useful change
   ↓
User approves
   ↓
Life System updates
   ↓
Today + Plan surface the change
   ↓
User checks in / completes / changes course
   ↓
DW learns and adapts
```

Everything in V1 should strengthen this loop.

---

## 2. V1 primary navigation

V1 should expose no more than five primary destinations:

| Destination | Canonical route | Job |
|---|---|---|
| **Today** | `/command-center` | What matters now: schedule, priorities, routines, energy, DW notices |
| **DW** | `/talk` | Main conversational control surface |
| **Plan** | `/calendar/month` with calendar subviews | When life happens; schedule and upcoming commitments |
| **Dimensions** | `/life-dimensions` | Whole-life organization and entry point to domain-specific tools |
| **You** | `/profile/progress` / `/settings` | Progress, account, preferences, privacy, billing |

Specialized tools remain available, but should be reached through DW, a Dimension, Today, Plan, or You rather than competing for primary navigation.

---

## 3. Authoritative V1 concepts

Users should not need to understand internal planning architecture.

| User-facing concept | V1 meaning |
|---|---|
| **Life System** | The total system DW helps the user maintain |
| **Dimension** | An area of life: physical, emotional, financial, social, spiritual, career, etc. |
| **Goal** | An outcome the user wants |
| **Plan** | A group of actions organized toward an outcome |
| **Task** | One concrete action |
| **Routine** | A repeatable sequence of actions |
| **Habit** | A repeated behavior being developed |
| **Calendar event** | Something assigned to a date/time |
| **Reminder** | A notification connected to an action/event |
| **Check-in** | New information about the user's current state |
| **Insight** | A pattern or observation DW surfaces from user data |

### V1 rule

Names such as Universal Plan, Elevation Plan, Life Blueprint, Project, Week Planner, and similar internal/specialized planning structures may continue to exist in code, but V1 should not force a user to choose among overlapping planning models.

DW should translate normal language into the appropriate underlying objects.

---

## 4. Route classification

Legend:

- **CORE** — part of the canonical V1 experience.
- **NEST** — keep functional, but access through a core surface instead of primary navigation.
- **LABS/FUTURE** — preserve code; hidden from normal V1 navigation.
- **ALIAS/CONSOLIDATE** — keep only as compatibility redirect or merge into canonical surface.
- **INTERNAL** — admin, support, development, or utility route; not part of normal product navigation.

### Identity, onboarding, account

| Route | V1 classification | V1 treatment |
|---|---|---|
| `/` | ALIAS/CONSOLIDATE | Route signed-in users to Today or DW based on final entry rule; do not maintain a separate "AI Home" identity |
| `/login` | CORE | Canonical sign-in |
| `/reset-password` | CORE | Required account recovery |
| `/welcome` | CORE | First-run entry only |
| `/voice-onboarding` | CORE | Candidate canonical conversational onboarding surface; consolidate other onboarding flows behind one entry |
| `/subscription` | NEST | Access from You/Settings/paywall |
| `/settings` | CORE | Canonical settings/account control |
| `/profile/progress` | CORE | Canonical You/progress surface |
| `/values-rules-profile` | NEST | Access through You or DW personalization |
| `/dw-learns` | NEST | Transparency/control surface under You |

### Home, planning, calendar

| Route | V1 classification | V1 treatment |
|---|---|---|
| `/command-center` | CORE | Canonical Today/Home |
| `/life-dashboard` | ALIAS/CONSOLIDATE | Redirect/merge into Life Blueprint or Dimensions; no separate home concept |
| `/life-blueprint` | NEST | Long-term context accessed from Dimensions/You, not primary V1 nav |
| `/blueprint` | ALIAS/CONSOLIDATE | Merge/redirect to canonical blueprint surface |
| `/plan` | ALIAS/CONSOLIDATE | Redirect to canonical Plan hub |
| `/plans` | NEST | Plan workspace accessible through Plan/DW |
| `/plans/:planId` | NEST | Detail route |
| `/plan-builder` | NEST | DW/Plan-launched flow |
| `/schedule-review/:draftId` | NEST | Review/consent step before schedule commit |
| `/tasks` | NEST | Reach from Today/Plan/DW; not primary nav |
| `/routines` | NEST | Reach from Today/Dimensions/DW |
| `/calendar/month` | CORE | Canonical Plan landing surface |
| `/calendar` | CORE | Week subview |
| `/calendar/schedule` | CORE | Schedule/list subview |
| `/week-schedule` | NEST | Secondary Plan view |
| `/daily-schedule` | NEST | Secondary Plan/Today view |
| `/tracking` | NEST | Fold into Dimensions/Today where possible |
| `/action-center` | NEST | DW follow-ups accessible from Today/DW |
| `/library` | NEST | Saved content accessible from relevant dimensions/tools |

### DW, reflection, guidance

| Route | V1 classification | V1 treatment |
|---|---|---|
| `/talk` | CORE | Canonical DW conversation surface |
| legacy `/chat` | ALIAS/CONSOLIDATE | Redirect to `/talk` |
| `/journal` | NEST | Access from DW/You/Emotional dimension |
| `/energy-transmutation` | NEST | Tool launched by DW/Emotional or Spiritual dimension |
| `/guidance/conversations` | NEST | Conversation/learning history under DW or You |
| `/weekly-checkin` | NEST | Reframe as beta feedback or check-in as appropriate; do not confuse with canonical daily check-in |
| `/feedback` | NEST | Accessible from You/Settings |

### Dimensions and domain tools

| Route | V1 classification | V1 treatment |
|---|---|---|
| `/life-dimensions` | CORE | Canonical Dimensions hub |
| `/workout` | NEST | Physical dimension / DW |
| `/recovery` | NEST | Physical/Emotional dimension / DW |
| `/meal-prep` | NEST | Nutritional/Physical dimension / DW |
| `/shopping-list` | NEST | Child of Nutrition/Plan |
| `/cook-session` | NEST | Child of Nutrition |
| `/spiritual` | NEST | Spiritual dimension |
| `/relationships` | NEST | Social/Relationship dimension |
| `/finances` | NEST | Financial dimension |
| `/cosmic` | NEST | Spiritual/Cosmic planning capability |
| `/cosmic-insights` | NEST | Child of Cosmic |
| `/role-map` | NEST | Context tool under Dimensions/You |
| `/systems` | NEST | System detail surface, not primary navigation |
| `/systems/training` | NEST | Physical system detail |
| `/systems/wake-up` | NEST | Routine/system detail |
| `/systems/wind-down` | NEST | Routine/system detail |

### Content, imports, discovery

| Route | V1 classification | V1 treatment |
|---|---|---|
| `/import` | NEST | Launch from DW/Plan/You |
| `/imports` | NEST | Import history |
| `/imports/new` | NEST | Import flow |
| `/feed` | LABS/FUTURE | Not required to prove V1 life-system loop |
| `/browse` | ALIAS/CONSOLIDATE | Legacy alias to one future discovery surface |
| `/export/:planId` | NEST | Utility action from plan detail |

### Social, gamification, experimental

| Route | V1 classification | V1 treatment |
|---|---|---|
| `/challenges` | LABS/FUTURE | Hide from normal V1 navigation |
| `/group-challenges` | LABS/FUTURE | Hide |
| `/community` | LABS/FUTURE | Hide until community has users/moderation/operations |
| `/my-level` | LABS/FUTURE | Hide gamification from V1 core |
| `/shared-attention` | LABS/FUTURE | Keep feature-flagged off |
| `/elevation-plan` | LABS/FUTURE | Preserve behind feature flag |
| `/weekly-review` | LABS/FUTURE | Preserve behind feature flag until V1 core is proven |
| `/expand-my-week` | LABS/FUTURE | Preserve behind plan experiment flag |

### Support/admin/dev

| Route | V1 classification | V1 treatment |
|---|---|---|
| `/admin/analytics` | INTERNAL | Admin only |
| `/support/report` | INTERNAL | Reach through Settings/Help |
| `/app-tour` | NEST | Optional onboarding/help |
| `/dev/routes` | INTERNAL | Never normal production navigation |
| `/404` | INTERNAL | Standard fallback |

---

## 5. Onboarding consolidation

The repository currently contains multiple onboarding implementations and flags.

### V1 requirement

There must be **one canonical onboarding state machine**.

It must:

1. Explain DWAI's value in plain language.
2. Create/sign into an account.
3. Ask only enough questions to understand current life, responsibilities, priorities, schedule constraints, energy, and desired changes.
4. Allow the user to skip nonessential questions.
5. Produce a **starter Life System proposal**.
6. Show the proposal before saving important changes.
7. Save only after explicit approval.
8. Land the user in **Today** with visible value immediately.
9. Resume correctly after interruption/restart.
10. Allow later editing through DW/You.

### Consolidation rule

Existing onboarding components may be reused, but V1 must have one entry, one completion definition, one persisted onboarding version/state, and one resume behavior.

---

## 6. Today consolidation

`/command-center` becomes the canonical home.

V1 Today should answer five questions:

1. **What is happening today?**
2. **What matters most?**
3. **What have I committed to?**
4. **How am I doing right now?**
5. **What does DW notice or suggest?**

### V1 Today content

Required:
- today's calendar/schedule
- highest-priority tasks/actions
- active routines due today
- lightweight energy/mood state
- one clear DW insight/follow-up area
- fast entry to Talk to DW

Optional/later:
- large analytics dashboards
- gamification
- multiple competing insight card systems
- discovery/content feed modules

---

## 7. DW as the control layer

`/talk` is the canonical conversation surface.

V1 DW must reliably support:

- contextual multi-turn conversation
- read access to the user's approved Life System context
- proposals for goals, tasks, routines, reminders, calendar items, and plan changes
- explicit confirmation before consequential writes
- clear success/failure feedback after actions
- retry behavior when AI/providers fail
- continuity across app restart/login where designed
- transparent "what DW learned" controls

### Consent rule

DW should distinguish:

- **conversation only**
- **proposal**
- **approved action**
- **completed write**

The UI must never make a proposal look like a completed action.

---

## 8. Daily check-in consolidation

The schema contains several mood/check-in/tracking structures. V1 should expose one obvious daily check-in experience.

### V1 check-in

At minimum:
- current energy
- current mood / emotional state
- optional short note

The check-in should:
- update Today
- be available to DW context
- influence suggestions without becoming medical diagnosis
- avoid forcing users through multiple overlapping tracking screens

Other specialized tracking can remain under Dimensions.

---

## 9. Feature-flag cleanup

V1 feature flags should be classified into three product states:

### CORE
Always on in the release build and covered by release tests.

Examples:
- canonical navigation
- canonical onboarding
- Today
- Talk/DW
- core personalization
- daily check-in
- reminders required by the V1 loop

### LABS
Explicit opt-in only. Never silently enabled by ambiguous defaults.

Examples:
- Elevation Engine / Elevation Plan
- Weekly Review
- Multi Plan experiments
- advanced insight/journal generation
- milestone moments
- experimental companion/action engines

### FUTURE/OFF
Not discoverable in V1 unless an internal developer override is used.

Examples:
- Shared Attention
- entertainment/creator companion surfaces
- unfinished social/community/gamification surfaces

### Release requirement

Feature-flag comments, resolver behavior, default values, Settings toggles, and tests must agree.

---

## 10. Mobile architecture decision

The repository currently contains:

1. **Capacitor 8** iOS/Android shells around the mature web app, and
2. a separate **Expo/React Native** app under `apps/mobile/`.

Maintaining both as active product implementations creates duplicate work and inconsistent feature coverage.

### Proposed V1 decision

**Use the mature web application + Capacitor as the canonical V1 product path and freeze the Expo rewrite during V1 stabilization.**

Rationale:
- preserves the broad existing feature implementation
- avoids rebuilding each DWAI feature a second time before product validation
- keeps one main frontend behavior to test
- reduces auth, billing, navigation, and data-consistency duplication

The Expo code should remain in the repository but receive no new V1 product features until a post-launch mobile architecture decision is made.

If the team rejects this proposal, the alternative must include an explicit migration plan showing which web/Capacitor capabilities are intentionally omitted from native V1.

---

## 11. Billing consolidation

The repository currently contains web Stripe billing and mobile RevenueCat work.

### V1 rule

The product must have one canonical entitlement:

```
subscriptionTier = free | plus
```

Provider-specific billing systems may determine that entitlement, but the UI must never independently grant premium access through local state alone.

Required:
- consistent Free/Plus behavior across surfaces
- purchase flow
- restore flow where platform requires it
- cancellation/expiration handling
- server-side entitlement verification
- graceful provider failure
- clear billing-not-configured behavior in nonproduction environments

---

## 12. Data-model rule for V1

**Do not perform a large destructive schema cleanup before launch.**

The current schema is broad. V1 consolidation should first happen at:
- navigation
- product terminology
- service boundaries
- feature flags
- canonical flows
- read/write ownership

Old/overlapping tables may remain if they do not create correctness or security problems.

Schema deletion/merging belongs in a later refactor after canonical V1 behavior is proven.

---

## 13. V1 release journeys

A release candidate must pass these journeys end to end.

### Account
- [ ] Create account
- [ ] Sign in
- [ ] Sign out
- [ ] Password reset
- [ ] Session survives expected restart/resume
- [ ] Delete account and confirm session ends
- [ ] User A cannot access User B data

### Onboarding
- [ ] Start onboarding
- [ ] Leave midway
- [ ] Resume correctly
- [ ] Complete onboarding
- [ ] Starter Life System proposal appears
- [ ] User can reject/edit proposal
- [ ] Approved items persist
- [ ] Completion lands on Today

### DW
- [ ] 3+ message contextual conversation
- [ ] DW reads current approved context
- [ ] DW proposes a task
- [ ] DW proposes a goal
- [ ] DW proposes a routine
- [ ] DW proposes a calendar/reminder action
- [ ] User approval required before write
- [ ] Approved write appears in destination surface
- [ ] AI failure shows retry/degraded state rather than blocking app

### Today / Plan
- [ ] Today's calendar items display
- [ ] New approved item appears on Today where expected
- [ ] Calendar day/week/month navigation works
- [ ] Editing an event persists
- [ ] Removing/rescheduling an item updates dependent views

### Check-in / learning
- [ ] Daily check-in saves
- [ ] Today reflects the latest state
- [ ] DW receives allowed check-in context
- [ ] User can inspect/edit learning controls

### Billing
- [ ] Free limits are deterministic
- [ ] Upgrade flow succeeds in sandbox/test
- [ ] Plus entitlement appears after purchase
- [ ] Restore works where required
- [ ] Cancellation/expiration removes entitlement correctly
- [ ] Provider outage does not corrupt entitlement

### Reliability
- [ ] Type check passes
- [ ] Unit test suite passes
- [ ] V1 Playwright journeys pass
- [ ] No known P0/P1 errors
- [ ] Startup does not hang indefinitely
- [ ] Background/foreground does not unexpectedly log user out
- [ ] Network failure has recoverable UI
- [ ] Sensitive fields are not emitted to telemetry

---

## 14. V1 implementation waves

### Wave 0 — Freeze and inventory
- Freeze new non-V1 features.
- Choose canonical mobile architecture.
- Mark every visible route CORE, NEST, LABS/FUTURE, ALIAS, or INTERNAL.
- Identify the canonical data/service path for each V1 concept.
- Record known P0/P1 defects.

**Exit:** The team knows exactly what is and is not V1.

### Wave 1 — Navigation and product language
- Reduce primary nav to Today / DW / Plan / Dimensions / You.
- Remove duplicate names and competing homes.
- Add redirects for legacy aliases.
- Move specialized tools under their parent dimension/core surface.
- Keep hidden features reachable only through flags/internal links where needed.

**Exit:** A new user can understand the app's structure without explanation.

### Wave 2 — Onboarding → Life System
- Select one onboarding implementation.
- Define one persisted state machine.
- Generate starter-system proposal.
- Add explicit review/consent.
- Confirm approved items are created through canonical services.

**Exit:** A new user reaches value without manual setup.

### Wave 3 — DW action loop
- Normalize DW action proposal/approval/write behavior.
- Verify goals/tasks/routines/calendar/reminders.
- Ensure errors and partial failures are visible.
- Ensure changes propagate to Today and Plan.

**Exit:** DW can reliably help manage the user's life, not only chat.

### Wave 4 — Today + Plan + Check-in
- Consolidate Today data.
- Simplify daily check-in.
- Ensure Plan/calendar is the time authority.
- Remove duplicate visible tracking/schedule concepts.

**Exit:** The daily maintenance loop works.

### Wave 5 — Billing, privacy, reliability
- Normalize entitlement behavior.
- Test account deletion/data isolation.
- Finish release telemetry/error handling.
- Complete automated V1 journeys.

**Exit:** Release candidate is safe to put in front of external beta users.

### Wave 6 — External beta
- Recruit a small real-user cohort.
- Measure onboarding completion, first useful DW action, return usage, failure rates, and qualitative confusion.
- Fix V1 friction before expanding feature scope.

**Exit:** Evidence exists for what V1 users actually value.

---

## 15. Explicit V1 non-goals

These capabilities can remain in code without blocking launch:

- full social/community rollout
- group challenges and gamification depth
- Shared Attention
- creator/entertainment companion systems
- complete wearable-provider coverage
- perfect offline functionality
- every finance/Plaid capability
- every cosmic/astrology capability as a top-level product surface
- every content-feed/discovery concept
- every advanced Elevation/Weekly Review experiment
- full schema cleanup
- Expo/native rewrite parity if Capacitor is selected for V1

A feature can still be useful in V1 without being a primary navigation destination.

---

## 16. V1 product-success events

Before expanding scope, analytics should be able to answer:

- Did the user complete onboarding?
- Did they accept or edit a starter Life System?
- Did they have a meaningful conversation with DW?
- Did DW complete an approved action?
- Did that action appear in Today/Plan?
- Did the user return and interact with the system again?
- Did the user complete a check-in?
- Which core surface caused errors or abandonment?
- Which nested capabilities are actually being used?

Avoid optimizing vanity metrics before these are measurable.

---

## 17. Definition of done for V1

DWAI V1 is ready for a wider launch when:

1. The five-surface product structure is coherent.
2. One onboarding flow reliably creates useful starter context.
3. DW can safely propose and complete core life-system actions.
4. Today and Plan reflect those actions consistently.
5. The user can check in and DW can adapt using permitted context.
6. Account, privacy, billing, and deletion behavior are reliable.
7. Core journeys are covered by repeatable automated/manual release tests.
8. Experimental systems cannot accidentally alter the normal V1 experience.
9. No duplicate mobile implementation is silently being developed as a second V1.
10. Real beta users can understand what DWAI does without the founder explaining the architecture.

---

## 18. Implementation guardrails

- Do not delete large feature areas simply because they are not V1.
- Do not redesign the product philosophy during stabilization.
- Do not create a third implementation of an existing system.
- Prefer redirects, nesting, and flags before destructive deletion.
- Every new V1 write path must enforce user ownership.
- Every AI action must expose proposal vs committed state.
- Every provider dependency must have a degraded/error state.
- No new feature enters CORE without a release test.
- Changes to V1 scope should update this document before implementation.

---

## 19. First implementation PRs after approval

This specification should be implemented through small reviewable PRs rather than one rewrite.

Recommended sequence:

1. **V1 route visibility + navigation consolidation**
2. **Canonical onboarding decision + state cleanup**
3. **Planning terminology/service contract**
4. **DW proposal/consent/action contract**
5. **Today data consolidation**
6. **Daily check-in consolidation**
7. **Feature-flag defaults cleanup**
8. **Mobile architecture freeze/cleanup**
9. **Billing entitlement consolidation**
10. **V1 end-to-end release tests**

No implementation PR should begin until this scope is reviewed and accepted.
