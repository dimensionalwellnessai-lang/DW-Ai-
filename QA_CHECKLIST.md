# QA PASS/FAIL Checklist - Wave 6 Gatekeeper

**Date:** January 4, 2026  
**Version:** 0.1.0-beta

---

## 1. GLOBAL QA RULES

### Navigation Consistency
| Page | Hamburger Menu | Back Button | Home Access | Status |
|------|----------------|-------------|-------------|--------|
| Home (AI Chat) | Via header | N/A | Current | PASS |
| Life Dashboard | PageHeader | Yes | Via menu | PASS |
| Calendar | PageHeader | Yes | Via menu | PASS |
| Daily Schedule | PageHeader | Yes | Via menu | PASS |
| Meal Prep | PageHeader | Yes | Via menu | PASS |
| Meditation/Spiritual | PageHeader | Yes | Via menu | PASS |
| Workout | PageHeader | Yes | Via menu | PASS |
| Browse | PageHeader | Yes | Via menu | PASS |
| Challenges | PageHeader | Yes | Via menu | PASS |
| Talk It Out | PageHeader | Yes | Via menu | PASS |
| Journal | PageHeader | Yes | Via menu | PASS |
| Routines | PageHeader | Yes | Via menu | PASS |
| Finances | PageHeader | Yes | Via menu | PASS |
| Settings | PageHeader | Yes | Via menu | PASS |
| Feedback | PageHeader | Yes | Via menu | PASS |
| Astrology | PageHeader | Yes | Via menu | PASS |
| App Tour | PageHeader | Yes | Via menu | PASS |

### No Fake UI
| Check | Status |
|-------|--------|
| No "Coming Soon" without explanation | PASS - Replaced with "This isn't ready yet" + Go Back |
| No "Not Available" pages | PASS - All routes lead to real pages |
| Disabled buttons have explanation | PASS - "Pick 1 option to save." helper text |

---

## 2. SAVE SYSTEM STATUS

### Save Flow Requirements
| Feature | Disabled Until Selection | Loading State | Toast on Save | Persists on Refresh | Status |
|---------|--------------------------|---------------|---------------|---------------------|--------|
| Meal Suggestions | Yes (ring highlight) | Yes | "Saved." | Yes (localStorage) | PASS |
| Meditation Suggestions | Yes (ring highlight) | Yes | "Saved." | Yes (localStorage) | PASS |
| Challenges | Yes | Yes | "Added to your system." | Yes (localStorage) | PASS |
| Schedule Events | N/A (form-based) | Yes | "Saved." | Yes (DB + local) | PASS |
| Chat History | Automatic | Yes | N/A | Yes (localStorage) | PASS |

### Guest Mode
| Check | Status |
|-------|--------|
| Save locally when not signed in | PASS |
| "Saved on this device" message available | PASS (in copy constants) |

---

## 3. COPY/LANGUAGE QA

### Banned Words Removed
| Word | Occurrences Remaining | Status |
|------|----------------------|--------|
| "just" (in UI/toasts) | 0 in toasts/errors | PASS |
| "just" (acceptable uses) | 3 - crisis dialog (user validation), PWA prompt (technical), landing page (comparative) | ACCEPTABLE |
| "should" | N/A - not in UI copy | PASS |
| "fix" | 0 in user-facing copy | PASS |
| "broken" | 0 | PASS |

### Copy System Updates
| Update | Status |
|--------|--------|
| Centralized copy in `client/src/copy/en.ts` | PASS |
| Error messages use calm language | PASS - "That didn't save." |
| Success messages are brief | PASS - "Saved." / "Added to your system." |
| Selection prompts consistent | PASS - "Pick 1 option to save." |

---

## 4. ROUTE AUDIT

