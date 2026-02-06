# Architecture & Code Structure

## Overview

DW.ai is a full-stack web application with mobile support via Capacitor. The architecture follows a modern web stack with clear separation between frontend, backend, and shared code.

## Tech Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI component library
- **Wouter** - Client-side routing
- **TanStack React Query** - Server state management
- **Zustand** - Client state management
- **Framer Motion** - Animations

### Backend
- **Express.js** - Web server
- **TypeScript** - Type safety
- **PostgreSQL** - Database
- **Drizzle ORM** - Database ORM
- **Passport.js** - Authentication
- **OpenAI** - AI integration

### Mobile
- **Capacitor** - Native mobile wrapper
- **iOS** - Native iOS components
- **Android** - Native Android components

### Testing
- **Vitest** - Unit testing
- **React Testing Library** - Component testing

## Project Structure

```
DW-Ai-/
├── client/                      # Frontend React application
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── auth/          # Authentication components
│   │   │   └── ui/            # shadcn/ui components
│   │   ├── pages/             # Page components (routes)
│   │   │   └── systems/       # System pages
│   │   ├── stores/            # Zustand state stores
│   │   │   ├── user-store.ts
│   │   │   ├── preferences-store.ts
│   │   │   ├── features-store.ts
│   │   │   └── navigation-store.ts
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/               # Utility functions
│   │   ├── config/            # Configuration files
│   │   ├── contexts/          # React contexts
│   │   ├── routes/            # Route registry
│   │   ├── copy/              # UI text/copy
│   │   ├── test/              # Test utilities
│   │   ├── App.tsx            # Root component
│   │   ├── main.tsx           # App entry point
│   │   └── index.css          # Global styles
│   ├── index.html             # HTML entry point
│   └── public/                # Static assets
├── server/                     # Backend Express application
│   ├── routes.ts              # API route handlers
│   ├── storage.ts             # Database queries
│   ├── openai.ts              # AI integration
│   ├── email.ts               # Email service
│   ├── auth.ts                # Authentication logic
│   ├── index.ts               # Server entry point
│   └── seed-demo.ts           # Demo data seeder
├── shared/                     # Shared types and schemas
│   └── schema.ts              # Drizzle database schemas
├── android/                    # Android native project
│   └── app/                   # Android app code
├── ios/                        # iOS native project
│   └── App/                   # iOS app code
├── attached_assets/           # User uploads and generated content
├── docs/                      # Documentation
├── script/                    # Build scripts
├── dist/                      # Production build output
├── capacitor.config.ts        # Capacitor configuration
├── vite.config.ts            # Vite configuration
├── tailwind.config.ts        # Tailwind configuration
├── tsconfig.json             # TypeScript configuration
└── package.json              # Dependencies and scripts
```

## Frontend Architecture

### State Management

The application uses a hybrid approach to state management:

#### 1. React Query (Server State)
Used for data fetching, caching, and synchronization with the backend:
- API requests
- User data from database
- Real-time data updates
- Optimistic updates

#### 2. Zustand (Client State)
Used for local application state that doesn't need backend synchronization:
- **User Store** (`useUserStore`) - Authentication state, current user
- **Preferences Store** (`usePreferencesStore`) - Theme, voice settings, notifications
- **Features Store** (`useFeaturesStore`) - Feature flags for gradual rollouts
- **Navigation Store** (`useNavigationStore`) - Navigation history and state

Example usage:
```typescript
import { useUserStore } from '@/stores';

function MyComponent() {
  const { user, isAuthenticated, setUser } = useUserStore();
  
  return <div>Hello {user?.username}</div>;
}
```

### Routing

Client-side routing is handled by **Wouter**:
- File: `client/src/App.tsx`
- Routes defined declaratively with `<Route>` components
- Lazy loading with `React.lazy()` for code splitting

### Components

Components follow a flat structure (not atomic design yet):
- **UI Components** (`components/ui/`) - shadcn/ui base components
- **Auth Components** (`components/auth/`) - Login, signup forms
- **Feature Components** - Specific feature components
- **Page Components** (`pages/`) - Top-level route components

### Styling

- **Tailwind CSS** - Utility-first CSS framework
- **CSS Variables** - Theme colors defined in `client/src/index.css`
- **Dark Mode** - Supported via `next-themes`
- **Responsive Design** - Mobile-first approach

Example:
```tsx
<div className="bg-background text-foreground p-4 rounded-lg">
  <h1 className="text-2xl font-bold">Title</h1>
</div>
```

## Backend Architecture

### API Structure

