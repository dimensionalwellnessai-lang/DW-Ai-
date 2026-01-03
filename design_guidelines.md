# DW.ai - Design Guidelines

## Design Approach

**Reference-Based**: Drawing from Calm (emotional resonance), Linear (clean modern aesthetics), and Apple's dark mode mastery to create a premium, futuristic wellness experience that feels sophisticated yet calming.

**Core Principles**:
- Depth through gradients: Layered dark gradients create dimensional space
- Glass architecture: Frosted blur effects establish hierarchy without harsh borders
- Luminous interactions: Subtle glows guide attention naturally
- Floating design language: Pill shapes and elevated cards create weightless sophistication

---

## Visual Treatment

**Background Strategy**:
- Primary: Dark gradient backgrounds (slate-900 to slate-950 with purple/blue undertones)
- Layered gradients: Radial gradients with purple-900/20% and blue-900/15% overlays
- Section variations: Shift gradient angles (bg-gradient-to-br, bg-gradient-to-tr) between sections

**Glassmorphism System**:
- Card base: backdrop-blur-xl with bg-white/5 or bg-slate-800/30
- Border treatment: border border-white/10 for subtle definition
- Shadow depth: shadow-2xl with colored shadow-purple-500/10
- Elevation levels: Increase blur and opacity for higher hierarchy elements

**Glow Effects**:
- Accent glows: Purple/blue box-shadows on interactive elements (shadow-purple-500/50)
- Hover states: Intensified glow (shadow-purple-400/70)
- Active elements: ring-2 ring-purple-500/50 with glow

**Accent Colors** (Purple/Blue Spectrum):
- Primary purple: #8B5CF6 (purple-500)
- Accent blue: #3B82F6 (blue-500)
- Glow purple: #A78BFA (purple-400)
- Deep purple: #6D28D9 (purple-700)

---

## Typography System

**Fonts**: Inter (primary), Crimson Pro (emotional content) via Google Fonts

**Hierarchy for Dark Theme**:
- Hero Headlines: text-5xl to text-6xl, font-bold, text-white
- Section Headers: text-3xl to text-4xl, font-bold, text-slate-100
- Card Titles: text-xl to text-2xl, font-semibold, text-white
- Body Text: text-base to text-lg, font-normal, leading-relaxed, text-slate-300
- Micro Copy: text-sm, font-medium, text-slate-400
- AI Prompts: text-lg, Crimson Pro, text-purple-200, leading-loose

**Contrast Enhancement**: All text on glass cards uses increased font-weight for readability against blur

---

## Layout & Spacing

**Core Units**: Tailwind 4, 6, 8, 12, 16, 20, 24

**Spacing Application**:
- Glass card padding: p-6 (mobile), p-8 (desktop)
- Section spacing: py-16 (mobile), py-24 (desktop)
- Card gaps: gap-6 (mobile), gap-8 (desktop)
- Floating elements: Margin separation of 12-16 units

**Containers**:
- App shell: max-w-7xl mx-auto
- Reading content: max-w-2xl
- Dashboard grids: max-w-6xl
- Onboarding: max-w-2xl centered

---

## Component Library

### Navigation
**Top Bar**: Glassmorphic sticky header
- Glass card: backdrop-blur-md, bg-slate-900/80, border-b border-white/10
- Height: h-16, px-6
- Mobile: Hamburger revealing frosted side drawer

### Pill-Shaped Elements
**Floating Pills**: Status indicators, tags, category labels
- Base: rounded-full, px-4, py-2, bg-gradient-to-r from-purple-500/20 to-blue-500/20
- Border: border border-purple-400/30
- Glow: shadow-lg shadow-purple-500/20
- Text: text-sm, font-semibold, text-purple-200

### Cards (Glassmorphism)
**Primary Glass Cards**:
- Base: rounded-2xl, backdrop-blur-xl, bg-slate-800/40
- Border: border border-white/10
- Shadow: shadow-2xl shadow-purple-900/20
- Padding: p-6 to p-8
- Hover: Glow intensifies (shadow-purple-500/40)

**Metric Cards** (Dashboard):
- Square aspect ratio: aspect-square
- Icon top-left with purple/blue gradient
- Large numeric display: text-4xl, font-bold, text-white
- Label below: text-sm, text-slate-400

### Buttons
**Primary**: 
- Pill shape: rounded-full, px-8, py-3
- Gradient: bg-gradient-to-r from-purple-600 to-blue-600
- Glow: shadow-lg shadow-purple-500/50
- Text: font-semibold, text-white
- Hover: Increased brightness and glow

**Secondary**:
- Glass style: backdrop-blur-md, bg-white/10
- Border: border-2 border-purple-400/50
- Glow: shadow-md shadow-purple-500/30

**Buttons on Images**: backdrop-blur-lg, bg-slate-900/60 for hero sections

