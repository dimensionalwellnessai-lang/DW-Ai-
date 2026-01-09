# Flip the Switch (DWAI) — Stages 2, 3, 5, 6 Unified Spec (v1)
Owner: Reil Brown  
Repo snapshot: **Dimensional-wellness-ai v2.0.1 beta** (zip import)  
Date: 2026-01-09  

This document unifies **Stage 2 (Market/Promise)**, **Stage 3 (Onboarding)**, **Stage 5 (Vibe-coding execution)**, and **Stage 6 (Monetization + Distribution)** into a single buildable framework that fits your existing codebase.

---

## TL;DR — What to ship next
**Your highest ROI is NOT more features.** It’s:
1) **Lock one primary promise** (Stage 2)  
2) **Make onboarding deliver relief in < 3 minutes** (Stage 3)  
3) **Adopt spec-driven vibe coding** so changes land fast and clean (Stage 5)  
4) **Add measurement + ethical monetization hooks now** so growth is real later (Stage 6)

---

# Stage 2 — Market Desire + Primary Promise

## 2.1 Primary Promise (single sentence)
**Primary Promise (v1):**  
> “Flip the Switch turns ‘I’m overwhelmed’ into a clear next move — fast.”

This aligns with your existing brand line (**Pause. Name it. Flip it. One step.**) and your tools-first approach (DWAI_MASTER_SPEC.md).

### Do NOT do in v1
- Don’t promise “fix your whole life” in the first session
- Don’t present all dimensions at once as the first “ask”

### Do in v1
- Promise immediate relief: clarity + next step + saved object

## 2.2 Core Desire Mapping (keep it simple)
Your app hits 3 money-making desires:

1) **Reduce stress / feel in control** (primary)
2) **Save time** (secondary)
3) **Self-improvement / progress** (secondary)

**Rule:** Every onboarding path must clearly map to one desire.

## 2.3 “Money Moment” (ethical)
Your own repo already commits to: **Monetize tools, not healing** (docs/ETHICAL_MONETIZATION.md).

So the first monetizable moments should be *convenience*, not access to grounding or support:

**Ethical Premium candidates (choose 1–2 for v1):**
- Exports (calendar .ics / CSV / PDF pack)
- “Unlimited Projects” or extended history
- Integrations (Google Calendar sync in phase 2; stub in phase 1)
- Advanced insights (“compare weeks”, “trend viewer”, “dimension coverage over time”)
- Templates library (routines/meal plans/workout plans)

**Never:**
- Paywall the “Pause / Anchor / Reframe” flow
- Paywall emotional relief in vulnerable moments

---

# Stage 3 — Onboarding (convert + retain without being corny)

You currently have **two onboarding experiences**:
- `client/src/pages/welcome.tsx` (tutorial carousel)
- `client/src/components/soft-onboarding-modal.tsx` (strong emotional “Pause” flow)

## 3.1 Decision: unify onboarding into ONE path
**Recommendation:** Make **SoftOnboardingModal** the primary first-time experience and demote / remove the tutorial carousel.

Why:
- The soft onboarding already matches your Master Spec’s “Flow D: Mood → Assistant”
- It already has emotional tone + personalization + choice of response type
- The tutorial carousel explains features but doesn’t create “felt relief”

## 3.2 Onboarding success definition (measurable)
A user is “activated” if, within the first session, they complete any one:
- **Anchor** (breathing complete)  
- **Reframe** (reads perspective + saves 1 action)  
- **Plan** (creates a 30–60 minute mini-plan and saves it)  
- **Talk** (sends 1 meaningful message to Assistant and receives a response)

## 3.3 Onboarding flow spec (v1)
**Step 1 — Pause + safety boundary**  
Already exists in COPY.onboarding and SoftOnboardingModal.

**Step 2 — “Where are you at?”**  
Already exists (energy options), multi-select.

**Step 3 — “What’s running in the background?”**  
Already exists (background options), multi-select.

**Step 4 — “Pick what you need right now”**  
Already exists (Anchor / Reframe / Plan / Talk).

**Step 5 — Create one saved object (critical)**
This is the missing piece. Every path should end by saving something real:

- Anchor → save “Grounding Practice” completion log (+ optional calendar event)
- Reframe → save “Perspective Shift” with “one next step”
- Plan → save a “Next Hour Plan” (task list + optional calendar block)
- Talk → save a “Session Summary” (title + one action + one tag)

### 3.4 Make onboarding feel “scientific” without being cringe
Connor’s note: charts/graphs add legitimacy.
In your world, that can be subtle and ethical:

Add a lightweight “Why this works” card in Step 4 or Step 5:
- “90 seconds of breathwork can reduce acute arousal.” (no hard claims, just gentle)
- “Small plans reduce mental load.”  
- “Naming the state reduces the swirl.”

## 3.5 Copy upgrades (keep your voice)
Your copy is already good. The upgrade is **structure**:
- Replace feature explanation with “state → response → outcome”
- Keep “no pressure” language
- Keep “you’re in control here” boundary

---

# Stage 5 — Vibe Coding Execution (how to build fast without chaos)

