# DW (Dimensional Wellness AI) - Complete App Synopsis

## What This App Is

DW is a mobile-first personal life management app that uses an AI companion to help users live with intention across every dimension of their life. It's available on iOS and Android (via Capacitor wrapping a React web app) and will be published to the Apple App Store and Google Play Store.

The core idea: Instead of aimlessly going through life, DW helps you be intentional with every day, in every dimension — body, mind, time, purpose, money, relationships, environment, and identity.

The AI companion (called "DW") is the central interface. It's not just a chatbot — it's meant to feel like a real companion who knows your life, understands your goals, and helps you build, maintain, and execute a personal life system.

---

## The Problem Right Now

The app currently feels like "a whole bunch of buttons with no guidance." There are 60+ pages/screens, but no clear flow or narrative connecting them. Even with an app tour, it's hard to explain what the app does when you open it. The experience needs to feel more like a companion guiding you through your life — not a dashboard with scattered features.

---

## Core Philosophy

- **Reduce pressure, not increase performance.** Success = feeling calmer, seen, and capable.
- **All actions require explicit user consent.** No forced routines.
- **Energy-aware and optional.** The app adapts to how you're feeling.
- **No guilt mechanics.** No streaks, no social pressure, no "you missed a day" shame.
- **No medical or diagnostic claims.** This is a life management tool, not a medical app.

---

## The 8 Life Dimensions (The "Switches")

The app organizes life into 8 dimensions, each called a "Switch" that can be in one of 4 states:

| Switch | What It Covers |
|--------|---------------|
| **Body** | Fitness, nutrition, meal prep, workouts, body scans |
| **Mind** | Mental wellness, mood tracking, meditation, journaling |
| **Time** | Scheduling, calendars, daily routines, time blocking |
| **Purpose** | Goals, career, projects, meaning, direction |
| **Money** | Finances, budgeting, financial wellness |
| **Relationships** | Social connections, community, accountability partners |
| **Environment** | Living space, household tasks, cleaning, organization |
| **Identity** | Self-discovery, astrology/spirituality (optional), personal growth |

Switch states: **Off** → **Flickering** → **Stable** → **Powered**

---

## What's Currently Built (Feature Inventory)

### Onboarding & First-Time Experience
- **Welcome page** — Initial landing for new users
- **Enhanced onboarding wizard** — Multi-step setup asking about responsibilities, priorities, free time, peak motivation time, wellness focus areas, goals
- **Interactive tour** — Guided walkthrough of the app (but user reports it still feels confusing)
- **First-time agreement** — Terms/consent screen
- **Splash screen** — App loading animation

### AI Companion ("DW")
- **AI Chat workspace** — Full conversation interface at `/talk` or `/chat`
- **Floating AI widget** — Quick-access AI bubble on every screen
- **Context-aware responses** — AI considers user profile, mood, energy level
- **Intent detection** — AI routes conversations to appropriate features
- **Streaming responses** — Real-time AI text generation
- **AI Sync sessions** — AI extracts actionable items from conversations (goals, habits, tasks, events) and presents them for user approval
- **AI learnings** — System remembers user preferences and patterns over time
- **AI pattern snapshots** — Tracks behavioral patterns per dimension
- **Proactive nudges** — AI-initiated suggestions based on context
- **Morning briefing** — AI-generated daily overview
- **Learn mode** — AI asks questions to deepen understanding of user

### Life Command Center (Home Screen - `/`)
- Current main screen showing life overview
- Energy level selector (low/medium/high)
- Time band selector (10 min / 20-30 min / 45-60 min / 90+ min)
- Switch status overview (all 8 dimensions)
- Recommended actions based on energy + available time

### Calendar & Scheduling
- **Calendar page** (`/calendar`) — Weekly/monthly calendar view
- **Calendar month view** (`/calendar/month`)
- **Calendar schedule view** (`/calendar/schedule`)
- **Daily schedule** (`/daily-schedule`) — Time-blocked day view
- **Schedule blocks** — Recurring time blocks (work, sleep, meals, etc.)
- **Calendar events** — One-time and recurring events with dimension tags

