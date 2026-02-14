# Dimensional Wellness - App Store Submission Changelog

## Version 1.1.1 - DW Chat Refresh & Polish

### Release Date: February 14, 2026

---

## 🎯 What's New in This Release

### 1. **DW Chat: Built-In Guide Experience**
**What Changed:**
- DW chat now feels like a built-in guide—clean, article-style responses without chat bubbles
- Assistant messages appear as flowing sections instead of left/right message boxes
- First-person tone: DW speaks as the app itself, your personal wellness concierge
- Maintains all existing functionality: message history, quick actions, voice input, text-to-speech, feedback

**Why It Matters:**
- More natural, less "chatbot" feeling
- Better alignment with DW's identity as a calm, integrated life assistant
- Cleaner visual experience in both light and dark modes

**Technical Details:**
- Updated `/talk` page to article-style presentation
- Removed chat bubble styling (rounded-3xl boxes)
- Assistant messages styled as prose/article sections with subtle borders
- User messages styled with left accent border for clarity
- Dark mode fully supported

---

### 2. **AI Wellness Coach Improvements**
**What's New:**
- Smoother guidance flow with improved context awareness
- Enhanced nervous system-aware responses
- Better personalization based on energy and clarity states

---

### 3. **Demo Mode: Instant Access**
**For Reviewers:**
- "Try Demo Mode" on login screen provides instant access
- Pre-filled wellness data showcases all features
- Demo credentials: `demo@dimensionalwellness.app` / `DemoWellness2026!`
- No server authentication required for demo exploration

---

### 4. **Stability & Polish**
**Improvements:**
- Scrolling polish in chat and calendar views
- Updated permissions messaging for clarity
- Performance optimizations across the app
- UI consistency improvements

---

## 📝 App Store Release Notes (Copy-Ready)

**What's New in Version 1.1.1:**

• DW chat now feels like a built-in guide—clean, article-style responses without chat bubbles.

• AI wellness coach improvements and smoother guidance.

• Demo Mode: instant access with pre-filled wellness data for reviewers.

• Stability fixes, scrolling polish, and updated permissions messaging.

---

## Version 2.1.0 - iOS/Android Submission Fixes

### Release Date: January 27, 2026

---

## 🎯 Key Improvements for App Store/Play Store Review

### 1. **Demo Mode for Reviewers** 
**Purpose:** Enable app reviewers to explore the full feature set without creating an account.

**What's New:**
- **One-Tap Demo Mode**: Prominent "Try Demo Mode" button on the login screen
- **Pre-Populated Content**: Demo includes:
  - 3 sample wellness conversations showing AI guidance
  - 4 goals and habits (exercise, journaling, hydration, stretching)
  - 7 days of mood tracking data
  - 4 recurring calendar events (workouts, walks, journaling, meal prep)
  - Complete wellness profiles (body, nutrition, workout, finance, spiritual)
- **Demo Credentials Display**: Reviewers can see sample credentials in an info dialog
- **Zero Setup Required**: Skip onboarding and dive straight into a fully-configured wellness system

**Technical Details:**
- Demo data stored in localStorage (client-side only)
- No server authentication required
- Can exit demo mode and start fresh anytime

---

### 2. **Camera & Photo Permissions** 
**Purpose:** Fix iPad camera crashes and ensure proper permission handling across iOS and Android.

**What's Changed:**
- **iOS Permissions (Info.plist)**:
  - `NSCameraUsageDescription`: Explains camera use for progress photos and document scanning
  - `NSPhotoLibraryUsageDescription`: Explains photo library access for choosing images
  - `NSPhotoLibraryAddUsageDescription`: Explains saving images to photo library
  
- **Android Permissions (AndroidManifest.xml)**:
  - Camera permission with `android:required="false"` (optional feature)
  - Read/Write external storage (scoped to API levels)
  - Android 13+ granular media permissions (READ_MEDIA_IMAGES, READ_MEDIA_VIDEO)

- **UI Changes**:
  - Replaced "Take Photo" button with "Choose Photo"
  - Photo selection now uses photo library picker only (safer, more reliable)
  - Graceful error handling when permissions are denied
  - Clear messaging: "Choose photos from your gallery"

**Impact:**
- ✅ No more iPad camera crashes
- ✅ Works reliably on all device types
- ✅ Users can still track progress with existing photos
- ✅ Permissions clearly explained to users

---

### 3. **Strategic Repositioning: Wellness First** 
**Purpose:** Shift app perception from astrology-focused to wellness/life planning system with optional personalization tools.

**What's Changed:**
- **App Branding**:
  - Display name: "DW" (was "DW")
  - Subtitle: "Wellness Planner" (iOS) / "Wellness Planner" (Android)
  - Emphasizes life planning, habit tracking, and wellness coaching

- **Navigation Updates**:
  - Bottom nav: "Astrology" → "Insights" (with lightbulb icon)
  - Icon change signals broader personalization beyond astrology
  - Tab reordering: Wellness features (Plan, Today, Journal) before Insights

