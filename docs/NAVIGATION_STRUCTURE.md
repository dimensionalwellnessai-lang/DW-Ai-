# DW.ai Navigation Structure

## Bottom Navigation Bar (Always Visible)

```
┌─────────────────────────────────────────────────────────────┐
│  🏠      📅        💬       📊       ☰                       │
│ Home  Calendar    DW     Track    Menu                      │
│  /     /calendar  /talk  /tracking  [opens menu]           │
└─────────────────────────────────────────────────────────────┘
```

## Side Menu Structure (Hamburger Menu)

```
╔═══════════════════════════════════════════════════════════╗
║  👤 user@email.com                                        ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  ⭐ Life Command Center            → /                    ║
║  💬 Talk to DW                     → /talk                ║
║  📅 Life Timeline                  → /calendar            ║
║                                                           ║
║  ─────────────── MY IDENTITY ───────────────              ║
║  📜 Life Blueprint                 → /life-blueprint      ║
║  🎯 My Goals                       → /goals               ║
║  ✅ My Habits                      → /habits              ║
║                                                           ║
║  ──────────── BODY & MIND ────────────                    ║
║  🏋️ Workout                        → /workout             ║
║  🍽️ Meal Prep                      → /meal-prep           ║
║  🧘 Meditation                     → /spiritual           ║
║  📓 Journal                        → /journal             ║
║                                                           ║
║  ──────── LIFE DIMENSIONS ────────                        ║
║  ✨ Astrology                      → /astrology           ║
║  💰 Finances                       → /finances            ║
║  👥 Community                      → /community           ║
║                                                           ║
║  ───────────── EXPLORE ───────────                        ║
║  🔍 Browse                         → /browse              ║
║  🎯 Challenges                     → /challenges          ║
║  🔄 Recovery                       → /recovery            ║
║                                                           ║
║  ───────────── SYSTEMS ───────────                        ║
║  ⚡ Switch Training                → /switchboard         ║
║  📊 My Progress                    → /profile/progress    ║
║  📝 Routines                       → /routines            ║
║  ✅ Tasks                          → /tasks               ║
║                                                           ║
║  ──────────── SETTINGS ───────────                        ║
║  ⚙️ Settings                       → /settings            ║
║  🗺️ App Tour                       → /app-tour            ║
║  📋 Feedback                       → /feedback            ║
║  🔒 Privacy & Terms                → /privacy-terms       ║
║                                                           ║
╠═══════════════════════════════════════════════════════════╣
║  [Logout Button]                                          ║
║  v1.0.0                                                   ║
╚═══════════════════════════════════════════════════════════╝
```

## Floating AI Widget

```
┌─────────────────────────────────────────┐
│                                         │
│                                         │
│  [Page Content]                         │
│                                         │
│                                     ┌───┤
│                                     │💬 │
│                                     └───┤
│                                         │
└─────────────────────────────────────────┘
└─────────────────────────────────────────┘
│  🏠   📅   💬   📊   ☰                   │ ← Bottom Nav
└─────────────────────────────────────────┘
       ↑
  Positioned above bottom nav
  Shows on all pages except /talk
```

## Page Hierarchy

```
/ (Home - Life Command Center)
├── /talk (DW Chat)
├── /calendar (Life Timeline)
│   ├── /today (Today's view)
│   └── /calendar?view=week (Week view)
├── /tracking (Tracking Dashboard)
│
├── MY IDENTITY
│   ├── /life-blueprint (Life Blueprint)
│   │   ├── 8 Dimensions (body, mind, time, etc.)
│   │   └── Reset Protocol
│   ├── /goals (My Goals)
│   └── /habits (My Habits)
│
├── BODY & MIND
│   ├── /workout (Workout)
│   ├── /meal-prep (Meal Prep)
│   ├── /spiritual (Meditation)
│   └── /journal (Journal)
│
├── LIFE DIMENSIONS
│   ├── /astrology (Astrology)
│   ├── /finances (Finances)
│   └── /community (Community)
│
├── EXPLORE
│   ├── /browse (Browse)
│   ├── /challenges (Challenges)
│   └── /recovery (Recovery)
│
├── SYSTEMS
│   ├── /switchboard (Switch Training)
│   ├── /profile/progress (My Progress)
│   ├── /routines (Routines)
│   └── /tasks (Tasks)
│
└── SETTINGS
    ├── /settings (Settings)
    ├── /app-tour (App Tour)
    ├── /feedback (Feedback)
    └── /privacy-terms (Privacy & Terms)
```

## Key Features

### ✅ Bottom Navigation
- **Always visible** on authenticated pages
- **5 items** for easy thumb reach
- **Active state** highlighting
- **Direct access** to most-used features

### ✅ Side Menu
- **Organized sections** for easy browsing
- **All features accessible** (no hidden features)
- **Visual hierarchy** with section headers
- **User context** at top

### ✅ Floating AI Widget
- **Context-sensitive** (hidden on /talk)
- **Quick access** to AI assistant
- **Non-intrusive** positioning
- **Expands inline** for quick questions

### ✅ Navigation Philosophy
- **Home-centric**: Life Command Center is the default landing
- **Quick actions**: Bottom nav for frequent tasks
- **Complete access**: Side menu for all features
- **AI available**: Floating widget for instant help
- **Mobile-first**: Designed for touch interaction
