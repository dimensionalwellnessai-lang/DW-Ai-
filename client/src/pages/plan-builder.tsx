import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, ArrowRight, ArrowLeft, Check, Calendar, Dumbbell, Utensils, Heart, Loader2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

const DIMENSIONS = [
  { id: "physical", label: "Physical", icon: Dumbbell, color: "bg-green-500" },
  { id: "nutrition", label: "Nutrition", icon: Utensils, color: "bg-orange-500" },
  { id: "mental", label: "Mental", icon: Heart, color: "bg-purple-500" },
  { id: "schedule", label: "Schedule", icon: Calendar, color: "bg-blue-500" },
];

const LOCAL_PLANS_KEY = "fts_local_plans";

interface Plan {
  id: string;
  name: string;
  status: "draft" | "active" | "archived";
  itemCount: number;
  createdAt: string;
  goals?: string;
  dimensions?: string[];
  scheduleItems?: any[];
}

function getLocalPlans(): Plan[] {
  try {
    const stored = localStorage.getItem(LOCAL_PLANS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveLocalPlans(plans: Plan[]) {
  localStorage.setItem(LOCAL_PLANS_KEY, JSON.stringify(plans));
}

export default function PlanBuilderPage() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [planName, setPlanName] = useState("");
  const [goals, setGoals] = useState("");
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>([]);

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  const toggleDimension = (id: string) => {
    setSelectedDimensions(prev => 
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      setLocation("/plans");
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const newPlan: Plan = {
      id: `plan-${Date.now()}`,
      name: planName || "My Wellness Plan",
      status: "draft",
      itemCount: Math.floor(Math.random() * 10) + 5,
      createdAt: new Date().toISOString(),
      goals,
      dimensions: selectedDimensions,
      scheduleItems: [],
    };
    
    const plans = getLocalPlans();
    plans.unshift(newPlan);
    saveLocalPlans(plans);
    
    setIsGenerating(false);
    setLocation(`/schedule-review/${newPlan.id}`);
  };

  const canProceed = () => {
    if (step === 1) return planName.trim().length > 0;
    if (step === 2) return selectedDimensions.length > 0;
    if (step === 3) return goals.trim().length > 0;
    return false;
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Plan Builder" backPath="/plans" />
      
      <ScrollArea className="h-[calc(100vh-57px)]">
        <div className="p-4 max-w-lg mx-auto space-y-6 pb-8">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Step {step} of {totalSteps}</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Name Your Plan
                </CardTitle>
                <CardDescription>
                  Give your wellness plan a name that resonates with you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="plan-name">Plan Name</Label>
                  <Input
                    id="plan-name"
                    placeholder="e.g., My Morning Routine, Weekly Wellness"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    data-testid="input-plan-name"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Choose Focus Areas</CardTitle>
                <CardDescription>
                  Select the dimensions you want to include in your plan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {DIMENSIONS.map(dim => {
                    const Icon = dim.icon;
                    const isSelected = selectedDimensions.includes(dim.id);
                    return (
                      <Card
                        key={dim.id}
                        className={`cursor-pointer transition-all ${
                          isSelected ? "ring-2 ring-primary" : "hover-elevate"
                        }`}
                        onClick={() => toggleDimension(dim.id)}
                        data-testid={`card-dimension-${dim.id}`}
                      >
                        <CardContent className="p-4 flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg ${dim.color} flex items-center justify-center`}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{dim.label}</div>
                          </div>
                          {isSelected && (
                            <Check className="w-5 h-5 text-primary" />
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>What Are Your Goals?</CardTitle>
                <CardDescription>
                  Describe what you want to achieve with this plan
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="goals">Your Goals</Label>
                  <Textarea
                    id="goals"
                    placeholder="e.g., Build a morning routine, exercise 3x per week, eat healthier..."
                    value={goals}
                    onChange={(e) => setGoals(e.target.value)}
                    rows={4}
                    data-testid="input-goals"
                  />
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {selectedDimensions.map(id => {
                    const dim = DIMENSIONS.find(d => d.id === id);
                    return dim ? (
                      <Badge key={id} variant="secondary">{dim.label}</Badge>
                    ) : null;
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex-1 gap-2"
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4" />
              {step === 1 ? "Cancel" : "Back"}
            </Button>
            
            {step < totalSteps ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="flex-1 gap-2"
                data-testid="button-next"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleGenerate}
                disabled={!canProceed() || isGenerating}
                className="flex-1 gap-2"
                data-testid="button-generate"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Plan
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
