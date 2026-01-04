import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, CalendarDays, CalendarRange, Check } from "lucide-react";
import { 
  PlanningHorizon, 
  PlanningDomain, 
  getPlanningScope, 
  savePlanningScope 
} from "@/lib/guest-storage";

interface PlanningScopeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: PlanningDomain;
  onScopeSelected: (horizon: PlanningHorizon) => void;
  title?: string;
  description?: string;
}

const HORIZON_OPTIONS: { value: PlanningHorizon; label: string; description: string; icon: typeof Calendar }[] = [
  { 
    value: "today", 
    label: "Just Today", 
    description: "Focus on what you need right now",
    icon: Calendar 
  },
  { 
    value: "week", 
    label: "This Week", 
    description: "Plan ahead for the next 7 days",
    icon: CalendarDays 
  },
  { 
    value: "month", 
    label: "This Month", 
    description: "Set yourself up for the whole month",
    icon: CalendarRange 
  },
];

const DOMAIN_TITLES: Record<PlanningDomain, { title: string; description: string }> = {
  meals: {
    title: "How would you like to plan your meals?",
    description: "We can help you prepare for today, the week ahead, or the whole month."
  },
  workouts: {
    title: "How would you like to plan your workouts?",
    description: "Whether it's today's session or your monthly training schedule, we've got you."
  },
  general: {
    title: "How far ahead would you like to plan?",
    description: "Choose your planning horizon and we'll adapt to your needs."
  },
};

export function PlanningScopeDialog({
  open,
  onOpenChange,
  domain,
  onScopeSelected,
  title,
  description,
}: PlanningScopeDialogProps) {
  const existingScope = getPlanningScope(domain);
  const [selected, setSelected] = useState<PlanningHorizon>(existingScope?.horizon || "week");
  
  const domainContent = DOMAIN_TITLES[domain];

  const handleConfirm = () => {
    savePlanningScope(domain, selected);
    onScopeSelected(selected);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            {title || domainContent.title}
          </DialogTitle>
          <DialogDescription>
            {description || domainContent.description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 py-4">
          {HORIZON_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = selected === option.value;
            
            return (
              <Card
                key={option.value}
                className={`cursor-pointer transition-all ${
                  isSelected 
                    ? "ring-2 ring-primary bg-primary/5" 
                    : "hover-elevate"
                }`}
                onClick={() => setSelected(option.value)}
                data-testid={`planning-scope-${option.value}`}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`p-2 rounded-lg ${isSelected ? "bg-primary/10" : "bg-muted"}`}>
                    <Icon className={`h-5 w-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{option.label}</p>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                  {isSelected && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-planning">
            Cancel
          </Button>
          <Button onClick={handleConfirm} data-testid="button-confirm-planning">
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook for easy integration
export function usePlanningScope(domain: PlanningDomain) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [horizon, setHorizon] = useState<PlanningHorizon | null>(() => {
    const scope = getPlanningScope(domain);
    return scope?.horizon || null;
  });
  
  const showScopeDialog = () => setDialogOpen(true);
  
  const handleScopeSelected = (newHorizon: PlanningHorizon) => {
    setHorizon(newHorizon);
  };
  
  const hasScope = horizon !== null;
  
  return {
    horizon,
    hasScope,
    dialogOpen,
    setDialogOpen,
    showScopeDialog,
    handleScopeSelected,
    PlanningScopeDialogProps: {
      open: dialogOpen,
      onOpenChange: setDialogOpen,
      domain,
      onScopeSelected: handleScopeSelected,
    },
  };
}