Express.js handles all API endpoints in `server/routes.ts`:
- RESTful API design
- Session-based authentication
- JSON request/response format

Key endpoints:
- `/api/login` - User authentication
- `/api/register` - User registration
- `/api/user` - Get current user
- `/api/chat` - AI chat interface
- `/api/schedule` - Calendar/schedule data
- `/api/goals` - Goal management
- `/api/workouts` - Workout planning
- `/api/meals` - Meal planning
- `/api/summary` - Wellness dashboard data

### Database

**Drizzle ORM** provides type-safe database access:
- Schema defined in `shared/schema.ts`
- Migrations via `drizzle-kit push`
- PostgreSQL as the database

Tables include:
- `users` - User accounts
- `schedule_events` - Calendar events
- `goals` - User goals
- `habits` - Habit tracking
- `routines` - Daily routines
- `workouts` - Workout plans
- `meals` - Meal plans
- `mood_logs` - Wellness check-ins
- `chat_history` - AI conversation history

### Authentication

Passport.js with local strategy:
- Session-based auth (no JWT)
- Bcrypt password hashing
- Session storage in PostgreSQL via `connect-pg-simple`

### AI Integration

OpenAI-compatible API integration:
- Context-aware responses
- User wellness data integration
- Streaming support (future)
- Fallback handling

## Mobile Architecture (Capacitor)

### How It Works

1. **Web Build** - Vite builds the React app to `dist/public/`
2. **Sync** - Capacitor copies web assets to native projects
3. **Native Wrapper** - iOS/Android projects wrap the web view
4. **APIs** - Capacitor plugins provide native functionality

### Capacitor Configuration

File: `capacitor.config.ts`

```typescript
{
  appId: 'com.reilbrown.fliptheswitch',
  appName: 'DW-Ai',
  webDir: 'dist/public',
  ios: { contentInset: 'always' },
  android: { 
    allowMixedContent: true,
    backgroundColor: '#e1e6ed'
  }
}
```

### Native Features

- Deep links (phone assistant integration)
- Push notifications (future)
- Native splash screen
- Status bar styling

## Build Process

### Development Build
```bash
npm run dev
```
- Vite dev server with HMR
- Watches for file changes
- Serves at `http://localhost:5000`

### Production Build
```bash
npm run build
```
1. **Client Build** - Vite bundles React app
2. **Server Build** - ESBuild bundles Express server
3. **Output** - `dist/public/` (web) and `dist/index.cjs` (server)

### Mobile Build
```bash
npm run sync:ios      # Sync to iOS
npm run sync:android  # Sync to Android
```

## Testing Strategy

### Unit Tests
- Vitest for test runner
- React Testing Library for component tests
- Test files: `*.test.ts` or `*.spec.ts`

Example:
```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUserStore } from '@/stores/user-store';

describe('useUserStore', () => {
  it('should initialize with no user', () => {
    const { result } = renderHook(() => useUserStore());
    expect(result.current.user).toBeNull();
  });
});
```

### Integration Tests
- Test API endpoints
- Test database operations
- Test auth flows

## Code Conventions

### TypeScript
- Strict mode enabled
- Prefer interfaces over types
- Avoid `any` - use `unknown` if needed
- Export types alongside implementation

### React
- Functional components only
- Use hooks for logic
- Lazy load pages for performance
- Use Suspense for loading states

### File Naming
- `kebab-case.tsx` for components
- `camelCase.ts` for utilities
- `PascalCase` for component names

### Import Order
1. React imports
2. Third-party libraries
3. Internal components
4. Internal utilities
5. Types
6. Styles

## Performance Considerations

- **Code Splitting** - Lazy load pages and heavy components
- **React Query Caching** - Reduces unnecessary API calls
- **Zustand Persistence** - LocalStorage for offline-first UX
- **Image Optimization** - Use WebP format where possible
- **Bundle Analysis** - Monitor bundle size with vite build reports

## Security

- Environment variables for secrets
- Session-based auth (HTTP-only cookies)
- Input validation with Zod schemas
- SQL parameterization (Drizzle ORM)
- CORS configuration
- Bcrypt password hashing

## Future Improvements

- [ ] Add E2E tests with Playwright
- [ ] Implement WebSocket for real-time updates
- [ ] Add service worker for offline support
- [ ] Migrate to atomic design component structure
- [ ] Add feature-based organization
- [ ] Implement tRPC for type-safe API
- [ ] Add more comprehensive error boundaries

## Related Documentation

- [SETUP.md](./SETUP.md) - Local development setup
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide
- [ENHANCED_FEATURES.md](./ENHANCED_FEATURES.md) - Feature documentation
