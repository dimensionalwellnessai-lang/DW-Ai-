import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import Stripe from "stripe";
import { z } from "zod";

import { storage } from "../storage";
import { requireAuth, FREE_DAILY_QUOTAS } from "./_shared";

interface StripeConfig {
  client: Stripe;
  webhookSecret: string;
  priceMonthly: string;
  priceAnnual: string;
}

let stripeSingleton: StripeConfig | null | undefined;

function getStripe(): StripeConfig | null {
  if (stripeSingleton !== undefined) return stripeSingleton;
  const key = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const priceMonthly = process.env.STRIPE_PRICE_ID_MONTHLY;
  const priceAnnual = process.env.STRIPE_PRICE_ID_ANNUAL;
  if (!key || !webhookSecret || !priceMonthly || !priceAnnual) {
    stripeSingleton = null;
    return null;
  }
  stripeSingleton = {
    // The account uses Stripe Managed Payments, which requires API version
    // 2025-03-31.basil or newer.
    client: new Stripe(key, { apiVersion: "2025-03-31.basil" as Stripe.LatestApiVersion }),
    webhookSecret,
    priceMonthly,
    priceAnnual,
  };
  return stripeSingleton;
}

export function isBillingConfigured(): boolean {
  return getStripe() !== null;
}

function getOrigin(req: Request): string {
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
  const host = (req.headers["x-forwarded-host"] as string) || req.headers.host;
  return `${proto}://${host}`;
}

function billingNotConfigured(res: Response) {
  return res.status(503).json({
    error: "billing_not_configured",
    message: "Billing is not configured on this server. Please contact support.",
  });
}

async function ensureCustomer(userId: string, stripe: Stripe): Promise<string> {
  const user = await storage.getUser(userId);
  if (!user) throw new Error("User not found");
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const customer = await stripe.customers.create({
    email: user.email,
    metadata: { userId: user.id },
  });
  await storage.updateUser(userId, { stripeCustomerId: customer.id });
  return customer.id;
}

function priceForPlan(cfg: StripeConfig, plan: "monthly" | "annual"): string {
  return plan === "annual" ? cfg.priceAnnual : cfg.priceMonthly;
}

async function applySubscriptionToUser(
  userId: string,
  sub: Stripe.Subscription,
): Promise<void> {
  const isActive = ["active", "trialing"].includes(sub.status);
  const tier = isActive ? "plus" : "free";
  const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null;
  const priceId = sub.items.data[0]?.price?.id ?? null;
  await storage.updateUser(userId, {
    subscriptionTier: tier,
    subscriptionUpdatedAt: new Date(),
    subscriptionPeriodEnd: periodEnd,
    stripeSubscriptionId: sub.id,
    stripePriceId: priceId,
  });
}

/**
 * Stripe webhook — must be mounted with `express.raw` BEFORE the global
 * express.json() middleware, otherwise the signature won't verify. We
 * register this on the Express app directly so it is invoked before any
 * JSON body parser configured higher up.
 */
export function registerBillingWebhook(app: Express): void {
  app.post(
    "/api/billing/webhook",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      const cfg = getStripe();
      if (!cfg) return billingNotConfigured(res);

      const sig = req.headers["stripe-signature"];
      if (!sig || typeof sig !== "string") {
        return res.status(400).json({ error: "Missing stripe-signature header" });
      }

      let event: Stripe.Event;
      try {
        event = cfg.client.webhooks.constructEvent(req.body as Buffer, sig, cfg.webhookSecret);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "invalid signature";
        console.error("[billing] webhook signature verification failed:", msg);
        return res.status(400).json({ error: `Webhook signature verification failed: ${msg}` });
      }

      try {
        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            const userId = session.metadata?.userId
              || (session.client_reference_id ?? undefined);
            const customerId = typeof session.customer === "string"
              ? session.customer
              : session.customer?.id;
            const subscriptionId = typeof session.subscription === "string"
              ? session.subscription
              : session.subscription?.id;
            if (userId && customerId) {
              await storage.updateUser(userId, {
                stripeCustomerId: customerId,
                stripeSubscriptionId: subscriptionId ?? null,
                subscriptionTier: "plus",
                subscriptionUpdatedAt: new Date(),
              });
            }
            if (subscriptionId) {
              const sub = await cfg.client.subscriptions.retrieve(subscriptionId);
              const resolvedUserId = userId
                ?? (await storage.getUserByStripeCustomerId(customerId ?? ""))?.id;
              if (resolvedUserId) await applySubscriptionToUser(resolvedUserId, sub);
            }
            break;
          }
          case "customer.subscription.updated":
          case "customer.subscription.created": {
            const sub = event.data.object as Stripe.Subscription;
            const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
            const user = await storage.getUserByStripeCustomerId(customerId);
            if (user) await applySubscriptionToUser(user.id, sub);
            break;
          }
          case "customer.subscription.deleted": {
            const sub = event.data.object as Stripe.Subscription;
            const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
            const user = await storage.getUserByStripeCustomerId(customerId);
            if (user) {
              await storage.updateUser(user.id, {
                subscriptionTier: "free",
                subscriptionUpdatedAt: new Date(),
                subscriptionPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
                stripeSubscriptionId: null,
                stripePriceId: null,
              });
            }
            break;
          }
          default:
            // Ignore everything else.
            break;
        }
        res.json({ received: true });
      } catch (err) {
        console.error("[billing] webhook handling error:", err);
        res.status(500).json({ error: "Webhook handler failed" });
      }
    },
  );
}

