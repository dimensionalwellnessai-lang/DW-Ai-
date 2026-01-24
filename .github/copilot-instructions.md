# GitHub Copilot Custom Instructions

## Project Overview

**Flip the Switch (FTS)** is a Dimensional Wellness AI - a consent-based personal assistant designed to help users build their own life system through adaptive, energy-based guidance. The app manages wellness across 13 life dimensions using an energy-based **Pause → Name → Flip → Choose** structure.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **State Management**: TanStack React Query
- **Routing**: Wouter
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **AI Integration**: OpenAI-compatible API via Replit AI Integrations
- **Email Service**: Resend (for password reset)
- **Mobile**: Capacitor for iOS and Android

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
├── server/                 # Backend Express application
│   ├── routes.ts          # API endpoints
│   ├── storage.ts         # Database operations
│   ├── openai.ts          # AI integration
│   └── email.ts           # Email service
├── shared/                 # Shared types and schemas
│   └── schema.ts          # Drizzle database schemas
├── attached_assets/        # User uploads and generated images
├── android/                # Android native files (Capacitor)
└── ios/                    # iOS native files (Capacitor)
```

## Development Commands

### Build and Run
```bash
# Install dependencies
npm install

# Start development server (runs both frontend and backend)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run check
```

### Database
```bash
# Push database schema changes
npm run db:push
```

## Code Conventions

### TypeScript
- Use TypeScript for all new files
- Prefer interfaces over types for object shapes
- Use proper type annotations, avoid `any`
- Export types from relevant modules

### React
- Use functional components with hooks
- Prefer composition over inheritance
- Use custom hooks for reusable logic
- Follow React Query patterns for data fetching
- Use Suspense boundaries with lazy loading for performance

### Component Structure
- Place shared components in `client/src/components/`
- Place page components in `client/src/pages/`
- Use shadcn/ui components as base, customize as needed
- Follow existing component patterns

### Styling
- Use Tailwind CSS utility classes
- Use semantic color tokens (e.g., `text-foreground`, `bg-background`)
- Avoid hardcoded colors; use CSS variables defined in `client/src/index.css`
- Support both light and dark modes
- Use `cn()` helper from `lib/utils` for conditional classes

### API Routes
- Define API routes in `server/routes.ts`
- Use proper HTTP methods (GET, POST, PUT, DELETE)
- Return consistent error responses
- Validate inputs using Zod schemas
- Include proper authentication checks

### Database
- Define schemas in `shared/schema.ts` using Drizzle ORM
- Use migrations via `npm run db:push`
- Follow existing table naming conventions
- Include proper indexes for performance

## Design Philosophy

**Core Principles:**
- **Energy-based guidance** over productivity metrics
- **Meaning over metrics** - no streaks or leaderboards
- **Optionality as a core feature** - never mandatory
- **Silence as a design tool** - calm, unobtrusive UX
- **Nervous system-aware** - adapts to user energy states
- **Consent-based** - always asks before saving or scheduling

**UI Guidelines:**
- Maintain calm, minimal aesthetic
- Use clear visual hierarchy
- Provide contextual help without being intrusive
- Ensure accessibility (ARIA labels, keyboard navigation)
- Support both authenticated users and guest mode

## Testing

- The project is in active development; test infrastructure is minimal
- When adding features, consider edge cases
- Manually test in both light and dark modes
- Test guest mode and authenticated flows
- Verify mobile responsiveness

## Security Boundaries

**NEVER:**
- Commit secrets, API keys, or credentials to the repository
- Expose sensitive user data in logs or error messages
- Bypass authentication checks on protected routes
- Use SQL string concatenation (always use parameterized queries)
- Disable CORS without proper justification
- Remove or modify security-related middleware

**ALWAYS:**
- Use environment variables for sensitive configuration
- Validate and sanitize all user inputs
- Use secure session management
- Follow OWASP security best practices
- Hash passwords with bcrypt
- Sanitize file uploads

## AI Integration

- AI features use OpenAI-compatible API
- Context is built from user's wellness data
- AI should be helpful, consent-based, and non-prescriptive
- Maintain user privacy - don't share data unnecessarily
- Provide fallback behavior if AI is unavailable

## File Upload Handling

- User uploads go to `attached_assets/` directory
- Support documents (PDF, DOCX), images, and text files
- Validate file types and sizes
- Process meal plans and workout documents with appropriate parsers

## Mobile Considerations

- App uses Capacitor for native mobile builds
- Test deep links and phone assistant integration
- Ensure touch-friendly UI (adequate tap targets)
- Consider offline functionality where appropriate

## Documentation

- Keep README.md up to date with major features
- Document API changes in relevant files
- Include JSDoc comments for complex functions
- Update FEATURE_STATUS.md as features are completed

## Common Pitfalls to Avoid

- Don't break dark mode by using hardcoded colors
- Don't bypass authentication middleware
- Don't modify database schema without testing
- Don't remove existing functionality without explicit requirement
- Don't add unnecessary dependencies
- Don't create temporary test files in the main directories (use `/tmp`)

## Current Status

🚧 **Beta** - Active development with weekly feature updates and ongoing improvements.
