# Flip the Switch (FTS)

A Dimensional Wellness AI - a consent-based personal assistant designed to help users build their own life system through adaptive, energy-based guidance rather than prescriptive routines.

## Overview

Flip the Switch helps users manage wellness across 13 life dimensions using an energy-based **Pause → Name → Flip → Choose** structure. The AI acts as a concierge - anticipatory, personalized, and pattern-aware.

### Key Features

- **AI Chat Interface**: Primary interaction point with context-aware wellness guidance
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

## Design Philosophy

- **Energy-based guidance** over productivity metrics
- **Meaning over metrics** - no streaks or leaderboards
- **Optionality as a core feature** - never mandatory
- **Silence as a design tool** - calm, unobtrusive UX
- **Nervous system-aware** - adapts to user energy states
- **Consent-based** - always asks before saving or scheduling

## License

Proprietary - All rights reserved.
