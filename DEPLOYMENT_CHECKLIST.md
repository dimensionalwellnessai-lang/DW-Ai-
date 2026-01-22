# DW-Ai Platform Deployment Checklist

**Version**: 1.0  
**Last Updated**: January 22, 2026  
**App Version**: 0.1.0-beta → 1.0.0

> This checklist accompanies the [COMPREHENSIVE_ROADMAP.md](./COMPREHENSIVE_ROADMAP.md) document. Use it to track progress toward app store deployment.

---

## Quick Reference Status Legend
- [ ] Not Started
- [x] Completed
- [~] In Progress
- [!] Blocked/Needs Attention

---

## Phase 1: Pre-Launch Critical (Q1 2026)

### A. Feature Completion

#### Workout Planning (HIGH PRIORITY)
- [ ] Design workout library schema
- [ ] Create 20+ starter workouts
- [ ] Implement filters (home/gym, equipment, body parts, duration)
- [ ] Build workout player UI
- [ ] Add timer/sets/reps tracking
- [ ] Integrate workout scheduling with calendar
- [ ] Enable save to projects/plans
- [ ] Add recovery day suggestions
- [ ] Test workout flow end-to-end
- [ ] Update navigation to enable `/workout` route
- [ ] QA test on iOS and Android

**Owner**: _________  
**Due Date**: _________  
**Status**: Not Started

---

#### Analytics Implementation (MEDIUM PRIORITY)
- [ ] Review SPEC_09_ANALYTICS.md requirements
- [ ] Set up analytics infrastructure
- [ ] Add event tracking to key user actions
- [ ] Create Life Dashboard insights component
- [ ] Build Weekly Balance summary view
- [ ] Implement pattern recognition ("better on workout days")
- [ ] Add dimension coverage visualization
- [ ] Test analytics data collection
- [ ] Verify privacy compliance (no PII tracking)
- [ ] QA test insights accuracy

**Owner**: _________  
**Due Date**: _________  
**Status**: Not Started

---

#### Mobile Responsiveness Audit
- [ ] Test all 45 pages on iPhone (12, 13, 14)
- [ ] Test all 45 pages on Android (Pixel, Samsung)
- [ ] Test on iPad and Android tablets
- [ ] Fix layout breaks on small screens (<375px width)
- [ ] Ensure touch targets are 44px+ (accessibility)
- [ ] Test hamburger menu on all devices
- [ ] Validate form inputs on mobile keyboards
- [ ] Test landscape orientation
- [ ] Verify gesture controls (swipe, pinch)
- [ ] Performance test on older devices

**Owner**: _________  
**Due Date**: _________  
**Status**: Not Started

---

### B. Platform Compliance & Legal

#### Privacy & Legal Documents
- [ ] Review PRIVACY.md for completeness
- [ ] Update PRIVACY.md with any new data practices
- [ ] Review TERMS.md for completeness
- [ ] Host PRIVACY.md and TERMS.md on public URL
- [ ] Add privacy policy link to app footer
- [ ] Add terms of service link to app footer
- [ ] Create "About" page with legal links
- [ ] Add health disclaimers to relevant pages
- [ ] Review all copy for medical claims (none allowed)
- [ ] Legal review (if budget allows)

**Owner**: _________  
**Due Date**: _________  
**Status**: Not Started

---

