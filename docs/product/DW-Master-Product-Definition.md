# DW Master Product Definition

> **Status**: Finalized — use this document as the authoritative product definition for all engineering, design, and AI-agent work.

---

## 1. What DW Is

**DW (Dimensional Wellness)** is a **proactive Smart Life Planning Companion** — a consent-based personal AI that helps users design and live a life that fits *them*, not a generic productivity template.

DW is **B-locked**: it operates on the user's behalf without requiring constant manual input. It surfaces context-aware guidance, tracks patterns across 13 life dimensions, and proposes actions the user can accept, modify, or ignore.

> "DW doesn't tell you what to do — it holds the map while you drive."

---

## 2. Core Identity

| Attribute | Definition |
|-----------|-----------|
| **Product type** | Proactive life planning companion |
| **Interaction model** | Consent-based; always asks before saving or scheduling |
| **Guidance style** | Energy-aware, never prescriptive |
| **Metric philosophy** | Meaning over metrics — no streaks, no leaderboards |
| **Optionality** | Core feature; nothing is mandatory |
| **Silence** | A design tool; calm, unobtrusive default state |

---

## 3. The 13 Life Dimensions

DW tracks user wellness across the following dimensions:

1. Physical Health
2. Mental & Emotional Health
3. Spiritual / Purpose
4. Financial
5. Relationships & Social
6. Career & Professional Growth
7. Learning & Intellectual
8. Environment & Space
9. Creativity & Expression
10. Fun & Recreation
11. Community & Contribution
12. Rest & Recovery
13. Identity & Self-Concept

Each dimension has its own energy state, goals, habits, and AI-generated insights.

---

## 4. The Interaction Framework

Every DW interaction follows the **Pause → Name → Flip → Choose** structure:

1. **Pause** — slow down and notice the current state
2. **Name** — identify what dimension or energy is at play
3. **Flip** — reframe from problem to possibility
4. **Choose** — select a small, doable next action

AI suggestions always map to one of these four stages.

---

## 5. User Modes

| Mode | Description |
|------|-------------|
| **Guest** | Local-storage only; no account required |
| **Authenticated** | Full persistence via PostgreSQL; sync across devices |
| **B-locked** | Proactive background intelligence layer (future: always-on) |

---

## 6. Feature Tiers

All features must be gated by one of these tiers:

- **Core** — available to all users including guests
- **Registered** — requires account creation
- **Premium** *(future)* — subscription-gated features

New features must declare their tier before implementation.

---

## 7. Non-Goals

DW is explicitly **not**:

- A task manager (tasks are a means, not the end)
- A fitness tracker (fitness is one dimension, not the product)
- A journaling app (journaling supports reflection, it isn't the loop)
- A productivity optimization tool (optimization without meaning is noise)

---

## 8. Success Metrics (Qualitative)

DW succeeds when users report:

- Reduced decision fatigue
- Increased sense of alignment between values and actions
- Feeling supported, not surveilled
- Returning to the app during hard moments, not just good ones
