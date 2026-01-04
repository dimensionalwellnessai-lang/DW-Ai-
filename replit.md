# Flip the Switch (FTS)

## Overview

Flip the Switch (FTS) is a Dimensional Wellness AI - a consent-based personal assistant that helps users build their own life system through adaptive guidance — not prescriptive routines. The app uses AI-powered insights to provide energy-based guidance (not productivity-based), adapting to the user's current state rather than pushing for output.

## Core Principles (Non-Negotiable)

- No forced routines or "ideal life" templates
- All actions (save, schedule, commit) require explicit user consent
- The assistant supports user authorship, not dependency
- The product is calm, optional, and energy-aware
- The creator's personal life system is not encoded or replicated

## Development Guardrails

- Do not add new features unless explicitly requested
- Do not introduce monetization that targets emotional relief or identity
- Do not add social pressure, streaks, or guilt-based mechanics
- Avoid medical or diagnostic claims
- Maintain App Store compliance at all times

**If there is ambiguity, default to**: user control, optionality, clarity, and calm.

## Scope Status

- Wave 6 (Guided Experiences, Body & Energy Intelligence) is complete
- Phase B (Polish & Stabilization) is complete
- We are now operating under Wave 7 (Growth, Trust & Sustainability)

## Authoritative Documentation

- `/docs/WAVE_7_ROADMAP.md` - What may be built
- `/docs/ETHICAL_MONETIZATION.md` - Monetization boundaries
- `/docs/USER_TRUST_AND_SAFETY.md` - Trust and consent enforcement
- `/docs/APP_STORE_REVIEWER_NOTES.md` - Compliance requirements

## Core Philosophy

**North Star Flow**: Ground → Name → Shift → Next Step

**Core Principle**: If a feature does not reduce cognitive load or support emotional regulation, it does not belong.

**North Star Question**: "Does this help the user feel safer in their body right now?" If no, it doesn't belong.

FTS must never: overwhelm, rush, guilt, or compete for attention.

### Voice Methodology (Reil Brown's "Flip the Switch")
- **4-Step Response Structure**: Ground → Name → Shift → Next Step
- **Banned Language**: "you should", "fix", "broken", "always", "never", "just", "optimize", "maximize", "hack"
- **Preferred Language**: "notice", "shift", "heavy", "steady", "grounded", "clear", "observe"
- **Signature Phrases**: "Pause for a second", "Let's flip the switch", "What's the energy right now?"
- **Max Response Length**: 120 words per AI response

### Design Principles
- **Energy-based guidance** instead of productivity-based guidance
- **Meaning over metrics**: Replace scores/streaks/leaderboards with narrative summaries and reflective language
- **Optionality is a feature**: Always allow exit, no forced next step, no penalty for inactivity
- **Silence as a design tool**: Intentional pauses, blank space, minimal responses
- **Nervous system-aware**: Adapt to user states (overstimulated, tired, scattered, steady, grounded)
- **Dependence avoidance**: Teach self-trust, normalize days without app use

### Copy & Language Standards
Avoid: "You should", "You must", "Complete", "Fix", "Broken"
Use: "We can", "If you want", "Notice", "Shift", "Observe"
Tone: calm, grounded, human, humble

### Screen Structure
**AI Assistant is the main experience** (landing page)
Supporting sections accessible via hamburger menu:
- Challenges (workout, mental health, nutrition, social, financial)
- Talk It Out (dedicated AI mode for processing feelings)
- Calendar & Plans (schedule, plans, routines)

### First Interaction (Soft Onboarding)
4-step flow:
1. "Pause for a second." - Introduction
2. "What's the energy right now?" - Energy check-in
3. "What's running in the background?" - Context gathering
4. "You're in control." - Boundary setting

## Configuration Architecture

### Centralized Voice & Copy
- **Brand Config**: `client/src/config/brand.ts` - App name, tagline, descriptor
- **Voice Guide**: `client/src/config/voiceGuide.ts` - AI voice rules, banned/preferred words, response structure
- **Copy Constants**: `client/src/copy/en.ts` - All UI text, onboarding copy, microcopy

