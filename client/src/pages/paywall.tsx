import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Loader2, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { simulateUpgrade, simulateRestore } from "@/lib/billing";

/** Inline spinner label used on buttons with pending billing requests. */
function ProcessingLabel() {
  return (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Processing…
    </>
  );
}

interface PlanDetails {
  id: "trial" | "monthly";
  label: string;
  price: string;
  description: string;
}

const PLAN_DETAILS: Record<"trial" | "monthly", PlanDetails> = {
  trial: {
    id: "trial",
    label: "DW Plus — 7-Day Free Trial",
    price: "$79.99 / year",
    description: "Free for 7 days, then $79.99/year. Cancel anytime before the trial ends.",
  },
  monthly: {
    id: "monthly",
    label: "DW Plus — Monthly",
    price: "$9.99 / month",
    description: "Billed monthly. No trial period. Cancel anytime.",
  },
};

/**
 * DW Plus paywall — shown once after onboarding (soft paywall) and also when
 * free-tier limits are reached. Design: calm, minimal, consistent with app.
 *
 * Purchase flow: tapping a plan CTA shows a confirmation overlay with pricing
 * details before processing. On confirmation, calls the billing stub and
 * navigates to the app home. Compatible with future RevenueCat/StoreKit
 * integration (replace simulateUpgrade with the real purchase flow).
 */
