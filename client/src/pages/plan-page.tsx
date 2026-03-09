import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import {
  Zap,
  Brain,
  Clock,
  Compass,
  Wallet,
  Users,
  Home,
  Sprout,
  Play,
  Check,
  ChevronRight,
  Plus,
  Calendar,
  Sparkles,
} from "lucide-react";
import { getSwitchData, type SwitchId } from "@/lib/switch-storage";
import { getUserSignals, deriveRecommendedSwitch, deriveMode } from "@/lib/user-signals";
import { PLAN_LIBRARY, type PlanTemplate, type TimeBand } from "@/config/plan-library";
import { SWITCH_COLORS } from "@/lib/switch-colors";
import { trackEvent, EVENTS } from "@/lib/analytics";

const SWITCH_ICONS: Record<SwitchId, typeof Zap> = {
  body: Zap,
  mind: Brain,
  time: Clock,
  purpose: Compass,
  money: Wallet,
  relationships: Users,
  environment: Home,
  identity: Sprout,
};

interface PlanItem {
  id: string;
  switchId: SwitchId;
  title: string;
  estimateMinutes: number;
  completed: boolean;
  steps: string[];
}

const PLAN_STORAGE_KEY = "dw_weekly_plan";

function getWeeklyPlan(): PlanItem[] {
  try {
    const stored = localStorage.getItem(PLAN_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Error reading plan:", e);
  }
  return [];
}

function saveWeeklyPlan(plan: PlanItem[]): void {
  localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(plan));
}

function generatePlanFromLibrary(switchId: SwitchId, timeBand: TimeBand): PlanItem {
  const template = PLAN_LIBRARY[switchId][timeBand];
  return {
    id: `${switchId}_${Date.now()}`,
    switchId,
    title: template.actionNow.title,
    estimateMinutes: template.estimateMinutes,
    completed: false,
    steps: template.actionNow.steps,
  };
}