### Mood & Wellness Tracking
- **Mood tracker** (`/mood-tracker`) — Log energy level, mood level, clarity level with notes
- **Tracking page** (`/tracking`) — Unified tracking view
- **Body scans** — Height, weight, waist measurements with consent
- **Wellness blueprint** — Personal baseline profile, stress signals, stabilizing actions, support preferences, recovery reflections
- **Wellness preferences** (`/wellness-preferences`)

### Meal Planning & Nutrition
- **Meal prep** (`/meal-prep`) — Meal planning with nutritional info (calories, protein, carbs, fat)
- **Meal plans** — Organized meal collections with week labels
- **Shopping lists** (`/shopping-list`) — Auto-generated from meal plans with ingredient categories
- **Meal prep preferences** — Weekday/weekend prep days, default servings
- **Document import** — Upload PDFs/docs of meal plans, AI parses them into structured data

### Fitness
- **Workout page** (`/workout`) — Exercise plans and tracking
- **Workout plans** — Structured exercise programs
- **Exercises** — Individual exercises with sets, reps, duration, equipment

### Goals, Habits & Tasks
- **Goals** (`/goals`) — Goal setting with wellness dimension tags, progress tracking
- **Habits** (`/habits`) — Habit tracking with frequency and reminders
- **Habit logs** — Completion tracking
- **Tasks** (`/tasks`) — To-do items linked to projects, goals, routines
- **Challenges** (`/challenges`) — Multi-day structured challenges

### Routines & Systems
- **Routines** (`/routines`) — Step-by-step guided routines with duration
- **Systems hub** (`/systems`) — Overview of all life systems
- **Wake-up system** (`/systems/wake-up`)
- **Wind-down system** (`/systems/wind-down`)
- **Training system** (`/systems/training`)
- **System modules** — Configurable system components with conditional logic

### Life Planning
- **Plans** (`/plans`) — Browse available life plans
- **Plan builder** (`/plan-builder`) — Create custom plans
- **Plan page** (`/plan`) — View active plan
- **Life blueprint** (`/life-blueprint`) — High-level life overview
- **Life dashboard** (`/life-dashboard`)
- **Life switchboard** (`/switchboard`) — Visual switch panel for all 8 dimensions
- **Switchboard intake** — Initial assessment per dimension
- **Switch training** — Deep dive into individual switches

### Journal
- **Journal** (`/journal`) — Personal journaling with entries

### Browse & Discovery
- **Browse page** (`/browse`) — Content discovery with 4 tabs:
  - **For You** — AI-curated personalized suggestions
  - **Explore** — Browse wellness content library
  - **Saved** — Bookmarked content
  - **Community** — Groups, feed, local resources (gyms, therapists, yoga studios)

### Spiritual & Identity (Optional)
- **Spiritual** (`/spiritual`) — Meditation, mindfulness
- **Astrology** (`/astrology`) — Birth chart, zodiac insights
- **Birth charts** — Full astrological profile with placements and interpretations

### Finances
- **Finances** (`/finances`) — Financial wellness tracking

### Accountability
- **Accountability** (`/accountability`) — Partner/group accountability
- **Accountability settings** — Configure accountability preferences

### Progress & Insights
- **My Progress** (`/profile/progress`) — Personal progress dashboard
- **Insights** (`/insights`) — AI-generated behavioral insights
- **Weekly check-in** (`/weekly-checkin`) — Structured weekly reflection

### Settings & Account
- **Settings** (`/settings`) — App preferences, themes, notifications
- **Account deletion** (`/account/delete`)
- **Password reset** (`/reset-password`)
- **Privacy & Terms** (`/privacy-terms`)
- **Subscription** (`/subscription`) — Premium features and plans
- **Feedback** (`/feedback`) — Send feedback to developers
- **Import** (`/import`) — Import documents (PDFs, Word docs)
- **Export** — Export plan data

### Admin
- **Admin analytics** (`/admin/analytics`) — Usage analytics dashboard

---

## Navigation Structure

### Bottom Navigation Bar (5 tabs, always visible)
1. **Calendar** — `/calendar`
2. **Browse** — `/browse`
3. **Home** — `/` (Life Command Center)
4. **DW** — `/talk` (AI Chat)
5. **Journal** — `/journal`

### Hamburger Menu (top-left)
- Shows logged-in status
- Links to Settings, My Progress
- Log out option
- Sign In/Sign Up for unauthenticated users

