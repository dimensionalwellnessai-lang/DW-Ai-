import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, Loader2, ShieldCheck, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, parseApiError } from "@/lib/queryClient";
import type { BillingPlan } from "@/lib/billing";
import { usePageMeta } from "@/hooks/use-page-meta";

interface BillingStatus {
  tier: "free" | "plus";
  billingConfigured: boolean;
}

/**
 * Map a checkout page plan key to the recurring plan the billing backend
 * actually sells. The server only offers monthly and annual subscriptions
 * (STRIPE_PRICE_ID_MONTHLY / STRIPE_PRICE_ID_ANNUAL); the one-time "lifetime"
 * plan has no real price, so it maps to null and is treated as unavailable
 * rather than silently charging a subscription.
 */
function planToBackend(planKey: string): "monthly" | "annual" | null {
  if (planKey === "plus-yearly") return "annual";
  if (planKey === "lifetime") return null;
  return "monthly";
}

/** Inline spinner label used on the confirm button during processing. */
function ProcessingLabel() {
  return (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Processing…
    </>
  );
}

/** Metadata about each plan shown on the checkout page. */
const PLAN_DETAILS: Record<
  string,
  {
    label: string;
    billingPlan: BillingPlan;
    price: string;
    period: string;
    trialNote?: string;
    features: string[];
  }
> = {
  "plus-yearly": {
    label: "DW Pro — Yearly",
    billingPlan: "plus",
    price: "$89.99",
    period: "/ year",
    trialNote: "7 days free, then $89.99/year. Cancel before trial ends to avoid charges.",
    features: [
      "Advanced personalized insights",
      "Adaptive scheduling tools",
      "Unlimited daily usage",
      "Full history + export",
      "Ad-free experience",
      "Early access to new features",
    ],
  },
  "plus-monthly": {
    label: "DW Pro — Monthly",
    billingPlan: "plus",
    price: "$14.99",
    period: "/ month",
    trialNote: "No trial. Cancel anytime.",
    features: [
      "Advanced personalized insights",
      "Adaptive scheduling tools",
      "Unlimited daily usage",
      "Full history + export",
      "Ad-free experience",
      "Early access to new features",
    ],
  },
  premium: {
    label: "DW Pro — Monthly",
    billingPlan: "premium",
    price: "$14.99",
    period: "/ month",
    trialNote: "No trial. Cancel anytime.",
    features: [
      "Advanced personalized insights",
      "Adaptive scheduling tools",
      "Unlimited daily usage",
      "Full history + export",
      "Ad-free experience",
      "Early access to new features",
    ],
  },
  lifetime: {
    label: "DW Lifetime",
    billingPlan: "lifetime",
    price: "$99",
    period: "one-time",
    features: [
      "Everything in Pro",
      "Forever access",
      "All future features",
    ],
  },
};

/** Allowed back-navigation destinations from the checkout page. */
const ALLOWED_BACK_PATHS = new Set(["/paywall", "/subscription"]);

/**
 * Checkout confirmation page.
 *
 * Reached from /paywall and /subscription when the user taps a paid-plan
 * button. Displays a summary of the selected plan and, on confirmation, calls
 * the billing stub before redirecting to the home screen.
 *
 * Query params:
 *   plan  — one of the keys in PLAN_DETAILS (e.g. "plus-yearly", "premium")
 *   ctx   — optional upgrade context forwarded to the billing stub
 *           ("message_limit" | "session_limit" | "paywall")
 *   from  — optional back-destination ("/paywall" | "/subscription")
 */
