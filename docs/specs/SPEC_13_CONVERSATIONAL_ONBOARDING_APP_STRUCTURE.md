# SPEC 13 — CONVERSATIONAL ONBOARDING & APP STRUCTURE (DRAFT)

## Purpose

This spec defines DW's conversational onboarding model and the app structure that is dynamically shaped by each user's real life patterns, curiosities, and needs.

---

## Product Concept & Positioning

DW is a personal life coach and life-shaping system generated from the user's lived reality.

DW meets people where they are and helps take them where they want to go.

DW starts as a blank shell and is populated through interaction, reflection, and ongoing adaptation.

---

## Main Navigation

The primary app navigation is:

1. **Command Center**
2. **My Life**
3. **Guidance**
4. **Tools**
5. **Profile**

---

## My Life Structure

My Life is the user's core life system.

- **Focus Points** — the few high-priority areas that matter most right now.
- **Paths** — ongoing directions of growth (for example: health reset, financial stability, emotional steadiness).
- **Systems** — repeatable operating structures that make follow-through easier (routines, rhythms, check-ins, defaults).
- **Plans** — structured sequences with milestones and pacing for progressing on a Path or System.
- **Projects** — bounded initiatives with a defined outcome and clearer finish state.

### Plans vs Projects

- **Plans** are directional and adaptive. They can evolve continuously as life changes.
- **Projects** are scoped and outcome-focused. They usually have a clearer completion point.

---

## Guidance Structure

Guidance is the reflective and educational layer of DW.

Sections:

- **Recommended**
- **Explore**
- **Conversations**
- **Zodiac Guidance**
- **Reflections**
- **Patterns**

### Zodiac Guidance Role

Zodiac Guidance combines western horoscope and Chinese zodiac on one screen.

It is a secondary reflective layer for timing, self-awareness, and perspective.
It is not the foundation of the app and does not replace practical planning, execution, or real-world constraints.

---

## Conversational Onboarding Model

Onboarding should feel like a first life coaching session, not a questionnaire.

Required principles:

- voice/text hybrid conversational UX
- observation before intervention
- vision before fixing
- room for uncertainty and partial completion
- progressive continuation after signup through Command Center cards

---

## Conversational Onboarding Flow

1. **Opening / connection**
2. **Current life story** (what is going on right now)
3. **Desired direction** (what the user wants out of life)
4. **Current life areas involved** (multi-select and/or conversational inference)
5. **Pattern exploration** through soft prompts instead of requiring self-diagnosed barriers
6. **Curiosity discovery** (what the user wants to learn)
7. **Capacity and pacing**
8. **Reflective summary**
9. **Editable AI-generated suggestions**
10. **Launch into an initial populated app shell**

---

## AI Behavior Requirements

The AI must:

- infer likely barriers and support needs when users are unsure
- suggest focus points, paths, systems, plans, projects, lessons, and tools
- make every suggestion editable (rename, remove, defer)
- adapt when an approach is not working
- integrate newly learned user concepts into the life system
- show where and why items were added when the user asks

---

## Dynamic Population Model

DW uses a static app shell with dynamic user-specific population.

### Command Center

Populates with current priorities, check-ins, suggested next steps, and progressive onboarding cards.

### My Life

Populates focus points, paths, systems, plans, and projects based on onboarding + continued interaction.

### Guidance

Populates recommendations, explorations, conversations, pattern insights, reflections, and zodiac content based on context and timing.

### Tools

Populates suggested and pinned tools based on active paths/projects, current friction points, and preferred support style.

---

## Data Model Overview

Key entities:

- **UserProfile** (identity, context, preferences, support style)
- **OnboardingSession** (conversation transcript, stage progress, completion state)
- **Observation** (captured user signals: emotional, practical, relational, financial, etc.)
- **FocusPoint**
- **Path**
- **System**
- **Plan**
- **Project**
- **Lesson**
- **LearningThread**
- **SuggestedItem** (AI proposal + user decision state: accepted/edited/deferred/rejected)

---

## UX Principles

DW should be:

- personable
- empathetic
- adaptive
- strong enough to guide
- soft enough to meet users where they are

DW should not feel rigid or overly questionnaire-like.

---

## Implementation Notes

- Onboarding is never a one-time gate; it continues progressively via Command Center.
- Users can skip, defer, or return to unanswered prompts.
- The system should preserve user agency and keep all generated structure editable.