export default function PlanPage() {
  const [, navigate] = useLocation();
  const [plan, setPlan] = useState<PlanItem[]>(getWeeklyPlan);
  const [signals] = useState(getUserSignals);
  const [hasIntake, setHasIntake] = useState(false);

  useEffect(() => {
    const intakeComplete = localStorage.getItem("dw_intake_complete");
    const onboardingComplete = localStorage.getItem("dw_onboarding_completed");
    setHasIntake(!!intakeComplete || !!onboardingComplete);
  }, []);

  const recommendation = deriveRecommendedSwitch(signals);
  const mode = deriveMode(signals);

  const handleAddPlan = (switchId: SwitchId) => {
    const newItem = generatePlanFromLibrary(switchId, signals.timeBand);
    const updated = [...plan, newItem];
    setPlan(updated);
    saveWeeklyPlan(updated);
  };

  const handleToggleComplete = (id: string) => {
    const wasAllComplete = plan.length > 0 && plan.every(item => item.completed);
    const updated = plan.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    setPlan(updated);
    saveWeeklyPlan(updated);
    const toggled = updated.find(item => item.id === id);
    if (toggled?.completed) {
      trackEvent(EVENTS.PLAN_COMPLETED, { planItemId: id, switchId: toggled.switchId });
    }
  };

  const handleRemoveItem = (id: string) => {
    const updated = plan.filter(item => item.id !== id);
    setPlan(updated);
    saveWeeklyPlan(updated);
  };

  const groupedPlan = plan.reduce((acc, item) => {
    if (!acc[item.switchId]) acc[item.switchId] = [];
    acc[item.switchId].push(item);
    return acc;
  }, {} as Record<SwitchId, PlanItem[]>);

  const completedCount = plan.filter(p => p.completed).length;
  const totalCount = plan.length;

  if (!hasIntake) {
    return (
      <ScrollArea className="h-[calc(100vh-4rem)]">
        <div className="p-4 pb-24 space-y-6 max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4 pt-12"
          >
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center">
              <Calendar className="h-8 w-8 text-purple-400" />
            </div>
            <h1 className="text-xl font-bold text-foreground">
              You don't have a plan yet
            </h1>
            <p className="text-muted-foreground">
              Complete the Switch Training to generate your first plan.
            </p>
          </motion.div>

          <Link href="/switchboard/intake">
            <Button 
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white"
              data-testid="button-start-intake"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generate a plan from the Switchboard
            </Button>
          </Link>
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-4rem)]">
      <div className="p-4 pb-24 space-y-6 max-w-lg mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">This Week's Plan</h1>
            {totalCount > 0 && (
              <p className="text-sm text-muted-foreground">
                {completedCount} of {totalCount} completed
              </p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAddPlan(recommendation.recommendedSwitchId)}
            data-testid="button-add-plan"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>

        {totalCount === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-border bg-muted/30">
              <CardContent className="p-6 text-center space-y-4">
                <p className="text-muted-foreground">
                  Your plan is empty. Add actions from your recommended switch.
                </p>
                <div className="flex gap-2 justify-center flex-wrap">
                  <Button
                    size="sm"
                    onClick={() => handleAddPlan(recommendation.recommendedSwitchId)}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white"
                    data-testid="button-add-recommended"
                  >
                    Add {recommendation.recommendedSwitchId} plan
                  </Button>
                  <Link href="/switchboard">
                    <Button variant="outline" size="sm">
                      Browse Switches
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedPlan).map(([switchId, items]) => {
              const id = switchId as SwitchId;
              const Icon = SWITCH_ICONS[id];
              const colors = SWITCH_COLORS[id];

              return (
                <motion.div
                  key={id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="border-border">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${colors.bg}`}>
                          <Icon className={`h-4 w-4 ${colors.text}`} />
                        </div>
                        <CardTitle className="text-base text-foreground capitalize">
                          {id}
                        </CardTitle>
                        <Badge 
                          variant="outline" 
                          className="ml-auto text-xs border-border text-muted-foreground"
                        >
                          {mode === "restoring" ? "Restoring" : "Training"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className={`p-3 rounded-lg border transition-all ${
                            item.completed 
                              ? 'border-emerald-500/30 bg-emerald-500/5' 
                              : 'border-border bg-muted/30'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() => handleToggleComplete(item.id)}
                              className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                item.completed 
                                  ? 'bg-emerald-500 border-emerald-500' 
                                  : 'border-border hover:border-primary'
                              }`}
                              data-testid={`checkbox-${item.id}`}
                            >
                              {item.completed && <Check className="h-3 w-3 text-white" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className={`text-sm font-medium ${
                                  item.completed ? 'text-muted-foreground line-through' : 'text-foreground'
                                }`}>
                                  {item.title}
                                </p>
                                <Badge 
                                  variant="outline" 
                                  className="text-xs border-border text-muted-foreground shrink-0"
                                >
                                  {item.estimateMinutes} min
                                </Badge>
                              </div>
                              {!item.completed && (
                                <div className="mt-2 flex gap-2">
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white"
                                    onClick={() => {
                                      trackEvent(EVENTS.PLAN_ACTIVATED, { planItemId: item.id, switchId: id });
                                      navigate(`/switch/${id}`);
                                    }}
                                    data-testid={`button-start-${item.id}`}
                                  >
                                    <Play className="h-3 w-3 mr-1" />
                                    Start
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs text-muted-foreground hover:text-muted-foreground"
                                    onClick={() => handleRemoveItem(item.id)}
                                    data-testid={`button-remove-${item.id}`}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-muted-foreground hover:text-muted-foreground"
                        onClick={() => handleAddPlan(id)}
                        data-testid={`button-add-more-${id}`}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add more
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-border bg-muted/30">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground italic">
                "Small is powerful when it's consistent."
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </ScrollArea>
  );
}
