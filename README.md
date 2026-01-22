# Flip the Switch (FTS) test

A Dimensional Wellness AI - a consent-based personal assistant designed to help users build their own life system through adaptive, energy-based guidance rather than prescriptive routines.

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

Flip the Switch helps users manage wellness across 13 life dimensions using an energy-based **Pause → Name → Flip → Choose** structure. The AI acts as a concierge - anticipatory, personalized, and pattern-aware.

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

## Design Philosophy

- **Energy-based guidance** over productivity metrics
- **Meaning over metrics** - no streaks or leaderboards
- **Optionality as a core feature** - never mandatory
- **Silence as a design tool** - calm, unobtrusive UX
- **Nervous system-aware** - adapts to user energy states
- **Consent-based** - always asks before saving or scheduling

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

## Contributing

This project is currently in private beta. For feedback or issues, use the in-app feedback button.

## Documentation

- **[Enhanced Features Guide](docs/ENHANCED_FEATURES.md)** - Comprehensive guide to new v2.0 features
- **[Security Summary](docs/SECURITY_SUMMARY.md)** - Security analysis and recommendations
- **[Design Guidelines](design_guidelines.md)** - UI/UX design principles
- **[QA Checklist](QA_CHECKLIST.md)** - Quality assurance testing checklist

## License

MIT License - See [LICENSE](LICENSE) file.
