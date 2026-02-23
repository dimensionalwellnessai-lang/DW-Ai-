import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/hooks/use-toast";
import { Save, Utensils, Dumbbell, CalendarClock, BookHeart } from "lucide-react";

interface UserValuesRules {
  id: string;
  faithDietaryExclusions?: string[];
  strongFoodDislikes?: string[];
  mealBudgetLevel?: string;
  maxMealPrepTimeMin?: number;
  movementEnvironment?: string[];
  accessibilityNeeds?: string[];
  sensoryNeeds?: string;
  fixedScheduleNotes?: string;
  reminderStyle?: string;
  additionalNotes?: string;
}

interface UserProfile {
  id: string;
  dietRestrictions?: string[];
  allergies?: string[];
  workoutEquipment?: string[];
  workoutLocation?: string;
  injuriesLimitations?: string[];
}

const DIETARY_PATTERNS = [
  "Vegan", "Vegetarian", "Pescatarian", "Keto", "Paleo",
  "Gluten-Free", "Dairy-Free", "Low-FODMAP", "Mediterranean",
];

const FAITH_DIETARY = [
  "Halal", "Kosher", "No pork", "No beef", "No alcohol",
  "Vegan by faith", "Fasting periods", "Jain vegetarian",
];

const COMMON_DISLIKES = [
  "Mushrooms", "Cilantro", "Onions", "Spicy food", "Seafood",
  "Eggs", "Nuts", "Soy", "Beets", "Liver/offal",
];

const MOVEMENT_ENVIRONMENTS = [
  "Home", "Gym", "Outdoor", "Water/swimming", "Studio",
];

const EQUIPMENT_OPTIONS = [
  "No equipment", "Dumbbells", "Barbell", "Resistance bands",
  "Pull-up bar", "Kettlebell", "Yoga mat", "Stationary bike", "Treadmill",
];

const ACCESSIBILITY_OPTIONS = [
  "Seated exercises only", "Low-impact only", "No jumping",
  "Adaptive movement", "Wheelchair accessible", "Limited standing",
];

function toggleItem(list: string[], item: string): string[] {
  return list.includes(item) ? list.filter(i => i !== item) : [...list, item];
}

function ChecklistGroup({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (updated: string[]) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((opt, index) => {
        const checkboxId = `chk-${index}-${opt.replace(/[^a-zA-Z0-9-]/g, "-")}`;
        return (
          <div key={opt} className="flex items-center space-x-2">
            <Checkbox
              id={checkboxId}
              checked={selected.includes(opt)}
              onCheckedChange={() => onChange(toggleItem(selected, opt))}
            />
            <Label htmlFor={checkboxId} className="font-normal cursor-pointer text-sm">
              {opt}
            </Label>
          </div>
        );
      })}
    </div>
  );
}