export default function CheckoutPage() {
  usePageMeta("Checkout", "Complete your DW.ai premium subscription to unlock all features.");
  const [, setLocation] = useLocation();
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const { data: status } = useQuery<BillingStatus>({
    queryKey: ["/api/billing/status"],
    staleTime: 30 * 1000,
  });
  const billingConfigured = status?.billingConfigured !== false;

  const searchParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : "",
  );
  // Resolve the requested plan to a known key FIRST so the displayed plan and
  // the plan we actually charge always come from the same source of truth.
  // An unknown/invalid key falls back to "plus-yearly" for both.
  const requestedKey = searchParams.get("plan") ?? "plus-yearly";
  const planKey = PLAN_DETAILS[requestedKey] ? requestedKey : "plus-yearly";
  // Sanitize `from` to a known in-app path only.
  const rawFrom = searchParams.get("from") ?? "";
  const from = ALLOWED_BACK_PATHS.has(rawFrom) ? rawFrom : "/paywall";

  const plan = PLAN_DETAILS[planKey];
  const isLifetime = plan.billingPlan === "lifetime";

  const backendPlan = planToBackend(planKey);

  const handleConfirm = async () => {
    // Honest guards: never fake a charge or grant entitlement locally.
    if (!billingConfigured) {
      toast({
        title: "Payments aren't available yet",
        description: "Subscriptions aren't switched on for this app yet. Hang tight — you won't be charged.",
      });
      return;
    }
    if (!backendPlan) {
      toast({
        title: "This plan isn't available yet",
        description: "Lifetime access isn't offered right now. Please choose the monthly or yearly plan.",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      const res = await apiRequest("POST", "/api/billing/checkout", { plan: backendPlan });
      const body = (await res.json()) as { url?: string };
      if (body.url) {
        // Hand off to Stripe's hosted checkout. Stripe redirects back to
        // /upgrade?status=success on completion.
        window.location.assign(body.url);
        return;
      }
      throw new Error("No checkout URL returned");
    } catch (err) {
      toast({
        title: "Checkout failed",
        description: parseApiError(err),
        variant: "destructive",
      });
      setProcessing(false);
    }
  };

  const handleBack = () => {
    setLocation(from);
  };

  return (
    <div
      className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12"
      style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 24px)" }}
      data-testid="checkout-page"
    >
      <div className="w-full max-w-sm space-y-8">
        {/* Back navigation */}
        <button
          onClick={handleBack}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Go back"
          disabled={processing}
          data-testid="button-checkout-back"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* ── Checkout form ───────────────────────────────────────────── */}
        <>
            {/* Honest billing notice when Stripe isn't configured yet */}
            {!billingConfigured && (
              <div className="flex items-start gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2.5">
                <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-xs text-blue-600 dark:text-blue-400 leading-snug">
                  Payments aren't switched on yet, so no charge will be made. We'll let you know the moment subscriptions go live.
                </p>
              </div>
            )}

            {/* Header */}
            <div className="text-center space-y-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                Order summary
              </p>
              <h1 className="text-2xl font-display font-semibold text-foreground">
                {plan.label}
              </h1>
            </div>

            {/* Pricing */}
            <div className="rounded-xl border border-border p-5 space-y-4">
              <div className="flex items-end justify-between">
                <span className="text-3xl font-bold text-foreground">
                  {plan.price}
                </span>
                <span className="text-sm text-muted-foreground pb-1">
                  {plan.period}
                </span>
              </div>

              {plan.trialNote && (
                <p className="text-xs text-muted-foreground">{plan.trialNote}</p>
              )}

              <ul className="space-y-2 pt-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                    <span className="text-foreground">{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Trust badge */}
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                {isLifetime
                  ? "Secure checkout\u00a0\u2022\u00a0One-time payment"
                  : "Secure checkout\u00a0\u2022\u00a0Cancel anytime"}
              </span>
            </div>

            {/* CTA */}
            <Button
              size="lg"
              className="w-full"
              onClick={handleConfirm}
              disabled={processing}
              data-testid="button-confirm-payment"
            >
              {processing ? (
                <ProcessingLabel />
              ) : plan.billingPlan === "lifetime" ? (
                `Pay ${plan.price}`
              ) : (
                plan.trialNote?.startsWith("Includes")
                  ? "Start free trial"
                  : "Subscribe now"
              )}
            </Button>
        </>
      </div>
    </div>
  );
}
