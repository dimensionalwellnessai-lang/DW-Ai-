---
name: Billing architecture (Stripe)
description: How DW Wellness AI's subscription billing is wired and the honesty rule for the checkout client
---

# Billing / Stripe wiring

The backend already ships a complete, real Stripe integration in `server/routes/billing.ts`
(real Checkout sessions, customer portal, webhook with subscription sync). It uses **plain
env-var credentials**, NOT the Replit Stripe connector / `stripe-replit-sync`:
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_MONTHLY`, `STRIPE_PRICE_ID_ANNUAL`.
When any are missing, `isBillingConfigured()` is false and `/api/billing/status` returns
`billingConfigured:false`; checkout/portal return 503. So "going live" only needs those 4 secrets
plus Stripe products/prices/webhook created in the user's Stripe dashboard.

The backend only sells **monthly** and **annual** subscriptions (both map to the `"plus"` tier).
There is no real one-time "lifetime" SKU and no separate "premium" SKU, even though the
`/subscription` marketing page still shows Premium/Lifetime cards.

**Honesty rule (the reason this matters):** the client must call the real
`/api/billing/checkout` and redirect to the returned Stripe URL — it must NEVER grant
entitlement locally. A prior client stub (`simulateUpgrade` in `client/src/lib/billing.ts`)
called `activateDWPlus()` locally (free Plus!) then POSTed to the deleted `/api/billing/upgrade`.
Both `paywall.tsx` and `checkout.tsx` now use the real flow gated on `billingConfigured`.

**How to apply:** when touching any purchase UI, derive the displayed plan and the plan you
charge from the SAME sanitized key (unknown key → fall back consistently for both), gate on
`billingConfigured`, and show an honest "not available yet" message instead of faking success.
`simulateUpgrade` is dead for purchases; only `simulateRestore`/`fetchSubscriptionStatus` remain.
