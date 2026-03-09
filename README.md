# DW.ai - Dimensional Wellness AI

A Life Intelligence System with an AI concierge at the center. A consent-based personal assistant designed to help users build their own life system through adaptive, energy-based guidance rather than prescriptive routines.

## 🌟 New Features (v2.0)

### Unified Search
- **Intelligent Search**: Search across tasks, projects, routines, and goals with smart ranking
- **Category Filtering**: Filter results by type with real-time counts
- **Keyboard Shortcuts**: Enter to search, Escape to clear
- **Relevance Scoring**: Results ranked by exact matches, partial matches, and context

### Wellness Dashboard
- **Mood Trends**: Visualize energy, mood, and clarity averages over time
- **Progress Tracking**: Active goals, habits, routines, and completion metrics
- **AI Insights**: Personalized recommendations based on your data patterns
- **Smart Summaries**: Aggregated wellness insights in a clean, visual format

### Proactive AI Assistant
- **Context-Aware Nudges**: Suggestions based on your history (e.g., "Yesterday was tiring")
- **Inactivity Reminders**: Gentle check-ins when you haven't logged mood in 24 hours
- **Energy-Based Recommendations**: Adaptive suggestions matching your current state
- **Priority Ordering**: High, medium, and low priority nudges based on urgency

### Enhanced Browsing
- **Quick Actions**: Schedule or save content directly from browse cards
- **Improved UI**: Clear action buttons with visual feedback
- **Toast Notifications**: Instant feedback for user actions

### Performance Optimizations
- **Lazy Loading**: Components load on-demand for faster initial page load
- **Suspense Boundaries**: Smooth loading states with skeleton animations
- **Optimized Queries**: Efficient data fetching with intelligent caching

## Overview

DW.ai helps users manage wellness across 8 life dimensions using an energy-based **Pause → Name → Flip → Choose** structure. The AI acts as a concierge - anticipatory, personalized, and pattern-aware.

### Key Features

- **🔍 Unified Search**: Intelligent search across tasks, projects, routines, and goals
- **📊 Wellness Dashboard**: Visual mood trends, progress tracking, and AI insights
- **🤖 Proactive AI**: Context-aware nudges and personalized recommendations
- **💬 AI Chat Interface**: Primary interaction point with context-aware wellness guidance
- **📅 Today Hub**: Daily command center showing schedule, goals, and proactive nudges
- **🎯 Life System Management**: Goals, habits, routines, and schedule blocks
- **🌈 Wellness Dimensions**: Physical, emotional, spiritual, financial, and more
- **🍽️ Meal Planning**: Import and manage meal prep documents
- **💪 Workout Planning**: Customizable workout routines
- **📆 Calendar Integration**: Daily schedule with recurring events
- **📝 Journal & Check-ins**: Weekly wellness check-ins and journaling
- **AI Chat Interface**: Primary interaction point with context-aware wellness guidance
- **Voice Interaction**: Speech-to-text input and text-to-speech responses for natural conversation
- **Phone Assistant Integration**: Deep links for Siri and Google Assistant integration
- **Today Hub**: Daily command center showing schedule, goals, and proactive nudges
- **Life System Management**: Goals, habits, routines, and schedule blocks
- **Wellness Dimensions**: Physical, emotional, spiritual, financial, and more
- **Meal Planning**: Import and manage meal prep documents
- **Workout Planning**: Customizable workout routines
- **Calendar Integration**: Daily schedule with recurring events
- **Journal & Check-ins**: Weekly wellness check-ins and journaling

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **State**: TanStack React Query
- **Routing**: Wouter
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: OpenAI-compatible API via Replit AI Integrations
- **Email**: Resend (for password reset)

## Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components (routes)
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utility functions
│   │   ├── config/        # Configuration files
│   │   ├── routes/        # Route registry
│   │   └── copy/          # UI text/copy
│   └── index.html
├── server/                 # Backend Express application
│   ├── routes.ts          # API endpoints
│   ├── storage.ts         # Database operations
│   ├── openai.ts          # AI integration
│   └── email.ts           # Email service
├── shared/                 # Shared types and schemas
│   └── schema.ts          # Drizzle database schemas
└── attached_assets/        # User uploads and generated images
```

## Command Center Architecture

The **Command Center** is the swipeable home experience of DW.ai. It consists of several layered files that developers can edit or extend:

### Primary Layout File

**[`client/src/components/swipeable-layout.tsx`](client/src/components/swipeable-layout.tsx)**

This is the top-level layout shell for the swipeable home. It uses [Embla Carousel](https://www.embla-carousel.com/) to render a full-screen horizontal carousel of screens. The initial screens are registered in the `SCREENS` array near the top of the file:

```tsx
const SCREENS = [
  { id: "chat",     label: "Chat",     component: AIWorkspace },
  { id: "browse",   label: "Browse",   component: BrowsePage },
  { id: "calendar", label: "Calendar", component: CalendarPlansPage },
  { id: "routines", label: "Routines", component: RoutinesPage },
];
```

To **add, remove, or reorder swipeable screens**, edit the `SCREENS` array in this file. Each entry requires an `id`, a `label` (used for the dot-navigation aria-label), and a `component`.

The component also renders:
- Left/right chevron hints when scrolling is available
- A dot-navigation bar (bottom center) with keyboard and click navigation
- Keyboard support (`ArrowLeft` / `ArrowRight`)

### Home Command Center Page

**[`client/src/features/home/home-command-center.tsx`](client/src/features/home/home-command-center.tsx)**

The `HomeCommandCenter` component is the main home dashboard served at the `/command-center` route (registered in `client/src/App.tsx`). It renders a vertical scrollable feed of **wellness cards** using live data from `useHomeSummary()`.

Cards are composed from individual files in:

**[`client/src/features/home/components/`](client/src/features/home/components/)**

| File | Card | Purpose |
|------|------|---------|
| `TodayCard.tsx` | Today | Today's schedule and energy snapshot |
| `InsightSnapshotCard.tsx` | Insight Snapshot | AI-generated wellness insight |
| `PlanInMotionCard.tsx` | Plan in Motion | Active goals and habit progress |
| `HealthSnapshotCard.tsx` | Health Snapshot | Body/health dimension overview |
| `MomentumCard.tsx` | Momentum | Streak and consistency data |
| `FollowUpCard.tsx` | Follow-Up | Pending AI follow-up actions |
| `DWJournalCard.tsx` | DW Journal | Insight journal (feature-flagged) |
| `DailyCheckinCard.tsx` | Daily Check-in | Quick mood/energy check-in (feature-flagged) |

To **add a new card**, create a component in the `components/` directory and import it into `home-command-center.tsx`.

### Life Command Center Page (alternate view)

**[`client/src/pages/life-command-center.tsx`](client/src/pages/life-command-center.tsx)**

An alternate, dimension-focused Command Center implementation. It shows the 8 life dimensions in a scrollable dashboard with insights and pinnable AI cards. To switch to this view, update the `/command-center` route in `client/src/App.tsx` to import and render `LifeCommandCenter` instead of `HomeCommandCenter`.

### Route Registration

**[`client/src/routes/registry.ts`](client/src/routes/registry.ts)**

All app routes — including the Command Center — are declared here as structured objects. The registry controls route paths, labels, menu visibility, and ordering. The Command Center entry:

```ts
{
  id: "command-center",
  path: "/command-center",
  label: "Command Center",
  navLabel: "Command Center",
  icon: "zap",
  type: "page",
  description: "Life Command Center - your wellness dashboard",
  showInMenu: true,
  menuSection: "primary",
  menuOrder: 0.5,
  enabled: true,
}
```

To change the Command Center route, label, or menu position, update this entry in `registry.ts`.

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database

### Environment Variables

The following environment variables are required:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Secret for session encryption |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | OpenAI-compatible API base URL |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | OpenAI API key |

#### OAuth / Social Sign-In (optional)

Social sign-in is feature-flagged: if the env vars are absent the buttons simply won't appear.

| Variable | Description |
|----------|-------------|
| `OAUTH_REDIRECT_BASE_URL` | Base URL for OAuth redirect URIs (defaults to `APP_URL`) |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 client secret |
| `APPLE_CLIENT_ID` | Apple Services ID (e.g. `com.example.app.signin`) |
| `APPLE_TEAM_ID` | 10-character Apple Developer Team ID |
| `APPLE_KEY_ID` | Key ID from the Sign In with Apple key |
| `APPLE_PRIVATE_KEY` | Full PEM contents of the `.p8` private key (use `\n` for newlines) |

##### Setting up Google OAuth

1. Open [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials).
2. Create an **OAuth 2.0 Client ID** (type: *Web application*).
3. Under **Authorized redirect URIs** add:
   - `https://dimensionalwellnessai.com/api/auth/google/callback`
   - `https://dimensional-wellness-ai--dareiltrader.replit.app/api/auth/google/callback` (Replit staging)
4. Copy the **Client ID** and **Client secret** into `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

##### Setting up Apple Sign In

1. In [Apple Developer → Identifiers](https://developer.apple.com/account/resources/identifiers), create or select a **Services ID**.
2. Enable **Sign In with Apple**, click **Configure**, and add the return URL:
   `https://dimensionalwellnessai.com/api/auth/apple/callback`
