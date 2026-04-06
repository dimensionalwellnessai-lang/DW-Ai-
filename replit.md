# Flip the Switch (DWAI) - Replit Configuration

## Overview

Flip the Switch is a Dimensional Wellness AI - a consent-based personal assistant designed to help users build their own life system through adaptive, energy-based guidance rather than prescriptive routines. The app follows a **Pause → Name → Flip → Choose** structure where the AI acts as a concierge that is anticipatory, personalized, and patient.

**Core Philosophy**: The app exists to reduce pressure, not increase performance. Success is measured by whether users feel calmer, seen, and capable - not by engagement metrics or streaks.

**Key Principles**:
- All actions require explicit user consent
- No forced routines or "ideal life" templates
- Energy-aware and optional by design
- No guilt-based mechanics, streaks, or social pressure
- No medical or diagnostic claims

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: Radix UI primitives with shadcn/ui styling
- **Styling**: Tailwind CSS with custom theme variables supporting multiple themes
- **Build Tool**: Vite with path aliases (@/, @shared/, @assets/)

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **API Style**: RESTful endpoints under /api/*
- **Session Management**: Express sessions with cookie-based auth
- **File Uploads**: Multer for document parsing (PDFs, meal plans)

### Data Layer
- **ORM**: Drizzle ORM
- **Database**: PostgreSQL
- **Schema Location**: shared/schema.ts
- **Migrations**: Drizzle Kit (migrations/ directory)

### Mobile Support
- **Framework**: Capacitor for iOS/Android builds
- **Web Directory**: dist/public
- **iOS Safe Area**: Configured with contentInset: 'always'

### Key Design Patterns
1. **Guest Storage**: localStorage-based storage for non-authenticated users (profileSetup, preferences)
2. **Shared Schema**: Database schema in shared/ directory accessible to both client and server
3. **Copy/Tone Layer**: Centralized UI copy following "Flip the Script" voice guidelines
4. **Analytics**: Client-side event tracking with optional backend integration
5. **Lazy Loading**: Components load on-demand with Suspense boundaries
6. **DW Orb System**: Reusable `DWOrb` component (`client/src/components/dw-orb.tsx`) — cosmic/galactic sphere representing DW's presence. States: idle, suggestion, active, chat. Only DW uses the orb visual (no other UI element).
7. **Command Center Cards**: 9 orbit icons around central DW Orb: Today, Insight, Plan, Nutrition, Momentum, Follow-Up, Journal, Cosmic, For You. Tap icon opens bottom drawer with preview content + "More" (→full page or scroll-to for Today) + "Chat with DW" (→/talk?topic=). Below orbit: Proactive cards, Vitals row (Energy/Mood/Check-in), Today's Schedule, Active Goals, Routines (Morning/Wind Down), Talk to DW CTA, and daily affirmation. The /today route redirects to /command-center.
8. **Cosmic Background**: `cosmic-bg` CSS class provides subtle gradient background (navy/indigo/violet in dark mode).
9. **Time-of-Day Gradients**: CSS classes `cc-time--dawn/morning/afternoon/evening/night` in index.css for Command Center background. Uses layered CSS `background` gradients over `hsl(var(--background))`.
10. **Insight Dimension Cards**: Clickable cards on `/insights` page open a dialog with dimension score, assessment questions, and "Talk with DW" CTA. Keyboard accessible (role="button", tabIndex, Enter/Space handlers).
11. **Calendar** (`client/src/pages/calendar-month.tsx`): Apple Calendar-style view at `/calendar`. Day/Week/Month toggle in header. Tapping any day opens a bottom sheet listing all events with time, dimension badge, and tappable link to the event's related page. Day view shows a 24h timeline. Week view shows 7-column grid with event pills. Month view shows dot indicators per day. Event management (add/edit/delete) available at `/calendar/manage`.
12. **Event Detail Sheet** (`client/src/components/event-detail-sheet.tsx`): Bottom sheet opens on every calendar event tap. Shows event time, section link (auto-detected from title keywords), tasks list with checkboxes, and a merged Add+Suggest flow — tapping "Add" opens the type-your-own input AND auto-loads personalized DW suggestions simultaneously. Tasks stored in `calendar_event_tasks` DB table (requires auth). Guest users see sign-in prompt.
    - **Free time detection**: Events titled "free", "watch tv", "chill", blank, etc. trigger "Ideas & Plans" mode — suggestions are rich lifestyle cards with category icons (Watch/Read/Go/Do/Listen/Create) and a "why this fits you" sentence.
    - **Structured event tasks**: Non-free-time events show compact task-style suggestion rows.
    - **Personalization**: Backend pulls onboarding profile, active goals, user profile preferences, AI learnings, AND `lifestylePreferences` (identity vision, style/aesthetic, watch/read/do/listen/go preferences) to tailor every suggestion.
    - **Lifestyle Preferences form**: First-time free-time event shows "Make these more personal" nudge → 7-field form: Who I'm becoming, My style/aesthetic, What I watch, Music/podcasts, Activities I enjoy, Places I like to go, What I read. Saved once to `user_profiles.lifestyle_preferences` (jsonb), used forever.
    - **Identity/style lens**: Both free-time and structured event prompts filter suggestions through `identityVision` and `styleLikes` — every suggestion serves who the user is becoming, not just what's convenient.

### DW Smart Import
- **Route**: `/life-system-import` — Universal content importer that detects any content type pasted
- **Entry points**: Command Center carousel card ("DW Smart Import") + Hamburger menu button ("DW Smart Import") + Chat detection (paste detection auto-offers builder when 3+ life-system keywords detected in long input)
- **Backend parser**: `server/life-system-parser.ts` — uses GPT-4o to detect content types, then runs targeted parallel extractors
- **API routes**: `POST /api/life-system/import/parse` (detect + extract all content types), `POST /api/life-system/import/apply` (write to DB), `POST /api/life-system/import/check-conflicts` (goal conflict check)
- **Detected content types**: `life_system`, `journal_entry`, `workout_plan`, `meal_plan`, `grocery_list`, `goals`, `affirmations`, `reading_list`, `financial_plan`, `project_plan`, `notes`
- **What it creates**: Goals, daily habits, morning/wind-down routines, calendar events (with tasks), grocery shopping list, journal entries (DW journal), affirmations (spiritual goals), reading list (intellectual goals), financial goals, project tasks (purpose goals), freeform notes (journal)
- **Dynamic wizard**: Review steps are shown only for detected content types; each step has checkboxes to include/exclude individual items
- **Schedule frequency**: User chooses weekly/biweekly/every 3 weeks/monthly — creates recurring weeks of events (only shown if schedule-type content detected)
- **Goal conflict handling**: Compares extracted goals against existing goals, shows side-by-side if conflict, user decides keep/replace
- **Chat pre-fill**: Text stored in `sessionStorage("dw_ls_prepaste")` so import page auto-populates when redirected from chat

### AI Integration
- AI chat interface as primary interaction point
- DW Orb centered in Command Center orbital layout — tap orb to navigate to /talk
- Floating DW Orb in bottom-right corner on all pages (except chat/onboarding)
- DW Orb appears in Talk It Out chat header and inline with DW messages
- Context-aware wellness guidance
- Proactive nudges based on user history and energy state
- System prompts enforce calm, consent-based tone
- **Life System Planning Mode**: When user shares comprehensive personal context or requests a "full reset", DW builds phased structured plans (daily system → body/nutrition → spiritual → weekly schedule → money → lifestyle). Activated via `server/openai.ts`.
- **Markdown rendering**: DW chat messages use `react-markdown` + `remark-gfm`. Headers, bold, bullets, horizontal rules all render visually in `client/src/pages/talk-it-out.tsx`.
- **Save Plan**: Any substantial DW response (>350 chars) shows a "Save this plan" button. Plans saved to localStorage (`dw_saved_plans`). Accessible via "My Plans" bookmark button in chat header → SwipeableDrawer list → full-content Dialog with markdown rendering.

### Notifications System
- **Tables**: `notifications` and `evening_check_ins` in DB
- **API**: `/api/notifications/*` — list, count, mark read, create DW daily affirmation (`POST /api/notifications/dw-daily`)
- **API**: `/api/accountability/check-in-status` (GET) and `/api/accountability/evening-check-in` (POST)
- **Components**: `NotificationBell` (bell icon with unread count badge in page header) + `NotificationPanel` (full drawer)
- **DW daily affirmation**: Auto-called once per session on app open for logged-in users (session-gated via sessionStorage)
- **Smart check-in timing**: `/api/accountability/check-in-status` computes the optimal check-in hour from `preferredSleepTime` in user system prefs (90 min before sleep, default 9:30 PM). Returns rich context: `timeContext`, `contextTitle`, `contextBody`, `optimalHour`, `missedYesterday`, `todayTaskCount`.
- **Time-aware check-in**: 6 scenarios — `prime_evening`, `late_night`, `very_late`, `missed_morning`, `missed_day_start`, `missed_afternoon`. Each has unique icon, color, title, body message, dismiss duration, and DW reflection tone. DW response adapts (late-night = brief/restful; missed = forward-looking; prime = warm full reflection).
- **Missed check-in context**: Shows `todayTaskCount` events on agenda so DW can reflect on them. Dismiss is time-context-keyed so different contexts can re-prompt even same day.
- **Username setup**: `UsernameSetupModal` prompts logged-in users without a username the first time they navigate to `/browse` or community pages

### Browse Page (client/src/pages/browse.tsx)
- **Discover tab filter**: Filter button opens a bottom-sheet with three filter groups: Bucket (All/For You/Explore/Surprise), Content type (All/article/video/quote/fact/spiritual/lesson), Wellness dimension (All/emotional/physical/financial/spiritual/intellectual/social/environmental/purpose). Filters apply client-side to the loaded discover card list. Active filter count badge shows on Filter button. Bucket pills are also clickable to quickly toggle a single bucket filter.
- **For You tab**: Shows time-aware real content (videos, articles, workouts, meal idea) via `GET /api/browse/for-you` using Perplexity web search. Refreshes when time slot changes. Greeting banner adapts to time of day and user name. Topic suggestions from `/api/explore/suggestions` shown below.
- **For You — Entertainment**: `GET /api/browse/entertainment` — Perplexity-powered (OpenAI fallback) personalized TV/movie suggestions. Horizontal scroll card rail, links to Google search for each show.
- **For You — Activities**: `GET /api/browse/activities` — OpenAI-generated time-of-day-aware activity suggestions (indoor/outdoor/social) with "Add to Schedule" button.
- **For You — Learning**: `GET /api/browse/learning` — Perplexity-powered real learning resources (YouTube videos, courses, articles, podcasts) with real URLs. Add-to-schedule support.
- **Video tab**: Auto-loads recommended videos from `forYouData` at the top; Search YouTube section below.
- **Articles tab**: Curated via `GET /api/browse/ai-articles` — uses Perplexity first (real URLs), falls back to OpenAI. Time-slot and day-of-week aware.
- **Community tab** — 4 sub-tabs:
  - **Groups**: 8 DW AI-created dimension support groups (Emotional, Physical, Social, Financial, Spiritual, Intellectual, Environmental, Purpose). Each group has: colored dimension icon, "Open Chat" and "Video Call" (Jitsi Meet) buttons. Tapping "Open Chat" opens in-app group chat with DW welcome banner, posts thread, and compose bar. Users can also create their own groups.
    - **DW AI responses**: When a user posts in a group, DW auto-generates a warm, personalized support response (via OpenAI) and stores it as a reply, shown with sparkle badge. Chat polls every 5s to show new DW replies.
    - **Video calls**: Each DW group has a Jitsi Meet URL (e.g. `https://meet.jit.si/DW-EmotionalWellness`). Video Call button in group list and in chat header. Group video + 1-on-1 both available via Jitsi.
    - **Group IDs**: `dw-dim-emotional`, `dw-dim-physical`, `dw-dim-social`, `dw-dim-financial`, `dw-dim-spiritual`, `dw-dim-intellectual`, `dw-dim-environmental`, `dw-dim-purpose`
    - **DB**: `community_groups`, `community_group_members`. Posts: `community_posts` (added `group_id`, `parent_id`, `is_dw_response` columns)
  - **Feed**: Cross-group in-app community posts with like/create. DW system user (`dw-ai-system`) seeded in `users` table.
  - **Engage**: Location-aware Perplexity search for volunteering, community events, and service. Filter by type.
  - **Local**: Perplexity-powered local resource search (gyms, therapists, yoga studios, etc.)
- **Server endpoint** `GET /api/browse/for-you`: Perplexity-powered, returns `{ videos, articles, workouts, meal, timeSlot, dayName, timeLabel }`. Falls back to curated static content.
- **Community DB tables**: `community_posts` (with group_id, parent_id, is_dw_response), `community_post_likes`, `community_groups`, `community_group_members`

## External Dependencies

### Core Services
- **PostgreSQL Database**: Primary data store (configured via DATABASE_URL)
- **OpenAI/AI Provider**: Powers the AI chat and recommendation features

### Optional Integrations
- **Google Cloud Vision API**: OCR fallback for PDF parsing (GOOGLE_CLOUD_VISION_API_KEY)
- **Wearable Integration**: Health data from connected devices

### Third-Party Libraries
- **PDF Processing**: pdf-parse, Tesseract.js for OCR
- **Document Parsing**: mammoth for Word documents
- **Charts**: Recharts for analytics dashboards
- **Form Handling**: React Hook Form with Zod validation

### Development Tools
- **Replit Plugins**: Runtime error overlay, cartographer, dev banner (development only)
- **Type Checking**: TypeScript with strict mode