export function registerBillingRoutes(app: Express): void {
  // ── Status: tier, period end, today's usage ────────────────────────────
  app.get("/api/billing/status", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.json({
          tier: "free",
          updatedAt: null,
          periodEnd: null,
          usage: null,
          quotas: FREE_DAILY_QUOTAS,
          billingConfigured: isBillingConfigured(),
        });
      }
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.json({
          tier: "free",
          updatedAt: null,
          periodEnd: null,
          usage: null,
          quotas: FREE_DAILY_QUOTAS,
          billingConfigured: isBillingConfigured(),
        });
      }
      const usage = await storage.getTodayUsageSummary(user.id);
      res.json({
        tier: user.subscriptionTier ?? "free",
        updatedAt: user.subscriptionUpdatedAt ?? null,
        periodEnd: user.subscriptionPeriodEnd ?? null,
        usage,
        quotas: FREE_DAILY_QUOTAS,
        billingConfigured: isBillingConfigured(),
      });
    } catch (err) {
      console.error("[billing] status error", err);
      res.status(500).json({ error: "Failed to fetch subscription status" });
    }
  });

  // ── Checkout: create Stripe Checkout session for monthly or annual ────
  const checkoutBody = z.object({
    plan: z.enum(["monthly", "annual"]).default("annual"),
  });
  app.post("/api/billing/checkout", requireAuth, async (req, res) => {
    const cfg = getStripe();
    if (!cfg) return billingNotConfigured(res);
    const parsed = checkoutBody.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid checkout request" });
    }
    try {
      const userId = req.session.userId!;
      const customerId = await ensureCustomer(userId, cfg.client);
      const origin = getOrigin(req);
      const session = await cfg.client.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: priceForPlan(cfg, parsed.data.plan), quantity: 1 }],
        success_url: `${origin}/upgrade?status=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/upgrade?status=cancelled`,
        client_reference_id: userId,
        allow_promotion_codes: true,
        metadata: { userId, plan: parsed.data.plan },
        subscription_data: {
          metadata: { userId },
          ...(parsed.data.plan === "annual" ? { trial_period_days: 7 } : {}),
        },
      });
      res.json({ url: session.url, id: session.id });
    } catch (err) {
      console.error("[billing] checkout error", err);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // ── Customer portal: manage / cancel subscription ─────────────────────
  app.post("/api/billing/portal", requireAuth, async (req, res) => {
    const cfg = getStripe();
    if (!cfg) return billingNotConfigured(res);
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      if (!user?.stripeCustomerId) {
        return res.status(400).json({ error: "No Stripe customer on file. Subscribe first." });
      }
      const origin = getOrigin(req);
      const portal = await cfg.client.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${origin}/upgrade`,
      });
      res.json({ url: portal.url });
    } catch (err) {
      console.error("[billing] portal error", err);
      res.status(500).json({ error: "Failed to open customer portal" });
    }
  });

  // ── Restore: kept for legacy mobile clients; now fed by Stripe state ──
  app.post("/api/billing/restore", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.json({ success: false, tier: "free", message: "No active subscription found" });
      }
      const user = await storage.getUser(req.session.userId);
      if (user?.subscriptionTier === "plus") {
        return res.json({ success: true, tier: "plus", message: "DW Pro restored successfully" });
      }
      return res.json({ success: false, tier: "free", message: "No active subscription found" });
    } catch (err) {
      console.error("[billing] restore error", err);
      res.status(500).json({ error: "Failed to restore subscription" });
    }
  });
}
