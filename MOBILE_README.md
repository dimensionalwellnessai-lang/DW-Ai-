# DW.ai Mobile App — Expo / React Native

Production-ready Expo React Native app for [DW.ai — Dimensional Wellness AI](https://dimensionalwellnessai.com).

---

## ⚠️ Do Not Break Web

> **The existing website at `dimensionalwellnessai.com` is completely separate from this mobile app.**
>
> - **Web code** lives in the repository root: `client/`, `server/`, `shared/`
> - **Mobile code** lives entirely in: `apps/mobile/`
>
> Never modify root-level build scripts, `package.json` (root), `vite.config.ts`, or `server/` from within the mobile app.
> The mobile app calls the same backend API — it does not run its own server.
>
> **Web app commands** (unchanged): `npm run dev`, `npm run build`, `npm start`
> **Mobile app commands**: `cd apps/mobile && ...` (see below)

---

## Quick Start — Run Mobile Locally

```bash
# 1. Navigate to mobile app
cd apps/mobile

# 2. Install dependencies
npm install

# 3. Create your local env file
cp .env.example .env.local
# Fill in EXPO_PUBLIC_REVENUECAT_IOS_KEY, EXPO_PUBLIC_SENTRY_DSN, etc.

# 4. Start Expo dev server
npm start

# 5. Run on iOS simulator
npm run ios

# 6. Run on Android emulator
npm run android
```

> **Prerequisites:**
> - Node.js 18+
> - Expo CLI: `npm install -g expo-cli`
> - EAS CLI: `npm install -g eas-cli`
> - For iOS: Xcode + iOS Simulator
> - For Android: Android Studio + Emulator

---

## Required Environment Variables

| Variable | Description | Where to Get |
|---|---|---|
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY` | RevenueCat iOS API key | [RevenueCat Dashboard](https://app.revenuecat.com) |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | RevenueCat Android API key | [RevenueCat Dashboard](https://app.revenuecat.com) |
| `EXPO_PUBLIC_SENTRY_DSN` | Sentry DSN for crash reporting | [Sentry.io Project Settings](https://sentry.io) |
| `EXPO_PUBLIC_POSTHOG_API_KEY` | PostHog analytics key | [PostHog Dashboard](https://app.posthog.com) |

Variables prefixed with `EXPO_PUBLIC_` are embedded at build time and exposed to the app bundle.
**Never put secrets in `EXPO_PUBLIC_` variables.**

---

## API Connection

The mobile app connects to the existing DW.ai backend:

| Environment | API Base URL |
|---|---|
| `development` | `http://localhost:5000` |
| `staging` | `https://staging.dimensionalwellnessai.com` |
| `production` | `https://dimensionalwellnessai.com` |

The environment is selected via the `APP_ENV` variable set in `eas.json` build profiles.
Session cookies are stored securely using `expo-secure-store`.

---

## Subscriptions — RevenueCat

### Setup
1. Create a [RevenueCat](https://app.revenuecat.com) account
2. Create a new app (iOS + Android)
3. Configure your products in App Store Connect / Google Play
4. Link your products to RevenueCat offerings
5. Add your API keys to `.env.local`

### Entitlement Architecture
- **Entitlement ID**: `dw_plus` (configured in `src/services/subscriptions.ts`)
- **Free tier**: Limited AI messages (3/day), 3 wellness dimensions
- **DW Plus tier**: Unlimited AI, all 13 dimensions, advanced features

### Flows Implemented
- ✅ Offerings fetch on paywall open
- ✅ Purchase flow with loading/error states
- ✅ Restore purchases (required for App Store)
- ✅ Entitlement check on app start and resume
- ✅ Paywall shown on locked content access

### Failure Handling
- Network down → graceful error state with retry
- Purchase cancelled → no error shown (user cancelled)
- RevenueCat service unavailable → fallback to cached status

---

## How to Produce a TestFlight Build

### Prerequisites
1. Apple Developer account with active membership
2. EAS account linked: `eas login`
3. App registered in App Store Connect
4. Certificates provisioned via EAS

### Steps

```bash
cd apps/mobile

# Configure EAS project (first time)
eas init

# Build for internal distribution (TestFlight)
npm run build:preview

# OR build production build
npm run build:ios

# Submit to TestFlight
npm run submit:ios
```

### Update `eas.json` before building
Replace placeholder values in `eas.json`:
```json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@email.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABCDE12345"
      }
    }
  }
}
```

Also update `app.json`:
```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "your-eas-project-id"
      }
    }
  }
}
```

---

## App Store Connect — Required Before Submission

The following must be configured in App Store Connect before submitting to App Review:

| Item | Notes |
|---|---|
| App Name | "DW.ai - Dimensional Wellness" |
| Bundle ID | `com.dimensionalwellness.dwai` |
| App Icon | 1024×1024 PNG in App Store Connect |
| Screenshots | Required sizes: 6.9", 6.5", 5.5" (at minimum) |
| Privacy Policy URL | `https://dimensionalwellnessai.com/privacy` |
| Support URL | `https://dimensionalwellnessai.com/support` |
| Description | See `APP_STORE_MARKETING.md` in root |
| Keywords | wellness, ai, dimensions, mindfulness, health |
| Age Rating | Complete the age rating questionnaire |
| In-App Purchases | Configure subscription products (monthly + annual) |
| Demo Account | Create a demo account for review team |

---

## Architecture

```
apps/mobile/
├── app/                    # Expo Router file-based routes
│   ├── _layout.tsx         # Root layout (auth check, providers)
│   ├── index.tsx           # Entry redirect
│   ├── auth/               # Auth screens (welcome, sign-in, sign-up, forgot-password)
│   ├── (tabs)/             # Main app tabs (today, guidance, dimensions, profile)
│   └── (modals)/           # Modal screens (paywall, settings)
├── src/
│   ├── config/
│   │   └── env.ts          # Environment configuration
│   ├── services/
│   │   ├── api.ts          # HTTP client with retry/timeout
│   │   ├── auth.ts         # Authentication service
│   │   ├── ai.ts           # AI/chat service
│   │   ├── subscriptions.ts # RevenueCat integration
│   │   ├── analytics.ts    # Analytics (PostHog)
│   │   └── monitoring.ts   # Sentry error tracking
│   ├── stores/
│   │   ├── auth.ts         # Zustand auth store
│   │   └── subscription.ts # Zustand subscription store
│   └── components/
│       └── ui/             # Shared UI components
├── assets/                 # App icons and splash screens
├── app.json                # Expo configuration
├── eas.json                # EAS Build configuration
└── .env.example            # Environment variable template
```

---

## Known Limitations / TODOs (Post-v1)

- [ ] **Push notifications**: Backend has web push, needs mobile adaptation
- [ ] **Offline mode**: Currently requires network for all features
- [ ] **Voice mode**: Microphone integration not yet implemented
- [ ] **Wearable sync**: Whoop/Oura/Garmin integration not yet in mobile
- [ ] **PostHog**: Analytics stub in place; needs `posthog-react-native` package installed
- [ ] **Android subscriptions**: Google Play Billing not tested
- [ ] **Deep links**: Associated domains configured but handlers not fully implemented
- [ ] **Social auth**: Google/Apple/Facebook OAuth flows not yet ported to mobile
- [ ] **Mood logging**: Quick action present but screen not yet built
- [ ] **Energy check-in**: Quick action present but screen not yet built

---

## Release Checklist

Before submitting to App Review:

### Functionality
- [ ] Sign up / sign in / sign out works end-to-end
- [ ] Password reset email sends correctly
- [ ] AI guidance chat works (at least 3 message exchange)
- [ ] Paywall displays correctly with RevenueCat packages
- [ ] Purchase flow completes successfully (sandbox)
- [ ] Restore purchases works correctly
- [ ] Account deletion works and signs user out

### Technical
- [ ] No uncaught promise rejections in Sentry
- [ ] Crash-free rate > 99% in Sentry
- [ ] App launches cleanly from cold start
- [ ] App correctly resumes after backgrounding
- [ ] Tested on iPhone 15 Pro and iPhone SE (minimum)
- [ ] Dark mode appearance correct
- [ ] Dynamic text sizes look acceptable

### App Store
- [ ] App Store Connect metadata complete
- [ ] All required screenshot sizes submitted
- [ ] Privacy policy URL accessible
- [ ] Demo account credentials ready for review team
- [ ] In-App Purchase products approved in App Store Connect
- [ ] Subscription disclosure copy compliant with Apple guidelines

---

## Support

For internal questions: refer to `ARCHITECTURE.md` in the repository root.
For RevenueCat questions: [RevenueCat Docs](https://www.revenuecat.com/docs)
For EAS Build questions: [Expo EAS Docs](https://docs.expo.dev/eas/)
