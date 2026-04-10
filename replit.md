# DW Wellness AI (dimensionalwellnessai.com) - Replit Configuration

## Overview
Flip the Switch is a Dimensional Wellness AI (DWAI), a consent-based personal assistant designed to help users build a personalized life system. It provides adaptive, energy-based guidance rather than prescriptive routines, adhering to a "Pause → Name → Flip → Choose" structure. The AI aims to be an anticipatory, personalized, and patient concierge, focusing on reducing pressure, promoting calmness, and enhancing user capability. The project emphasizes explicit user consent, energy awareness, and a no-guilt approach, avoiding medical claims. Key capabilities include a Command Center with a central DW Orb for AI interaction, a comprehensive Calendar System with lifestyle suggestions, DW Smart Import for universal content parsing, and deep AI integration for context-aware wellness guidance and direct actions within the app.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
### Core Technologies
- **Frontend**: React with TypeScript, Wouter for routing, TanStack React Query for state, Radix UI and shadcn/ui for components, Tailwind CSS for styling, and Vite as the build tool.
- **Backend**: Node.js with Express, TypeScript (ESM) for language, RESTful API endpoints, and Express sessions for cookie-based authentication.
- **Data Layer**: PostgreSQL database managed by Drizzle ORM, with a shared schema and Drizzle Kit for migrations.
- **Mobile Support**: Capacitor for iOS/Android integration, using the web build directory.

### UI/UX and Design Patterns
- **Consistent Design**: Global `app-shell` for safe-area handling, `PageHeader` component for consistent page structure, `usePageMeta` hook for SEO metadata.
- **Dynamic Theming**: Cosmic background, time-of-day gradients, and layered orbit rings in the Command Center.
- **Interactive Elements**: DW Orb system for AI interaction (idle, suggestion, active, chat states), Insight Dimension Cards, and interactive practice cards in the Spiritual page.
- **Loading & Empty States**: Skeleton loaders and centralized empty states.
- **Typography**: `font-display` (Space Grotesk) and `font-body` (Nunito) for consistent branding.
- **Guest Storage**: LocalStorage for unauthenticated user data.
- **Centralized Copy**: Consistent tone and messaging through a centralized UI copy layer.
- **Lazy Loading**: Components loaded on demand using React Suspense.

### Key Features and Implementations
- **Command Center**: Main dashboard featuring a central DW Orb, 9 orbit icons, proactive cards, vitals, schedule, goals, routines, and daily affirmations.
- **Calendar System**: Apple Calendar-style view with day/week/month, event details in bottom sheets, free time detection, and AI-driven lifestyle suggestions based on user preferences.
- **DW Smart Import**: Universal content importer using GPT-4o for parsing diverse content types and applying them to the user's life system.
- **AI Integration**: Primary interaction via an AI chat interface providing context-aware guidance, proactive nudges, and "Life System Planning Mode." The AI is deeply connected to app features, allowing real-time context fetching and direct actions (e.g., creating journal entries, setting reminders, updating goals) via tool calls.
- **Notifications System**: Database-backed notifications, including a smart check-in system adapting messages based on time context.
- **Browse Page**: Features "For You," "Video," "Articles," and "Saved" tabs with personalized content sourced from Perplexity.
- **Onboarding Wizard**: An 8-screen flow capturing user mission, personal details, goals, daily rhythm, and providing an app tour.
- **Voice Assistant System**: Full integration for iOS (Siri) and Android (Google Assistant) with a dedicated voice conversation mode, STT/TTS, deep-linking actions, App Intents, App Shortcuts, widgets, and Google Assistant App Actions.
- **Cosmic Hub**: Features Calendar, Readings (AI-generated based on birth/numerology profile), Astrology, and Numerology.
- **OpenAI TTS Integration**: All in-app speech uses OpenAI's Alloy voice via a unified `tts-service`, with adjustable personality presets and speed.
- **Workout Page Redesign**: Features "Today" (AI-personalized recommendations), "Library" (searchable workouts), and "My Plans" tabs.
- **Goals Page**: Rebuilt with 9 wellness dimensions, creation forms, progress tracking, habit linking, and filtering.
- **Habits Page**: Rebuilt with frequency/reminder pickers, dimension selection, 7-day WeekDots, streak tracking, pause/resume, and progress summary.
- **Finances Page**: AI Financial Coach chat, Savings Goals tracker, and a Financial Toolkit.
- **Spiritual Page**: Over 30 practices across 11 categories, completion tracking, spiritual streak, personalized sections, and an AI Meditation Generator.
- **App Tour**: Enhanced with 8 milestone tracking, real-time completion detection, progress bar, and clickable links to relevant pages.
- **DW Proactive Intelligence**: AI proactively reaches out based on user energy levels, suggests habits for financial goals, sends habit reminders, and provides weekly summaries.

## External Dependencies
- **PostgreSQL Database**
- **OpenAI/AI Provider**: For AI chat, content generation, and recommendations.
- **Google Cloud Vision API**: For OCR (Optical Character Recognition).
- **Wearable Integration**: For health data (optional).
- **PDF Processing**: `pdf-parse`, `Tesseract.js`
- **Document Parsing**: `mammoth`
- **Charts**: `Recharts`
- **Form Handling**: `React Hook Form` with `Zod`