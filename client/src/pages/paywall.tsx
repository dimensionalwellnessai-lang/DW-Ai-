import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { simulateRestore } from "@/lib/billing";
import { usePageMeta } from "@/hooks/use-page-meta";

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
  const { toast } = useToast();

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

  const handleStartTrial = () => {
    const params = new URLSearchParams({ plan: "plus-yearly", from: "/paywall" });
    if (ctx) params.set("ctx", ctx);
    setLocation(`/checkout?${params.toString()}`);
  };

  const handleMonthly = () => {
    const params = new URLSearchParams({ plan: "plus-monthly", from: "/paywall" });
    if (ctx) params.set("ctx", ctx);
    setLocation(`/checkout?${params.toString()}`);
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

        {/* Primary CTA — Yearly with free trial */}
        <div className="space-y-3">
          <Button
            size="lg"
            className="w-full"
            onClick={handleStartTrial}
            disabled={restoring}
            data-testid="button-start-trial"
          >
            Start 7-day free trial
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
                disabled={restoring}
                data-testid="button-monthly"
              >
                Subscribe monthly
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
