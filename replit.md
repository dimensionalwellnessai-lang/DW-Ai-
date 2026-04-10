# DW Wellness AI (dimensionalwellnessai.com) - Replit Configuration

## Overview

Flip the Switch is a Dimensional Wellness AI (DWAI), a consent-based personal assistant designed to help users build a personalized life system. It provides adaptive, energy-based guidance rather than prescriptive routines, following a **Pause → Name → Flip → Choose** structure. The AI acts as an anticipatory, personalized, and patient concierge. Its core philosophy is to reduce pressure, not increase performance, focusing on user calmness, feeling seen, and capability. The app adheres to principles of explicit user consent, no forced routines, energy awareness, no guilt-based mechanics, and no medical claims.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack React Query
- **UI Components**: Radix UI primitives with shadcn/ui styling
- **Styling**: Tailwind CSS with custom themes
- **Build Tool**: Vite

### Backend
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM)
- **API Style**: RESTful endpoints (`/api/*`)
- **Session Management**: Express sessions with cookie-based authentication
- **File Uploads**: Multer for document parsing

### Data Layer
- **ORM**: Drizzle ORM
- **Database**: PostgreSQL
- **Schema**: Shared (`shared/schema.ts`)
- **Migrations**: Drizzle Kit

### Mobile Support
- **Framework**: Capacitor for iOS/Android
- **Web Directory**: `dist/public`

### Production-Readiness Polish (Task #1)
- **Routing**: `/home` and `/today` redirect to `/command-center`. `/welcome` and `/voice-onboarding` redirect to `/enhanced-onboarding`. Single canonical entry points for home and onboarding.
- **SEO Metadata**: `usePageMeta(title, description)` hook applied to all pages — sets `<title>` as "{Title} | DW.ai" and updates the meta description tag.
- **Feature Flag Guards**: `FeatureFlagGate` component at `client/src/components/feature-flag-gate.tsx`. Route registry has `requiredFlag` field; `AllFeaturesView` filters out routes whose flag is off so they're completely invisible.
- **Loading States**: Skeleton loaders added to habits and goals pages. Empty states use the centralized `COPY.emptyStates` system.
- **Typography**: `font-display` (Space Grotesk) and `font-body` (Nunito) are now properly registered in `tailwind.config.ts` so these utility classes actually apply the correct fonts.
- **Shell Consistency**: Global `app-shell` class in App.tsx wraps all routes for safe-area handling. Pages with `PageHeader` component get sticky header + hamburger nav.

