# Dimensional Wellness AI (DWAI)

## Overview

Dimensional Wellness AI (DWAI) is a personalized wellness and life management application that helps users build sustainable routines, track habits, and achieve holistic wellness goals. The app uses AI-powered insights to create customized life systems based on each user's unique responsibilities, priorities, and available time. Core features include an onboarding flow that understands user context, goal and habit tracking, mood/energy logging, smart scheduling, and AI-powered daily check-ins.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state management and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens for theming (light/dark mode support)
- **Typography**: Inter (primary) and Crimson Pro (for emotional/inspirational content)
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

### Third-Party Libraries
- **UI**: Full shadcn/ui component suite with Radix UI primitives
- **Forms**: react-hook-form with @hookform/resolvers and Zod validation
- **Dates**: date-fns for date manipulation
- **Charts**: Recharts for progress visualization