export default function ValuesRulesProfilePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // --- UserValuesRules state ---
  const [faithDietaryExclusions, setFaithDietaryExclusions] = useState<string[]>([]);
  const [strongFoodDislikes, setStrongFoodDislikes] = useState<string[]>([]);
  const [mealBudgetLevel, setMealBudgetLevel] = useState("moderate");
  const [maxMealPrepTimeMin, setMaxMealPrepTimeMin] = useState<number | undefined>();
  const [movementEnvironment, setMovementEnvironment] = useState<string[]>([]);
  const [accessibilityNeeds, setAccessibilityNeeds] = useState<string[]>([]);
  const [sensoryNeeds, setSensoryNeeds] = useState("");
  const [fixedScheduleNotes, setFixedScheduleNotes] = useState("");
  const [reminderStyle, setReminderStyle] = useState("gentle");
  const [additionalNotes, setAdditionalNotes] = useState("");

  // --- UserProfile state (dietary patterns, allergies, equipment) ---
  const [dietRestrictions, setDietRestrictions] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [workoutEquipment, setWorkoutEquipment] = useState<string[]>([]);

  const { data: valuesRules, isLoading: loadingValues } = useQuery<UserValuesRules | null>({
    queryKey: ["/api/user-values-rules"],
  });

  const { data: userProfile, isLoading: loadingProfile } = useQuery<UserProfile | null>({
    queryKey: ["/api/profile"],
  });

  useEffect(() => {
    if (valuesRules) {
      setFaithDietaryExclusions(valuesRules.faithDietaryExclusions || []);
      setStrongFoodDislikes(valuesRules.strongFoodDislikes || []);
      setMealBudgetLevel(valuesRules.mealBudgetLevel || "moderate");
      setMaxMealPrepTimeMin(valuesRules.maxMealPrepTimeMin);
      setMovementEnvironment(valuesRules.movementEnvironment || []);
      setAccessibilityNeeds(valuesRules.accessibilityNeeds || []);
      setSensoryNeeds(valuesRules.sensoryNeeds || "");
      setFixedScheduleNotes(valuesRules.fixedScheduleNotes || "");
      setReminderStyle(valuesRules.reminderStyle || "gentle");
      setAdditionalNotes(valuesRules.additionalNotes || "");
    }
  }, [valuesRules]);

  useEffect(() => {
    if (userProfile) {
      setDietRestrictions(userProfile.dietRestrictions || []);
      setAllergies(userProfile.allergies || []);
      setWorkoutEquipment(userProfile.workoutEquipment || []);
    }
  }, [userProfile]);

  const saveValuesMutation = useMutation({
    mutationFn: async (data: Partial<UserValuesRules>) => {
      if (valuesRules?.id) {
        const res = await fetch(`/api/user-values-rules/${valuesRules.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Failed to update values & rules");
        return res.json();
      } else {
        const res = await fetch("/api/user-values-rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Failed to create values & rules");
        return res.json();
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/user-values-rules"] }),
  });

  const saveProfileMutation = useMutation({
    mutationFn: async (data: Partial<UserProfile>) => {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/profile"] }),
  });

  const handleSave = async () => {
    try {
      await Promise.all([
        saveValuesMutation.mutateAsync({
          faithDietaryExclusions,
          strongFoodDislikes,
          mealBudgetLevel,
          maxMealPrepTimeMin,
          movementEnvironment,
          accessibilityNeeds,
          sensoryNeeds,
          fixedScheduleNotes,
          reminderStyle,
          additionalNotes,
        }),
        saveProfileMutation.mutateAsync({
          dietRestrictions,
          allergies,
          workoutEquipment,
        }),
      ]);
      toast({ title: "Saved", description: "Your values & rules have been updated." });
    } catch (error) {
      toast({
        title: "Unable to save",
        description: "Something went wrong while saving your values & rules. Please try again.",
        variant: "destructive",
      });
    }
  };

  const isSaving = saveValuesMutation.isPending || saveProfileMutation.isPending;
  const isLoading = loadingValues || loadingProfile;

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-background">
        <PageHeader title="Values & Rules" backPath="/settings" />
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <PageHeader title="Values & Rules" backPath="/settings" />

      <div className="flex-1 overflow-auto">
        <div className="container max-w-2xl mx-auto p-4 space-y-6">
          <p className="text-sm text-muted-foreground">
            Your personal values and constraints are used to personalise meal plans, workouts,
            scheduling, and support suggestions.
          </p>

          {/* ── Food Rules ──────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Utensils className="h-5 w-5 text-primary" />
                <CardTitle>Food Rules</CardTitle>
              </div>
              <CardDescription>Dietary patterns, allergies, exclusions and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              <div className="space-y-2">
                <Label className="text-sm font-medium">Dietary pattern</Label>
                <ChecklistGroup
                  options={DIETARY_PATTERNS}
                  selected={dietRestrictions}
                  onChange={setDietRestrictions}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Faith / belief exclusions</Label>
                <ChecklistGroup
                  options={FAITH_DIETARY}
                  selected={faithDietaryExclusions}
                  onChange={setFaithDietaryExclusions}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Strong dislikes</Label>
                <ChecklistGroup
                  options={COMMON_DISLIKES}
                  selected={strongFoodDislikes}
                  onChange={setStrongFoodDislikes}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Allergies / intolerances</Label>
                <Textarea
                  placeholder="e.g. tree nuts, shellfish, lactose..."
                  value={allergies.join(", ")}
                  onChange={(e) =>
                    setAllergies(
                      e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter((s) => s.length > 0)
                    )
                  }
                  rows={2}
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Meal budget</Label>
                <RadioGroup value={mealBudgetLevel} onValueChange={setMealBudgetLevel}>
                  {[
                    { value: "budget", label: "Budget – keep it affordable" },
                    { value: "moderate", label: "Moderate – balanced cost" },
                    { value: "flexible", label: "Flexible – ingredients quality first" },
                  ].map(({ value, label }) => (
                    <div key={value} className="flex items-center space-x-2">
                      <RadioGroupItem value={value} id={`budget-${value}`} />
                      <Label htmlFor={`budget-${value}`} className="font-normal cursor-pointer">
                        {label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Max meal prep time</Label>
                <RadioGroup
                  value={maxMealPrepTimeMin?.toString() ?? ""}
                  onValueChange={(v) => setMaxMealPrepTimeMin(Number(v))}
                >
                  {[
                    { value: "15", label: "15 min or less" },
                    { value: "30", label: "30 min" },
                    { value: "60", label: "Up to 1 hour" },
                    { value: "120", label: "2+ hours (batch cooking)" },
                  ].map(({ value, label }) => (
                    <div key={value} className="flex items-center space-x-2">
                      <RadioGroupItem value={value} id={`prep-${value}`} />
                      <Label htmlFor={`prep-${value}`} className="font-normal cursor-pointer">
                        {label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

            </CardContent>
          </Card>

          {/* ── Movement Rules ──────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5 text-primary" />
                <CardTitle>Movement Rules</CardTitle>
              </div>
              <CardDescription>Equipment, environment, and access needs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              <div className="space-y-2">
                <Label className="text-sm font-medium">Preferred environment</Label>
                <ChecklistGroup
                  options={MOVEMENT_ENVIRONMENTS}
                  selected={movementEnvironment}
                  onChange={setMovementEnvironment}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Available equipment</Label>
                <ChecklistGroup
                  options={EQUIPMENT_OPTIONS}
                  selected={workoutEquipment}
                  onChange={setWorkoutEquipment}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Accessibility needs</Label>
                <ChecklistGroup
                  options={ACCESSIBILITY_OPTIONS}
                  selected={accessibilityNeeds}
                  onChange={setAccessibilityNeeds}
                />
              </div>

            </CardContent>
          </Card>

          {/* ── Life / State Constraints ─────────────────────────────── */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-primary" />
                <CardTitle>Life &amp; State Constraints</CardTitle>
              </div>
              <CardDescription>Fixed schedules, reminders, and sensory needs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              <div className="space-y-2">
                <Label className="text-sm font-medium">Fixed schedule constraints</Label>
                <Textarea
                  placeholder="e.g. school pickup at 3 pm daily, shift work Fri–Sun nights..."
                  value={fixedScheduleNotes}
                  onChange={(e) => setFixedScheduleNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Reminder style</Label>
                <RadioGroup value={reminderStyle} onValueChange={setReminderStyle}>
                  {[
                    { value: "gentle", label: "Gentle – soft nudges only" },
                    { value: "regular", label: "Regular – standard reminders" },
                    { value: "proactive", label: "Proactive – check in frequently" },
                  ].map(({ value, label }) => (
                    <div key={value} className="flex items-center space-x-2">
                      <RadioGroupItem value={value} id={`reminder-${value}`} />
                      <Label htmlFor={`reminder-${value}`} className="font-normal cursor-pointer">
                        {label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Sensory / environmental needs</Label>
                <Textarea
                  placeholder="e.g. noise sensitivity, prefer low-light environments, scent allergies..."
                  value={sensoryNeeds}
                  onChange={(e) => setSensoryNeeds(e.target.value)}
                  rows={3}
                />
              </div>

            </CardContent>
          </Card>

          {/* ── Additional Notes ─────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BookHeart className="h-5 w-5 text-primary" />
                <CardTitle>Additional Notes</CardTitle>
              </div>
              <CardDescription>Anything else the AI should know about your values and boundaries</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Freeform notes — cultural context, life circumstances, strong preferences..."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={4}
              />
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={isSaving} className="w-full" size="lg">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Values & Rules"}
          </Button>
        </div>
      </div>
    </div>
  );
}
