# Flip the Switch (DWAI) - Replit Configuration

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
- **Onboarding Wizard**: 7-screen flow — Mission → About DW → Name+Birth+Location → Profession → 90-day Goals → App Tour (9-slide carousel) → Launch. New fields: `profession` (8 options) and `lifeGoals` (10 multi-select options). Maps to backend responsibilities/priorities/wellnessFocus. Bridges birth data to cosmic localStorage keys.
- **Command Center**: Added layered orbit rings (outer/inner/halo), atmospheric radial glow behind DW Orb, and a pulsing halo glow for depth.
- **Voice Assistant System**: Full voice assistant integration for iOS (Siri) and Android (Google Assistant). Includes: (1) `/voice` — full-screen voice conversation mode with animated mic orb, STT via Web Speech API, TTS via `ttsService`, auto-start on assistant launch; (2) `/day/start` — daily briefing page with today's priorities, next event, and CTA to start voice mode; (3) `useAssistantLaunch()` hook parses URL params and Capacitor launch URLs to determine source/action/autoStartVoice; (4) `deep-link-service.ts` extended with new actions (voice, day_start, whats_next, mood_log, task_add, workout_start) and a navigator function for routing; (5) iOS `DWAppIntents.swift` + `DWAppShortcuts.swift` with 6 App Intents and Siri phrase mappings; (6) `ios/App/DWWidget/` small + medium SwiftUI widget with 6 deep-link action buttons; (7) Android `shortcuts.xml` (5 long-press launcher shortcuts) and `app_actions.xml` (Google Assistant App Actions); (8) `assistant-analytics.ts` + `/api/assistant/log` endpoint for action tracking; (9) `VoicePreferences` stored in localStorage via `getVoicePreferences()`/`saveVoicePreferences()`; (10) Deep link service is initialized with wouter `setLocation` in App.tsx on mount.
- **Cosmic Hub**: Now has 4 tabs — Calendar, Readings, Astrology, Numbers. Readings tab features 6 timeframe deep readings (Today, Month, Year, Moon Phase, Life Phase, Life Pattern), each generating AI readings from birth+numerology profile. Cosmic Alignment section allows comparing your energy with another person using numerology.

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