# App Store Review - Quick Reference Guide

## 🔑 Demo Account Access

**Email:** `demo@fliptheswitch.app`  
**Password:** Provided in App Store Connect review notes (or via secure channel)

## ✅ Issues Fixed in PR #45

### 1. Account Creation Bug ✅
- **Problem:** Registration failures, session errors
- **Fixed:** Robust error handling, email normalization, session validation
- **Test:** Try creating a new account - works reliably now

### 2. Photo Selection ✅
- **Problem:** App crashed on iPad with photo features
- **Fixed:** Photo library picker only, no camera access
- **Test:** Photo selection now requests permissions properly, no crashes

### 3. App Uniqueness ✅
- **Problem:** Flagged as astrology/horoscope duplicate
- **Fixed:** De-emphasized astrology (now dormant), enhanced dimensional wellness branding
- **Unique Value:** 13-dimension energy-based life system, not just fitness/meditation

### 4. Demo Account ✅
- **Problem:** No demo account with pre-populated content
- **Fixed:** Comprehensive demo with goals, habits, routines, workouts, meals, AI chats
- **Test:** Login with credentials above to see all features

## 🎯 What Makes This App Unique

1. **Energy-Based Guidance** - Adapts to user's capacity, not arbitrary goals
2. **13 Life Dimensions** - Holistic wellness beyond fitness/meditation
3. **Consent-First Design** - No mandatory features or engagement manipulation
4. **AI Life Concierge** - Context-aware across all dimensions
5. **Meaning Over Metrics** - No streaks or leaderboards

## 📱 Features to Test (All Pre-Populated)

- ✅ Goal tracking (3 active goals)
- ✅ Habit formation (3 habits with streaks)
- ✅ Daily routines (morning & evening)
- ✅ Schedule management (recurring events)
- ✅ Meal planning (weekly plan)
- ✅ Workout programs (5K training, strength)
- ✅ AI conversations (active thread)
- ✅ Wellness tracking (mood/energy logs)

## 🔧 Technical Details

**Device Compatibility:** iPad Air 11-inch (M3), iPadOS 26.2  
**Orientations:** Portrait, Landscape (all directions)  
**Permissions:** Photo Library (properly requested)  

## 📄 Documentation

- Full details: `/docs/APP_STORE_REVIEW_FIXES.md`
- Demo account info: `/docs/APP_STORE_DEMO_ACCOUNT.md`

---

**Ready for App Store Re-submission** ✅