### User Preferences
Preferred communication style: Simple, everyday language. Collaborative, not directive.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
  - **Central Route Registry**: `client/src/lib/routes.ts` defines all routes with enabled flags
  - **Feature Visibility**: `client/src/lib/feature-visibility.ts` controls menu visibility
  - Routes must be enabled in both files to be accessible and visible
  - Disabled routes show a friendly "Not Found" page
- **Version**: App version stored in `client/src/lib/routes.ts` as `APP_VERSION` (currently 0.1.0-beta)
- **State Management**: TanStack React Query for server state management and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens for theming (light/dark mode support)
- **Typography**: Multiple lively fonts for visual variety:
  - DM Sans (default sans-serif)
  - Space Grotesk (display/headings via .font-display)
  - Nunito (body text via .font-body)
  - Crimson Pro (serif/emotional content via .font-serif)
- **Guest Mode**: Local storage persistence for chat messages before signup (uses `fts_` prefix keys)
- **Charts**: Recharts for data visualization on the progress page

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API endpoints under `/api` prefix
- **Session Management**: express-session with secure cookies
- **Authentication**: Custom session-based auth with bcrypt password hashing

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Database**: PostgreSQL (requires DATABASE_URL environment variable)
- **Migrations**: Drizzle Kit for schema management (`drizzle-kit push`)
- **Validation**: Zod schemas generated from Drizzle schemas using drizzle-zod

### Core Data Models
- **Users**: Authentication credentials and onboarding status
- **Onboarding Profiles**: User responsibilities, priorities, free time, wellness focus
- **Life Systems**: Personalized system name, weekly schedule, suggested habits/tools
- **Goals**: Wellness goals with dimensions (physical, mental, emotional, etc.)
- **Habits**: Trackable habits with frequency, streaks, and reminder times
- **Mood Logs**: Daily energy, mood, and clarity level tracking
- **Check-ins**: AI conversation history for daily wellness check-ins
- **Schedule Blocks**: Time-blocked schedule entries by day

### AI Integration
- **Provider**: OpenAI-compatible API via Replit AI Integrations
- **Use Cases**: 
  - Chat-based daily check-ins with contextual wellness guidance
  - Life system recommendations based on onboarding data
- **Context**: AI responses are personalized using user's system name, wellness focus, and peak motivation time
- **Voice Config**: System prompt enforces 4-step structure and vocabulary rules

### Build System
- **Development**: Vite dev server with HMR, proxied through Express
- **Production**: Vite builds client to `dist/public`, esbuild bundles server to `dist/index.cjs`
- **Path Aliases**: `@/` maps to client/src, `@shared/` maps to shared/

## External Dependencies

### Database
- PostgreSQL database (connection via DATABASE_URL environment variable)
- connect-pg-simple for session storage in production

### AI Services
- Replit AI Integrations (OpenAI-compatible API)
  - Requires AI_INTEGRATIONS_OPENAI_BASE_URL and AI_INTEGRATIONS_OPENAI_API_KEY environment variables

### Authentication
- Session-based authentication with express-session
- SESSION_SECRET environment variable recommended for production
- **Password Reset**: Email-based reset via Resend integration (tokens expire in 1 hour)
- **Remember Me**: Login sessions extend from 7 days to 30 days when checked

### Email
- **Provider**: Resend via Replit connector
- **Default Sender**: Flip the Switch <no-reply@resend.dev> (temporary for beta)

### Third-Party Libraries
- **UI**: Full shadcn/ui component suite with Radix UI primitives
- **Forms**: react-hook-form with @hookform/resolvers and Zod validation
- **Dates**: date-fns for date manipulation
- **Charts**: Recharts for progress visualization

## Voice Mode (Wave 6.1)

### Voice Input
- **Component**: `VoiceModeButton` in `client/src/components/voice-mode-button.tsx`
- **API**: Web Speech API (Safari-compatible via webkitSpeechRecognition)
- **Behavior**: Push-to-talk only, never auto-listening
- **States**: Idle (outline mic), Listening (pulse ring), Processing (spinner), Error (text fallback)

### Voice Scripts
- **Location**: `client/src/config/voiceScripts.ts`
- **Locked Scripts**: Session start, unsure user, before suggestion, after save, skip, error fallback