### Menu Items → Real Pages
| Menu Item | Route | Page Exists | Status |
|-----------|-------|-------------|--------|
| Life Dashboard | /life-dashboard | Yes | PASS |
| Today | /daily-schedule | Yes | PASS |
| Calendar | /calendar | Yes | PASS |
| Meal Plans | /meal-prep | Yes | PASS |
| Workout | /workout | Yes (with "not ready" message) | PASS |
| Meditation | /spiritual | Yes | PASS |
| Browse | /browse | Yes | PASS |
| Journal | /journal | Yes | PASS |
| Challenges | /challenges | Yes | PASS |
| Talk It Out | /talk | Yes | PASS |
| Routines | /routines | Yes | PASS |
| Finances | /finances | Yes | PASS |
| Astrology | /astrology | Yes | PASS |
| Feedback | /feedback | Yes | PASS |
| Settings | /settings | Yes | PASS |

### Disabled Routes (Not in Menu)
| Route | Status | Reason |
|-------|--------|--------|
| /blueprint | Disabled in routes.ts | Future feature |
| /projects | Disabled in routes.ts | Future feature |
| /community | Disabled in routes.ts | Future feature |
| /systems | Disabled in routes.ts | Future feature |

---

## 5. FEATURE-BY-FEATURE QA

### Daily Schedule
- [x] Hamburger menu visible
- [x] Back button works
- [x] Add event works
- [x] Edit/Delete events work
- [x] Events persist on refresh

### Meal Prep
- [x] Suggested meals selectable (ring highlight)
- [x] Single-select enforced
- [x] Save button disabled until selection
- [x] Save works with toast "Saved."
- [x] Saved item persists

### Meditation
- [x] Suggestions selectable (ring highlight)
- [x] Save works with toast "Saved."
- [x] Add to Calendar works
- [x] Back button works

### Browse
- [x] Hamburger menu present
- [x] Category filters work
- [x] AI suggestions feature works

### Challenges
- [x] Cards clickable
- [x] Detail dialog opens
- [x] Add to Plan / Calendar works
- [x] Toast: "Added to your system."

### Chat (Home)
- [x] Messages saved to history
- [x] History persists on refresh (localStorage)
- [x] Conversation categories work

### Talk It Out
- [x] Hamburger menu present
- [x] Back button works
- [x] Messages sent/received
- [x] Crisis detection active

---

## 6. FILES CHANGED

### Pages Updated with PageHeader
- `client/src/pages/workouts.tsx` - Added PageHeader, updated copy, fixed Go Back navigation
- `client/src/pages/insights.tsx` - Added PageHeader, updated copy
- `client/src/pages/settings.tsx` - Added PageHeader
- `client/src/pages/feedback.tsx` - Added PageHeader, updated toasts
- `client/src/pages/talk-it-out.tsx` - Added PageHeader

### Copy Updates
- `client/src/copy/en.ts` - Removed banned words, updated error messages
- `client/src/pages/meal-prep.tsx` - Updated toasts, removed "just" from video descriptions
- `client/src/pages/meditation.tsx` - Updated toasts
- `client/src/pages/challenges.tsx` - Updated toasts
- `client/src/pages/schedule-review.tsx` - Updated toasts
- `client/src/pages/spiritual.tsx` - Removed "just" from guidance text
- `client/src/components/ai-workspace.tsx` - Updated error messages
- `client/src/components/auth/login-page.tsx` - Updated error messages
- `client/src/components/onboarding/onboarding-flow.tsx` - Updated error messages
- `client/src/pages/welcome.tsx` - Removed "just"
- `client/src/pages/app-tour.tsx` - Removed "just"
- `client/src/components/finance-profile-dialog.tsx` - Removed "just"

---

## 7. SUMMARY

| Category | Status |
|----------|--------|
| Navigation Consistency | PASS |
| No Fake UI | PASS |
| Save System | PASS |
| Copy/Language | PASS |
| Route Audit | PASS |
| All Features | PASS |

**Wave 6 Gate Status: READY TO PROCEED**

---

## Notes for Safari Testing
- All pages now use consistent PageHeader with hamburger menu
- Save flows use explicit React state (stable IDs, visual ring highlights)
- localStorage persistence for guest mode
- No forced refresh required after saves
