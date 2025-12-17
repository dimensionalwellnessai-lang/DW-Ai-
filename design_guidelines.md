# Wellness Lifestyle AI - Design Guidelines

## Design Approach

**Reference-Based Approach**: Drawing inspiration from Calm (emotional resonance), Notion (flexible personalization), and Linear (clean modern aesthetics) to create a supportive, growth-oriented wellness experience.

**Core Principles**:
- Supportive, not clinical: Design should feel like a trusted companion
- Clarity over complexity: Information hierarchy must reduce cognitive load
- Breathable layouts: Generous spacing creates calm, focused experiences
- Progressive disclosure: Reveal complexity gradually through onboarding

---

## Typography System

**Primary Font**: Inter (via Google Fonts) - clean, highly readable
**Secondary Font**: Crimson Pro (for emotional, inspirational content)

**Hierarchy**:
- Hero/Page Titles: text-5xl to text-6xl, font-bold
- Section Headers: text-3xl to text-4xl, font-semibold
- Card Titles: text-xl to text-2xl, font-medium
- Body Text: text-base to text-lg, font-normal, leading-relaxed
- Micro Copy (labels, captions): text-sm, font-medium
- AI Prompts: text-lg, Crimson Pro, leading-loose for warmth

---

## Layout & Spacing System

**Core Spacing Units**: Tailwind units of 4, 6, 8, 12, 16, 20, 24
- Component padding: p-6 (mobile), p-8 (desktop)
- Section spacing: py-12 (mobile), py-20 (desktop)
- Card gaps: gap-6 (mobile), gap-8 (desktop)
- Inline spacing: space-x-4, space-y-4

**Container Strategy**:
- App Shell: max-w-7xl mx-auto for main content
- Reading Content: max-w-2xl for long-form text
- Dashboard Cards: max-w-6xl with grid layouts
- Full-width sections for onboarding flows

**Grid Patterns**:
- Onboarding: Single column, centered, max-w-2xl
- Dashboard: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Habit Tracker: grid-cols-2 md:grid-cols-4 lg:grid-cols-7 (weekly view)
- Goal Cards: grid-cols-1 md:grid-cols-2

---

## Component Library

### Navigation
**Top Navigation Bar**: Sticky header with logo, main nav links, user avatar
- Height: h-16, px-6, shadow-sm
- Mobile: Hamburger menu revealing side drawer

**Side Navigation (Dashboard)**: Optional left sidebar for power users
- Width: w-64, fixed positioning
- Collapsible on mobile: transform to bottom navigation

### Onboarding Flow
**Multi-Step Cards**: Centered, elevated cards with progress indicator
- Card: max-w-2xl, p-8, rounded-2xl, shadow-lg
- Progress: Stepped dots at top, current step highlighted
- Question Layout: Vertical stack with generous spacing (space-y-8)
- Input Groups: Checkbox/radio grids with 2-3 columns on desktop

**Selection Cards**: Interactive choice cards (responsibilities, wellness priorities)
- Hover state: Subtle elevation increase
- Selected state: Border emphasis, no background change yet
- Icon + Title + Optional Description
- Grid: grid-cols-1 md:grid-cols-2 lg:grid-cols-3, gap-4

### Dashboard Components
**Metric Cards**: Showcase daily energy, mood, progress
- Design: Compact square/rectangle cards
- Layout: Icon top-left, metric center, label below
- Size: aspect-square for visual consistency

**Habit Tracker**: Weekly grid visualization
- Days as columns, habits as rows
- Checkboxes or dots showing completion
- Visual: Soft rounded squares for each day cell

**AI Chat Interface**: Conversational daily check-ins
- Chat bubbles: max-w-lg, rounded-2xl, p-4
- AI messages: Align left with subtle avatar
- User responses: Align right
- Input: Fixed bottom with rounded-full input field

**Schedule Builder**: Time-block visual representation
- Vertical timeline showing day segments
- Draggable blocks (indicate via cursor pointer)
- Time labels on left, activity blocks on right

