import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { motion } from "framer-motion";

type PlanType = "free" | "premium" | "lifetime";

export default function SubscriptionPage() {
  const [, setLocation] = useLocation();
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);

  const handleSelectPlan = (plan: PlanType) => {
    setSelectedPlan(plan);
    // Save selection to localStorage (placeholder - no payment processing)
    localStorage.setItem('dw_selected_plan', plan);
    // Navigate to the app
    setLocation('/');
  };

  const handleMaybeLater = () => {
    // Default to free plan
    localStorage.setItem('dw_selected_plan', 'free');
    setLocation('/');
  };

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
                  onClick={() => handleSelectPlan('free')}
                  variant="outline"
                  className="w-full mt-6"
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
                  onClick={() => handleSelectPlan('premium')}
                  className="w-full mt-6"
                >
                  Start Free Trial
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
                  onClick={() => handleSelectPlan('lifetime')}
                  variant="outline"
                  className="w-full mt-6"
                >
                  Get Lifetime
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <Button 
            variant="ghost" 
            onClick={handleMaybeLater}
            className="text-muted-foreground"
          >
            Maybe Later
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
