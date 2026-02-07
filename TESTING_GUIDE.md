# Navigation & UX Testing Guide

## Prerequisites
Before testing, ensure:
- ✅ Database is provisioned (DATABASE_URL set)
- ✅ Dev server is running (`npm run dev`)
- ✅ Feature flags are enabled in `client/src/config/featureFlags.ts`

## Manual Testing Checklist

### 1. Time-Based Navigation (Critical)
Test the hamburger menu changes based on time of day:

**Morning (6am-11am)**
- [ ] Click hamburger menu button
- [ ] Verify "🌅 Good Morning" greeting appears
- [ ] Check suggested actions:
  - [ ] Morning Routine
  - [ ] Today's Workout
  - [ ] Breakfast Plan
  - [ ] Today's Schedule
- [ ] Verify all actions are clickable

**Afternoon (11am-5pm)**
- [ ] Open menu
- [ ] Verify "☀️ Good Afternoon" greeting
- [ ] Check suggested actions:
  - [ ] Lunch Plan
  - [ ] Midday Check-in
  - [ ] Review Progress
  - [ ] Quick Journal

**Evening (5pm-10pm)**
- [ ] Open menu
- [ ] Verify "🌆 Good Evening" greeting
- [ ] Check suggested actions:
  - [ ] Dinner Plan
  - [ ] Evening Reflection
  - [ ] Review Today
  - [ ] Wind Down Routine

**Night (10pm-6am)**
- [ ] Open menu
- [ ] Verify "🌙 Good Night" greeting
- [ ] Check suggested actions:
  - [ ] Sleep Preparation
  - [ ] Journal Entry
  - [ ] Tomorrow Planning
  - [ ] Bedtime Routine

### 2. All Features View (Critical)
- [ ] Open hamburger menu
- [ ] Click "All Features" button
- [ ] Verify drawer opens with search bar
- [ ] Test search functionality:
  - [ ] Type "workout" - should filter to workout-related features
  - [ ] Type "journal" - should filter to journal feature
  - [ ] Type gibberish - should show "No features found" message
  - [ ] Clear search - should show all features again

**Category Organization**
- [ ] Verify "Most Used" section appears (may be empty for new users)
- [ ] Scroll down and verify all categories are present:
  - [ ] 📋 Planning & Organizing
  - [ ] 💪 Health & Fitness
  - [ ] 🧘 Wellness
  - [ ] 💰 Financial
  - [ ] 📊 Insights & Tracking
  - [ ] 🔧 Settings & Tools
- [ ] Verify scroll indicator (↓ arrow) appears if content is scrollable
- [ ] Click any feature tile - should navigate to that feature
- [ ] Verify X button closes the drawer

### 3. AI Learning & Personalization
**Initial State**
- [ ] Open All Features view
- [ ] "Most Used" section should be empty or hidden

**After Using Features**
- [ ] Navigate to Workout page
- [ ] Return to home
- [ ] Navigate to Meal Prep page
- [ ] Return to home
- [ ] Navigate to Journal page
- [ ] Return to home
- [ ] Open All Features view
- [ ] Verify "Most Used" section now shows used features

**Persistence**
- [ ] Close the app/browser
- [ ] Reopen the app
- [ ] Check All Features view
- [ ] "Most Used" should still show previously used features

### 4. Warning Banners
**Setup Incomplete**
- [ ] Open hamburger menu
- [ ] If onboarding incomplete, verify banner shows:
  - ⚠️ "Complete Your Setup - X% done"
  - [Resume] button
- [ ] Click Resume button
- [ ] Should navigate to onboarding

**Banner Dismissal**
- [ ] If banner has dismiss button (X), click it
- [ ] Banner should disappear
- [ ] Reopen menu - banner should not reappear (if dismissible)

### 5. Core Navigation
**Menu Items**
- [ ] Verify "Home" button works
- [ ] Verify "Today" button works
- [ ] Verify "Talk to DW" button works
- [ ] Verify "Settings" button (in footer) works
- [ ] Verify "My Progress" button (if logged in) works