- **Insights Page Reframing**:
  - Page title: "Personalized Insights"
  - Introductory text: "Personalized Guidance for Your Wellness Journey"
  - Framing: "Astrology and cosmic rhythms are offered as optional tools for deeper self-reflection"
  - Tabs renamed:
    - "Charts" → "Astrology" (clarifies it's one tool of many)
    - "Calendar" → "Moon Cycles"
    - "Journal" → "Reflections"

**Messaging Strategy:**
- **Primary:** Wellness planner, habit tracker, AI wellness coach
- **Secondary:** Personalized insights including optional astrology
- **Tertiary:** Cosmic rhythms as a self-reflection aid

---

## 📝 User-Facing Changes

### New Features
1. **Demo Mode** - Try the app instantly with pre-filled wellness data
2. **Enhanced Photo Selection** - Reliable photo library integration (no camera crashes)
3. **Clearer Navigation** - "Insights" section for personalized guidance

### Bug Fixes
1. Fixed camera crashes on iPad
2. Improved permission handling across iOS and Android
3. Better error messaging when permissions are denied

### UX Improvements
1. More welcoming login screen with demo option
2. Clearer app positioning as a wellness planner
3. Astrology repositioned as an optional personalization tool

---

## 🔧 Technical Changes

### Frontend
- New file: `client/src/lib/demo-mode.ts` - Demo data generator
- Updated: `client/src/components/auth/login-page.tsx` - Demo mode UI
- Updated: `client/src/components/body-scan-dialog.tsx` - Photo library only
- Updated: `client/src/components/bottom-nav.tsx` - Navigation rebranding
- Updated: `client/src/pages/astrology.tsx` - Insights page reframing

### iOS
- Updated: `ios/App/App/Info.plist`:
  - Added camera, photo library permissions
  - Changed display name to "DW"

### Android
- Updated: `android/app/src/main/AndroidManifest.xml`:
  - Added camera permissions (optional)
  - Added photo/media permissions
  - Android 13+ granular permissions
- Updated: `android/app/src/main/res/values/strings.xml`:
  - Changed app name to "DW"
  - Added "Wellness Planner" subtitle

### Configuration
- Updated: `capacitor.config.ts` - App name consistency

---

## 🧪 Testing Recommendations

### For Reviewers
1. **Test Demo Mode**:
   - Click "Try Demo Mode" on login screen
   - Explore pre-populated conversations, goals, calendar
   - Verify all features are accessible

2. **Test Photo Selection**:
   - Navigate to Body Profile (Settings → Body Check-in)
   - Try "Choose Photo" - should open photo library
   - Verify no crashes on iPad

3. **Verify Permissions**:
   - Check that permission dialogs appear with clear explanations
   - Test "deny" flow - app should handle gracefully

### For QA
- Test on iPad (all sizes)
- Test on iPhone (various models)
- Test on Android tablets and phones
- Verify demo data is comprehensive
- Check that astrology is not the primary focus in onboarding

---

## 📦 Release Checklist

- [x] Demo mode implemented and tested
- [x] Camera/photo permissions added to both platforms
- [x] "Take Photo" replaced with "Choose Photo"
- [x] App name updated to "DW"
- [x] Navigation rebranded (Astrology → Insights)
- [x] Insights page reframed with wellness-first messaging
- [x] Changelog documented
- [ ] Test on physical iOS device
- [ ] Test on physical Android device
- [ ] Capture updated screenshots for app stores
- [ ] Update App Store/Play Store descriptions
- [ ] Submit for review

---

## 📱 App Store/Play Store Description Updates

### Recommended Short Description
"Your personal wellness planner with AI coaching. Build habits, track mood, manage routines, and grow with personalized insights."

### Recommended Full Description
**DW** is your personalized wellness companion - an AI-powered life planner designed to help you build sustainable habits, track your wellbeing, and create a system that works for you.

**Core Features:**
- 🤖 **AI Wellness Coach**: Get personalized guidance adapted to your energy and goals
- 📅 **Daily Planning**: Schedule builder, habit tracking, and routine management
- 📝 **Wellness Journaling**: Mood tracking, reflections, and progress insights
- 🎯 **Goal Management**: Set intentions, track habits, build your wellness system
- 💡 **Personalized Insights**: Optional tools including astrology, moon cycles, and pattern analysis

**What Makes Us Different:**
- **Energy-based, not productivity-based** - We meet you where you are
- **Meaning over metrics** - No streaks, no guilt, just growth
- **Optionality as a feature** - Everything is a suggestion, never a demand
- **Consent-based AI** - We always ask before saving or scheduling

**No Mandatory Features**
Use what serves you, skip what doesn't. Build your own wellness system at your pace.

**Try Demo Mode**
Not ready to sign up? Try our demo mode to explore the full app with pre-populated wellness data.

**Privacy First**
Your data stays yours. No selling, no marketing, no BS.

---

## 🔐 Security Notes

- All demo data is stored locally (localStorage)
- No sensitive demo data transmitted to servers
- Photo library access properly scoped and explained
- Permissions are optional and can be denied without breaking core features

---

## 🎨 Design Philosophy

This update reinforces our core design principles:
1. **Wellness > Astrology**: Position as life planner first
2. **Optionality**: Every feature is optional, including personalization
3. **Transparency**: Clear permissions, clear explanations
4. **Accessibility**: Demo mode removes barriers for reviewers and curious users

---

## 📞 Support

For questions about this release:
- Email: support@dimensionalwellness.app
- In-app feedback: Settings → Feedback

---

**Built with care for your wellness journey** 💚
