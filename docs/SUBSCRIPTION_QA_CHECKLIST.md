# Subscription QA Checklist

Test matrix for all subscription flows in DW.ai mobile.  
Run through this checklist before every TestFlight build and App Store submission.

---

## Environment requirements

| Requirement | Notes |
|---|---|
| Xcode Sandbox account | Separate Apple ID from production; create in App Store Connect → Users & Access → Sandbox Testers |
| RevenueCat dashboard | Switch to Sandbox mode; verify `dw_plus` entitlement and offering are configured |
| TestFlight build | Use the `preview` EAS profile (`npm run build:preview` from `apps/mobile/`) |
| Network proxy (optional) | Charles / Proxyman to simulate network failures |

---

## A — Fresh install

| # | Scenario | Expected | Pass? |
|---|---|---|---|
| A1 | Install app, no prior subscription | Paywall loads correctly; no entitlement granted | ☐ |
| A2 | Open paywall — plans load within ~3 s | Monthly and Annual packages visible with correct prices | ☐ |
| A3 | Annual plan shows "Best Value" badge | Badge visible | ☐ |
| A4 | Trial messaging (if configured in RevenueCat) | Trial period and price shown correctly on package card | ☐ |
| A5 | Close paywall without purchasing | No error shown; free state preserved | ☐ |

---

## B — Logged-out / Login transition

| # | Scenario | Expected | Pass? |
|---|---|---|---|
| B1 | Open app without an account | Entitlement = free; premium features locked | ☐ |
| B2 | Register new account | RevenueCat `logIn` called with new user ID; entitlement revalidated | ☐ |
| B3 | Log in with existing Pro account | Entitlement = Pro within 2 s of login; premium features unlocked | ☐ |
| B4 | Log out | RevenueCat `logOut` called; entitlement cache cleared; next session starts clean | ☐ |
| B5 | Log back in with same Pro account | Entitlement = Pro restored correctly | ☐ |

---

## C — Purchase success

| # | Scenario | Expected | Pass? |
|---|---|---|---|
| C1 | Tap "Subscribe" / "Start" on Monthly plan | StoreKit sheet appears | ☐ |
| C2 | Complete Sandbox purchase | `purchase_success` analytics event fired; "Welcome to DW Plus!" alert shown; paywall closes | ☐ |
| C3 | Premium features unlock immediately | No app restart required | ☐ |
| C4 | Profile shows "✨ DW Plus" badge | Badge visible after purchase | ☐ |
| C5 | Repeat purchase tap while in-flight | Second tap is ignored (idempotency guard) | ☐ |
| C6 | Annual plan purchase | Same as C2–C4; "Best Value" badge shown pre-purchase | ☐ |

---

## D — Purchase cancel

| # | Scenario | Expected | Pass? |
|---|---|---|---|
| D1 | Tap plan → dismiss StoreKit sheet | `purchase_cancel` event fired; **no error alert**; paywall remains open | ☐ |
| D2 | After cancel, tap plan again | New purchase sheet opens normally | ☐ |

---

## E — Purchase failure

| # | Scenario | Expected | Pass? |
|---|---|---|---|
| E1 | Purchase with network disabled | "No Internet Connection" alert shown; retry possible | ☐ |
| E2 | Store unavailable (simulate via RevenueCat sandbox error) | "Store Unavailable" alert shown; paywall does not freeze | ☐ |
| E3 | Generic purchase error | "Purchase Failed" alert with descriptive message | ☐ |
| E4 | Deferred / pending purchase | "Purchase Pending" alert; app in usable state | ☐ |
| E5 | After any failure, loading spinner is **gone** | No stuck ActivityIndicator | ☐ |

---

## F — Restore purchases

| # | Scenario | Expected | Pass? |
|---|---|---|---|
| F1 | Tap "Restore Previous Purchases" with active Sandbox subscription | `restore_success` event fired; "Purchases Restored ✓" alert; premium unlocked | ☐ |
| F2 | Restore with no prior subscription | `restore_success` event fired; "No Active Subscription" alert | ☐ |
| F3 | Restore with network disabled | `restore_fail` event fired; "Restore Failed" alert; retry affordance visible | ☐ |
| F4 | Restore from Settings modal | Same outcomes as F1–F3 | ☐ |
| F5 | "Restoring…" loading text visible during restore | Spinner / text shows while in flight | ☐ |
| F6 | After restore completes, spinner disappears | No stuck state | ☐ |

---

## G — Offline then online recovery

| # | Scenario | Expected | Pass? |
|---|---|---|---|
| G1 | Open paywall with no connection | "No Internet Connection" error state with "Try again" button | ☐ |
| G2 | Tap "Try again" after restoring connection | Plans load successfully | ☐ |
| G3 | Go offline after plans loaded, then attempt purchase | "No Internet Connection" purchase error | ☐ |
| G4 | Come back online, re-attempt purchase | Purchase completes normally | ☐ |

---

## H — App restart / resume entitlement consistency

| # | Scenario | Expected | Pass? |
|---|---|---|---|
| H1 | Force-quit and restart app with active subscription | Entitlement = Pro on startup; no re-purchase required | ☐ |
| H2 | Background app for 30 s, foreground | Entitlement revalidated silently; UI stays correct | ☐ |
| H3 | Background app for 10 min (cache stale window), foreground | Fresh revalidation call made; result reflected in UI | ☐ |
| H4 | Subscription expires between sessions | Next foreground resume detects lapsed entitlement; UI reverts to free | ☐ |
| H5 | RevenueCat unavailable on startup; cache fresh | Last-known entitlement used; no crash | ☐ |
| H6 | RevenueCat unavailable on startup; cache stale/empty | Safe default (isPro: false) used; no crash | ☐ |

---

## I — Premium gating consistency

| # | Scenario | Expected | Pass? |
|---|---|---|---|
| I1 | Free user taps premium feature | Paywall presented | ☐ |
| I2 | Pro user opens same feature | Feature accessible without paywall | ☐ |
| I3 | Subscription lapses mid-session (simulate) | Feature gated on next foreground resume | ☐ |

---

## J — Analytics events (verify in PostHog / console)

| Event | Trigger | Pass? |
|---|---|---|
| `paywall_view` | Paywall modal opens | ☐ |
| `plan_select` | User taps a plan card | ☐ |
| `purchase_start` | Purchase sheet presented | ☐ |
| `purchase_success` | Successful Sandbox purchase | ☐ |
| `purchase_cancel` | StoreKit sheet dismissed | ☐ |
| `purchase_fail` | Purchase error (check `reason` property) | ☐ |
| `restore_start` | Restore tapped | ☐ |
| `restore_success` | Restore completed | ☐ |
| `restore_fail` | Restore error | ☐ |
| `entitlement_state_changed` | isPro changes value | ☐ |

---

## K — Sentry breadcrumbs (verify in Sentry event timeline)

| Breadcrumb | Trigger | Pass? |
|---|---|---|
| `RevenueCat initialized` | App start | ☐ |
| `Fetching offerings` | Paywall open | ☐ |
| `Purchase started` | Plan tapped | ☐ |
| `Purchase completed` | After purchase | ☐ |
| `Restore purchases started` | Restore tapped | ☐ |
| `Restore completed` | After restore | ☐ |

---

## Notes / known gaps

- Backend entitlement sync (`POST /api/subscriptions/sync`) is stubbed with a TODO — must be implemented and tested when the endpoint is live.
- RevenueCat webhook integration (for server-side receipt validation) is out of scope for this sprint.
- Android purchases are not tested in this checklist — run a separate pass on Google Play Billing once Android build is ready.