#### App Store (iOS) Requirements
- [ ] Review [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [ ] Ensure no violations of health/medical guidelines (2.5, 5.1)
- [ ] Verify AI features comply (5.1 - not therapy)
- [ ] Add required disclaimers to app
- [ ] Prepare test account for reviewers
- [ ] Complete APP_STORE_REVIEWER_NOTES.md
- [ ] Screenshot all key features for reviewer notes
- [ ] Document crisis detection (Talk It Out)
- [ ] Explain consent-based design approach

**Owner**: _________  
**Due Date**: _________  
**Status**: Not Started

---

#### Google Play Requirements
- [ ] Review [Google Play Developer Policy](https://play.google.com/about/developer-content-policy/)
- [ ] Ensure compliance with health policy
- [ ] Verify no misleading health claims
- [ ] Prepare Data Safety responses
- [ ] Complete Content Rating (IARC)
- [ ] Set up test account
- [ ] Document all data collection practices

**Owner**: _________  
**Due Date**: _________  
**Status**: Not Started

---

### C. Performance & Stability

#### Performance Optimization
- [ ] Audit bundle size (target: <500KB initial)
  - Current size: _________
  - Tools used: Vite build analysis
- [ ] Implement code splitting for routes
- [ ] Optimize images (convert to WebP, lazy loading)
- [ ] Add service worker for offline support
- [ ] Test on 3G/slow connections
- [ ] Measure Time to Interactive (TTI) - target: <3s
- [ ] Measure First Contentful Paint (FCP) - target: <1.5s
- [ ] Optimize database queries (slow query log)
- [ ] Reduce initial render time
- [ ] Test on low-end devices

**Owner**: _________  
**Due Date**: _________  
**Status**: Not Started

---

#### Stability & Error Handling
- [ ] Test all error states (network failures)
- [ ] Test API error responses (500, 404, etc.)
- [ ] Implement React error boundaries for all routes
- [ ] Add retry mechanisms for failed requests
- [ ] Test offline mode behavior
- [ ] Add user-friendly error messages
- [ ] Set up crash reporting (Sentry, Crashlytics)
- [ ] Test session expiration handling
- [ ] Test password reset flow errors
- [ ] Test guest mode → authenticated mode transition

**Owner**: _________  
**Due Date**: _________  
**Status**: Not Started

---

### D. Testing

#### Manual Testing Checklist
- [ ] **Onboarding Flow**
  - [ ] Guest mode onboarding
  - [ ] Sign up flow
  - [ ] Login flow
  - [ ] Password reset flow
  - [ ] Mood check-in
  - [ ] Quick setup
  
- [ ] **Core Features**
  - [ ] AI Chat (send/receive messages)
  - [ ] Today Hub (view schedule)
  - [ ] Calendar (create/edit/delete events)
  - [ ] Meal planning (select meals, shopping list)
  - [ ] Meditation (browse, save, schedule)
  - [ ] Workouts (once completed)
  - [ ] Challenges (browse, add to plan)
  - [ ] Routines (create, play)
  - [ ] Journal (create entries)
  - [ ] Mood tracking
  - [ ] Talk It Out (crisis detection)
  
- [ ] **Data Persistence**
  - [ ] Guest mode (localStorage)
  - [ ] Authenticated mode (PostgreSQL)
  - [ ] Session persistence (refresh page)
  - [ ] Logout and re-login
  
- [ ] **Device Testing**
  - [ ] iPhone 12 (iOS 16+)
  - [ ] iPhone 14 Pro (iOS 17+)
  - [ ] iPad Air
  - [ ] Google Pixel 6
  - [ ] Samsung Galaxy S21
  - [ ] Android tablet

**Owner**: _________  
**Due Date**: _________  
**Status**: Not Started

---

#### Automated Testing (Optional)
- [ ] Set up E2E testing framework (Playwright, Cypress)
- [ ] Write E2E tests for critical flows:
  - [ ] Onboarding
  - [ ] Login/logout
  - [ ] AI chat
  - [ ] Calendar event creation
- [ ] Unit tests for AI safety checks
- [ ] Integration tests for database operations
- [ ] Visual regression tests (Percy, Chromatic)
- [ ] Set up CI/CD pipeline for tests

**Owner**: _________  
**Due Date**: _________  
**Status**: Not Started

---

### E. Build & Deployment

#### iOS Build & Deployment

**Apple Developer Account**
- [ ] Create/access Apple Developer account
- [ ] Pay $99/year fee
- [ ] Add team members (if applicable)
- [ ] Enroll in Apple Developer Program
- [ ] Verify account and payment

**App Store Connect Setup**
- [ ] Create new app in App Store Connect
- [ ] Set bundle ID: `com.reilbrown.fliptheswitch`
- [ ] Choose app name (check availability)
- [ ] Select category: Health & Fitness
- [ ] Set primary language: English
- [ ] Choose pricing: Free

**Certificates & Provisioning**
- [ ] Generate iOS Distribution Certificate
- [ ] Create App Store Provisioning Profile
- [ ] Download and install in Xcode
- [ ] Configure signing in Xcode project
- [ ] Enable capabilities (if needed):
  - [ ] Push Notifications
  - [ ] Background Modes
  - [ ] HealthKit (if integrating)

**App Assets**
- [ ] Generate app icon (1024x1024 + all sizes)
  - [ ] 20pt, 29pt, 40pt, 60pt, 76pt, 83.5pt (@1x, @2x, @3x)
- [ ] Create launch screen
- [ ] Design splash screen
- [ ] Prepare App Store screenshots:
  - [ ] 6.7" display (iPhone 14 Pro Max)
  - [ ] 6.5" display (iPhone 11 Pro Max)
  - [ ] 5.5" display (iPhone 8 Plus)
  - [ ] 12.9" iPad Pro (if iPad support)
- [ ] Record app preview video (15-30 seconds)

**App Store Listing**
- [ ] App Name: _________________________ (30 chars max)
- [ ] Subtitle: _________________________ (30 chars max)
- [ ] Description (4000 chars max) - WRITTEN: [ ]
- [ ] Keywords (100 chars) - WRITTEN: [ ]
- [ ] Support URL: _________________________
- [ ] Marketing URL: _________________________
- [ ] Privacy Policy URL: _________________________

**Build & Submit**
- [ ] Run `npm run build` and test locally
- [ ] Sync Capacitor: `npx cap sync ios`
- [ ] Open Xcode: `npx cap open ios`
- [ ] Archive build in Xcode
- [ ] Validate build (Xcode Organizer)
- [ ] Upload to App Store Connect
- [ ] Complete App Store listing
- [ ] Submit for review
- [ ] Monitor review status

**TestFlight Beta (Recommended)**
- [ ] Configure TestFlight in App Store Connect
- [ ] Add internal testers (up to 100)
- [ ] Add external testers (up to 10,000)
- [ ] Distribute beta build
- [ ] Collect feedback
- [ ] Iterate based on feedback
- [ ] Final build after beta testing

**Owner**: _________  
**Due Date**: _________  
**Status**: Not Started

---

#### Android Build & Deployment

**Google Play Console Setup**
- [ ] Create Google Play Developer account
- [ ] Pay $25 one-time fee
- [ ] Verify account and payment
- [ ] Set up merchant account (if monetizing)
- [ ] Create new app in Play Console
- [ ] Choose app name
- [ ] Select default language: English
- [ ] Set app type: App
- [ ] Choose: Free

**App Configuration**
- [ ] Update `android/app/build.gradle`:
  - [ ] Set `applicationId`
  - [ ] Set `versionCode` (start at 1)
  - [ ] Set `versionName` (e.g., "1.0.0")
  - [ ] Configure `minSdkVersion` (21+)
  - [ ] Set `targetSdkVersion` (33+)
- [ ] Configure permissions in AndroidManifest.xml

**App Signing**
- [ ] Generate upload keystore
- [ ] Store keystore securely (NEVER commit)
- [ ] Create `key.properties` file
- [ ] Add `key.properties` to `.gitignore`
- [ ] Configure signing in `build.gradle`
- [ ] Test release build: `./gradlew bundleRelease`

**App Assets**
- [ ] Generate launcher icons (all densities):
  - [ ] mdpi: 48x48, hdpi: 72x72, xhdpi: 96x96
  - [ ] xxhdpi: 144x144, xxxhdpi: 192x192
  - [ ] Play Store: 512x512 (PNG)
- [ ] Create adaptive icon (foreground + background)
- [ ] Design feature graphic (1024x500)
- [ ] Prepare screenshots:
  - [ ] Phone: minimum 2, up to 8
  - [ ] 7" tablet: minimum 2 (optional)
  - [ ] 10" tablet: minimum 2 (optional)

**Play Store Listing**
- [ ] App name (50 chars max): _________________________
- [ ] Short description (80 chars max): _________________________
- [ ] Full description (4000 chars max) - WRITTEN: [ ]
- [ ] Categorization:
  - [ ] App category: Health & Fitness
  - [ ] Tags: wellness, meditation, AI
- [ ] Contact details:
  - [ ] Email: _________________________
  - [ ] Website: _________________________
  - [ ] Privacy Policy URL: _________________________

**Content Rating**
- [ ] Complete IARC questionnaire
- [ ] Answer questions about content
- [ ] Receive rating certificate
- [ ] Apply ratings to app

**Data Safety Section**
- [ ] Complete Data Safety form:
  - [ ] List data collected
  - [ ] Confirm no third-party sharing
  - [ ] Confirm encryption in transit
  - [ ] Confirm user can request deletion
  - [ ] Confirm optional data collection

**Build & Release**
- [ ] Build Android App Bundle (AAB):
  - `npx cap sync android`
  - `cd android && ./gradlew bundleRelease`
- [ ] Locate AAB: `android/app/build/outputs/bundle/release/`
- [ ] Upload to Play Console (Internal testing first)
- [ ] Configure release
- [ ] Submit for review

**Testing Tracks**
- [ ] Internal Testing (up to 100 testers)
- [ ] Closed Testing (alpha/beta)
- [ ] Open Testing (public beta, optional)
- [ ] Production Release (phased rollout)

**Owner**: _________  
**Due Date**: _________  
**Status**: Not Started

---

## Phase 2: Beta Testing (4-6 Weeks)

### Beta Recruitment
- [ ] Define target beta tester profile
- [ ] Set beta tester goal: _______ users
- [ ] Recruit friends & family (10-20)
- [ ] Post in social media
- [ ] Post in wellness communities
- [ ] Create waitlist on landing page
- [ ] Send beta invitations

**Owner**: _________  
**Due Date**: _________  
**Status**: Not Started

---

### Beta Setup
- [ ] Configure TestFlight (iOS)
- [ ] Configure Internal Testing (Android)
- [ ] Create onboarding email for beta testers
- [ ] Set up feedback channels:
  - [ ] In-app feedback form
  - [ ] Survey (Google Forms/Typeform)
  - [ ] Discord/Slack channel
- [ ] Schedule one-on-one interviews (5-10 users)

**Owner**: _________  
**Due Date**: _________  
**Status**: Not Started

---

### Beta Metrics Tracking
- [ ] Set up analytics (if not already done)
- [ ] Track: DAU, session length, retention
- [ ] Track: feature usage (which features used most)
- [ ] Track: onboarding completion rate
- [ ] Track: crash rate
- [ ] Collect qualitative feedback
- [ ] Identify top 5 issues
- [ ] Prioritize fixes

**Owner**: _________  
**Due Date**: _________  
**Status**: Not Started

---

## Phase 3: Launch Preparation (4-6 Weeks)

### Landing Page & Website
- [ ] Register domain name: _________________________
- [ ] Choose hosting (Vercel, Netlify)
- [ ] Design landing page
- [ ] Write copy (hero, features, testimonials)
- [ ] Create screenshot carousel
- [ ] Record app demo video (30-60s)
- [ ] Add download badges (App Store, Google Play)
- [ ] Set up email capture (Mailchimp, ConvertKit)
- [ ] Add analytics (Google Analytics, Plausible)
- [ ] SEO optimization (meta tags, Open Graph)
- [ ] Create FAQ page
- [ ] Link to Privacy Policy and Terms
- [ ] Launch landing page

**Owner**: _________  
**Due Date**: _________  
**Status**: Not Started

---

### Marketing Assets
- [ ] Finalize app icon (1024x1024)
- [ ] Create logo variants (full, icon, wordmark)
- [ ] Define brand colors
- [ ] Design social media profile images
- [ ] Create feature graphics and banners
- [ ] Record video demo or tutorial
- [ ] Write product descriptions (short, medium, long)
- [ ] Create FAQ content
- [ ] Write blog posts (3-5):
  - [ ] "Why Energy-Based Wellness Works"
  - [ ] "What Makes DW-Ai Different"
  - [ ] "A Day in the Life with DW-Ai"
  - [ ] "Consent-Based Design: Our Approach"
  - [ ] _________________________
- [ ] Create press kit/media kit

**Owner**: _________  
**Due Date**: _________  
**Status**: Not Started

---

### Social Media Setup
- [ ] Create Instagram account
- [ ] Create Twitter/X account
- [ ] Create TikTok account (optional)
- [ ] Create LinkedIn page
- [ ] Create Facebook page (optional)
- [ ] Design profile images and cover photos
- [ ] Create content calendar (4 weeks pre-launch)
- [ ] Schedule posts:
  - [ ] Feature highlights
  - [ ] User testimonials
  - [ ] Behind-the-scenes
  - [ ] Wellness tips
  - [ ] Countdown to launch
- [ ] Define hashtag strategy
- [ ] Engage with wellness communities

**Owner**: _________  
**Due Date**: _________  
**Status**: Not Started

---

### Press & Media Outreach
- [ ] Compile media list (50+ contacts):
  - [ ] Tech publications (TechCrunch, The Verge)
  - [ ] Wellness blogs (Mindful.org, Healthline)
  - [ ] Podcasts
  - [ ] Newsletters
- [ ] Write press release
- [ ] Create personalized pitches
- [ ] Reach out 2-3 weeks before launch
- [ ] Offer exclusive early access for reviews
- [ ] Follow up on pitches

**Owner**: _________  
**Due Date**: _________  
**Status**: Not Started

---

## Phase 4: Launch (Week of Launch)

### Pre-Launch (T-7 Days)
- [ ] Final QA testing on production builds
- [ ] Double-check app store listings
- [ ] Verify privacy policy and terms links work
- [ ] Test all download links
- [ ] Prepare social media posts
- [ ] Notify beta testers of public launch
- [ ] Send email to waitlist: "Launching soon!"
- [ ] Schedule Product Hunt launch

**Owner**: _________  
**Due Date**: _________  
**Status**: Not Started

---

### Launch Day
- [ ] Apps go live on App Store and Google Play
- [ ] Post launch announcement on social media
- [ ] Send email to waitlist: "We're live!"
- [ ] Launch on Product Hunt
  - [ ] Post at 12:01am PST
  - [ ] Engage in comments all day
  - [ ] Ask beta testers to upvote
- [ ] Post in relevant communities:
  - [ ] Reddit (r/getdisciplined, r/productivity)
  - [ ] Facebook groups
  - [ ] Twitter/X (#buildinpublic)
  - [ ] LinkedIn
- [ ] Reach out to press contacts: "We launched!"
- [ ] Monitor app store reviews
- [ ] Respond to comments and questions
- [ ] Track analytics: downloads, DAU, reviews

**Owner**: _________  
**Due Date**: _________  
**Status**: Not Started

---

### Post-Launch (T+1 to T+7 Days)
- [ ] Check app store reviews daily
- [ ] Respond to ALL reviews (positive and negative)
- [ ] Monitor crash reports
- [ ] Track analytics daily
- [ ] Post daily on social media
- [ ] Engage with users who mention the app
- [ ] Release bug fix update if critical issues found
- [ ] Thank beta testers publicly
- [ ] Share early metrics (if positive)
- [ ] Continue press outreach

**Owner**: _________  
**Due Date**: _________  
**Status**: Not Started

---

## Phase 5: Post-Launch Growth (Month 2-3)

### Retention Strategies
- [ ] Implement push notifications (opt-in)
- [ ] Create email sequences for inactive users
- [ ] Add in-app nudges (non-intrusive)
- [ ] Monitor retention metrics (D1, D7, D30)
- [ ] Identify drop-off points
- [ ] A/B test onboarding improvements
- [ ] Run user surveys (monthly)

**Owner**: _________  
**Due Date**: _________  
**Status**: Not Started

---

### Content Marketing
- [ ] Publish blog posts (weekly)
- [ ] Share user success stories
- [ ] Create educational content on wellness
- [ ] Record YouTube tutorials
- [ ] Guest posts on wellness blogs
- [ ] Podcast appearances
- [ ] Webinars or live Q&A sessions

**Owner**: _________  
**Due Date**: _________  
**Status**: Not Started

---

### Community Building
- [ ] Create private community (Discord, Circle)
- [ ] Host live Q&A sessions (monthly)
- [ ] Share user-generated content
- [ ] Run wellness challenges
- [ ] Feature "User of the Month"
- [ ] Implement referral program (optional, ethical)

**Owner**: _________  
**Due Date**: _________  
**Status**: Not Started

---

## Success Metrics

### Launch Goals (First Month)
- [ ] **Downloads**: 1,000+ downloads
- [ ] **Rating**: 4.0+ stars on both App Store and Play Store
- [ ] **Reviews**: 50+ reviews
- [ ] **Retention**: 30%+ D7 retention rate
- [ ] **Engagement**: Average 3+ sessions per user per week
- [ ] **Crash-Free Rate**: 99%+ crash-free sessions

### Growth Goals (Month 2-3)
- [ ] **Active Users**: 5,000+ MAU (Monthly Active Users)
- [ ] **Rating**: 4.5+ stars maintained
- [ ] **Retention**: 40%+ D30 retention rate
- [ ] **Feature Usage**: 70%+ users try AI chat, 50%+ try meal planning
- [ ] **Referrals**: 10%+ of users refer a friend

### Long-Term Goals (6 Months)
- [ ] **Active Users**: 10,000-20,000 MAU
- [ ] **Rating**: 4.5+ stars maintained
- [ ] **Retention**: 50%+ D30 retention rate
- [ ] **Community**: 500+ active community members
- [ ] **Revenue**: (if monetized) $X,XXX MRR

---

## Notes & Action Items

### Blockers & Risks
_Document any blockers or risks here_

1. 
2. 
3. 

### Questions for Team
_Document any open questions_

1. 
2. 
3. 

### Decisions Made
_Record key decisions and rationale_

| Date | Decision | Rationale | Decided By |
|------|----------|-----------|------------|
|      |          |           |            |

---

## Appendix: Quick Commands

### Build Commands
```bash
# Development
npm run dev

# Production build
npm run build

# Database push
npm run db:push

# iOS build
npx cap sync ios
npx cap open ios

# Android build
npx cap sync android
cd android && ./gradlew bundleRelease
```

### Testing Commands
```bash
# Run tests (if configured)
npm test

# Type check
npm run check

# Lint
npm run lint
```

---

**Document Owner**: _________________________  
**Last Review Date**: _________________________  
**Next Review Date**: _________________________