## 5.1 Your current advantage
You already have:
- A master spec (`DWAI_MASTER_SPEC.md`)
- Strong copy system (`client/src/copy/en.ts`)
- Clear brand config (`client/src/config/brand.ts`)
- A real “Pause flow” component (`soft-onboarding-modal.tsx`)

Your vibe coding should be **spec-driven**, not “random prompt-driven.”

## 5.2 The Spec-Driven Vibe Coding Loop (repeatable)
**Loop:**
1) Update this spec (or a small “Change Spec” section)
2) Define the object you want saved (Task / CalendarEvent / Routine / Insight, etc.)
3) Define UI state transitions
4) Implement + test one screen/flow
5) Add analytics event names
6) Commit

## 5.3 AI Prompt Pack (use this with Claude/Cursor)
Paste this as your “system prompt” for coding sessions:

**PROMPT (copy/paste):**
- You are editing a React + TypeScript app.
- Respect existing patterns, components, and copy system.
- Never invent new storage formats if one already exists.
- Prefer updating `client/src/copy/en.ts` for UI text.
- Keep onboarding “tools-first” and ethical (see docs/ETHICAL_MONETIZATION.md).
- Any onboarding path must end by saving a real object (task/event/log).
- Maintain data tags for dimensions of wellness (physical, emotional, etc).

## 5.4 “Screenshots into AI” workflow (Connor method adapted)
When you want a UI change:
1) Screenshot the current screen + the inspiration screen
2) Upload both to your AI
3) Say: “Match layout/spacing/typography; keep my brand voice; keep existing components”
4) Ask AI to implement ONLY that screen, not the whole app

## 5.5 Testing checklist for vibe-coded changes
- No new global state unless required
- All new actions have toast feedback
- Data saved shows up somewhere (calendar/tasks/logs)
- No flow blocks emotional support behind paywalls

---

# Stage 6 — Monetization + Distribution (ethical + measurable)

You already have strong principles in `docs/ETHICAL_MONETIZATION.md` and `docs/WAVE_7_ROADMAP.md`.

## 6.1 Analytics (must-have for growth)
Add an analytics provider (Mixpanel/PostHog/Amplitude). The provider is your choice — the taxonomy below is the important part.

### Event taxonomy (minimum)
**Onboarding**
- `onboarding_opened`
- `onboarding_energy_selected`
- `onboarding_background_selected`
- `onboarding_response_selected` (anchor/reframe/plan/talk)
- `onboarding_completed`

**Activation / Save**
- `object_saved` with props `{ type: "task|event|routine|log|summary", source: "onboarding|assistant|tool", dimensionTags: [] }`

**Core habits**
- `assistant_message_sent`
- `assistant_object_created`
- `calendar_event_created`
- `task_created`
- `routine_started`
- `routine_completed`

**Trust + safety**
- `why_this_shown`
- `ai_suggestion_accepted`
- `ai_suggestion_rejected`

## 6.2 Monetization placement (ethical)
**Never monetize at “Pause.”**  
Monetize after a user receives value and wants power-user convenience.

### Best first paywalls (v1)
- Exports: “Download plan pack (PDF/ICS/CSV)”
- Integrations: “Sync with Google Calendar”
- Extended history: “Keep more than X days of insights logs”
- Templates library access: “Unlock full routine templates”

## 6.3 Distribution loop (what you do weekly)
**Your app growth system (repeat weekly):**
1) Watch where onboarding drop-offs happen
2) Improve one screen per week (only one)
3) Collect feedback in-app (1 question max)
4) Turn top feedback into one new template or improvement
5) Ship update

### In-app feedback (minimum)
- “What felt most helpful today?”
- “What felt confusing or heavy?”
- “If you could snap your fingers and change one thing, what would it be?”

## 6.4 UGC / influencer format (simple)
Because your app is “state → flip → outcome,” your best content format is:

**Video format:**
- “I was [state]…”
- “I used Flip the Switch for 2 minutes…”
- “Now my next move is [tiny plan]…”

This is aligned with Connor’s “relatable, raw, unprocessed” concept.

---

# Implementation Map (where to build in your code)

## Files to touch first (Stage 3 activation)
- `client/src/components/soft-onboarding-modal.tsx`  
  Add: “Save object” step per response type (Anchor/Reframe/Plan/Talk)

- `client/src/pages/welcome.tsx`  
  Option A: Replace with the soft onboarding modal as the first-time flow  
  Option B: Remove carousel; route to Assistant after soft onboarding

- `client/src/copy/en.ts`  
  Keep all user-visible words centralized here

- `docs/ETHICAL_MONETIZATION.md`  
  Reference during paywall decisions

---

# Acceptance Criteria (Stages 2/3/5/6 “together”)

✅ Stage 2 complete when:
- Primary promise is written and used in onboarding + app header/marketing

✅ Stage 3 complete when:
- A user can finish onboarding and the app saves at least one real object

✅ Stage 5 complete when:
- You can implement a UI change using the prompt pack + spec loop without breaking patterns

✅ Stage 6 complete when:
- Analytics events exist + one ethical monetization hook is designed (even if disabled)

---

## Appendix: Primary promise options (pick 1 later)
1) “Overwhelmed → clear next move.” (best default)
2) “Chaos → calm plan.” (more emotional)
3) “Pause, name it, flip it — one step at a time.” (brand-native)