### Integration Points
- AI Chat: Bottom right of input area
- Talk It Out: Bottom center with send button

### Voice Rules
- Voice never navigates without permission
- Voice never saves without confirmation
- Voice never interrupts
- Voice mirrors on-screen actions (populates text input before sending)

## Body & Energy Intelligence (Wave 6.2)

### Energy Context System
- **Location**: `client/src/lib/energy-context.ts`
- **Sources**: Mood logs, body scan, soft onboarding mood
- **Levels**: low, medium, high (mapped from numeric/categorical inputs)

### AI Energy Awareness
- AI adapts tone, pacing, and number of suggestions based on energy level
- Low energy: 1-2 gentle options, slower pacing, prioritize grounding
- Medium energy: Balanced, collaborative options
- High energy: More opportunities, remind user can save energy

### Transparency Rules
- AI must explain why it's adjusting guidance ("I'm suggesting this because your energy seems lower today")
- Never silently adjust without explanation
- Never restrict options or auto-schedule

### Consent Rules
- Never auto-schedule
- Never block options based on energy
- Never force rest or effort
- All actions require explicit user confirmation

### Data Sources (Existing Only)
- Mood/energy/clarity sliders
- Body scan dialog (energy level, body goal)
- Soft onboarding mood selection
- No new sensors or biometric inference

### Persistence
- Body scan progress auto-saves
- Unit toggle (imperial/metric) persists globally
- Clarity level saves to localStorage (fts_current_clarity) when mood is logged
- Leaving app does not reset scan

## Guided Experiences (Wave 6.3)

### Netflix-Style Layout Pattern
All guided experience pages (Meditation, Workouts, Challenges, Recovery) follow a consistent pattern:
- **AI Picks Section**: Max 2-3 personalized recommendations at top
- **"Why" Explanations**: Each AI recommendation includes transparent reasoning
- **Single-Select Pattern**: Only one item can be selected at a time
- **Save Disabled Until Selection**: Helper text "Pick 1 option to save" when nothing selected
- **Calendar Confirmation**: All calendar additions require explicit confirmation dialog

### Updated Pages
- **Meditation**: `client/src/pages/meditation.tsx` - AI Picks with "Why", single-select, calendar confirmation
- **Challenges**: `client/src/pages/challenges.tsx` - AI Picks with "Why", Browse by Category, calendar confirmation
- **Workouts**: `client/src/pages/workout.tsx` - "Picked for You" with "Why", calendar confirmation dialog

### Reusable Component
- **GuidedExperienceLayout**: `client/src/components/guided-experience-layout.tsx` - Netflix-style shell with AI Picks, categories, filters

### Wave 6.3 Rules
- Never auto-save or auto-schedule
- Always show "Why" reasoning for AI suggestions
- Maximum 2-3 AI picks to avoid overwhelm
- Single selection enforced (toggle off by re-clicking)
- Calendar additions always confirmed via dialog

## Wave 7: Transparency & Trust (Current)

### 7.1 System Ownership/Transparency
- **Data Origin Labels**: Goals, habits, and routines display origin badges ("You Created", "AI Suggested", "Imported")
- **Explain Why Toggle**: Collapsible "Why this?" button shows AI reasoning for suggestions
- **Schema Fields**: `dataSource` and `explainWhy` columns on goals, habits, routines tables
- **My Life System Section**: Life Dashboard shows all user's items with origin counts

### 7.3 Feedback Queue
- **User Feedback Table**: `userFeedback` with category tags (confusion, friction, emotional_load, clarity)
- **Feedback API**: POST /api/feedback endpoint for submitting feedback
- **Page Context**: Feedback captures which page the user was on

### 7.4 Pattern Awareness (Energy-Adaptive AI)
- **Energy Patterns**: `ENERGY_ADAPTIVE_PATTERNS` in voiceGuide.ts for low/medium/high energy
- **Transparency Phrases**: AI explains why it's adjusting guidance based on energy
- **Consent Reminders**: Phrases that reinforce user autonomy ("You're always in control")
- **No Dark Patterns**: Never auto-schedule, never restrict options, always ask permission
- Safari-compatible (no experimental APIs)