### Floating AI Widget
- Present on every screen
- Quick access to AI companion

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + TypeScript, Vite, Tailwind CSS, Radix UI/shadcn |
| Routing | Wouter |
| State | TanStack React Query |
| Backend | Node.js + Express, TypeScript |
| Database | PostgreSQL with Drizzle ORM |
| Auth | Express sessions with cookie-based authentication |
| AI | OpenAI API (chat, intent detection, recommendations) |
| Email | Resend |
| Search | Perplexity API |
| Mobile | Capacitor (iOS 15.0+, Android) |
| Build | Vite |

### App IDs
- **Capacitor App ID**: com.reilbrown.fliptheswitch
- **App Name**: DW-Ai

---

## Database Tables (Data Model)

The app has 40+ database tables including:
- `users` — Core user accounts
- `user_profiles` — Detailed user preferences (diet, fitness, coaching tone, meditation style)
- `onboarding_profiles` — Data collected during onboarding
- `life_systems` — User's personalized life system
- `goals`, `habits`, `habit_logs` — Goal and habit tracking
- `mood_logs` — Mood, energy, clarity tracking
- `check_ins` — AI check-in conversations
- `schedule_blocks`, `calendar_events`, `daily_schedule_events` — Scheduling
- `tasks` — To-do items
- `routines`, `routine_logs` — Step-by-step routines
- `meal_plans`, `meals` — Meal planning
- `workout_plans`, `exercises` — Fitness plans
- `shopping_lists`, `shopping_list_items` — Grocery lists
- `wellness_blueprints`, `baseline_profiles`, `stress_signals`, `stabilizing_actions` — Wellness system
- `challenges` — Multi-day challenges
- `body_scans` — Physical measurements
- `system_modules` — Configurable life systems
- `birth_charts` — Astrology data
- `ai_learnings`, `ai_sync_sessions`, `ai_sync_items` — AI memory and sync
- `ai_pattern_snapshots` — Behavioral pattern detection
- `interaction_events` — Usage analytics
- `saved_content`, `wellness_content` — Content library
- `imported_documents`, `imported_document_items` — Document parsing
- `projects`, `project_chats` — Project management
- `conversations`, `messages` — Chat history

---

## What the App Should Feel Like (The Vision)

Inspired by the Toland companion app, the experience should feel like:

1. **A companion, not a dashboard.** The AI should feel like someone who knows you, not a menu of features. When you open the app, it should feel like checking in with a friend who's been thinking about your day.

2. **Guided, not overwhelming.** Instead of showing 60 buttons, the app should surface the right thing at the right time based on your energy, schedule, and goals. The AI decides what to show you — you don't have to hunt for features.

3. **Intentional onboarding.** Like Toland, the first experience should feel like meeting your companion. The AI should ask questions, learn about you, and then explain why it's a good match. It should feel personal, not like filling out a form.

4. **Every dimension connected.** When you log a meal, it should connect to your body switch. When you journal, it connects to your mind switch. The user should always see how their actions feed into the bigger picture of their life system.

5. **Be intentional with every day, in every dimension.** This is the core message. The app helps you live with full intention rather than aimlessly going through life.

---

## Key Problems to Solve

1. **Too many screens, no clear path.** The app needs a clear user journey — from first open to daily use.
2. **AI companion doesn't feel like a companion.** It needs personality, memory, and proactive guidance.
3. **Features feel disconnected.** Meals, workouts, mood, goals all exist but don't feel like parts of one system.
4. **Onboarding doesn't set the stage.** Users should leave onboarding knowing exactly what the app does and feeling connected to the AI.
5. **No clear "what do I do now?" moment.** Every time the user opens the app, the AI should guide them to the most relevant action.

---

## Summary for AI Spec Writing

This app is a **mobile-first life management companion** that uses AI to help users build and maintain an intentional life across 8 dimensions (body, mind, time, purpose, money, relationships, environment, identity). The tech is all built — React/TypeScript frontend, Express backend, PostgreSQL database, OpenAI integration, Capacitor for mobile. The core issue is that the UX feels like a scattered dashboard instead of a guided companion experience. The redesign should center the AI companion as the primary interface, reduce visual overwhelm, connect all features into a unified life system, and make the onboarding feel like meeting a personal guide — similar to how the Toland companion app matches you with a character who then guides your experience.
