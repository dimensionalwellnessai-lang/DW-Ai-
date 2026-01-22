# DW-Ai / Flip the Switch - Comprehensive Roadmap & Deployment Checklist

**Document Version**: 1.0  
**Date**: January 22, 2026  
**Current App Version**: 0.1.0-beta  
**Status**: Wave 6 Complete → Wave 7 In Progress

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [App Review & Current Status](#app-review--current-status)
3. [User Experience Analysis](#user-experience-analysis)
4. [Improvement Checklist](#improvement-checklist)
5. [Platform Deployment Readiness](#platform-deployment-readiness)
6. [Launch Strategy & Marketing](#launch-strategy--marketing)
7. [Timeline & Milestones](#timeline--milestones)

---

## Executive Summary

**DW-Ai (Flip the Switch)** is a consent-based wellness AI assistant in active beta (v0.1.0) with a strong foundation and clear ethical principles. The app has successfully passed Wave 6 QA ("Gatekeeper") and is ready to advance toward platform deployment.

### Key Strengths
✅ **Solid Technical Foundation**: React + TypeScript + Capacitor + PostgreSQL  
✅ **Ethical Design**: Consent-based, no dark patterns, user control  
✅ **Comprehensive Features**: 45+ screens covering wellness dimensions  
✅ **Quality Assurance**: Wave 6 QA passed, navigation consistent  
✅ **Mobile-Ready**: Capacitor configured for iOS/Android  
✅ **Documentation**: Extensive specs, design guidelines, QA checklists

### Priority Focus Areas
🎯 Complete Wave 7 (Trust & Transparency)  
🎯 Polish in-progress features (Workout, Analytics)  
🎯 Complete iOS/Android deployment configurations  
🎯 Establish beta testing program  
🎯 Prepare App Store/Play Store assets & compliance

---

## App Review & Current Status

### 1. Onboarding Experience

**Current Flow**: Welcome → Mood Check-in → Quick Setup → Today Hub

#### ✅ What Works Well
- **Fast, non-intrusive**: Mood check-in is optional and quick
- **Consent-based**: Users can skip without pressure
- **Meaningful start**: AI opens with context-aware suggestions
- **Guest mode**: Users can try without account creation
- **Micro-onboarding**: Questions asked only when needed

#### 🔧 Opportunities for Improvement
- **App Tour visibility**: Tour exists (`/app-tour`) but may need better discovery
- **Value proposition**: Could strengthen "why use DW-Ai" messaging in first 30 seconds
- **Progressive disclosure**: Consider staged feature introduction over first 3 days
- **Personalization payoff**: Show quick win from mood check-in selection

**Recommendation**: Add optional "Quick Wins" tutorial after onboarding showing 1-2 immediate benefits.

---

### 2. Core User Flows Analysis

#### A. AI Chat (Primary Interface)

**Status**: ✅ Fully Functional

**Strengths**:
- Clean, uncluttered interface
- Context-aware responses
- Conversation history persists
- Crisis detection active ("Talk It Out" mode)
- Multiple conversation categories

**Improvements Needed**:
- [ ] Add "example prompts" for new users
- [ ] Implement suggested follow-up actions in chat
- [ ] Add voice input (Phase 2, planned)
- [ ] Show AI confidence/transparency indicators

---

#### B. Today Hub / Daily Schedule

**Status**: ✅ Fully Functional

**Strengths**:
- Daily command center concept is strong
- Calendar integration works
- Event creation/editing functional
- Recurring events supported

**Improvements Needed**:
- [ ] Add "morning briefing" feature (AI-generated daily overview)
- [ ] Implement drag-and-drop time blocking
- [ ] Add energy-based schedule suggestions
- [ ] Show dimension balance for the day

---

#### C. Meal Planning

**Status**: ✅ Fully Functional (Import supports PDF/Word)

**Strengths**:
- Comprehensive meal library
- Restriction/allergy filters work
- Shopping list generation
- Document import (PDF/Word meal plans)
- Calorie/macro display

**Improvements Needed**:
- [ ] Add meal prep timer/notifications
- [ ] Expand meal database
- [ ] Add community meal sharing (Wave 7+)
- [ ] Integrate with grocery delivery APIs (future)

---

#### D. Meditation / Spiritual Practice

**Status**: ✅ Fully Functional

**Strengths**:
- Netflix-style browsing
- Mood + intention filters
- Duration filtering
- Calendar scheduling integration

**Improvements Needed**:
- [ ] Add in-app guided meditations (currently links)
- [ ] Include grief-specific content (planned)
- [ ] Add manifestation practices (planned)
- [ ] Track meditation streaks (optional, non-shaming)

---

#### E. Workout Planning

**Status**: 🟨 In Progress (Page exists, marked "not ready")

**Current State**:
- Page exists with PageHeader
- Shows "This isn't ready yet" message
- Go Back navigation works

**Required to Complete**:
- [ ] Build workout library with filters (home/gym, equipment, limitations)
- [ ] Create workout plan builder
- [ ] Add player mode with timer/sets tracking OR link-based (user preference)
- [ ] Schedule sessions to calendar
- [ ] Enable saving plans to projects
- [ ] Add recovery tracking integration

**Priority**: HIGH (Core wellness dimension)

---

#### F. Challenges

**Status**: ✅ Fully Functional

**Strengths**:
- Browsable challenge library
- Detail dialogs work
- Add to plan/calendar functional
- Toast notifications clear

**Improvements Needed**:
- [ ] Add challenge completion tracking
- [ ] Show progress on active challenges
- [ ] Add community challenge participation (future)

---

#### G. Journal & Mood Tracking

**Status**: ✅ Fully Functional

**Strengths**:
- Weekly check-ins implemented
- Mood tracking active
- Journal entries persist

**Improvements Needed**:
- [ ] Add mood trends visualization
- [ ] Implement pattern recognition ("You feel better on days with morning routines")
- [ ] Add export journal feature
- [ ] Privacy: remind users data stays private

---

#### H. Finances

**Status**: 🟨 In Progress

**Current State**:
- Finance profile setup exists
- Basic tracking UI present

**Required to Complete**:
- [ ] Complete expense tracking functionality
- [ ] Add budget planning tools
- [ ] Implement financial wellness insights
- [ ] Link to financial dimension in Life Dashboard

---

### 3. Navigation & Interface

**Status**: ✅ Excellent (Wave 6 QA Passed)

#### ✅ Strengths
- **Consistent PageHeader**: All 45 pages use standardized header
- **Hamburger menu**: Accessible from all screens
- **Back button**: Works reliably
- **No fake UI**: "Coming soon" replaced with "This isn't ready yet" + actionable back button
- **Visual hierarchy**: Clean, glassmorphic design system
- **Dark mode mastery**: Premium aesthetic matching design guidelines

#### Minor Improvements
- [ ] Add breadcrumb navigation for deep pages
- [ ] Implement global search (find any feature quickly)
- [ ] Add keyboard shortcuts for power users
- [ ] Consider bottom navigation for mobile (thumb-friendly)

---

### 4. Save System & Data Persistence

**Status**: ✅ Fully Functional (Wave 6 QA Passed)

#### ✅ Strengths
- Save flows work consistently
- Loading states visible
- Toast notifications clear and calm ("Saved." not "Successfully saved!")
- Guest mode uses localStorage
- Authenticated mode syncs to PostgreSQL
- No forced refreshes needed

#### Minor Improvements
- [ ] Add "unsaved changes" warning for complex forms
- [ ] Implement auto-save drafts for long-form content
- [ ] Show sync status indicator (offline/online)
- [ ] Add data export feature (user control)

---

### 5. Copy & Language

**Status**: ✅ Excellent (Wave 6 QA Passed)

#### ✅ Achievements
- Banned words removed ("just", "should", "fix", "broken")
- Centralized copy in `client/src/copy/en.ts`
- Calm, supportive tone throughout
- Error messages are kind: "That didn't save." vs "Error: Save failed"
- Success messages brief: "Saved." vs "Successfully saved to your account!"

#### Continuous Improvement
- [ ] Regular voice/tone audits
- [ ] User testing on copy clarity
- [ ] Internationalization preparation (i18n)
- [ ] Accessibility: alt text, ARIA labels

---

## User Experience Analysis

### Identified Usability Issues

| Issue | Severity | Location | Recommendation |
|-------|----------|----------|----------------|
| Workout feature incomplete | HIGH | `/workout` | Complete workout library and player (Q1 2026) |
| Analytics not instrumented | MEDIUM | All pages | Implement Wave 7 analytics plan |
| App Tour discoverability | MEDIUM | Menu | Add first-time user prompt or onboarding step |
| Mobile responsiveness gaps | MEDIUM | Various | Systematic mobile audit and fixes |
| No global search | LOW | Navigation | Add search bar to hamburger menu |
| Voice input missing | LOW | AI Chat | Implement in Phase 2 (Wave 8+) |
| No offline mode indicator | LOW | All pages | Show connectivity status |
| Community features absent | PLANNED | `/community` | Launch in Wave 8+ |

---

### Non-Functional Components Requiring Attention

1. **Workout Planning** (HIGH PRIORITY)
   - Status: Page exists but disabled
   - Action: Complete library, player, and scheduling features
   - Timeline: Q1 2026 (before app store launch)

2. **Analytics Dashboard** (MEDIUM PRIORITY)
   - Status: Not yet instrumented
   - Action: Implement Wave 7 analytics spec (SPEC_09)
   - Timeline: Q1 2026

3. **Projects/Context Containers** (PLANNED)
   - Status: Disabled route
   - Action: Wave 7 or Wave 8 feature
   - Timeline: Q2 2026

4. **Community Features** (PLANNED)
   - Status: Disabled route
   - Action: Post-launch feature
   - Timeline: Q2 2026

5. **Blueprint System** (PLANNED)
   - Status: Disabled route
   - Action: System templates for common life situations
   - Timeline: Q2 2026

---

## Improvement Checklist

### Phase 1: Pre-Launch Critical (Q1 2026)

#### 🚨 MUST COMPLETE BEFORE APP STORE SUBMISSION

##### A. Feature Completion
- [ ] **Complete Workout Planning** (HIGH PRIORITY)
  - [ ] Build workout library with 20+ starter workouts
  - [ ] Implement filters (home/gym, equipment, body parts, duration)
  - [ ] Create workout player with timer/sets/reps tracking
  - [ ] Add workout scheduling to calendar
  - [ ] Enable save to projects/plans
  - [ ] Add recovery day suggestions
  
- [ ] **Analytics Implementation** (MEDIUM PRIORITY)
  - [ ] Implement analytics per SPEC_09
  - [ ] Add basic insights to Life Dashboard
  - [ ] Create Weekly Balance summary
  - [ ] Add pattern recognition ("better on workout days")
  
- [ ] **Mobile Responsiveness Audit**
  - [ ] Test all 45 pages on mobile (iOS/Android)
  - [ ] Fix layout breaks on small screens
  - [ ] Ensure touch targets are 44px+ (accessibility)
  - [ ] Test hamburger menu on all devices
  - [ ] Validate form inputs on mobile keyboards

##### B. Platform Compliance & Legal

- [ ] **App Store Requirements (iOS)**
  - [ ] Review and update Privacy Policy (PRIVACY.md)
  - [ ] Review and update Terms of Service (TERMS.md)
  - [ ] Add required health disclaimers to app
  - [ ] Create App Store listing (see Platform Deployment section)
  - [ ] Prepare screenshots (6.7", 6.5", 5.5" devices)
  - [ ] Record app preview video (15-30 seconds)
  - [ ] Write app description (170 chars subtitle + 4000 chars description)
  - [ ] Submit for App Review with reviewer notes (APP_STORE_REVIEWER_NOTES.md)
  
- [ ] **Google Play Requirements (Android)**
  - [ ] Review Privacy Policy compliance (Google Play requirements)
  - [ ] Add Data Safety section information
  - [ ] Create Play Store listing
  - [ ] Prepare screenshots (phone, 7" tablet, 10" tablet)
  - [ ] Record feature graphic (1024x500)
  - [ ] Write Play Store description (short + full)
  - [ ] Complete Content Rating questionnaire (IARC)
  - [ ] Set up merchant account (if monetizing)

- [ ] **Health App Compliance**
  - [ ] Ensure all health disclaimers are visible
  - [ ] Verify "not medical advice" messaging
  - [ ] Add crisis resources to Talk It Out
  - [ ] Review AI safety measures (SPEC_04)
  - [ ] Test crisis detection and escalation

##### C. Performance & Stability

- [ ] **Performance Optimization**
  - [ ] Audit bundle size (target: <500KB initial load)
  - [ ] Implement code splitting for routes
  - [ ] Optimize images (WebP, lazy loading)
  - [ ] Add service worker for offline support
  - [ ] Test on 3G/slow connections
  
- [ ] **Stability & Error Handling**
  - [ ] Test all error states (network failures, API errors)
  - [ ] Implement comprehensive error boundaries
  - [ ] Add retry mechanisms for failed requests
  - [ ] Test offline mode (show appropriate messaging)
  - [ ] Add crash reporting (Sentry or similar)

##### D. Testing

- [ ] **Manual Testing**
  - [ ] Complete full user journey testing (new user → active user)
  - [ ] Test on real iOS devices (iPhone 12+, iPad)
  - [ ] Test on real Android devices (Pixel, Samsung)
  - [ ] Test all save/load flows
  - [ ] Validate all calendar integrations
  - [ ] Test meal import (PDF, Word documents)
  - [ ] Verify crisis detection in Talk It Out
  
- [ ] **Automated Testing** (if resources permit)
  - [ ] Set up E2E tests for critical flows
  - [ ] Add unit tests for AI safety checks
  - [ ] Integration tests for database operations
  - [ ] Visual regression tests for UI consistency

##### E. Build & Deployment

- [ ] **iOS Build**
  - [ ] Complete iOS app configuration
  - [ ] Generate app icons (all required sizes)
  - [ ] Add launch screen/splash
  - [ ] Test on TestFlight with beta users
  - [ ] Configure push notifications (future)
  - [ ] Set up Apple Developer account ($99/year)
  - [ ] Create certificates and provisioning profiles
  - [ ] Archive and upload to App Store Connect
  
- [ ] **Android Build**
  - [ ] Complete Android app configuration
  - [ ] Generate app icons (all densities: mdpi to xxxhdpi)
  - [ ] Add splash screen
  - [ ] Test via internal testing track
  - [ ] Sign APK/AAB with release keystore
  - [ ] Set up Google Play Developer account ($25 one-time)
  - [ ] Create release in Play Console
  - [ ] Upload AAB (Android App Bundle)

---

### Phase 2: Wave 7 Features (Q1-Q2 2026)

#### System Ownership & Transparency

- [ ] **Data Origin Labels**
  - [ ] Add "You Created" labels to user-generated content
  - [ ] Add "AI Suggested" labels to AI recommendations
  - [ ] Add "Imported" labels to document imports
  - [ ] Show origin in all relevant views (calendar, meals, workouts)
  
- [ ] **Transparency Features**
  - [ ] Add "Why this?" explanations for AI suggestions
  - [ ] Show AI reasoning in chat responses
  - [ ] Implement energy-adaptive response explanations
  - [ ] Add consent reminders to AI patterns

- [ ] **My Life System Overview**
  - [ ] Create Life System page showing all components
  - [ ] Show dimension coverage visualization
  - [ ] Display active goals, routines, habits
  - [ ] Add export entire system feature

#### Ethical Monetization Preparation

- [ ] **Monetization Framework**
  - [ ] Define free vs. premium feature boundaries
  - [ ] Ensure NO emotional paywalls (per ETHICAL_MONETIZATION.md)
  - [ ] Design export features (PDFs, CSVs)
  - [ ] Plan integration capabilities (Google Calendar, etc.)
  - [ ] Consider extended storage tiers
  
- [ ] **Premium Features** (if applicable)
  - [ ] Advanced analytics and insights
  - [ ] Extended chat history (>30 days)
  - [ ] Multiple calendar exports
  - [ ] Custom routine templates
  - [ ] Priority AI responses
  - [ ] Data portability tools

#### Intentional Distribution

- [ ] **Feedback System**
  - [ ] Enhance in-app feedback (already exists at `/feedback`)
  - [ ] Add rating prompts (non-intrusive, after positive interactions)
  - [ ] Implement user trust metrics
  - [ ] Create feedback loop to development
  
- [ ] **Gradual Rollout**
  - [ ] Plan phased launch strategy (see Marketing section)
  - [ ] Set up beta tester program
  - [ ] Create early access program
  - [ ] Monitor user satisfaction metrics

---

### Phase 3: Post-Launch Enhancements (Q2-Q3 2026)

#### Advanced Features

- [ ] **Projects/Context Containers**
  - [ ] Enable `/projects` route
  - [ ] Implement project creation and management
  - [ ] Link conversations, goals, routines to projects
  - [ ] Add project-based chat history
  
- [ ] **Community Features**
  - [ ] Enable `/community` route
  - [ ] Allow sharing of routines (anonymized, consent-based)
  - [ ] Create challenge participation features
  - [ ] Implement feedback and support systems

- [ ] **Blueprint/Templates System**
  - [ ] Enable `/blueprint` route
  - [ ] Create life situation templates
  - [ ] Allow custom blueprint creation
  - [ ] Share community blueprints (curated)

- [ ] **Voice Integration**
  - [ ] Add voice input to AI chat (Phase 2 from master spec)
  - [ ] Implement transcription service
  - [ ] Add voice meditation guides
  - [ ] Enable hands-free routine execution

#### Integrations

- [ ] **Calendar Sync**
  - [ ] Two-way Google Calendar sync
  - [ ] Apple Calendar integration (iOS)
  - [ ] Outlook Calendar support
  - [ ] CalDAV support
  
- [ ] **Health Integrations**
  - [ ] Apple Health integration (HealthKit)
  - [ ] Google Fit integration
  - [ ] Wearable device support (Fitbit, Garmin, Oura)
  - [ ] Sleep tracking integration

- [ ] **Third-Party Services**
  - [ ] Grocery delivery APIs (Instacart, Amazon Fresh)
  - [ ] Music/meditation apps (Spotify, Calm)
  - [ ] Task management tools (Todoist, Things)

---

### Phase 4: Continuous Improvement (Ongoing)

#### UX Polish

- [ ] Conduct user testing sessions (monthly)
- [ ] A/B test key flows (onboarding, AI chat)
- [ ] Iterate on copy based on feedback
- [ ] Refine design system based on usage patterns
- [ ] Accessibility audit (WCAG 2.1 AA compliance)

#### Content Expansion

- [ ] Expand meal library (100+ meals)
- [ ] Add workout library (100+ workouts)
- [ ] Create meditation library (50+ practices)
- [ ] Develop challenge library (30+ challenges)
- [ ] Add astrology content depth

#### Technical Debt

- [ ] Code refactoring and optimization
- [ ] Dependency updates (security patches)
- [ ] Performance monitoring and optimization
- [ ] Database query optimization
- [ ] Reduce bundle size

---

## Platform Deployment Readiness

### iOS Deployment Status

#### ✅ Completed Steps

1. **Project Configuration**
   - ✅ Capacitor configured (`capacitor.config.ts`)
   - ✅ App ID set: `com.reilbrown.fliptheswitch`
   - ✅ App name: `DW-Ai`
   - ✅ iOS folder structure created (`/ios/App`)
   - ✅ Podfile present
   - ✅ Xcode project files exist

2. **Build Pipeline**
   - ✅ Codemagic workflow configured (`codemagic.yaml`)
   - ✅ Node 20 environment set
   - ✅ Xcode latest specified
   - ✅ Build scripts defined:
     - npm ci (dependencies)
     - npm run build (web app)
     - npx cap sync ios (Capacitor sync)
     - CocoaPods install
   - ✅ Artifact output configured (IPA files)

#### 🔧 Remaining iOS Steps

##### 1. Apple Developer Account Setup
- [ ] Create/access Apple Developer account ($99/year)
- [ ] Add team members (if applicable)
- [ ] Enroll in Apple Developer Program
- [ ] Verify account and payment

##### 2. App Store Connect Setup
- [ ] Create new app in App Store Connect
- [ ] Set bundle ID: `com.reilbrown.fliptheswitch`
- [ ] Choose app name (check availability)
- [ ] Select category: Health & Fitness / Lifestyle
- [ ] Set primary language
- [ ] Choose pricing (Free with optional IAP)

##### 3. Certificates & Provisioning
- [ ] Generate iOS Distribution Certificate
- [ ] Create App Store Provisioning Profile
- [ ] Download and install in Xcode
- [ ] Configure signing in Xcode project
- [ ] Enable required capabilities:
  - [ ] Push Notifications (future)
  - [ ] Background Modes (future)
  - [ ] HealthKit (if integrating)

##### 4. App Assets
- [ ] Generate app icon (1024x1024 + all sizes)
  - Required sizes: 20pt, 29pt, 40pt, 60pt, 76pt, 83.5pt (@1x, @2x, @3x)
- [ ] Create launch screen (storyboard or image)
- [ ] Design splash screen matching brand
- [ ] Prepare App Store screenshots:
  - [ ] 6.7" display (iPhone 14 Pro Max)
  - [ ] 6.5" display (iPhone 11 Pro Max)
  - [ ] 5.5" display (iPhone 8 Plus)
  - [ ] 12.9" iPad Pro (if iPad support)
- [ ] Record app preview video (optional but recommended)
  - 15-30 seconds
  - Landscape or portrait
  - Show key features

##### 5. App Store Listing Content
- [ ] App Name: "Flip the Switch - DW.ai" or similar (30 chars max)
- [ ] Subtitle: Compelling one-liner (30 chars max)
  - Example: "AI Wellness Companion"
- [ ] Description (4000 chars max)
  - Write compelling copy highlighting:
    - Consent-based AI guidance
    - 13 wellness dimensions
    - Energy-based approach (not productivity)
    - Meal planning, meditation, routines
    - Privacy-first, no data selling
- [ ] Keywords (100 chars, comma-separated)
  - wellness, meditation, meal planning, AI assistant, self-care, routines, mental health, energy, mindfulness
- [ ] Support URL: Link to support page
- [ ] Marketing URL: Link to landing page/website
- [ ] Privacy Policy URL: Link to PRIVACY.md hosted version

##### 6. App Review Preparation
- [ ] Complete `APP_STORE_REVIEWER_NOTES.md`
- [ ] Provide demo account (username/password)
- [ ] Document any special permissions needed
- [ ] Prepare explanation for:
  - AI features (not therapy)
  - Health disclaimers
  - Data collection practices
  - Crisis detection (Talk It Out)
- [ ] Explain "not medical advice" positioning
- [ ] Document consent-based design

##### 7. Build & Submit
- [ ] Run `npm run build` locally and test
- [ ] Sync Capacitor: `npx cap sync ios`
- [ ] Open Xcode: `npx cap open ios`
- [ ] Archive build in Xcode
- [ ] Validate build (Xcode Organizer)
- [ ] Upload to App Store Connect
- [ ] Complete App Store listing
- [ ] Submit for review
- [ ] Monitor review status (typically 24-48 hours)

##### 8. TestFlight Beta (Recommended Before Launch)
- [ ] Configure TestFlight in App Store Connect
- [ ] Add internal testers (up to 100)
- [ ] Add external testers (up to 10,000)
- [ ] Distribute beta builds
- [ ] Collect feedback
- [ ] Iterate based on feedback
- [ ] Final build after beta testing

---

### Android Deployment Status

#### ✅ Completed Steps

1. **Project Configuration**
   - ✅ Capacitor configured for Android
   - ✅ Android folder structure created (`/android`)
   - ✅ AndroidManifest.xml present
   - ✅ Package structure exists
   - ✅ Resources folder configured

#### 🔧 Remaining Android Steps

##### 1. Google Play Console Setup
- [ ] Create Google Play Developer account ($25 one-time fee)
- [ ] Verify account and payment
- [ ] Set up merchant account (if monetizing)
- [ ] Create new app in Play Console
- [ ] Choose app name
- [ ] Select default language
- [ ] Set app type: App or Game (App)
- [ ] Choose Free or Paid

##### 2. App Configuration
- [ ] Update `android/app/build.gradle`:
  - [ ] Set `applicationId` to match package
  - [ ] Set `versionCode` (start at 1, increment each release)
  - [ ] Set `versionName` (e.g., "1.0.0")
  - [ ] Configure `minSdkVersion` (21+)
  - [ ] Set `targetSdkVersion` (33+)
- [ ] Configure permissions in AndroidManifest.xml:
  - [ ] Internet
  - [ ] Camera (if using)
  - [ ] Storage (if needed)
  - [ ] Notifications

##### 3. App Signing
- [ ] Generate upload keystore:
  ```bash
  keytool -genkey -v -keystore upload-keystore.jks \
    -alias upload -keyalg RSA -keysize 2048 -validity 10000
  ```
- [ ] Store keystore securely (NEVER commit to repo)
- [ ] Create `key.properties` file in `android/`:
  ```
  storePassword=<password>
  keyPassword=<password>
  keyAlias=upload
  storeFile=upload-keystore.jks
  ```
- [ ] Add `key.properties` to `.gitignore`
- [ ] Configure signing in `build.gradle`
- [ ] Test release build:
  ```bash
  cd android
  ./gradlew bundleRelease
  ```

##### 4. App Assets
- [ ] Generate launcher icons (all densities):
  - [ ] mdpi: 48x48
  - [ ] hdpi: 72x72
  - [ ] xhdpi: 96x96
  - [ ] xxhdpi: 144x144
  - [ ] xxxhdpi: 192x192
  - [ ] Play Store: 512x512 (PNG)
- [ ] Create adaptive icon (foreground + background)
- [ ] Design feature graphic (1024x500, JPG or PNG)
- [ ] Prepare screenshots:
  - [ ] Phone: minimum 2, up to 8 (16:9 or 9:16)
  - [ ] 7" tablet: minimum 2 (optional)
  - [ ] 10" tablet: minimum 2 (optional)
- [ ] Create promo video (optional, YouTube link)

##### 5. Play Store Listing Content
- [ ] App name (50 chars max)
  - "Flip the Switch - Wellness AI"
- [ ] Short description (80 chars max)
  - "Consent-based AI for holistic wellness across 13 life dimensions"
- [ ] Full description (4000 chars max)
  - Highlight features, benefits, privacy
  - Include keywords naturally
  - Explain energy-based approach
  - Mention meal planning, meditation, routines
- [ ] Categorization:
  - [ ] App category: Health & Fitness or Lifestyle
  - [ ] Tags: wellness, meditation, AI, self-care
- [ ] Contact details:
  - [ ] Email address
  - [ ] Website URL
  - [ ] Privacy Policy URL (hosted PRIVACY.md)

##### 6. Content Rating
- [ ] Complete IARC questionnaire
- [ ] Answer questions about:
  - Violence, sexual content, language, drugs
  - User-generated content
  - Data collection
  - Social features
- [ ] Receive rating certificate
- [ ] Apply ratings to app

##### 7. Data Safety Section
- [ ] Complete Data Safety form (REQUIRED):
  - [ ] What data is collected?
    - Account info (email, username)
    - Health and fitness data (wellness check-ins)
    - Personal info (user preferences)
    - App activity (calendar events, goals)
  - [ ] Is data shared with third parties? (No)
  - [ ] Is data encrypted in transit? (Yes - HTTPS)
  - [ ] Can users request data deletion? (Yes)
  - [ ] Is data collection optional? (Yes for guest mode)
- [ ] Review and publish

##### 8. Store Presence & Pricing
- [ ] Set countries/regions for distribution
- [ ] Choose pricing (Free)
- [ ] Set up in-app purchases (if applicable, future)
- [ ] Configure availability date

##### 9. Build & Release
- [ ] Build Android App Bundle (AAB):
  ```bash
  npx cap sync android
  cd android
  ./gradlew bundleRelease
  ```
- [ ] Locate AAB: `android/app/build/outputs/bundle/release/app-release.aab`
- [ ] Upload to Play Console (Internal testing track first)
- [ ] Configure release:
  - [ ] Release name (e.g., "1.0.0 - Initial Release")
  - [ ] Release notes
  - [ ] Countries/regions
  - [ ] Review and rollout
- [ ] Submit for review

##### 10. Testing Tracks (Recommended)
- [ ] **Internal Testing** (up to 100 testers)
  - [ ] Upload AAB to internal track
  - [ ] Add tester emails
  - [ ] Share test link
  - [ ] Collect feedback
  
- [ ] **Closed Testing** (alpha/beta)
  - [ ] Create alpha or beta track
  - [ ] Upload build
  - [ ] Add tester list
  - [ ] Distribute and test
  
- [ ] **Open Testing** (public beta)
  - [ ] Optional: public beta before production
  - [ ] Set user limit (optional)
  - [ ] Collect user reviews

- [ ] **Production Release**
  - [ ] Promote from testing to production
  - [ ] OR upload new build directly
  - [ ] Set rollout percentage (5% → 20% → 50% → 100%)
  - [ ] Monitor crash reports and reviews

---

### Web/PWA Deployment (Optional)

While the app is designed for native mobile (iOS/Android via Capacitor), a web version or PWA can expand reach:

#### Web Hosting Options
- [ ] Vercel (recommended for Vite apps)
- [ ] Netlify
- [ ] Replit (current development)
- [ ] AWS Amplify
- [ ] Google Cloud Run

#### PWA Configuration
- [ ] Add `manifest.json` with app metadata
- [ ] Configure service worker for offline support
- [ ] Add install prompt
- [ ] Test offline functionality
- [ ] Ensure responsive design (mobile-first)
- [ ] Add "Add to Home Screen" prompt

---

## Launch Strategy & Marketing

### Pre-Launch Preparation (4-6 Weeks Before Launch)

#### 1. Beta Testing Program

**Objectives**:
- Validate core features on real devices
- Identify edge cases and bugs
- Gather user testimonials
- Refine onboarding based on real user behavior

**Beta Testing Plan**:

- [ ] **Recruit Beta Testers** (Target: 50-100 users)
  - [ ] Friends & family (10-20)
  - [ ] Social media followers
  - [ ] Wellness communities (Reddit, Facebook groups)
  - [ ] Early adopters via landing page
  - [ ] Diverse demographics (age, wellness experience, tech savvy)

- [ ] **Set Up Beta Channels**
  - [ ] iOS: TestFlight (link via App Store Connect)
  - [ ] Android: Internal/Closed Testing track (Play Console)
  - [ ] Create onboarding email for beta testers
  - [ ] Set expectations (frequency of updates, how to give feedback)

- [ ] **Feedback Collection**
  - [ ] In-app feedback form (already exists at `/feedback`)
  - [ ] Weekly survey (Google Forms or Typeform)
  - [ ] Beta tester Slack/Discord channel
  - [ ] One-on-one user interviews (5-10 users)
  - [ ] Track metrics: session length, feature usage, retention

- [ ] **Beta Testing Timeline**
  - Week 1: Internal testing (team + close friends)
  - Week 2-3: Closed beta (50 users)
  - Week 4: Open beta (100+ users)
  - Week 5-6: Final polishing based on feedback

---

#### 2. Landing Page & Website

**Purpose**: Convert visitors to waitlist/early access, establish brand presence

- [ ] **Landing Page Elements**
  - [ ] Hero section with value proposition
    - "Your AI Wellness Companion - Energy-Based, Consent-Driven"
  - [ ] Key features showcase (3-5 main benefits)
    - Meal Planning, Meditation, Routines, AI Chat, Calendar
  - [ ] Social proof (beta tester testimonials, if available)
  - [ ] Screenshot carousel (show app in action)
  - [ ] App preview video (30-60 seconds)
  - [ ] Download links (App Store, Google Play badges)
  - [ ] Email capture for waitlist/updates
  - [ ] Footer: Privacy Policy, Terms, Contact, Social links

- [ ] **Technical Setup**
  - [ ] Domain name registration (e.g., fliptheswitch.app, dwai.co)
  - [ ] Hosting (Vercel, Netlify, or similar)
  - [ ] Analytics (Google Analytics, Plausible, or Fathom)
  - [ ] Email capture integration (Mailchimp, ConvertKit, Beehiiv)
  - [ ] SEO optimization (meta tags, Open Graph, schema markup)

---

#### 3. Marketing Assets

- [ ] **Visual Assets**
  - [ ] App icon (finalized, 1024x1024)
  - [ ] Brand colors and logo variants
  - [ ] Social media profile images
  - [ ] App screenshots (iPhone, Android, iPad)
  - [ ] Feature graphics and banners
  - [ ] Video demo or tutorial

- [ ] **Written Content**
  - [ ] Product description (short, medium, long versions)
  - [ ] Value propositions for different audiences:
    - Wellness seekers
    - Busy professionals
    - Mental health advocates
    - Holistic health practitioners
  - [ ] FAQ page
  - [ ] Blog posts (3-5 articles):
    - "Why Energy-Based Wellness Works"
    - "What Makes DW-Ai Different from Other Wellness Apps"
    - "A Day in the Life with DW-Ai"
    - "Consent-Based Design: Our Approach to AI"
  - [ ] Press kit/media kit (for journalists)

- [ ] **Social Media Content**
  - [ ] Create accounts: Instagram, Twitter/X, TikTok, LinkedIn
  - [ ] Content calendar (4 weeks pre-launch)
  - [ ] Post types:
    - Feature highlights (carousel posts)
    - User testimonials (with permission)
    - Behind-the-scenes development
    - Wellness tips (aligned with app philosophy)
    - Countdown to launch
  - [ ] Hashtag strategy: #WellnessAI #SelfCare #MindfulLiving #DigitalWellness

---

### Launch Strategy

#### Soft Launch (Recommended)

**Benefits**: Test at scale, gather reviews, iterate before major marketing push

- [ ] **Phase 1: Limited Geographic Launch** (Week 1-2)
  - Launch in 1-2 countries first (e.g., US, Canada)
  - Monitor crash reports and reviews
  - Quick iteration on critical bugs
  - Target: 100-500 users

- [ ] **Phase 2: Broader Release** (Week 3-4)
  - Expand to more countries
  - Increase marketing efforts
  - Target: 1,000-5,000 users

- [ ] **Phase 3: Full Global Launch** (Week 5+)
  - All countries/regions
  - Major marketing campaign
  - Press outreach
  - Target: 10,000+ users in first month

---

#### Launch Day Tactics

- [ ] **App Store Optimization (ASO)**
  - [ ] Finalize keywords (100 chars, iOS; unlimited in description, Android)
  - [ ] A/B test app icon (if tools available)
  - [ ] Monitor keyword rankings
  - [ ] Encourage 5-star reviews (non-intrusive in-app prompt after positive interactions)

- [ ] **Press & Media Outreach**
  - [ ] Compile media list (wellness blogs, tech publications, podcasts)
    - TechCrunch, Product Hunt, Indie Hackers
    - Mindful.org, Healthline, Well+Good
    - The Hustle, Morning Brew newsletters
  - [ ] Create press release
  - [ ] Reach out to journalists (personalized pitches)
  - [ ] Offer exclusive early access for reviews

- [ ] **Product Hunt Launch**
  - [ ] Schedule launch on Tuesday-Thursday (best days)
  - [ ] Prepare assets (tagline, gallery, video)
  - [ ] Engage in comments throughout the day
  - [ ] Ask beta testers to upvote and review

- [ ] **Community Engagement**
  - [ ] Post in relevant subreddits (r/getdisciplined, r/productivity, r/wellness)
  - [ ] Share in wellness Facebook groups
  - [ ] Engage on Twitter/X with #buildinpublic
  - [ ] LinkedIn post for professional audience

- [ ] **Email Launch Campaign**
  - [ ] Send to waitlist/beta testers
  - [ ] Announce availability
  - [ ] Include download links
  - [ ] Share what's new/improved since beta
  - [ ] Thank early supporters

- [ ] **Influencer Partnerships** (if budget allows)
  - [ ] Identify micro-influencers (10k-100k followers) in wellness space
  - [ ] Offer free access in exchange for honest review
  - [ ] Provide talking points (energy-based, consent-driven)
  - [ ] Track referral codes for attribution

---

### Post-Launch Growth

#### Week 1-4 Post-Launch

- [ ] **Monitor & Respond**
  - [ ] Check app store reviews daily
  - [ ] Respond to reviews (positive and negative)
  - [ ] Monitor crash reports (Sentry, Crashlytics)
  - [ ] Track analytics: DAU, retention, session length
  - [ ] Engage on social media

- [ ] **Iterate Quickly**
  - [ ] Release bug fix update within week 1 if needed
  - [ ] Address critical user feedback
  - [ ] Improve onboarding if drop-off is high
  - [ ] A/B test key features

- [ ] **Content Marketing**
  - [ ] Publish blog posts (weekly)
  - [ ] Share user success stories (with permission)
  - [ ] Educational content on wellness dimensions
  - [ ] Video tutorials on YouTube

---

#### Month 2-3: Retention & Referrals

- [ ] **Retention Strategies**
  - [ ] Personalized push notifications (if user opts-in)
    - "Morning check-in" reminders
    - "Routine ready" notifications
    - Weekly wellness summary
  - [ ] Email sequences for inactive users
  - [ ] In-app nudges (non-intrusive, consent-based)

- [ ] **Referral Program** (Optional)
  - [ ] Design referral incentive (ethical, non-manipulative)
    - Example: "Invite a friend, both get 1 month extended history"
  - [ ] Add referral feature in app
  - [ ] Track referral attribution

- [ ] **Community Building**
  - [ ] Create private community (Discord, Circle, or in-app)
  - [ ] Host live Q&A sessions
  - [ ] Share user-generated content
  - [ ] Run challenges or wellness events

---

#### Month 4-6: Scale & Monetization

- [ ] **Paid Acquisition** (if metrics support it)
  - [ ] Test Facebook/Instagram ads
  - [ ] Google Ads (search: "wellness app", "meditation app")
  - [ ] TikTok ads (if targeting younger demographic)
  - [ ] Monitor CAC (Customer Acquisition Cost) vs LTV (Lifetime Value)

- [ ] **Monetization Launch** (if planned)
  - [ ] Release premium features (per ETHICAL_MONETIZATION.md)
  - [ ] Communicate value clearly
  - [ ] Offer free trial (7-14 days)
  - [ ] Monitor conversion rate
  - [ ] A/B test pricing tiers

- [ ] **Partnerships**
  - [ ] Wellness brands (meditation apps, fitness companies)
  - [ ] Health insurance providers (if applicable)
  - [ ] Corporate wellness programs (B2B opportunity)
  - [ ] Mental health organizations

---

## Timeline & Milestones

### Q1 2026 (January - March)

**Goal**: Complete critical features and prepare for app store submission

| Week | Milestone | Deliverables |
|------|-----------|--------------|
| **Week 1-2** | **Complete Workout Feature** | Workout library (20+ workouts), player, scheduling |
| **Week 3-4** | **Implement Analytics** | Wave 7 analytics, Life Dashboard insights |
| **Week 5-6** | **Mobile Responsiveness** | Test & fix all 45 pages on mobile devices |
| **Week 7-8** | **iOS Build Preparation** | Certificates, assets, TestFlight setup |
| **Week 9-10** | **Android Build Preparation** | Signing, assets, Play Console setup |
| **Week 11-12** | **App Store Listings** | Write copy, prepare screenshots, submit for review |

**Key Milestones**:
- ✅ **End of January**: Workout feature complete
- ✅ **End of February**: Analytics live, mobile responsive
- ✅ **End of March**: Apps submitted to App Store and Play Store

---

### Q2 2026 (April - June)

**Goal**: Launch app and establish user base

| Month | Milestone | Deliverables |
|-------|-----------|--------------|
| **April** | **Beta Testing** | TestFlight & Play Store internal testing, 50-100 beta users |
| **May** | **Launch Preparation** | Landing page, marketing assets, press kit, social media |
| **June** | **Public Launch** | Soft launch → full launch, press outreach, Product Hunt |

**Key Milestones**:
- ✅ **Mid-April**: Beta testing begins
- ✅ **End of May**: All launch assets ready
- ✅ **June 1-15**: Public launch

**Success Metrics**:
- 1,000+ downloads in first month
- 4.0+ star rating on App Store and Play Store
- 30%+ D7 retention rate
- 50+ reviews

---

### Q3 2026 (July - September)

**Goal**: Iterate based on user feedback and grow user base

| Month | Focus | Activities |
|-------|-------|-----------|
| **July** | **Retention & Engagement** | Push notifications, email campaigns, content marketing |
| **August** | **Feature Iteration** | Address top user requests, improve onboarding |
| **September** | **Community Building** | Launch community features, referral program |

**Key Milestones**:
- ✅ **End of July**: 5,000+ active users
- ✅ **End of August**: Onboarding conversion improved by 20%
- ✅ **End of September**: Community launched, 500+ members

---

### Q4 2026 (October - December)

**Goal**: Scale and prepare for monetization

| Month | Focus | Activities |
|-------|-------|-----------|
| **October** | **Wave 7 Completion** | Data origin labels, transparency features, My Life System overview |
| **November** | **Premium Features** | Develop and test monetization features (ethical approach) |
| **December** | **Monetization Launch** | Release premium tier, partnerships, year-end review |

**Key Milestones**:
- ✅ **End of October**: Wave 7 features live
- ✅ **End of November**: Premium features in beta testing
- ✅ **End of December**: 10,000+ active users, monetization launched

**Year-End Goals**:
- 10,000-20,000 active users
- 4.5+ star rating maintained
- Sustainable revenue model (if monetized)
- Community of engaged users
- Foundation for Wave 8+ features

---

## Appendix: Resources & References

### Internal Documentation
- `README.md` - Project overview and getting started
- `DWAI_MASTER_SPEC.md` - Product specification and architecture
- `QA_CHECKLIST.md` - Wave 6 QA checklist (completed)
- `design_guidelines.md` - Design system and visual guidelines
- `PRIVACY.md` - Privacy policy
- `TERMS.md` - Terms of service
- `APP_STORE_REVIEWER_NOTES.md` - App store reviewer guidance
- `ETHICAL_MONETIZATION.md` - Monetization principles
- `docs/WAVE_7_ROADMAP.md` - Wave 7 feature roadmap
- `docs/specs/SPEC_*.md` - Detailed specifications (11 specs)

### External Resources

#### App Store Submission
- [Apple App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Developer Policy](https://play.google.com/about/developer-content-policy/)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design (Android)](https://material.io/design)

#### Testing & Distribution
- [TestFlight Documentation](https://developer.apple.com/testflight/)
- [Google Play Testing Tracks](https://support.google.com/googleplay/android-developer/answer/9845334)
- [Capacitor iOS Guide](https://capacitorjs.com/docs/ios)
- [Capacitor Android Guide](https://capacitorjs.com/docs/android)

#### Marketing & Growth
- [App Store Optimization Guide](https://www.apptamin.com/blog/app-store-optimization-guide/)
- [Product Hunt Launch Guide](https://blog.producthunt.com/how-to-launch-on-product-hunt-7756982d2856)
- [Mobile App Marketing Resources](https://www.apptamin.com/)

---

## Conclusion

DW-Ai / Flip the Switch is well-positioned for a successful launch. With a strong technical foundation, ethical design principles, and comprehensive feature set, the app addresses a genuine need in the wellness space.

### Critical Path to Launch
1. **Complete Workout Feature** (4-6 weeks)
2. **Implement Analytics** (2-3 weeks)
3. **Mobile Responsiveness Audit** (2 weeks)
4. **Build & Submit to App Stores** (3-4 weeks)
5. **Beta Testing** (4-6 weeks)
6. **Public Launch** (phased approach)

### Success Factors
✅ **Ethical Design**: Consent-based, no dark patterns  
✅ **Comprehensive Features**: 45+ screens, 13 wellness dimensions  
✅ **Quality Assurance**: Wave 6 QA passed  
✅ **Clear Roadmap**: Wave 7+ features planned  
✅ **Technical Excellence**: Modern stack, scalable architecture  

### Risks to Mitigate
⚠️ **Incomplete Features**: Complete Workout and Analytics before launch  
⚠️ **App Store Rejection**: Thorough review of guidelines, clear disclaimers  
⚠️ **Low Initial Traction**: Strong beta testing and soft launch strategy  
⚠️ **User Retention**: Focus on onboarding experience and quick wins  

**Recommended Next Steps**:
1. Review this roadmap with stakeholders
2. Prioritize Q1 2026 critical features
3. Begin iOS/Android build preparations
4. Set up beta testing infrastructure
5. Start marketing asset creation

This roadmap is a living document and should be updated quarterly as priorities shift and new insights emerge from user feedback.

---

**Document Prepared By**: GitHub Copilot  
**Last Updated**: January 22, 2026  
**Next Review**: April 2026 (post-launch)