3. Set `APPLE_CLIENT_ID` to the Services ID (e.g. `com.example.app.signin`).
4. Under **Keys**, create a key with **Sign In with Apple** enabled and download the `.p8` file.
5. Set `APPLE_TEAM_ID`, `APPLE_KEY_ID`, and `APPLE_PRIVATE_KEY` from the key details.

##### Database migration

After adding the OAuth columns run:
```bash
npm run db:push
```
This adds `oauth_provider` and `oauth_id` columns and makes `password` nullable (existing rows keep their passwords).

On Replit, these are automatically configured via the Secrets tab and Replit AI Integrations.

### Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables (see above)

3. Push database schema:
   ```bash
   npm run db:push
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

The app will be available at `http://localhost:5000`

### Available Scripts

#### Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Run production server
- `npm run check` - TypeScript type checking
- `npm test` - Run tests with Vitest
- `npm run test:ui` - Run tests with UI

#### Mobile Development
- `npm run ios` - Build and open iOS in Xcode
- `npm run android` - Build and open Android in Android Studio
- `npm run sync:ios` - Sync web build to iOS
- `npm run sync:android` - Sync web build to Android
- `npm run build:ios` - Build for iOS App Store
- `npm run build:android` - Build for Play Store

#### Database
- `npm run db:push` - Push schema changes
- `npm run seed:demo` - Seed demo data

### Database Migrations

This project uses Drizzle ORM. To update the database schema:

```bash
npm run db:push
```

## API Endpoints

### New in v2.0

#### Wellness Summary
```bash
GET /api/summary?days=7
```
Returns aggregated wellness insights including mood trends, progress metrics, and AI-generated recommendations.

#### Unified Search
```bash
POST /api/search/unified
{
  "query": "workout",
  "categories": ["tasks", "routines", "goals"]
}
```
Searches across all system data with intelligent relevance scoring.

#### Future Integrations (Stubs)
- `GET /api/integrations/calendar/google/status` - Calendar sync status
- `POST /api/integrations/calendar/google/connect` - Connect Google Calendar
- `POST /api/voice/query` - Process voice queries (Phase 2)
- `POST /api/voice/response` - Generate voice responses (Phase 2)

For complete API documentation, see [ENHANCED_FEATURES.md](docs/ENHANCED_FEATURES.md).

## App Review & Demo Mode

### For Apple / Google App Reviewers

All features are available without creating an account using **Demo Mode**.

#### How to Activate Demo Mode

**Option 1 – Tap "Try Demo Mode" on the Login screen**
Open the app → tap **Try Demo Mode** on the first screen. Sample wellness data is loaded instantly.

**Option 2 – URL query param (web or Capacitor WebView)**
Append `?demo=true` to the app URL when loading in a browser or Capacitor WebView:
```
https://<your-domain>/?demo=true
```
Note: Native Capacitor deep links (`dwai://...`) use a separate listener and do not populate
`window.location.search`, so the `?demo=true` param only works via the web URL.

**Option 3 – Settings toggle (when already inside the app)**
Settings → scroll to **Demo Mode** → toggle on.

#### What Demo Mode provides
- Pre-filled AI conversations (3 topics: wellness intro, meal planning, stress management)
- Sample calendar events (daily workout, midday walk, evening journaling, weekly meal prep)
- 7 days of mood tracking data
- Body, meal-prep, workout, finance, and spiritual profiles
- All features accessible without a network connection or account

#### Disabling Demo Mode
Settings → **Demo Mode** toggle → off (returns to login screen and clears sample data).
Or tap **Exit Demo** in the top banner visible on every screen while demo is active.

---

## Guided Tour

The app includes an **interactive step-by-step tour** that highlights key UI elements.

### How to Launch the Tour

1. From the **App Tour** page (`/app-tour`) – tap **Tour the Whole App**
2. From **Settings** → **App Tours** → **Take Interactive Tour**

The tour walks through: Welcome → Home → Calendar → Chat → Browse → Journal → Complete.
Each step has Back / Next / Skip controls.

---

## Building for iOS and Android (Capacitor)

### Prerequisites
- Xcode 15+ (iOS)
- Android Studio (Android)
- Node.js 22+

### Sync & open in IDE
```bash
# Build web assets and sync to iOS
npm run sync:ios      # then open in Xcode manually, or:
npm run ios           # build + open Xcode in one step

# Build web assets and sync to Android
npm run sync:android  # then open in Android Studio, or:
npm run android       # build + open Android Studio in one step
```

### Release builds
```bash
npm run build:ios     # outputs App.xcarchive in ios/
npm run build:android # outputs APK + AAB in android/app/build/outputs/
```

### Troubleshooting Capacitor
- After any code change, run `npm run sync:ios` (or `sync:android`) before testing in a simulator.
- Hard-refresh the WebView on device: shake device → **Reload** in dev mode.
- Ensure `capacitor.config.ts` `webDir` points to `dist/public` (already set).


