# Flip the Switch (FTS)

## Overview

Flip the Switch (FTS) is a Dimensional Wellness AI, a consent-based personal assistant designed to help users build their own life system through adaptive, energy-based guidance rather than prescriptive routines. It aims to reduce cognitive load and support emotional regulation, fostering user authorship and self-trust. The project prioritizes calm, optionality, and user control, avoiding features that induce guilt, social pressure, or dependency.

## User Preferences

Preferred communication style: Simple, everyday language. Collaborative, not directive.

## System Architecture

### UI/UX Decisions
The application emphasizes a calm, optional, and energy-aware user experience. Key design principles include energy-based guidance over productivity, meaning over metrics (no streaks or leaderboards), optionality as a core feature, and silence as a design tool. The UI is nervous system-aware, adapting to user states. Typography uses DM Sans, Space Grotesk, Nunito, and Crimson Pro for visual variety. Light/dark mode is supported. The main experience is the AI Assistant, with supporting sections accessible via a hamburger menu.

### Technical Implementations
*   **Frontend**: React 18 with TypeScript, Vite, Wouter for routing, TanStack React Query for state management, shadcn/ui component library (Radix UI primitives), Tailwind CSS for styling. Guest mode allows local storage persistence for chat before signup. Recharts is used for data visualization.
*   **Backend**: Node.js with Express.js, TypeScript, RESTful API. `express-session` handles session management with secure cookies, and custom session-based authentication uses bcrypt for password hashing.
*   **Data Layer**: PostgreSQL database managed by Drizzle ORM. Schemas are defined in `shared/schema.ts`, and Drizzle Kit handles migrations. Zod schemas are generated for validation.
*   **Core Data Models**: Users, Onboarding Profiles, Life Systems, Goals, Habits, Mood Logs, Check-ins, and Schedule Blocks.
*   **AI Integration**: Utilizes an OpenAI-compatible API via Replit AI Integrations for chat-based check-ins and life system recommendations. AI responses are personalized using user context and adhere to a strict voice configuration.
*   **Voice Mode**: Implemented via Web Speech API (push-to-talk only, never auto-listening) with defined voice scripts and rules against navigation or saving without permission.
*   **Energy Context System**: The AI adapts its tone, pacing, and suggestions based on user energy levels (low, medium, high) derived from mood logs and body scans, always with transparent explanations and user consent.
*   **Guided Experiences**: Follows a Netflix-style layout with AI-picked recommendations, "Why" explanations, single-selection patterns, and explicit calendar confirmations.
*   **Transparency & Trust**: Implements data origin labels, an "Explain Why" toggle for AI suggestions, a user feedback queue, and energy-adaptive AI patterns with consent reminders to avoid dark patterns.
*   **Ingredient Substitution System**: AI-powered ingredient substitutes with ratios and usage notes. Users can click any ingredient to find alternatives, manage banned/excluded ingredients that are automatically filtered from all AI meal suggestions, and view substitutes with contextual tips.
*   **Community Page**: Tab-based navigation with Groups, Feed, and Local Resources categories. Groups show wellness communities, Feed displays community posts, and Local Resources provides AI-powered web search for nearby services (gyms, therapists, restaurants, etc.).
*   **Local Resources Search**: Powered by Perplexity API for web search. Returns curated results with AI-suggested picks. Falls back to mock data when API key is not configured. Results include business name, description, category, rating, address, phone, and website.
*   **Concierge Planning**: AI can help plan anything - trips, birthday parties, events, home organization, career transitions, and more. Uses constraint awareness (budget, time, energy, preferences) to provide personalized recommendations.

### Configuration Architecture
*   **Centralized Voice & Copy**: `client/src/config/brand.ts` for app identity, `client/src/config/voiceGuide.ts` for AI voice rules, and `client/src/copy/en.ts` for all UI text.

## External Dependencies

*   **Database**: PostgreSQL (via `DATABASE_URL` environment variable), `connect-pg-simple` for session storage.
*   **AI Services**: Replit AI Integrations (OpenAI-compatible API), requiring `AI_INTEGRATIONS_OPENAI_BASE_URL` and `AI_INTEGRATIONS_OPENAI_API_KEY`.
*   **Authentication**: `express-session` (with `SESSION_SECRET`), Resend for email-based password resets.
*   **Email**: Resend via Replit connector (default sender: `Flip the Switch <no-reply@resend.dev>`).
*   **Web Search**: Perplexity API (`PERPLEXITY_API_KEY`) for Local Resources search feature. Optional - falls back to mock data.
*   **Third-Party Libraries**: `shadcn/ui`, `react-hook-form` (with `@hookform/resolvers` and Zod), `date-fns`, `Recharts`.