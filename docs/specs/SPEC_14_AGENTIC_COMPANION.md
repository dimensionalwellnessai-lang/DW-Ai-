# SPEC 14 — AGENTIC COMPANION (DIMENSIONAL WELLNESS AI)

## Purpose

This spec defines the DWAI Agentic Companion system: a proactive, consent-first, life-scope companion that can act alongside the user — not just reflect back. It covers doorway-to-action cards, the four Shared Attention modes, the Action Engine, the proactive "DW noticed…" layer, and the ethical guardrails that govern all of it.

**Core rule**: *Unlimited in what it can touch. Principled in how it touches it.*

---

## What the Agentic Companion Is

The Agentic Companion extends DWAI from a wellness tracker into a proactive life companion that:

- Touches every domain of life (hobbies, entertainment, creators, errands, learning, companionship, spirituality, finances, wellness — everything)
- Suggests one action at a time, never a list of demands
- Never acts without an explicit consent path
- Is always explainable, reversible, and dismissible

---

## What the Agentic Companion Is Not

It is not:
- A bot that texts, posts, purchases, or communicates on behalf of the user without witnessed consent
- A surveillance tool (no persistent screen recording, no silent capture)
- A productivity optimizer (it will not nag or streak-shame)
- A replacement for human relationships, professionals, or community

---

## 1. Doorway-to-Action Cards

Four new home cards expand the card stack beyond wellness dimensions into the full scope of life:

| Card | Domain |
|---|---|
| **ExploreCard** | Hobbies and curiosities |
| **EntertainmentCard** | Unwind and enjoy |
| **CreatorsCard** | People you follow |
| **CompanionshipCard** | You don't have to do this alone |

Each card provides:
- A title and calm subtitle
- A rotating contextual prompt
- 2–3 doorway CTAs that route through the Action Engine
- An optional "Watch with DW" CTA (gated by the `sharedAttention` flag) that opens a co-watch session

All cards are individually gated by feature flags (`exploreCard`, `entertainmentCard`, `creatorsCard`, `companionshipCard`) and are off by default.

---

## 2. Action Engine

The Action Engine is a client-side service that mediates every agentic action.

### Action Types

| Type | Description |
|---|---|
| `open` | Navigate to an internal route or open an external URL |
| `read` | Read text aloud via the existing TTS service |
| `schedule` | Create a local reminder via the existing reminder scheduler |
| `order` | v1: opens a store/order URL after consent (provider integrations are out of scope) |
| `search` | v1: opens a search results URL after consent |

### Consent Tiers

| Tier | Behavior |
|---|---|
| `silent` | Act, log for review |
| `notify` | Act, then summarize |
| `witness` | Show action live, require explicit UI confirmation before executing |

Every action has a consent tier. The `witness` tier always requires UI confirmation before execution. No action of any tier is ever executed without a consent path being traversed.

### Undo

Actions marked `undoable` can be reversed (e.g., a reminder created by `schedule` can be cancelled). The engine exposes `undoAction()` for this purpose.

### Audit Log

Every action taken (proposed, executed, declined, undone) is recorded in a local audit log persisted in `localStorage` under the key `dw-agent-action-log`, capped at 200 entries. Users can inspect this log through the DW Broadcast Panel.

---

## 3. Shared Attention

Shared Attention enables a live connection between the user and DWAI around a shared focus — a piece of content, a task, or a real-world moment.

### Four Modes

| Mode | Label | Direction |
|---|---|---|
| `dw-broadcast` | Watch DW Work | User watches DWAI perform actions in real time |
| `user-broadcast` | DW Watches Me | User shares screen or camera with DWAI |
| `co-watch-dw` | DW Pulls, We Watch | DWAI pulls up content and they experience it together |
| `co-watch-user` | I Pull, We Watch | User pulls up content to watch with DWAI |

### Consent Requirements per Mode

- **`dw-broadcast`**: passive viewing; no consent gate beyond opening the panel
- **`user-broadcast`**: explicit per-session opt-in required; capture API called only after consent; never recorded by default; user sees their own local preview; a clear Stop control is always visible
- **`co-watch-dw`**: user initiates; a curated URL is presented for confirmation before embedding
- **`co-watch-user`**: user provides the URL; DWAI reacts and discusses

### Content Embedding

YouTube content uses `https://www.youtube-nocookie.com` embeds to respect CSP policy. If CSP blocks framing, the component falls back to an external-open button with a clear explanatory message.

### Sessions

Each Shared Attention session is represented by a `SharedSession` object with:
- Unique id
- Mode
- Consent tier
- Optional content URL and title
- Start/end timestamps (ISO 8601)
- `recordingConsent` flag (defaults to `false`; user must explicitly opt in to any recording)

---

## 4. Proactive "DW Noticed…" Layer

DWAI surfaces at most one proactive suggestion at a time, using client-side heuristics only. No new server work is required.

### Heuristics (v1)

1. **Long gap since last check-in**: if no check-in exists for today, suggest a quick check-in
2. **Free time**: if no plan or reminder exists in the next 2 hours, suggest an Explore action
3. **Fallback rotation**: a set of gentle, non-pushy prompts drawn from a static list

### Behavior Rules

- Never more than one suggestion visible at a time
- Dismissal is persisted in `localStorage` for the calendar day
- The same suggestion will not re-appear within 24 hours of dismissal
- Impressions, dismissals, and accepts are tracked via the existing analytics helper

---

## 5. Ethical Guardrails

### Consent-First

Every action requires an explicit consent path. The `witness` tier always shows the action to the user and waits for confirmation. No action is fire-and-forget.

### Explainable

Every action card shows a plain-language description of what DWAI is about to do and why it is suggesting it. There are no hidden operations.

### Reversible

Actions marked `undoable` can be reversed. DWAI always tells the user whether an action can be undone. Irreversible actions (e.g., `order`) are always `witness` tier.

### No Manipulation

DWAI will not:
- Create artificial urgency ("only 2 hours left!")
- Use social proof as pressure ("your friends all do this")
- Withhold features to coerce engagement
- Suggest actions that benefit DWAI or a third party at the user's expense

### No Medical Claims

DWAI will not make medical, therapeutic, or diagnostic claims. It does not diagnose, treat, prescribe, or promise health outcomes. It uses energy-aware, perception-first language throughout.

### Privacy

- `user-broadcast` sessions are never recorded by default
- `recordingConsent` must be explicitly set to `true` by the user for any recording to occur
- The audit log is stored locally and never transmitted without user action

---

## Implementation Map

| Spec Section | File(s) |
|---|---|
| Feature flags | `client/src/config/featureFlags.ts` |
| Shared types | `shared/sharedAttention.ts`, `shared/agentActions.ts` |
| Action engine | `client/src/lib/agent-actions.ts` |
| Shared attention components | `client/src/components/shared-attention/` |
| Proactive layer | `client/src/components/dw-noticed.tsx` |
| Doorway cards | `client/src/features/home/components/` |
| Hub page | `client/src/pages/shared-attention.tsx` |
| Copy | `client/src/copy/en.ts` |
| Tests | `client/src/test/agentActions.test.ts`, `client/src/features/home/components/__tests__/ExploreCard.test.tsx` |

---

## Version History

| Version | Notes |
|---|---|
| v1 (this PR) | Full scaffold: flags, types, action engine, shared attention components, doorway cards, proactive layer, hub page |