- **Energy-based guidance** over productivity metrics
- **Meaning over metrics** - no streaks or leaderboards
- **Optionality as a core feature** - never mandatory
- **Silence as a design tool** - calm, unobtrusive UX
- **Nervous system-aware** - adapts to user energy states
- **Consent-based** - always asks before saving or scheduling

## Voice Interaction Features

DW-Ai includes advanced voice interaction capabilities:

### Speech-to-Text (STT)
- Click the microphone button in any chat interface to speak your message
- Supports continuous listening mode for hands-free conversation
- Uses Web Speech API for accurate transcription

### Text-to-Speech (TTS)
- AI assistant can speak its responses aloud
- Customizable voice, speaking rate, pitch, and volume
- Auto-speak mode for automatic voice responses
- Click "Listen" button on any AI response to hear it

### Phone Assistant Integration
- **Siri Support (iOS)**: Use "Hey Siri, open dwai://action?type=chat&message=check my schedule"
- **Google Assistant (Android)**: Use "Hey Google, ask DW-Ai to check my tasks"
- Deep link support for direct app actions

### Voice Settings
Configure voice features in Settings → Voice Settings:
- Enable/disable voice responses
- Select preferred voice
- Adjust speaking rate, pitch, and volume
- Test your voice settings

For detailed documentation, see [Voice Integration Guide](./docs/VOICE_INTEGRATION.md).

## Current Status

**🚧 Beta** - This app is in active development. Core features work but expect:
- Occasional UI polish updates
- New features being added weekly
- Feedback-driven improvements

### What Works
- Quick Setup onboarding (creates starter calendar blocks)
- AI chat with context-aware wellness guidance
- Today Hub daily view
- Calendar events and scheduling
- Meal and workout planning
- Guest mode (local storage) and authenticated accounts

### Known Limitations
- Analytics not yet instrumented
- Premium features coming soon
- Mobile responsiveness ongoing

## Troubleshooting

If changes aren't showing up in your simulator or web app:
- **Quick Fix**: Hard refresh browser (`Cmd+Shift+R` or `Ctrl+Shift+R`)
- **Clean Build**: Run `./script/fresh-build.sh` to clear all caches
- **Full Guide**: See [Troubleshooting UI Changes](docs/TROUBLESHOOTING_UI_CHANGES.md) for detailed solutions

Common issues:
- Browser/app cache serving old version → Hard refresh
- Build not completed → Run `npm run build` then restart server
- Simulator not synced → Run `npm run sync:ios` (or `sync:android`)

## Contributing

This project is currently in private beta. For feedback or issues, use the in-app feedback button.

## DW Master Specs

Authoritative product, design, and architecture reference for all contributors and AI agents:

- **[DW Master Product Definition](docs/product/DW-Master-Product-Definition.md)** — What DW is, the 13 dimensions, interaction framework, and non-goals
- **[DW UX Commandments](docs/product/DW-UX-Commandments.md)** — 10 binding rules for every UI decision (progressive disclosure, silence as design, consent-before-action, etc.)
- **[DW Architecture Blueprint](docs/architecture/DW-Architecture-Blueprint.md)** — 5-layer architecture, data-flow diagram, system-of-record vs AI-interpretation separation
- **[Copilot & AI-Agent PR Guidelines](docs/development/Copilot-PR-Guidelines.md)** — Contributor rules for feature flags, testing, AI output storage, and endpoint design

---

## Documentation

### Getting Started
- **[Setup Guide](docs/SETUP.md)** - Complete local development setup instructions
- **[Architecture Guide](docs/ARCHITECTURE.md)** - Code structure, patterns, and tech stack
- **[Troubleshooting Guide](docs/TROUBLESHOOTING.md)** - Common issues and solutions
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Deploy to web, App Store, and Play Store

### Features & Development
- **[Enhanced Features Guide](docs/ENHANCED_FEATURES.md)** - Comprehensive guide to v2.0 features
- **[Voice Integration Guide](docs/VOICE_INTEGRATION.md)** - Voice interaction capabilities
- **[Security Summary](docs/SECURITY_SUMMARY.md)** - Security analysis and recommendations

### App Store
- **[App Store Review Guide](APPLE_SUBMISSION_CHECKLIST.md)** - Submission checklist
- **[Demo Account Guide](DEMO_ACCOUNT_GUIDE.md)** - Demo account for reviewers

### Design & QA
- **[Design Guidelines](design_guidelines.md)** - UI/UX design principles
- **[QA Checklist](QA_CHECKLIST.md)** - Quality assurance testing checklist
- **[Troubleshooting UI Changes](docs/TROUBLESHOOTING_UI_CHANGES.md)** - Fix caching issues

## License

MIT License - See [LICENSE](LICENSE) file.
