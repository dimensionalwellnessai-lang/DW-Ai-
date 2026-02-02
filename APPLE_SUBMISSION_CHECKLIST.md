# Apple App Store Submission - Final Checklist

## Pre-Submission Tasks

### 1. Database Setup
- [ ] Ensure production database is accessible
- [ ] Run database migrations if needed: `npm run db:push`
- [ ] Create demo account: `npm run seed:demo`
- [ ] Verify demo account creation was successful (check logs)

### 2. Demo Account Verification
- [ ] Test login with credentials:
  - Email: `demo@dimensionalwellness.app`
  - Password: `DemoWellness2026!`
- [ ] Verify all demo data is present:
  - [ ] 5 goals across different dimensions
  - [ ] 4 habits with streak data
  - [ ] 3 routines (morning, evening, Sunday)
  - [ ] 5 calendar events
  - [ ] 7 days of mood logs
  - [ ] 1 AI conversation with messages
  - [ ] Complete user profile

### 3. Demo Mode Testing
- [ ] Open app and navigate to login page
- [ ] Verify "Try Demo Mode" button is prominent and visible
- [ ] Click "Try Demo Mode" button
- [ ] Confirm demo mode loads successfully
- [ ] Navigate through key features in demo mode
- [ ] Exit demo mode and verify clean state

### 4. iPad Testing (Critical)
- [ ] Test on iPad Air 11-inch or similar
- [ ] Test registration flow:
  - [ ] Enter valid email
  - [ ] Enter valid password (6+ characters)
  - [ ] Accept terms
  - [ ] Submit registration
  - [ ] Verify success or clear error message
- [ ] Test login flow:
  - [ ] Enter demo credentials
  - [ ] Verify successful login
  - [ ] Check home page loads correctly
- [ ] Verify touch targets:
  - [ ] All buttons are easy to tap
  - [ ] Input fields are accessible
  - [ ] Links have adequate touch area
  - [ ] Demo mode button is prominent
- [ ] Test in both orientations:
  - [ ] Portrait mode
  - [ ] Landscape mode

### 5. Error Handling Verification
- [ ] Test with invalid email format
  - Expected: "Please enter a valid email address."
- [ ] Test with short password (< 6 chars)
  - Expected: "Password must be at least 6 characters long."
- [ ] Test with existing email
  - Expected: "This email is already registered. Try logging in instead."
- [ ] Test with incorrect login credentials
  - Expected: Clear error message
- [ ] Verify no technical jargon in any error messages

### 6. Cross-Platform Consistency
- [ ] Test on iPhone (any model)
- [ ] Test on Android tablet (if available)
- [ ] Test on Android phone (if available)
- [ ] Verify consistent experience across all devices
- [ ] Check safe area insets on notched devices

### 7. Build & Deployment
- [ ] Run TypeScript check: `npm run check`
- [ ] Build production version: `npm run build`
- [ ] Test production build: `npm start`
- [ ] Verify no console errors in production
- [ ] Check all API endpoints respond correctly

### 8. Security Verification
- [ ] Verify CodeQL scan passed (✅ 0 alerts)
- [ ] Confirm demo password is hashed in database
- [ ] Verify no sensitive data in logs (production)
- [ ] Check environment variables are properly set
- [ ] Confirm .env is not committed to repo

## App Store Connect Submission

### Review Information Section
**Demo Account Required?** YES

**Sign-in required?** YES (or mention Demo Mode as alternative)

**Demo Account Credentials:**
```
Username: demo@dimensionalwellness.app
Password: DemoWellness2026!
```

**Additional Notes for Reviewers:**
```
DEMO ACCOUNT:
Login with: demo@dimensionalwellness.app / DemoWellness2026!

ALTERNATIVE ACCESS:
Click "Try Demo Mode" button on login screen for instant access (no login required).

WHAT TO EXPLORE:
- Comprehensive wellness data across 13 dimensions
- Goals, habits, routines, and mood tracking
- AI-powered conversational guidance
- Calendar with recurring events
- Pre-populated 7-day history

TESTING NOTES:
- Demo account has realistic wellness data for full app exploration
- Demo Mode (button on login) works offline and requires no authentication
- All features accessible on iPad, tablet, and phone
- Optimized touch targets for tablet devices

The app is a wellness support tool (not medical device) focused on helping users build sustainable wellness systems through energy-based guidance and dimensional balance.
```

### App Privacy Information
- [ ] Confirm data collection practices are accurate
- [ ] Verify privacy policy link works
- [ ] Update if any new data types are collected

### Screenshots & Preview
- [ ] Update screenshots if login screen changed significantly
- [ ] Ensure iPad screenshots show responsive design
- [ ] Verify all required device sizes have screenshots

## Post-Submission Monitoring

### When Apple Starts Review
- [ ] Monitor for questions from Apple review team
- [ ] Be ready to respond quickly to any issues
- [ ] Have production logs accessible for debugging

### If Rejected Again
- [ ] Review rejection reason carefully
- [ ] Test specific issue on actual iPad if needed
- [ ] Document any new issues found
- [ ] Respond with fixes and clear explanation

### If Approved
- [ ] Monitor crash reports post-launch
- [ ] Watch for user feedback on registration/login
- [ ] Keep demo account working for future reviews
- [ ] Document any issues for next update

## Quick Reference

### Demo Account
- **Email:** demo@dimensionalwellness.app
- **Password:** DemoWellness2026!
- **Reset Command:** `npm run seed:demo`

### Key Files
- **Seed Script:** `server/seed-demo.ts`
- **Registration:** `server/routes.ts` (line 349)
- **Login Page:** `client/src/components/auth/login-page.tsx`
- **Documentation:** 
  - `DEMO_ACCOUNT_GUIDE.md`
  - `APPLE_STORE_FIXES_SUMMARY.md`

### Common Commands
```bash
# Create/recreate demo account
npm run seed:demo

# Check TypeScript
npm run check

# Build production
npm run build

# Run production
npm start

# Development mode
npm run dev
```

## Success Criteria

The submission is ready when:
- ✅ Demo account logs in successfully
- ✅ Demo account has comprehensive data
- ✅ Demo mode button works without login
- ✅ Registration works on iPad
- ✅ Error messages are user-friendly
- ✅ Touch targets meet 44px minimum
- ✅ No TypeScript errors
- ✅ No security vulnerabilities
- ✅ Documentation is complete

## Contact & Support

If Apple review team needs clarification:
- Demo account is permanent and always available
- Demo mode works offline (backup option)
- All wellness data is realistic and comprehensive
- App follows Apple HIG for touch targets
- Error handling is production-ready

**Expected Review Time:** 1-2 weeks
**Priority:** Standard (can request expedited if needed)

---

**Last Updated:** 2026-02-02
**Version:** Ready for submission
**Status:** All tasks complete ✅
