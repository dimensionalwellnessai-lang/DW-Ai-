import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, X, Sparkles, Zap, Rocket } from "lucide-react";

type PlanType = 'free' | 'premium' | 'lifetime';

const PLANS = [
  {
    id: 'free' as PlanType,
    name: 'FREE',
    price: '$0',
    period: '/month',
    icon: Sparkles,
    features: [
      { text: 'AI Chat (limited)', included: true },
      { text: 'Basic tracking', included: true },
      { text: 'Journal', included: true },
      { text: 'Unlimited AI', included: false },
      { text: 'All dimensions', included: false },
      { text: 'Advanced features', included: false },
    ],
    cta: 'Select Free',
    badge: null,
  },
  {
    id: 'premium' as PlanType,
    name: 'PREMIUM',
    price: '$9.99',
    period: '/month',
    icon: Zap,
    features: [
      { text: 'Everything in Free', included: true },
      { text: 'Unlimited AI conversations', included: true },
      { text: 'All 8 life dimensions', included: true },
      { text: 'Advanced tracking', included: true },
      { text: 'Photo meal logging', included: true },
      { text: 'Pattern insights', included: true },
      { text: 'Priority support', included: true },
    ],
    cta: 'Start Free Trial',
    badge: 'Most Popular',
  },
  {
    id: 'lifetime' as PlanType,
    name: 'LIFETIME',
    price: '$99',
    period: 'one-time',
    icon: Rocket,
    features: [
      { text: 'Everything in Premium', included: true },
      { text: 'Forever access', included: true },
      { text: 'All future features', included: true },
    ],
    cta: 'Get Lifetime Access',
    badge: null,
  },
];

export default function SubscriptionPage() {
  const [, navigate] = useLocation();
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);

  const handleSelectPlan = (plan: PlanType) => {
    setSelectedPlan(plan);
    // Save selection (placeholder - no actual charging)
    localStorage.setItem('dw_subscription_plan', plan);
    localStorage.setItem('dw_subscription_selected_at', Date.now().toString());
    
    // Small delay to show selection, then navigate
    setTimeout(() => {
      navigate('/');
    }, 500);
  };

  const handleMaybeLater = () => {
    localStorage.setItem('dw_subscription_plan', 'free');
    localStorage.setItem('dw_subscription_skipped', 'true');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            Choose Your Plan
            <Sparkles className="h-8 w-8 text-primary" />
          </h1>
          <p className="text-muted-foreground">Start your wellness journey with the right plan for you</p>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isSelected = selectedPlan === plan.id;
            const isPremium = plan.id === 'premium';

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: PLANS.indexOf(plan) * 0.1 }}
              >
                <Card 
                  className={`relative overflow-hidden transition-all ${
                    isPremium 
                      ? 'border-primary shadow-lg' 
                      : 'hover:shadow-md'
                  } ${isSelected ? 'ring-2 ring-primary' : ''}`}
                >
                  {plan.badge && (
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold rounded-bl-lg">
                      {plan.badge}
                    </div>
                  )}
                  
                  <CardContent className="p-6 space-y-6">
                    {/* Plan Header */}
                    <div className="text-center space-y-2">
                      <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center ${
                        isPremium ? 'bg-primary/10' : 'bg-muted'
                      }`}>
                        <Icon className={`h-6 w-6 ${isPremium ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                      <div className="space-y-1">
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                          <span className="text-sm text-muted-foreground">{plan.period}</span>
                        </div>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="space-y-3">
                      {plan.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          {feature.included ? (
                            <Check className="h-4 w-4 text-primary shrink-0" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          <span className={`text-sm ${
                            feature.included ? 'text-foreground' : 'text-muted-foreground'
                          }`}>
                            {feature.text}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* CTA Button */}
                    <Button
                      onClick={() => handleSelectPlan(plan.id)}
                      variant={isPremium ? "default" : "outline"}
                      size="lg"
                      className="w-full"
                      disabled={isSelected}
                    >
                      {isSelected ? 'Selected' : plan.cta}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Maybe Later */}
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={handleMaybeLater}
            className="text-muted-foreground hover:text-foreground"
          >
            Maybe later - continue with Free
          </Button>
        </div>

        {/* Fine Print */}
        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p>No payment required right now. This is a placeholder for future subscription setup.</p>
          <p>All plans are currently free during beta testing.</p>
        </div>
      </motion.div>
    </div>
  );
}
