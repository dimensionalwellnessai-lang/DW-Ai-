import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { simulateRestore } from "@/lib/billing";
import { apiRequest, parseApiError } from "@/lib/queryClient";
import { usePageMeta } from "@/hooks/use-page-meta";

interface BillingStatus {
  tier: "free" | "plus";
  periodEnd: string | null;
  billingConfigured: boolean;
}

/**
 * DW Plus paywall — shown once after onboarding (soft paywall) and also when
 * free-tier limits are reached. Design: calm, minimal, consistent with app.
 *
 * Purchase simulation: on web/Replit, tapping "Start Free Trial" immediately
 * sets dw_is_plus=true and calls the backend billing stub. Compatible with
 * future RevenueCat/StoreKit integration (replace simulateUpgrade with the real
 * purchase flow).
 */
export default function PaywallPage() {
  usePageMeta("Upgrade", "Unlock premium features to accelerate your wellness journey.");
  const [, setLocation] = useLocation();
  const [showOtherPlans, setShowOtherPlans] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [checkingOut, setCheckingOut] = useState<"monthly" | "annual" | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const { toast } = useToast();

  const { data: status } = useQuery<BillingStatus>({
    queryKey: ["/api/billing/status"],
    staleTime: 30 * 1000,
  });
  const billingConfigured = status?.billingConfigured !== false;
  const isPlus = status?.tier === "plus";

  // Determine upgrade context and post-payment destination from query params
  const searchParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  const ctx = searchParams.get("ctx") as
    | "message_limit"
    | "session_limit"
    | "paywall"
    | "restore"
    | null;
  // `from` lets callers specify an explicit return path after payment
  const fromParam = searchParams.get("from");

  const upgradeContext = ctx === "message_limit" || ctx === "session_limit"
    ? ctx
    : "paywall";

  const startCheckout = async (plan: "monthly" | "annual") => {
    if (!billingConfigured) {
      toast({
        title: "Billing not available",
        description: "Subscriptions aren't configured on this server yet. Please contact support.",
        variant: "destructive",
      });
      return;
    }
    setCheckingOut(plan);
    try {
      const res = await apiRequest("POST", "/api/billing/checkout", { plan });
      const body = (await res.json()) as { url?: string };
      if (body.url) {
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
      setCheckingOut(null);
    }
  };

  const handleStartTrial = () => startCheckout("annual");
  const handleMonthly = () => startCheckout("monthly");

  const handleManageSubscription = async () => {
    setOpeningPortal(true);
    try {
      const res = await apiRequest("POST", "/api/billing/portal");
      const body = (await res.json()) as { url?: string };
      if (body.url) {
        window.location.assign(body.url);
        return;
      }
      throw new Error("No portal URL returned");
    } catch (err) {
      toast({
        title: "Couldn't open billing portal",
        description: parseApiError(err),
        variant: "destructive",
      });
      setOpeningPortal(false);
    }
  };

  const handleContinueFree = () => {
    setLocation("/");
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const result = await simulateRestore();
      if (result.success) {
        toast({
          title: "Purchase restored",
          description: "DW Plus has been restored to your account.",
        });
        setLocation("/");
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
      setRestoring(false);
    }
  };

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

        {/* Plus members see a manage-subscription panel instead of pricing */}
        {isPlus ? (
          <div className="space-y-3" data-testid="panel-already-plus">
            <div className="rounded-xl border border-border p-4 text-center space-y-1">
              <p className="text-sm font-medium text-foreground">You're on DW Plus</p>
              {status?.periodEnd && (
                <p className="text-xs text-muted-foreground">
                  Renews {new Date(status.periodEnd).toLocaleDateString()}
                </p>
              )}
            </div>
            <Button
              size="lg"
              className="w-full"
              onClick={handleManageSubscription}
              disabled={openingPortal || !billingConfigured}
              data-testid="button-manage-subscription"
            >
              {openingPortal ? (
                <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Opening…</span>
              ) : (
                "Manage subscription"
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Button
              size="lg"
              className="w-full"
              onClick={handleStartTrial}
              disabled={restoring || checkingOut !== null || !billingConfigured}
              data-testid="button-start-trial"
            >
              {checkingOut === "annual" ? (
                <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Redirecting…</span>
              ) : (
                "Start annual plan"
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Cancel anytime&nbsp;•&nbsp;Secure checkout via Stripe
            </p>
            {!billingConfigured && (
              <p className="text-center text-xs text-destructive" data-testid="text-billing-unavailable">
                Subscriptions aren't available on this server yet.
              </p>
            )}
          </div>
        )}

        {/* Other plans toggle */}
        <div className="space-y-2">
          <button
            onClick={() => setShowOtherPlans((v) => !v)}
            className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
            data-testid="button-other-plans-toggle"
            aria-expanded={showOtherPlans}
            disabled={restoring}
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
                disabled={restoring || checkingOut !== null || !billingConfigured || isPlus}
                data-testid="button-monthly"
              >
                {checkingOut === "monthly" ? (
                  <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Redirecting…</span>
                ) : (
                  "Subscribe monthly"
                )}
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
          disabled={restoring}
          data-testid="button-continue-free"
        >
          Continue with free
        </Button>

        {/* Footer links */}
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <button
            onClick={handleRestore}
            className="hover:text-foreground transition-colors disabled:opacity-50"
            disabled={restoring}
            data-testid="button-restore"
          >
            {restoring ? (
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
    </div>
  );
}
