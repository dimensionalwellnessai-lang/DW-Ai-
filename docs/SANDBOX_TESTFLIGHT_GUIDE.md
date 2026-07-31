# Sandbox & TestFlight Validation Guide

Step-by-step guide for validating DW.ai subscription flows in Xcode Sandbox and TestFlight before App Store submission.

---

## Prerequisites

### App Store Connect configuration
- [ ] App record created with correct bundle ID (`com.dimensionalwellnessai.app` or as configured in `app.json`)
- [ ] In-app purchase products created and approved:
  - `dw_plus_monthly` — auto-renewable subscription
  - `dw_plus_annual`  — auto-renewable subscription
- [ ] Subscription group configured (e.g., "DW Plus")
- [ ] Both products added to a RevenueCat **Offering** (e.g., `default`)
- [ ] Offering assigned to the `dw_plus` entitlement in RevenueCat

### RevenueCat dashboard
- [ ] iOS app configured with production API key
- [ ] `dw_plus` entitlement created and linked to both products
- [ ] `default` offering contains both packages
- [ ] Sandbox environment visible (top-right toggle in dashboard)
- [ ] App Store Connect integration enabled (for receipt validation)

### Sandbox tester accounts
- [ ] At least one Sandbox Apple ID created in App Store Connect → Users & Access → Sandbox Testers
- [ ] Sandbox tester is **not** the same account as the developer Apple ID
- [ ] Sandbox tester signed in on device under Settings → App Store → Sandbox Account

---

## Build preparation

```bash
# From the repository root
cd apps/mobile

# Install dependencies
npm install

# Build a TestFlight-compatible preview build
npm run build:preview
# (This runs: eas build --platform ios --profile preview)

# Alternatively, for a local simulator build:
npm run ios
```

---

## Xcode Sandbox testing

### 1. Initial offering load
1. Open the app on a Simulator or real device with the Sandbox account signed in.
2. Navigate to the Paywall (Profile → "Get Started" or any premium gating point).
3. Verify plans load within ~3 seconds.
4. Confirm Monthly and Annual packages are both visible with correct price strings from App Store Connect.

### 2. Successful purchase
1. Tap the Annual plan.
2. The Sandbox StoreKit sheet should appear with the Sandbox tester's name.
3. Tap **Subscribe** in the sheet.
4. The Sandbox "Environment: Sandbox" confirmation may appear — tap **Continue**.
5. Verify:
   - "Welcome to DW Plus! ✨" alert appears.
   - Paywall dismisses.
   - Profile shows "✨ DW Plus" badge.
   - RevenueCat dashboard (Sandbox mode) shows active subscription.

### 3. Purchase cancellation
1. Open the paywall again (or force free tier via RevenueCat dashboard).
2. Tap a plan → dismiss the sheet by tapping outside or the **X** button.
3. Verify: **no error alert** appears, paywall stays open.

### 4. Restore purchases
1. Delete and reinstall the app (or clear sandbox purchase history on device).
2. Sign in with the same user who previously purchased.
3. Open paywall → tap "Restore Previous Purchases".
4. Verify "Purchases Restored ✓" appears and premium unlocks.

### 5. Offline behaviour
1. Enable Airplane Mode on the device.
2. Open the paywall.
3. Verify the "No Internet Connection" error state appears with a "Try again" button.
4. Disable Airplane Mode, tap "Try again" — plans should load.
5. With plans loaded, enable Airplane Mode and tap a plan.
6. Verify "No Internet Connection" purchase alert appears (no stuck spinner).

### 6. Foreground resume revalidation
1. Purchase a subscription in Sandbox.
2. Background the app for more than 5 minutes (stale window).
3. Use the RevenueCat dashboard to expire the Sandbox subscription (Actions → Expire).
4. Foreground the app.
5. Verify: entitlement is updated to free tier; premium gating reflects this within a few seconds.

---

## TestFlight validation

### Distribution
1. Submit the build via EAS: `npm run submit:ios` (or via App Store Connect upload).
2. Add internal testers in App Store Connect → TestFlight.
3. Testers install via the TestFlight app.

### Notes for TestFlight
- Sandbox purchases are **not** available in TestFlight to external testers; internal testers use Sandbox via their Apple ID.
- RevenueCat sandbox mode must be enabled for the API key used in the `preview` EAS profile.
- Check the `EXPO_PUBLIC_REVENUECAT_IOS_KEY` environment variable in `eas.json` points to the correct key for the `preview` profile.

### Verification steps
1. Repeat Xcode Sandbox steps 1–6 above on a TestFlight build.
2. Confirm `paywall_view`, `purchase_start`, `purchase_success` events appear in PostHog (or development logs).
3. Confirm Sentry breadcrumbs appear in the Sentry event timeline for any errors triggered during testing.

---

## Common issues & fixes

| Symptom | Likely cause | Fix |
|---|---|---|
| Plans don't load (spinner indefinite) | RevenueCat API key incorrect or offering not published | Check `EXPO_PUBLIC_REVENUECAT_IOS_KEY`; verify offering in RC dashboard |
| "No packages" message on real device | Products not approved in App Store Connect | Submit products for review; wait for "Ready to Submit" status |
| Purchase sheet doesn't appear | Sandbox account not signed in | Settings → App Store → Sandbox Account |
| Restore always returns "No subscription" | Sandbox purchase expired or wrong Apple ID | Expire and re-purchase in Sandbox; confirm same Apple ID used |
| RevenueCat shows no data | App not posting receipts | Check RC logs in `LOG_LEVEL.DEBUG`; ensure `Purchases.configure` was called |
| Entitlement not refreshing on foreground | AppState listener not firing | Verify `_layout.tsx` mounts correctly; check for early returns |

---

## Out-of-scope / follow-up items

- **Backend receipt validation** (`POST /api/subscriptions/sync`) — stub in place, pending endpoint implementation.  
  See `apps/mobile/src/services/subscriptions.ts` → `syncEntitlementWithBackend()` for the TODO and contract notes.
- **RevenueCat webhooks** for server-side entitlement invalidation — requires backend webhook handler.
- **Android / Google Play Billing** — separate QA pass required once Android build is stable.
- **Promotional offer codes** — not yet configured; add when marketing campaigns launch.