**Back Button**
- [ ] Navigate to a feature page
- [ ] Click back button (top-left)
- [ ] Should return to previous page

**Menu Close**
- [ ] Open hamburger menu
- [ ] Click outside drawer (on backdrop)
- [ ] Menu should close
- [ ] Verify swipe down also closes menu (mobile)

### 6. Dark Mode Compatibility
- [ ] Toggle dark mode in system/app settings
- [ ] Verify all components render correctly:
  - [ ] Menu background is dark
  - [ ] Text is readable (light color)
  - [ ] Icons are visible
  - [ ] Suggested action buttons have good contrast
  - [ ] Warning banners are visible
  - [ ] Feature tiles are readable

### 7. Mobile Responsiveness
**Touch Targets**
- [ ] All buttons should be at least 44x44px
- [ ] Easy to tap without misclicks
- [ ] No overlapping tap areas

**Swipe Gestures**
- [ ] Swipe down on hamburger menu to close
- [ ] Swipe down on All Features view to close
- [ ] Swipe should feel smooth and natural

**Safe Areas**
- [ ] Menu doesn't overlap with notch (iPhone X+)
- [ ] Menu doesn't overlap with bottom gesture area
- [ ] Content is visible within safe boundaries

### 8. Feature Flags
**Toggle NEW_NAVIGATION to false**
- [ ] Edit `client/src/config/featureFlags.ts`
- [ ] Set `NEW_NAVIGATION: false`
- [ ] Restart dev server
- [ ] Click hamburger menu
- [ ] Should see old menu (legacy implementation)
- [ ] Verify old menu still works

**Toggle back to true**
- [ ] Set `NEW_NAVIGATION: true`
- [ ] Restart dev server
- [ ] Verify new menu appears

### 9. Performance
- [ ] Menu opens quickly (<300ms)
- [ ] No visible lag when typing in search
- [ ] Smooth animations when opening/closing
- [ ] No console errors
- [ ] No React warnings

### 10. Accessibility
- [ ] All buttons have proper ARIA labels
- [ ] Menu can be navigated with keyboard
- [ ] Tab order is logical
- [ ] Escape key closes menu
- [ ] Screen reader announces menu state

## Automated Testing (Future)
Once test infrastructure is set up:

```javascript
// Example test cases
describe('HamburgerMenu', () => {
  it('shows morning greeting between 6am-11am', () => {});
  it('shows afternoon greeting between 11am-5pm', () => {});
  it('shows evening greeting between 5pm-10pm', () => {});
  it('shows night greeting between 10pm-6am', () => {});
  it('updates suggested actions based on time', () => {});
});

describe('AllFeaturesView', () => {
  it('filters features based on search query', () => {});
  it('shows "No features found" when no matches', () => {});
  it('displays all categories', () => {});
  it('navigates to feature when tile is clicked', () => {});
});

describe('AILearningStore', () => {
  it('tracks feature usage', () => {});
  it('returns most used features', () => {});
  it('persists data to localStorage', () => {});
  it('limits most used to 4 items', () => {});
});
```

## Bug Reporting
If you find issues, please include:
1. **Steps to reproduce**
2. **Expected behavior**
3. **Actual behavior**
4. **Time of day** (for time-based features)
5. **Browser/device** info
6. **Screenshots** if applicable
7. **Console errors** (F12 > Console)

## Known Limitations
- Requires database connection to run server
- Time-based features need system time to be accurate
- AI learning requires localStorage (won't work in private/incognito mode)
- Legacy menu still uses old feature-visibility system

## Success Criteria
All tests above should pass before considering this feature complete. Pay special attention to:
- ✅ Time-based greetings change correctly
- ✅ Search filters features in real-time
- ✅ AI learning tracks and displays usage
- ✅ Dark mode looks good
- ✅ Mobile experience is smooth
- ✅ No console errors
