import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Download, Link as LinkIcon, Database } from "lucide-react";
import { useLocation } from "wouter";

interface PremiumFeaturesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Following ETHICAL_MONETIZATION.md principles:
// - We monetize tools, not healing
// - No emotional paywalls
// - No guilt-based upsells
// - Premium tools add convenience, not necessity
const PREMIUM_FEATURES = [
  {
    id: "export",
    title: "Advanced Export",
    description: "Export your wellness data, journal entries, and progress reports in multiple formats (CSV, JSON, PDF)",
    icon: Download,
    category: "tools",
  },
  {
    id: "integrations",
    title: "Third-Party Integrations",
    description: "Connect with your favorite apps like Apple Health, Google Fit, and popular calendar apps",
    icon: LinkIcon,
    category: "tools",
  },
  {
    id: "extended-history",
    title: "Extended History",
    description: "Access unlimited history of your wellness journey, switches, and analytics",
    icon: Database,
    category: "tools",
  },
];

export function PremiumFeaturesDialog({ open, onOpenChange }: PremiumFeaturesDialogProps) {
  const [, setLocation] = useLocation();

  const handleTakeTour = () => {
    onOpenChange(false);
    setLocation('/app-tour');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Premium Features
          </DialogTitle>
          <DialogDescription>
            Optional tools to enhance your wellness journey. All core features remain free.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Free Tier - Always highlighted */}
          <Card className="card-modern border-2 border-primary/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Free Forever</CardTitle>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                  Current Plan
                </Badge>
              </div>
              <CardDescription>
                Full access to all wellness features, AI assistance, and core functionality
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Complete wellness tracking across 13 dimensions</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>AI-powered journaling and chat assistant</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Calendar integration and scheduling</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Unlimited switches and wellness routines</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Basic data export and backup</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Premium Tier - Optional convenience tools */}
          <Card className="card-modern hover-lift">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-accent" />
                  Premium Tools
                </CardTitle>
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
              <CardDescription>
                Optional tools for power users who want extra convenience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {PREMIUM_FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.id} className="flex gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                        <Icon className="h-4 w-4 text-accent" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{feature.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Ethical commitment statement */}
          <div className="text-xs text-muted-foreground text-center px-4 py-3 bg-muted/30 rounded-lg">
            <p className="font-medium mb-1">Our Commitment</p>
            <p>
              We never put emotional support, wellness guidance, or healing behind paywalls. 
              Premium features are purely optional convenience tools.
            </p>
          </div>

          {/* App Tour CTA */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 text-center space-y-3">
              <Sparkles className="w-6 h-6 text-primary mx-auto" />
              <div>
                <h4 className="font-medium text-foreground">New to DW.ai?</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Take a quick tour to learn about all the free features available to you
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleTakeTour}
            data-testid="button-take-tour"
          >
            Take App Tour
          </Button>
          <Button variant="default" onClick={() => onOpenChange(false)}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