### Forms & Inputs
**Text Inputs**: rounded-lg, px-4, py-3, text-base
**Textareas**: rounded-lg, min-h-32, p-4
**Select Dropdowns**: rounded-lg with chevron icon
**Buttons**: 
- Primary: px-6, py-3, rounded-full, font-semibold
- Secondary: px-6, py-3, rounded-full, font-medium (outline variant)
- Icon Buttons: p-3, rounded-full, size-12

**Checkbox/Radio Groups**: 
- Large tap targets: min-h-12, px-4
- Custom styled with checkmark icons
- Label: text-base, font-medium

### Data Visualization
**Progress Bars**: Soft rounded-full, h-2 or h-3
**Goal Progress Circles**: Circular progress indicators for visual appeal
**Mood/Energy Graphs**: Line or area charts, simplified style

---

## Page Layouts

### Landing/Marketing Page
**Hero Section**: Full viewport height (min-h-screen)
- Large hero image (supportive, aspirational wellness imagery)
- Centered headline + subheadline
- Primary CTA button (rounded-full, large size)
- Trust indicator below CTA ("Join 10,000+ people building better lives")

**Features Section**: 3-column grid showcasing core capabilities
- Icon + Title + Description cards
- Icons from Heroicons (outline style)

**How It Works**: Stepped process (3-4 steps)
- Horizontal flow on desktop, vertical on mobile
- Visual connectors between steps

**Testimonials**: 2-column grid with user photos and quotes
- Card style with subtle elevation

**CTA Section**: Full-width, centered
- Compelling headline + button + secondary text

**Footer**: Multi-column layout
- Column 1: Logo + tagline
- Column 2-3: Navigation links
- Column 4: Newsletter signup
- Bottom: Social icons + legal links

### Onboarding Flow
**Progressive Steps**: One question per screen
- Centered card layout
- Clear progress indication
- Back/Next navigation at bottom
- AI personality present via welcoming microcopy

### Dashboard (Post-Onboarding)
**Layout**: Sidebar (optional) + Main content area
- Top: Welcome message with personalized system name
- Grid of metric cards (energy, mood, clarity)
- Today's Schedule block
- Active Goals section (cards)
- Quick Actions: Add habit, Log mood, AI check-in button

### Goal/Habit Detail View
**Header**: Goal title, progress indicator, edit button
- Metrics: Days tracked, current streak, overall progress
**Main Content**: Notes, milestones, related habits
**Activity Log**: Timeline of check-ins and updates

---

## Icons
**Library**: Heroicons (via CDN)
**Usage**:
- Navigation: Solid variant
- Cards/Features: Outline variant
- Size: w-5 h-5 (inline), w-8 h-8 (feature cards), w-12 h-12 (hero icons)

---

## Accessibility
- All interactive elements minimum tap target: 44x44px
- Form inputs with visible labels
- Focus states: ring-2 offset-2
- Semantic HTML throughout (nav, main, section, article)
- ARIA labels for icon-only buttons

---

## Images
**Required Images**:
1. **Hero Image**: Aspirational wellness scene (person meditating at sunrise, organized workspace with plants, balanced lifestyle visualization) - full-width background with content overlay
2. **Feature Cards**: Icon-based (no images)
3. **Testimonial Photos**: Circular avatar images (rounded-full, w-12 h-12 or w-16 h-16)
4. **Dashboard**: Optional decorative illustrations for empty states

**Image Treatment**: 
- Hero backgrounds: Subtle overlay for text readability
- Buttons on images: Backdrop blur (backdrop-blur-sm) for glass morphism effect

---

## Animations
**Minimal, Purposeful Use**:
- Page transitions: Fade in (200ms)
- Card hover: Slight scale (transform scale-105, transition-transform)
- Progress indicators: Smooth fill animations
- NO scroll-triggered animations, parallax, or excessive motion