export default function PaywallPage() {
  const [, setLocation] = useLocation();
  const [showOtherPlans, setShowOtherPlans] = useState(false);
  const [loading, setLoading] = useState<"trial" | "monthly" | "restore" | null>(null);
  const [pendingPlan, setPendingPlan] = useState<"trial" | "monthly" | null>(null);
  const { toast } = useToast();

  // Determine upgrade context from query param so bonus mechanics are applied
  const searchParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  const ctx = searchParams.get("ctx") as
    | "message_limit"
    | "session_limit"
    | "paywall"
    | "restore"
    | null;
  const upgradeContext = ctx === "message_limit" || ctx === "session_limit"
    ? ctx
    : "paywall";

  const handleStartTrial = () => {
    setPendingPlan("trial");
  };

  const handleMonthly = () => {
    setPendingPlan("monthly");
  };

  const handleConfirmPurchase = async () => {
    if (!pendingPlan) return;
    const plan = pendingPlan;
    setPendingPlan(null);
    setLoading(plan);
    try {
      await simulateUpgrade("plus", upgradeContext);
      toast({
        title: "DW Plus activated!",
        description:
          plan === "trial"
            ? "Your 7-day free trial has started. Enjoy unlimited access."
            : "Monthly subscription started. Enjoy unlimited access.",
      });
      setLocation("/command-center");
    } catch {
      toast({
        title: "Something went wrong",
        description: "Could not process payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleCancelPurchase = () => {
    setPendingPlan(null);
  };

  const handleContinueFree = () => {
    setLocation("/command-center");
  };

  const handleRestore = async () => {
    setLoading("restore");
    try {
      const result = await simulateRestore();
      if (result.success) {
        toast({
          title: "Purchase restored",
          description: "DW Plus has been restored to your account.",
        });
        setLocation("/command-center");
      } else {
        toast({
          title: "Nothing to restore",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Restore failed",
        description: "Could not restore purchase. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const isLoading = loading !== null;

  return (
    <div
      className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12"
      style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 24px)" }}
      data-testid="paywall-page"
    >
      <div className="w-full max-w-sm space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
            DW Plus
          </p>
          <h1 className="text-2xl font-display font-semibold text-foreground">
            Unlimited clarity,<br />every day.
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Remove daily limits and unlock the full DW experience.
          </p>
        </div>

        {/* Benefits */}
        <ul className="space-y-3">
          {[
            { emoji: "∞", text: "Unlimited daily messages" },
            { emoji: "∞", text: "Unlimited chat sessions" },
            { emoji: "📂", text: "Full conversation history" },
            { emoji: "🧠", text: "Long-term memory across sessions" },
          ].map((item) => (
            <li key={item.text} className="flex items-center gap-3 text-sm">
              <span className="w-6 text-center text-base shrink-0" aria-hidden="true">
                {item.emoji}
              </span>
              <span className="text-foreground">{item.text}</span>
            </li>
          ))}
        </ul>

        {/* Primary CTA — Yearly with free trial */}
        <div className="space-y-3">
          <Button
            size="lg"
            className="w-full"
            onClick={handleStartTrial}
            disabled={isLoading}
            data-testid="button-start-trial"
          >
            {loading === "trial" ? <ProcessingLabel /> : "Start 7-day free trial"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Then $79.99/year&nbsp;•&nbsp;Cancel anytime
          </p>
        </div>

        {/* Other plans toggle */}
        <div className="space-y-2">
          <button
            onClick={() => setShowOtherPlans((v) => !v)}
            className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
            data-testid="button-other-plans-toggle"
            aria-expanded={showOtherPlans}
            disabled={isLoading}
          >
            Other plans
            {showOtherPlans ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>

          {showOtherPlans && (
            <div className="rounded-xl border border-border p-4 space-y-3" data-testid="panel-other-plans">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Monthly</p>
                <p className="text-xs text-muted-foreground">
                  $9.99/month&nbsp;•&nbsp;No trial&nbsp;•&nbsp;Cancel anytime
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleMonthly}
                disabled={isLoading}
                data-testid="button-monthly"
              >
                {loading === "monthly" ? <ProcessingLabel /> : "Subscribe monthly"}
              </Button>
            </div>
          )}
        </div>

        {/* Continue with Free */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground"
          onClick={handleContinueFree}
          disabled={isLoading}
          data-testid="button-continue-free"
        >
          Continue with free
        </Button>

        {/* Footer links */}
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <button
            onClick={handleRestore}
            className="hover:text-foreground transition-colors disabled:opacity-50"
            disabled={isLoading}
            data-testid="button-restore"
          >
            {loading === "restore" ? (
              <span className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />Restoring…
              </span>
            ) : (
              "Restore purchase"
            )}
          </button>
          <span aria-hidden="true">·</span>
          <a
            href="/privacy-terms"
            className="hover:text-foreground transition-colors"
            data-testid="link-terms"
          >
            Terms &amp; Privacy
          </a>
        </div>
      </div>

      {/* Payment confirmation overlay */}
      {pendingPlan && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-confirm-title"
          data-testid="payment-confirm-overlay"
        >
          <div className="w-full max-w-sm bg-background border border-border rounded-2xl shadow-lg p-6 space-y-5">
            {/* Icon + heading */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p
                  id="payment-confirm-title"
                  className="text-base font-semibold text-foreground"
                >
                  Confirm Purchase
                </p>
                <p className="text-xs text-muted-foreground">Review your plan before continuing</p>
              </div>
            </div>

            {/* Plan details */}
            <div className="rounded-xl border border-border p-4 space-y-1">
              <p className="text-sm font-medium text-foreground">
                {PLAN_DETAILS[pendingPlan].label}
              </p>
              <p className="text-lg font-bold text-foreground">
                {PLAN_DETAILS[pendingPlan].price}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {PLAN_DETAILS[pendingPlan].description}
              </p>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              By confirming you agree to our{" "}
              <a href="/privacy-terms" className="underline hover:text-foreground">
                Terms &amp; Privacy
              </a>
              .
            </p>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button
                size="lg"
                className="w-full"
                onClick={handleConfirmPurchase}
                disabled={isLoading}
                data-testid="button-confirm-purchase"
              >
                {isLoading ? <ProcessingLabel /> : "Confirm Purchase"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={handleCancelPurchase}
                disabled={isLoading}
                data-testid="button-cancel-purchase"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
