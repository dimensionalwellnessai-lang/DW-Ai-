# DW Wellness AI (dimensionalwellnessai.com) - Replit Configuration

## Overview
Dimensional Wellness AI is a Dimensional Wellness AI (DWAI), a consent-based personal assistant designed to help users build a personalized life system. It provides adaptive, energy-based guidance rather than prescriptive routines, adhering to a "Pause → Name → Flip → Choose" structure. The AI aims to be an anticipatory, personalized, and patient concierge, focusing on reducing pressure, promoting calmness, and enhancing user capability. The project emphasizes explicit user consent, energy awareness, and a no-guilt approach, avoiding medical claims. Key capabilities include a Command Center with a central DW Orb for AI interaction, a comprehensive Calendar System with lifestyle suggestions, DW Smart Import for universal content parsing, and deep AI integration for context-aware wellness guidance and direct actions within the app.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
### Core Technologies
- **Frontend**: React with TypeScript, Wouter for routing, TanStack React Query for state, Radix UI and shadcn/ui for components, Tailwind CSS for styling, and Vite as the build tool.
- **Backend**: Node.js with Express, TypeScript (ESM) for language, RESTful API endpoints, and Express sessions for cookie-based authentication.
- **Data Layer**: PostgreSQL database managed by Drizzle ORM, with a shared schema and Drizzle Kit for migrations.
  - In production, `server/migrate.ts` (`runMigrations`) replays SQL files from `migrations/` via drizzle-kit's official migrator on boot.
  - In dev, `server/dev-db-bootstrap.ts` (`bootstrapDevDb`) replays the same SQL files but tolerates "already exists / already gone" errors so the dev DB self-heals on every `npm run dev`. It also drops a fixed set of orphan tables (`community_*`) that were removed from the schema. **`bootstrapDevDb` is the only dev migration entry point** — `scripts/post-merge.sh` invokes it and nothing else, and `drizzle-kit push` is no longer part of the post-merge flow (it was redundant with the bootstrap and produced interactive rename prompts on every removed table). The bootstrap is also exposed as a one-shot script at `scripts/dev-db-bootstrap.ts`. If you remove a table from `shared/schema.ts`, add it to `ORPHAN_TABLES` in `server/dev-db-bootstrap.ts` so dev DBs drop it cleanly.
  - Drift between `shared/schema.ts` and the migration set is enforced in CI by the `schema-drift` job in `.github/workflows/test.yml`, which boots a clean Postgres, runs `bootstrapDevDb()`, then asserts every table and column declared via `pgTable(...)` exists in the database (and that the database doesn't contain unexpected orphan tables). To run the check locally, point `DATABASE_URL` at a throwaway Postgres and run `npx tsx scripts/check-schema-drift.ts`.
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
- **Library**: Personal library of saved workouts, meals, meditations, habits, and goals. "Save to Library" is available from the Add sheet (`client/src/components/add-to-sheet.tsx`); the page at `/library` lists items with type filters and a per-item "Add to my day" action that re-opens the Add sheet so users can schedule today / this week / a routine. Discovery: the Browse page's "Saved" tab navigates to `/library` instead of rendering the legacy saved-content list (decided over adding a 6th item to the bottom nav, which is already at five). The hamburger "Explore → Library" entry remains.
- **Workout Page Redesign**: Features "Today" (AI-personalized recommendations), "Library" (searchable workouts), and "My Plans" tabs.
- **Goals Page**: Rebuilt with 9 wellness dimensions, creation forms, progress tracking, habit linking, and filtering.
- **Habits Page**: Rebuilt with frequency/reminder pickers, dimension selection, 7-day WeekDots, streak tracking, pause/resume, and progress summary.
- **Finances Page**: AI Financial Coach chat, Savings Goals tracker, and a Financial Toolkit.
- **Spiritual Page**: Over 30 practices across 11 categories, completion tracking, spiritual streak, personalized sections, and an AI Meditation Generator.
- **App Tour**: Enhanced with 8 milestone tracking, real-time completion detection, progress bar, and clickable links to relevant pages.
- **DW Proactive Intelligence**: AI proactively reaches out based on user energy levels, suggests habits for financial goals, sends habit reminders, and provides weekly summaries.
- **Relationships (Social Environment)**: People directory categorized as Aligned / Growth / Neutral / Draining; per-interaction logging of energy/clarity/self after each encounter (-2..+2 scale); Aliveness Moments capture; Weekly Rhythm reference (Mon–Thu light social, Fri optional, Sat main social window, Sun calm). Routes: `/relationships`, API: `/api/people`, `/api/people/interactions`, `/api/aliveness`, `/api/people/summary`. Schema: `people`, `people_interactions`, `aliveness_moments` in `shared/schema.ts`. Routes module: `server/routes/relationships.ts` (wired from `server/routes.ts`).

## Hidden / Removed Stub Features
The following advertised-but-unfinished features were hidden or removed to keep the UI honest:
- **Meal photo analysis**: No UI surfaces this, so the unused stub backend endpoints `/api/analyze-meal-photo` (in `server/routes.ts` and `server/routes/wellness-tracking.ts`) were deleted.
- ~~**Accountability scheduler client library**~~ — restored. `client/src/lib/accountability-scheduler.ts` plans pre-task and post-task local notifications for today's tasks and calendar events, respects quiet hours, and is started in `App.tsx` for signed-in users. Backed by the existing `/api/accountability/preferences` endpoints and configured from the Accountability Settings page.
- **Support report — conversation snippet toggle** (`client/src/pages/support-report.tsx`): The "Conversation snippet" toggle and its "not yet captured in beta" copy were removed because conversation history capture is not implemented. The page now POSTs to the working `/api/support/detailed-report` endpoint (it had been pointed at the wrong URL); tech-details and recent-context toggles function end-to-end.

The underlying database schemas and unrelated code paths were left intact in case these features come back.

## Plan File Uploads

- Plans (`/plans/:id`) accept three artifact kinds: imported chats, links, and now uploaded files (PDFs, notes, images). Uploads use multipart `POST /api/plans/:id/artifacts/upload` (`server/routes/plans.ts`) with a 25 MB cap; files persist in Replit Object Storage under `<PRIVATE_OBJECT_DIR>/plan-uploads/<userId>/<artifactId>` via `server/lib/plan-artifact-files.ts`, with the relative `<userId>/<artifactId>` storage key kept on the artifact row's `refId`.
- The `project_artifacts` table (migration `0026_plan_artifact_uploads.sql`) carries `mime_type`, `file_size`, and `excerpt` columns. The excerpt is a best-effort extracted text snippet (via `extractTextFromBuffer`) and is included in DW's plan chat context so replies can reference uploaded source material.
- Files can be re-downloaded at `GET /api/plans/:id/artifacts/:artifactId/file` (always sent as `attachment`) and are removed from object storage when the artifact is detached.
- Frontend: `client/src/pages/plan-detail.tsx` `ArtifactsPanel` adds an Upload button + dialog (`button-attach-upload`, `input-upload-file`, `button-confirm-upload`) and renders upload artifacts with a file-size badge and download link.

## ChatGPT Conversation Import

- Schema: `imported_conversations` table (`shared/schema.ts`) stores user-imported chats from ChatGPT exports or raw paste, with summary, topics, and suggested actions generated via gpt-4o-mini.
- Backend: `server/routes/imports-chat.ts` exposes `/api/imports/chatgpt-export` (multipart upload + preview, 100MB limit), `/api/imports/chatgpt-export/commit` (selected indexes), `/api/imports/raw-paste` (LLM-normalized), CRUD on `/api/imports/:id`, attach-to-project at `/api/imports/:id/project`, and `/api/imports/:id/continue` which seeds a new `conversations` row + returns recent messages so the client can prefill `dw_talk_messages` localStorage and jump to `/talk`.
- Frontend: `/imports` lists all imports with continue buttons; `/imports/new` has an upload tab and a paste tab; the existing Smart Import page (`/import`) shows a "Chat from ChatGPT" card linking to `/imports/new`.

## External Dependencies
- **PostgreSQL Database**
- **OpenAI/AI Provider**: For AI chat, content generation, and recommendations.
- **Transcription Provider**: `/api/transcribe` uses Deepgram when `DEEPGRAM_API_KEY` is configured, falling back to OpenAI Whisper.
- **Google Cloud Vision API**: For OCR (Optical Character Recognition).
- **Wearable Integration**: For health data (optional). Whoop/Oura/Garmin are wired through `server/routes/wearable-providers.ts` (Whoop & Oura OAuth2, Garmin OAuth1.0a). Required env vars: `WHOOP_CLIENT_ID`/`WHOOP_CLIENT_SECRET`, `OURA_CLIENT_ID`/`OURA_CLIENT_SECRET`, `GARMIN_CONSUMER_KEY`/`GARMIN_CONSUMER_SECRET`. Tokens are stored encrypted in `wearable_devices`; `/api/wearables/sync/:source` pulls the last 7 days into `wearable_data` deduped on `source_record_id` and updates `wearable_sync_jobs` on success/error.
  - **Route module boundary**: every `/api/wearables/*` route lives in `server/routes/wearables.ts` (`registerWearablesRoutes`). Do not add new wearable routes to `server/routes.ts` or `server/routes/admin-progress.ts` — Express only runs the FIRST handler for a given method+path, so a duplicate registration becomes silent dead code (cf. Task #139, where three duplicate registrations of `GET /api/wearables/data` hid the canonical handler and broke the Body dashboard).
  - **Duplicate-route audit**: `server/lib/route-audit.ts` wraps `app.get/post/...` and logs a `[route-audit]` warning at startup whenever the same method+path is registered twice. Installed in `server/index.ts` before any route registration.
- **PDF Processing**: `pdf-parse`, `Tesseract.js`
- **Document Parsing**: `mammoth`
- **Charts**: `Recharts`
- **Form Handling**: `React Hook Form` with `Zod`

## AI Provider Configuration (Phase 2)

Lightweight, non-conversational AI tasks run through `chatComplete()` in `server/ai-engine.ts`. The model used for each task is resolved in this order:

1. `options.model` (explicit per-call override)
2. `DW_AI_MODEL_<TASK_UPPER>` — per-task env var, e.g. `DW_AI_MODEL_CHIPS`
3. `DW_AI_MODEL_LIGHTWEIGHT` — global lightweight-task default
4. `"gpt-4o-mini"` — hardcoded fallback

## Main DW Chat Provider Configuration (Phase 3)

Main coaching chat in `server/openai.ts` is now provider-configurable with OpenAI-compatible routing:

1. `DW_AI_MODEL_CHAT` — explicit model for main DW chat (e.g. `claude-sonnet-4-5`)
2. If `DW_AI_MODEL_CHAT` is unset:
   - anthropic-compatible provider defaults to `claude-sonnet-4-5`
   - openai provider defaults to `gpt-4o-mini`
3. Optional chat-only endpoint override:
   - `DW_AI_CHAT_BASE_URL`
   - `DW_AI_CHAT_API_KEY`

Fallback chain for main chat:

1. configured chat model (`DW_AI_MODEL_CHAT` or provider default)
2. OpenAI fallback model (`gpt-4o-mini`)
3. Perplexity fallback (`sonar`)

### Task names

| Task name          | Endpoint / function                                  |
|--------------------|------------------------------------------------------|
| `chips`            | `POST /api/ai/chips` (quick-reply suggestions)       |
| `explain`          | `POST /api/ai/explain` (DW Explain)                  |
| `fix_transcript`   | `POST /api/ai/fix-transcript` (transcript correction)|
| `activities`       | `GET /api/browse/activities`                         |
| `music`            | `GET /api/browse/music` (OpenAI fallback path)       |
| `import_summary`   | `summarizeConversation` in imports-chat.ts           |
| `import_normalize` | `normalizeRawPaste` in imports-chat.ts               |
| `discover`         | `generateDiscoverRandomContent` in openai.ts         |
| `affirmation`      | `generateAffirmation` in openai.ts                   |
| `checkin`          | `generateCheckInAnalysis` in openai.ts               |

### Paths NOT migrated (still on the original OpenAI path)

All audio (TTS, Whisper, realtime voice), life-system analysis, meal-plan parsing, and elevation plans all continue to run on the existing `openai.ts` / `ai-engine.ts` `aiCall`/`aiStream` infrastructure.