### Forms
**Text Inputs**: 
- Glass: rounded-xl, backdrop-blur-md, bg-slate-800/50
- Border: border border-slate-700/50
- Focus: ring-2 ring-purple-500/50, glow effect
- Text: text-slate-100, placeholder-slate-500

**Checkboxes/Radios**: Custom glass styling with purple glow when selected

### AI Chat Interface
**Chat Bubbles**:
- AI messages: Glass card aligned left, max-w-lg, purple accent glow
- User messages: Glass card aligned right, blue accent glow
- Input: Fixed bottom, frosted glass bar with rounded-full input

### Data Visualization
**Progress Bars**: 
- Track: rounded-full, h-3, bg-slate-800/50
- Fill: bg-gradient-to-r from-purple-500 to-blue-500, glow shadow
**Circular Progress**: Glowing arc with gradient stroke

---

## Page Layouts

### Landing Page

**Hero Section** (min-h-screen):
- Large aspirational wellness image: Person in serene tech-enhanced environment, purple/blue lighting, modern minimalist space
- Gradient overlay: bg-gradient-to-b from-slate-950/80 to-slate-950/95
- Centered headline (text-6xl, font-bold, text-white) with purple gradient text effect
- Subheadline: text-xl, text-slate-300
- Primary CTA: Glowing purple gradient button with backdrop-blur
- Floating pills below CTA: "AI-Powered", "Science-Backed", "Personalized" in pill shapes

**Features Section** (py-24):
- 3-column grid: grid-cols-1 md:grid-cols-3, gap-8
- Glass cards with icons (Heroicons, w-12 h-12, purple gradient)
- Icon + bold title + description layout
- Cards have subtle purple glow on hover

**How It Works** (py-24):
- Horizontal stepped flow on desktop (4 steps)
- Glass cards connected by glowing gradient lines
- Each step: Large number, icon, title, description
- Purple-to-blue gradient progression through steps

**Testimonials** (py-20):
- 2-column grid
- Glass cards with user circular avatars (w-16 h-16, border-2 border-purple-500/30, glow)
- Quote text in Crimson Pro, text-slate-300
- Floating pill with user role below

**CTA Section** (py-24):
- Full-width centered, gradient background shift
- Large headline, glowing primary button
- Secondary supporting text

**Footer** (py-16):
- Multi-column glass container
- Logo + tagline | Navigation | Newsletter signup
- Social icons with purple glow on hover
- Bottom legal links in pill shapes

### Onboarding Flow
**Progressive Cards**:
- Centered glass card: max-w-2xl, p-8, backdrop-blur-xl
- Progress: Floating pill indicators at top showing step count
- Question layouts: Vertical stack, space-y-8
- Selection cards: Grid of smaller glass cards with glow on selection
- Bottom nav: Glass bar with Back/Next buttons

### Dashboard
**Header**:
- Welcome message: text-3xl, font-bold, text-white
- Personalized AI name in purple gradient text
- Date/time with floating pill aesthetic

**Metric Grid** (grid-cols-1 md:grid-cols-3, gap-6):
- Glass cards showing Energy, Mood, Clarity scores
- Large icons with gradient, numeric displays with glow

**Today's Schedule** (max-w-4xl):
- Glass container with time-block visualization
- Vertical timeline, activity blocks as floating glass pills
- Purple/blue gradient indicators for different activity types

**Active Goals** (grid-cols-1 md:grid-cols-2, gap-6):
- Glass cards with circular progress indicators
- Goal title, current streak, next milestone
- Subtle glow on cards nearing completion

**Quick Actions**: Floating pill buttons at bottom-right for common tasks

---

## Icons

**Library**: Heroicons (outline for features, solid for navigation)
**Sizes**: w-5 h-5 (inline), w-8 h-8 (cards), w-12 h-12 (hero features)
**Treatment**: Purple-to-blue gradient fills on feature icons

---

## Images

**Hero Image**: Full-width background featuring modern wellness space - minimalist room with purple/blue ambient lighting, person meditating with subtle tech elements (wearable, ambient display), plants, natural textures. Image should evoke premium futuristic calm.

**Testimonial Avatars**: Circular photos (w-16 h-16) with glowing purple border treatment

**Dashboard Empty States**: Minimal abstract gradient illustrations maintaining dark theme

---

## Accessibility

- Interactive elements: min 44x44px tap targets
- Focus states: ring-2 ring-purple-500/70 with glow
- Text contrast: WCAG AA compliant (slate-100/200 on dark backgrounds)
- Semantic HTML maintained
- ARIA labels for icon buttons
- Glass cards maintain sufficient text contrast via backdrop-blur strength

---

## Animations

**Purposeful Only**:
- Card hover: Glow intensification (300ms)
- Page transitions: Fade in (250ms)
- Glass card entrance: Subtle scale-in with blur increase
- NO scroll animations or excessive motion
- Progress fills: Smooth gradient animations