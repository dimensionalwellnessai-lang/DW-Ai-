# Dimensional Wellness AI (DWAI)

## Overview

Dimensional Wellness AI (DWAI) is a nervous-system-aware life companion that helps users feel calmer, seen, and capable. The app uses AI-powered insights to provide energy-based guidance (not productivity-based), adapting to the user's current state rather than pushing for output.

## Core Philosophy

**North Star Flow**: Arrive → Acknowledge → Guide → Act → Release

**Core Principle**: If a feature does not reduce cognitive load or support emotional regulation, it does not belong.

**North Star Question**: "Does this help the user feel safer in their body right now?" If no, it doesn't belong.

DWAI must never: overwhelm, rush, guilt, or compete for attention.

### Design Principles
- **Energy-based guidance** instead of productivity-based guidance
- **Meaning over metrics**: Replace scores/streaks/leaderboards with narrative summaries and reflective language
- **Optionality is a feature**: Always allow exit, no forced next step, no penalty for inactivity
- **Silence as a design tool**: Intentional pauses, blank space, minimal responses
- **Nervous system-aware**: Adapt to user states (overstimulated, tired, scattered, steady, grounded)
- **Dependence avoidance**: Teach self-trust, normalize days without app use

### Copy & Language Standards
Avoid: "You should", "You must", "Complete", "Fix"
Use: "We can", "If you want", "Notice", "Adjust"
Tone: calm, grounded, human, humble

### Screen Structure
**AI Assistant is the main experience** (landing page)
Supporting sections accessible via hamburger menu:
- Challenges (workout, mental health, nutrition, social, financial)
- Talk It Out (dedicated AI mode for processing feelings)
- Calendar & Plans (schedule, plans, routines)

### First Interaction
Welcome: "What do you feel like you need today?"
Options: Make a simple plan | Talk things out | Try a challenge | I'm not sure, I need guidance

## User Preferences

Preferred communication style: Simple, everyday language. Collaborative, not directive.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
  - **Central Route Registry**: `client/src/lib/routes.ts` defines all routes with enabled flags
  - **Feature Visibility**: `client/src/lib/feature-visibility.ts` controls menu visibility
  - Routes must be enabled in both files to be accessible and visible
  - Disabled routes show a friendly "Not Found" page
- **Version**: App version stored in `client/src/lib/routes.ts` as `APP_VERSION` (currently 0.1.0-beta)
- **State Management**: TanStack React Query for server state management and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens for theming (light/dark mode support)
- **Typography**: Multiple lively fonts for visual variety:
  - DM Sans (default sans-serif)
  - Space Grotesk (display/headings via .font-display)
  - Nunito (body text via .font-body)
  - Crimson Pro (serif/emotional content via .font-serif)
- **Guest Mode**: Local storage persistence for chat messages before signup
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
- **Password Reset**: Email-based reset via Resend integration (tokens expire in 1 hour)
- **Remember Me**: Login sessions extend from 7 days to 30 days when checked

### Email
- **Provider**: Resend via Replit connector
- **Default Sender**: DW.ai <no-reply@resend.dev> (temporary for beta)

### Third-Party Libraries
- **UI**: Full shadcn/ui component suite with Radix UI primitives
- **Forms**: react-hook-form with @hookform/resolvers and Zod validation
- **Dates**: date-fns for date manipulation
- **Charts**: Recharts for progress visualization