### Key Design Patterns & Features
- **Guest Storage**: LocalStorage for unauthenticated users.
- **Shared Schema**: Database schema shared between client and server.
- **Copy/Tone Layer**: Centralized UI copy for consistent voice.
- **Analytics**: Client-side event tracking.
- **Lazy Loading**: Components loaded on demand with Suspense.
- **DW Orb System**: A reusable `DWOrb` component as the central visual element for AI interaction (idle, suggestion, active, chat states).
- **Command Center**: Main dashboard with a central DW Orb, surrounded by 9 orbit icons (Today, Insight, Plan, Nutrition, Momentum, Follow-Up, Journal, Cosmic, For You). Includes proactive cards, vitals, schedule, goals, routines, and a daily affirmation.
- **Cosmic Background**: Subtle gradient background (`cosmic-bg` class).
- **Time-of-Day Gradients**: Dynamic CSS gradients for Command Center background based on time.
- **Insight Dimension Cards**: Interactive cards for dimension assessment on the `/insights` page.
- **Calendar System**: Apple Calendar-style view (`/calendar`) with day/week/month views. Event details are shown in a bottom sheet with tasks, merging add/suggest flows. Includes free time detection with rich lifestyle suggestions and personalization based on user preferences and AI learnings. A "Lifestyle Preferences" form helps tailor suggestions.
- **DW Smart Import**: Universal content importer (`/life-system-import`) detecting content types (e.g., `life_system`, `journal_entry`, `workout_plan`, `meal_plan`, `goals`). Uses GPT-4o for parsing and allows users to review and apply extracted items to their system. Handles recurring schedules and goal conflict resolution.
- **AI Integration**: Primary interaction via an AI chat interface. Context-aware wellness guidance and proactive nudges. System prompts enforce a calm, consent-based tone. Includes a "Life System Planning Mode" for comprehensive plans and markdown rendering for AI messages. Users can "Save Plan" for substantial AI responses.
- **AI↔Feature Connection (Full)**: DW is fully wired into the app as a live intelligence system. (1) **Real-time context**: smart/stream chat routes fetch today's habit completions, current mood log, today's schedule blocks, calendar events, recent journal entries, pending reminders, and active routines — all sent to DW in the system prompt so it knows exactly what's happening. (2) **Direct actions**: DW can create journal entries, log habit completions, set reminders, create routines, update goal progress, log mood, create goals/habits, and schedule blocks — all executed server-side from tool calls. (3) **Navigation**: `navigate_to` tool call lets DW send the user directly to any feature page (handled in ai-workspace.tsx and talk-it-out.tsx via `setLocation` with 1.2s delay). (4) **Feature feedback**: Since context is fetched fresh on every chat request, any action the user takes in any feature (completing a habit, logging a meal, writing in journal) is automatically reflected in DW's next conversation. (5) **Query invalidation**: After any action, all relevant frontend query keys are invalidated to refresh the UI immediately.
- **Notifications System**: Database-backed notifications (`notifications`, `evening_check_ins`). Includes a `NotificationBell` component and a smart check-in system that computes optimal timing and adapts messages based on time context (e.g., `prime_evening`, `late_night`, `missed_morning`).
- **Browse Page**: Features "For You," "Video," "Articles," and "Saved" tabs. Uses X/Facebook-style feed cards — full-width post layout with large thumbnails, engagement rows (watch/read/open, not-interested), and personalized "why suggested" context. Content sourced from Perplexity (with OpenAI fallback). Community and Discover tabs preserved as hidden state.
- **Onboarding Wizard**: 8-screen flow — Mission → About DW → Name+Birth+Location → Profession → 90-day Goals → Daily Rhythm (wake time, wind-down time, preferred workout days) → App Tour (9-slide carousel) → Launch. New fields: `profession` (8 options), `lifeGoals` (10 multi-select options), `wakeTime`, `sleepTime`, `preferredWorkoutDays`. Maps to backend responsibilities/priorities/wellnessFocus. Bridges birth data to cosmic localStorage keys.
- **Command Center**: Added layered orbit rings (outer/inner/halo), atmospheric radial glow behind DW Orb, and a pulsing halo glow for depth.
- **Voice Assistant System**: Full voice assistant integration for iOS (Siri) and Android (Google Assistant). Includes: (1) `/voice` — full-screen voice conversation mode with animated mic orb, STT via Web Speech API, TTS via `ttsService`, auto-start on assistant launch; (2) `/day/start` — daily briefing page with today's priorities, next event, and CTA to start voice mode; (3) `useAssistantLaunch()` hook parses URL params and Capacitor launch URLs to determine source/action/autoStartVoice; (4) `deep-link-service.ts` extended with new actions (voice, day_start, whats_next, mood_log, task_add, workout_start) and a navigator function for routing; (5) iOS `DWAppIntents.swift` + `DWAppShortcuts.swift` with 6 App Intents and Siri phrase mappings; (6) `ios/App/DWWidget/` small + medium SwiftUI widget with 6 deep-link action buttons; (7) Android `shortcuts.xml` (5 long-press launcher shortcuts) and `app_actions.xml` (Google Assistant App Actions); (8) `assistant-analytics.ts` + `/api/assistant/log` endpoint for action tracking; (9) `VoicePreferences` stored in localStorage via `getVoicePreferences()`/`saveVoicePreferences()`; (10) Deep link service is initialized with wouter `setLocation` in App.tsx on mount.
- **Cosmic Hub**: Now has 4 tabs — Calendar, Readings, Astrology, Numbers. Readings tab features 6 timeframe deep readings (Today, Month, Year, Moon Phase, Life Phase, Life Pattern), each generating AI readings from birth+numerology profile. Cosmic Alignment section allows comparing your energy with another person using numerology.
- **OpenAI TTS (Alloy voice)**: All speech in the app routes through `/api/tts` → `openai-tts.ts` → Alloy voice. `tts-service.ts` is the unified interface. Browser `speechSynthesis` is no longer used anywhere. Personality presets (calm/motivating/direct) affect speed. Voice settings page shows "OpenAI Alloy" badge, style selector, speed slider, and a "Hear DW" test button.
- **Workout Page Redesign**: `workout.tsx` now has a 3-tab layout — **Today** (atmospheric hero orb, AI-personalized recommendation, body profile card, planning horizon compact row), **Library** (search + filters + workout cards with expand/steps/YouTube), **My Plans** (AI plans, saved workouts, resources). All dialogs/session engine remain at the bottom.
- **PageHeader Consistency**: `systems-hub.tsx`, `plan-page.tsx`, and `accountability.tsx` all received `PageHeader` components for consistent page structure across the app.
- **Life Blueprint Consolidation**: `/life-blueprint` route in App.tsx now renders `LifeBlueprintV2Page` (v2 design) for a single consistent experience.

## Phase Implementations (Latest Updates)

### Phase 1 — Goals Page (Rebuilt)
- **9 wellness dimensions**: Physical, Mental, Emotional, Financial, Spiritual, Social, Environmental, Occupational, Purpose — each with icon/color
- **Create form**: Title, dimension selector, "Why does this matter" field, target date picker, notes
- **Goal cards**: Collapsible with progress bar, dimension badge, target date + days remaining
- **Progress update**: Quick buttons (25/50/75/100%) + edit mode with slider
- **Mark complete**: Sets progress to 100% and deactivates goal
- **Delete**: Removes goal with confirmation toast
- **DW Thread**: Shows linked supporting habits on expanded goal card (habits created with "Supports goal: [title]" in description)
- **Habit creation dialog**: Creates a habit directly from a goal with frequency selector
- **Filter by dimension**: Tab-style filter showing only dimensions that have goals

