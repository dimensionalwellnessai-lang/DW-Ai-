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
- **Notifications System**: Database-backed notifications (`notifications`, `evening_check_ins`). Includes a `NotificationBell` component and a smart check-in system that computes optimal timing and adapts messages based on time context (e.g., `prime_evening`, `late_night`, `missed_morning`).
- **Browse Page**: Features "For You," "Video," "Articles," and "Saved" tabs. Uses X/Facebook-style feed cards — full-width post layout with large thumbnails, engagement rows (watch/read/open, not-interested), and personalized "why suggested" context. Content sourced from Perplexity (with OpenAI fallback). Community and Discover tabs preserved as hidden state.
- **Onboarding Wizard**: 7-screen flow — Mission → About DW → Name+Birth+Location → Profession → 90-day Goals → App Tour (9-slide carousel) → Launch. New fields: `profession` (8 options) and `lifeGoals` (10 multi-select options). Maps to backend responsibilities/priorities/wellnessFocus. Bridges birth data to cosmic localStorage keys.
- **Command Center**: Added layered orbit rings (outer/inner/halo), atmospheric radial glow behind DW Orb, and a pulsing halo glow for depth.
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