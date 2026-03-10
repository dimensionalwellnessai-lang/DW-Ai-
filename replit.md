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
7. **Command Center Cards**: Reusable `CommandCenterCard` component with two-zone layout (info left, DW Orb right). 7 cards: Today, Insight, Plan, Health, Momentum, DW Prompt, Journal.
8. **Cosmic Background**: `cosmic-bg` CSS class provides subtle gradient background (navy/indigo/violet in dark mode).

### AI Integration
- AI chat interface as primary interaction point
- DW Orb appears on every Command Center card — tap orb to chat with DW about that card's context
- Floating DW Orb in bottom-right corner on all pages (except chat/onboarding)
- DW Orb appears in Talk It Out chat header and inline with DW messages
- Context-aware wellness guidance
- Proactive nudges based on user history and energy state
- System prompts enforce calm, consent-based tone

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