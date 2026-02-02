# Demo Account Setup Guide for Apple App Store Review

## Overview
This guide explains how to set up and use the demo account for Apple App Store reviewers.

## Demo Account Credentials

**Email:** `demo@dimensionalwellness.app`  
**Password:** `DemoWellness2026!`

⚠️ **Important:** These credentials must be provided to Apple during app review submission.

## Setting Up the Demo Account

### Option 1: Run the Seed Script (Recommended)

1. Ensure you have a PostgreSQL database running and configured
2. Set the `DATABASE_URL` environment variable
3. Run the seed script:
   ```bash
   npm run seed:demo
   ```

The script will:
- Delete any existing demo account (idempotent - safe to run multiple times)
- Create a new demo user with the credentials above
- Populate the account with comprehensive wellness data

### Option 2: Demo Mode (Client-Side Only)

Users can also try the app without creating an account by using "Demo Mode":
- Click the "Try Demo Mode" button on the login page
- This loads pre-populated data in local storage (no database required)
- Perfect for quick testing and exploration

## What's Included in the Demo Account

### User Profile
- Complete profile with wellness preferences
- Workout preferences (home gym, dumbbells, resistance bands)
- Meditation preferences (guided, 5-15 min sessions)
- Profile completeness: 80%

### Goals (5 total)
1. **Exercise 3x per week** (Physical) - High priority, 90-day target
2. **Meditate daily for 10 minutes** (Emotional) - High priority, 60-day target
3. **Read 2 books per month** (Intellectual) - Medium priority, 30-day target
4. **Build emergency fund** (Financial) - High priority, 180-day target
5. **Weekly family time** (Relational) - Medium priority, ongoing

### Habits (4 total with streaks)
1. **Morning Workout** - 7-day streak, Mon/Wed/Fri
2. **Drink 8 glasses of water** - 14-day streak, daily
3. **Evening Journaling** - 5-day streak, daily
4. **Read for 20 minutes** - 3-day streak, daily

### Routines (3 total)
1. **Morning Routine** (45 min) - Wake up, hydrate, meditate, workout, breakfast
2. **Evening Wind-Down** (30 min) - Stop screens, stretch, journal, read, sleep prep
3. **Sunday Reset** (90 min) - Review week, meal prep, plan schedule, set goals

### Calendar Events (5 total)
- Morning Workout (recurring Mon/Wed/Fri at 7 AM)
- Meditation (recurring daily at 6:30 AM)
- Team Meeting (recurring weekly on Monday at 2 PM)
- Meal Prep Sunday (recurring Sunday at 2 PM)
- Family Dinner (one-time today at 6:30 PM)

### Mood Logs (7 days)
Past week of mood tracking showing realistic energy patterns:
- Varied moods: energized, happy, content, tired, motivated, calm, hopeful
- Notes on each entry
- Values ranging from 5-8 out of 10

### AI Conversation (1 conversation, 6 messages)
Topic: "Getting Started with Wellness"
- Realistic back-and-forth dialogue
- User expressing wellness goals
- AI providing helpful, energy-based guidance
- Demonstrates the app's conversational AI capabilities

## Testing the Demo Account

### Login Test
1. Navigate to the login page
2. Enter email: `demo@dimensionalwellness.app`
3. Enter password: `DemoWellness2026!`
4. Click "Log In"
5. Should successfully log in and redirect to home page

### Features to Test
Once logged in, reviewers can explore:
- **Today View**: See daily schedule, habits, mood tracking
- **Goals**: View all 5 goals across different dimensions
- **Habits**: Check habit streaks and logs
- **Calendar**: View recurring and one-time events
- **Chat/AI**: See existing conversation, create new ones
- **Profile**: View complete user profile and preferences
- **Routines**: Explore morning, evening, and weekly routines

## Troubleshooting

### Demo Account Not Working
If login fails with demo credentials:
1. Check database connection
2. Run `npm run seed:demo` to recreate the account
3. Verify environment variables are set correctly

### Alternative: Use Demo Mode
If database issues prevent demo account login:
1. Direct reviewers to click "Try Demo Mode" on login page
2. This works without any backend/database
3. All features are accessible with pre-populated local data

## For Apple Reviewers

**Quick Start:**
1. Open the app
2. On the login screen, you have two options:
   - **Option A:** Click "Try Demo Mode" button (instant access, no login needed)
   - **Option B:** Log in with the credentials above

**What to explore:**
- All 13 wellness dimensions are represented in goals and activities
- Habit tracking with realistic streak data
- AI chat demonstrates personalized wellness guidance
- Calendar shows recurring routines and one-time events
- Mood tracking shows weekly patterns

**Privacy Note:**
This is a standalone demo account with fictional data created specifically for review purposes. No real user data is included.

## Maintenance

### Updating Demo Data
To update the demo account data:
1. Edit `server/seed-demo.ts`
2. Run `npm run seed:demo` to apply changes
3. Test by logging in with demo credentials

### Resetting Demo Account
The seed script is idempotent - running it multiple times is safe:
```bash
npm run seed:demo
```
This will delete and recreate the demo account with fresh data.

## Security Notes

- Demo password meets complexity requirements (uppercase, lowercase, number, special char)
- Password is hashed using bcrypt with 10 salt rounds
- Demo account is clearly labeled and separate from production users
- Credentials should be shared only with Apple review team through secure App Store Connect notes
