import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, Loader2, ShieldCheck, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { simulateUpgrade } from "@/lib/billing";
import type { BillingPlan } from "@/lib/billing";
import { usePageMeta } from "@/hooks/use-page-meta";

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
    label: "DW Plus — Yearly",
    billingPlan: "plus",
    price: "$79.99",
    period: "/ year",
    trialNote: "Includes a 7-day free trial. Cancel anytime.",
    features: [
      "Unlimited daily messages",
      "Unlimited chat sessions",
      "Full conversation history",
      "Long-term memory across sessions",
    ],
  },
  "plus-monthly": {
    label: "DW Plus — Monthly",
    billingPlan: "plus",
    price: "$9.99",
    period: "/ month",
    trialNote: "No trial. Cancel anytime.",
    features: [
      "Unlimited daily messages",
      "Unlimited chat sessions",
      "Full conversation history",
      "Long-term memory across sessions",
    ],
  },
  premium: {
    label: "DW Premium",
    billingPlan: "premium",
    price: "$9.99",
    period: "/ month",
    trialNote: "Includes a 7-day free trial. Cancel anytime.",
    features: [
      "Unlimited DW conversations",
      "All 8 dimensions",
      "Photo meal logging",
      "Advanced tracking",
      "Life Blueprint",
      "Pattern insights",
    ],
  },
  lifetime: {
    label: "DW Lifetime",
    billingPlan: "lifetime",
    price: "$99",
    period: "one-time",
    features: [
      "Everything in Premium",
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
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const searchParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : "",
  );
  const planKey = searchParams.get("plan") ?? "plus-yearly";
  const ctx = searchParams.get("ctx") as
    | "message_limit"
    | "session_limit"
    | "paywall"
    | null;
  // Sanitize `from` to a known in-app path only.
  const rawFrom = searchParams.get("from") ?? "";
  const from = ALLOWED_BACK_PATHS.has(rawFrom) ? rawFrom : "/paywall";

  const upgradeContext =
    ctx === "message_limit" || ctx === "session_limit" ? ctx : "paywall";

  const plan = PLAN_DETAILS[planKey] ?? PLAN_DETAILS["plus-yearly"];
  const isLifetime = plan.billingPlan === "lifetime";

  const handleConfirm = async () => {
    setProcessing(true);
    try {
      await simulateUpgrade(plan.billingPlan, upgradeContext);
      setSuccess(true);
      toast({
        title: "Payment confirmed!",
        description: isLifetime
          ? `${plan.label} is now active. You have lifetime access!`
          : `${plan.label} is now active. Enjoy unlimited access!`,
      });
      setTimeout(() => setLocation("/"), 1500);
    } catch {
      toast({
        title: "Payment failed",
        description: "Could not complete your purchase. Please try again.",
        variant: "destructive",
      });
    } finally {
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
          disabled={processing || success}
          data-testid="button-checkout-back"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {success ? (
          /* ── Success state ───────────────────────────────────────────── */
          <div className="text-center space-y-4 py-8">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              You're all set!
            </h2>
            <p className="text-sm text-muted-foreground">
              Taking you to the app…
            </p>
          </div>
        ) : (
          /* ── Checkout form ───────────────────────────────────────────── */
          <>
            {/* Demo notice */}
            <div className="flex items-start gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2.5">
              <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-xs text-blue-600 dark:text-blue-400 leading-snug">
                Payments aren't live yet — no charge will be made. Confirming will activate your plan in demo mode.
              </p>
            </div>

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
        )}
      </div>
    </div>
  );
}
