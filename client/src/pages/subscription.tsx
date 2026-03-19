import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Map, PlayCircle, Loader2, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useInteractiveTour } from "@/components/interactive-tour";
import { useToast } from "@/hooks/use-toast";
import { simulateUpgrade } from "@/lib/billing";

type PlanType = "free" | "premium" | "lifetime";

interface PlanDetails {
  label: string;
  price: string;
  description: string;
}

const PLAN_DETAILS: Record<Exclude<PlanType, "free">, PlanDetails> = {
  premium: {
    label: "DW Plus — Premium",
    price: "$9.99 / month",
    description: "Free for 7 days, then $9.99/month. Cancel anytime before the trial ends.",
  },
  lifetime: {
    label: "DW Plus — Lifetime",
    price: "$99 one-time",
    description: "One-time payment. Lifetime access to all current and future DW features.",
  },
};

/** Inline spinner label used on plan buttons with pending billing requests. */
function ProcessingLabel() {
  return (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Processing…
    </>
  );
}

export default function SubscriptionPage() {
  const [, setLocation] = useLocation();
  const [loadingPlan, setLoadingPlan] = useState<PlanType | null>(null);
  const [pendingPlan, setPendingPlan] = useState<Exclude<PlanType, "free"> | null>(null);
  const [showTourPrompt, setShowTourPrompt] = useState(false);
  const { isOpen, startTour, completeTour, skipTour } = useInteractiveTour();
  const { toast } = useToast();

  const handleSelectPlan = (plan: PlanType) => {
    if (plan === "free") {
      localStorage.setItem("dw_selected_plan", "free");
      setShowTourPrompt(true);
      return;
    }
    // For paid plans, show payment confirmation before processing
    setPendingPlan(plan);
  };

  const handleConfirmPurchase = async () => {
    if (!pendingPlan) return;
    const plan = pendingPlan;
    setPendingPlan(null);
    setLoadingPlan(plan);
    try {
      await simulateUpgrade(plan, "paywall");
      toast({
        title: plan === "lifetime" ? "Lifetime access activated!" : "DW Plus activated!",
        description:
          plan === "lifetime"
            ? "You now have lifetime access to all DW features."
            : "Your free trial has started. Enjoy unlimited access.",
      });
      localStorage.setItem("dw_selected_plan", plan);
      setShowTourPrompt(true);
    } catch {
      toast({
        title: "Something went wrong",
        description: "Could not process payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleCancelPurchase = () => {
    setPendingPlan(null);
  };

  const handleMaybeLater = () => {
    localStorage.setItem("dw_selected_plan", "free");
    setShowTourPrompt(true);
  };

  const handleStartTour = () => {
    setShowTourPrompt(false);
    setTimeout(() => startTour(), 300);
  };

  const handleSkipTour = () => {
    setShowTourPrompt(false);
    setLocation("/");
  };

  const handleTourComplete = () => {
    completeTour();
    setLocation("/");
  };

  const handleTourSkip = () => {
    skipTour();
    setLocation("/");
  };

  const handleAppTour = () => {
    setLocation("/app-tour");
  };

  const isLoading = loadingPlan !== null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-4xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <h1 className="text-3xl font-bold text-foreground">Choose Your Plan</h1>
          <p className="text-muted-foreground">
            Start with what fits you best. You can upgrade anytime.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Free Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="relative h-full flex flex-col">
              <CardHeader>
                <CardTitle className="text-xl">Free</CardTitle>
                <div className="mt-2">
                  <span className="text-4xl font-bold">$0</span>
                  <span className="text-muted-foreground ml-2">/ forever</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <ul className="space-y-3 flex-1">
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Talk to DW (limited)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Basic tracking</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">1 dimension</span>
                  </li>
                </ul>
                <Button
                  onClick={() => handleSelectPlan("free")}
                  variant="outline"
                  className="w-full mt-6"
                  disabled={isLoading}
                  data-testid="button-plan-free"
                >
                  Continue Free
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Premium Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="relative h-full flex flex-col border-primary shadow-lg">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary">POPULAR</Badge>
              </div>
              <CardHeader>
                <CardTitle className="text-xl">Premium</CardTitle>
                <div className="mt-2">
                  <span className="text-4xl font-bold">$9.99</span>
                  <span className="text-muted-foreground ml-2">/ month</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <ul className="space-y-3 flex-1">
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Unlimited DW conversations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">All 8 dimensions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Photo meal logging</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Advanced tracking</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Life Blueprint</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Pattern insights</span>
                  </li>
                </ul>
                <Button
                  onClick={() => handleSelectPlan("premium")}
                  className="w-full mt-6"
                  disabled={isLoading}
                  data-testid="button-plan-premium"
                >
                  {loadingPlan === "premium" ? <ProcessingLabel /> : "Start Free Trial"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Lifetime Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="relative h-full flex flex-col">
              <CardHeader>
                <CardTitle className="text-xl">Lifetime</CardTitle>
                <div className="mt-2">
                  <span className="text-4xl font-bold">$99</span>
                  <span className="text-muted-foreground ml-2">one-time</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <ul className="space-y-3 flex-1">
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Everything in Premium</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Forever access</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">All future features</span>
                  </li>
                </ul>
                <Button
                  onClick={() => handleSelectPlan("lifetime")}
                  variant="outline"
                  className="w-full mt-6"
                  disabled={isLoading}
                  data-testid="button-plan-lifetime"
                >
                  {loadingPlan === "lifetime" ? <ProcessingLabel /> : "Get Lifetime"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center space-y-3"
        >
          <Button
            variant="ghost"
            onClick={handleMaybeLater}
            className="text-muted-foreground"
            disabled={isLoading}
            data-testid="button-maybe-later"
          >
            Maybe Later
          </Button>
          <div className="flex items-center justify-center">
            <Button
              variant="outline"
              onClick={handleAppTour}
              className="gap-2"
              disabled={isLoading}
            >
              <PlayCircle className="w-4 h-4" />
              Take the App Tour
            </Button>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showTourPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10003] bg-background/80 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <Card className="w-full max-w-sm">
                <CardContent className="pt-6 text-center space-y-4">
                  <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Map className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Explore the App</h3>
                  <p className="text-sm text-muted-foreground">
                    Take a quick tour to discover everything DW has to offer and find your way around.
                  </p>
                  <div className="flex flex-col gap-2 pt-2">
                    <Button onClick={handleStartTour} data-testid="button-start-tour-after-paywall">
                      Take a Tour
                    </Button>
                    <Button variant="ghost" onClick={handleSkipTour} className="text-muted-foreground" data-testid="button-skip-tour-after-paywall">
                      Skip for now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment confirmation overlay */}
      {pendingPlan && (
        <div
          className="fixed inset-0 z-[10004] bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="subscription-payment-confirm-title"
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
                  id="subscription-payment-confirm-title"
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