### Phase 1 — Habits Page (Rebuilt)
- **Frequency picker**: Every day, Weekdays, 3× per week, Once a week
- **Reminder time picker**: HTML time input for browser/system reminders
- **Dimension selector**: 9 wellness dimensions with icons
- **7-day WeekDots**: Visual M/T/W/T/F/S/S dots showing completion history based on streak
- **Visual flame streak badge**: Orange 🔥 with streak count
- **Pause/Resume toggle**: Sets isActive flag to false/true
- **Delete**: Removes habit
- **Progress ring summary card**: Circular progress showing X/Y habits completed today
- **Dimension filter tabs**: Filter habits by wellness dimension

### Phase 1 — Finances Page (Rebuilt)
- **Removed duplicate**: Eliminated the duplicate "All Budget Tools" section
- **AI Financial Coach chat**: Full chat interface using /api/chat/smart with financial system prompt
- **Quick question buttons**: Pre-filled prompts (emergency fund, debt, budget)
- **Savings Goals tracker**: localStorage-persisted goals with progress rings, monthly savings projection, monthly amount needed calculation
- **Financial Toolkit**: 8 resource cards (50/30/20, Emergency Fund, etc.) with categories
- **Financial profile integration**: Uses existing FinanceProfileDialog, shows anxiety alert

### Phase 1 — Spiritual Page (Rebuilt)
- **30+ practices**: Across 11 categories (Gratitude, Breathwork, Meditation, Mindfulness, Yoga, Nature, Affirmations, Visualization, Prayer, Body Awareness, Journaling)
- **Practice cards**: Expand to show step-by-step instructions, guidance text, TTS listen button, "Great for" needs badges
- **Completion tracking**: localStorage (dw:spiritual_history), shows "Done today" / "Xd ago"
- **Spiritual streak**: Counts consecutive days with at least one practice completed
- **Personalized section**: Filters practices by user's spiritual profile preferences
- **Category search + filter**: Text search + category tabs
- **AI Meditation Generator tab**: Duration selector (3/5/10/15/20 min) + focus input + quick focus buttons + TTS playback
- **Streak badge**: Orange flame with day count

### Phase 2 — App Tour (Enhanced)
- **8 milestone tracking**: Body scan, first goal, first habit, meal prefs, spiritual profile, finance profile, journal entry, DW conversation
- **Real-time completion detection**: Queries /api/goals and /api/habits to detect if items have been created
- **Progress bar**: Shows X% complete with count of remaining steps
- **Two-tab layout**: "Getting Started" (milestone checklist) + "Features Guide" (12 feature descriptions)
- **Clickable milestones**: Each one links directly to the relevant page

### Phase 3 — Calendar Default View
- Calendar now defaults to **week** view instead of month view

### Phase 3 — Cosmic Planet Fix
- Removed the `<circle>` background element from planet symbols in NatalChartWheel SVG (was creating unwanted box backgrounds)

### Phase 3 — Recovery Surfacing
- Added a purple "Recovery & Rest" card at the bottom of the Workout page My Plans tab, linking to /recovery

### Phase 4 — DW Proactive Intelligence (Enhanced)
- **Low mood outreach**: If user has low energy for 2+ consecutive check-ins, DW reaches out with chat link
- **Financial goal → habit suggestion**: If user has financial goals but no financial habits, suggests creating one
- **Habit reminder (evening)**: If habits are incomplete after 5pm, shows reminder with incomplete habit names
- **Goal → habit nudge**: If user has active goals but no habits at all, suggests creating a supporting habit
- **Sunday weekly summary**: Shows goals count, habits count, and max streak every Sunday morning
- **Improved morning briefing**: Now includes active habits count in the "Today's Focus" list

### Phase 5 — DW Thread (Cross-Feature Connections)
- **Goals ↔ Habits**: Expanded goal cards show linked habits (habits created with "Supports goal: [title]" in description) with real-time completion status

### Phase 7 — Visual Polish & Fonts
- **Frosted glass bottom nav**: backdrop-filter blur + translucent background + reduced border opacity
- **Attention dot**: Orange dot on Home nav button when there are incomplete habits for today
- **Global font application**: body tag now uses Nunito (--font-body), h1–h6 use Space Grotesk (--font-display) with -0.015em letter spacing
- **Font utilities confirmed**: .font-display, .font-body, .font-serif utility classes work correctly via Tailwind config

## External Dependencies

### Core Services
- **PostgreSQL Database**
- **OpenAI/AI Provider**: For AI chat and recommendations.

### Optional Integrations
- **Google Cloud Vision API**: For OCR.
- **Wearable Integration**: For health data.

### Third-Party Libraries
- **PDF Processing**: `pdf-parse`, `Tesseract.js`
- **Document Parsing**: `mammoth`
- **Charts**: `Recharts`
- **Form Handling**: `React Hook Form` with `Zod`

### Development Tools
- **Replit Plugins**: Runtime error overlay, cartographer, dev banner.
- **Type Checking**: TypeScript.