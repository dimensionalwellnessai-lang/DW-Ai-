import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { CheckCircle, Calendar, ChevronRight, Lock, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface CheckinState {
  trialStartAt: string | null;
  currentWeekNumber: number;
  submittedWeeks: number[];
}

interface WeekResponse {
  id: string;
  weekNumber: number;
  status: string;
  answers: Record<string, string>;
}

const GUEST_STORAGE_KEY = "fts_weekly_checkin";
const GUEST_TRIAL_START_KEY = "fts_trial_start_at";

interface WeekContent {
  intro: string;
  questions: {
    id: string;
    type: "text" | "single-select" | "single-select-with-other";
    text: string;
    options?: string[];
    required?: boolean;
    showWhen?: { parentId: string; values: string[] };
  }[];
}

const WEEK_CONTENT: Record<number, WeekContent> = {
  1: {
    intro: "This is a quiet check-in. There are no right or wrong answers. I'm just trying to understand how the app feels to you.",
    questions: [
      { id: "q1", type: "text", text: "In your own words, what do you think this app is for?", required: true },
      { id: "q2", type: "single-select", text: "How did you feel the first time you opened it?", options: ["Calm", "Curious", "Overwhelmed", "Neutral", "Other"], required: true },
      { id: "q2_other", type: "text", text: "If other, please explain:", showWhen: { parentId: "q2", values: ["Other"] } },
      { id: "q3", type: "text", text: "What did you naturally explore first?" },
      { id: "q4", type: "text", text: "What felt confusing or unclear?" },
      { id: "q5", type: "text", text: "Was there anything that felt unnecessary or distracting?" },
      { id: "q6", type: "single-select-with-other", text: "After using it once or twice, did you feel like coming back?", options: ["Yes", "Maybe", "No"] },
      { id: "q6_why", type: "text", text: "If not, what held you back?", showWhen: { parentId: "q6", values: ["No", "Maybe"] } },
    ],
  },
  2: {
    intro: "This week is about how it fits into real life — not how often you used it.",
    questions: [
      { id: "q1", type: "single-select", text: "How did you end up using the app this week?", options: ["Quick check-ins", "Planning", "Reflection", "Just exploring"], required: true },
      { id: "q2", type: "single-select-with-other", text: "Did the app ever feel like it was asking too much of you?", options: ["Never", "A little", "Yes"], required: true },
      { id: "q2_explain", type: "text", text: "What felt like too much?", showWhen: { parentId: "q2", values: ["A little", "Yes"] } },
      { id: "q3", type: "text", text: "Did anything in the app feel grounding or supportive?" },
      { id: "q4", type: "text", text: "What did you skip entirely?" },
      { id: "q5", type: "text", text: "Did anything feel repetitive, annoying, or forced?" },
      { id: "q6", type: "text", text: "If you stopped using it at any point, what was the reason?" },
    ],
  },
  3: {
    intro: "This week is about trust and usefulness — not productivity.",
    questions: [
      { id: "q1", type: "single-select", text: "Did the app feel supportive, neutral, or intrusive?", options: ["Supportive", "Neutral", "Intrusive"], required: true },
      { id: "q2", type: "single-select-with-other", text: "Did you ever feel judged, rushed, or pressured by it?", options: ["No", "Slightly", "Yes"], required: true },
      { id: "q2_explain", type: "text", text: "What felt that way?", showWhen: { parentId: "q2", values: ["Slightly", "Yes"] } },
      { id: "q3", type: "text", text: "Was there a moment where the app felt genuinely helpful?" },
      { id: "q4", type: "text", text: "Did anything feel 'off' emotionally or energetically?" },
      { id: "q5", type: "single-select-with-other", text: "Do you trust the app with your information and plans?", options: ["Yes", "Unsure", "No"] },
      { id: "q5_why", type: "text", text: "What would help build more trust?", showWhen: { parentId: "q5", values: ["Unsure", "No"] } },
      { id: "q6", type: "single-select", text: "Would you feel comfortable using this on a hard day?", options: ["Yes", "Maybe", "No"] },
    ],
  },
  4: {
    intro: "This is the last check-in. Thank you for being part of this.",
    questions: [
      { id: "q1", type: "text", text: "How would you describe this app to a friend?", required: true },
      { id: "q2", type: "text", text: "What is the most valuable part of it for you?", required: true },
      { id: "q3", type: "text", text: "What is the least valuable part?" },
      { id: "q4", type: "single-select-with-other", text: "Does this feel like something you'd return to on your own?", options: ["Yes", "Maybe", "No"] },
      { id: "q4_why", type: "text", text: "What would bring you back more often?", showWhen: { parentId: "q4", values: ["Maybe", "No"] } },
      { id: "q5", type: "text", text: "What would you remove before adding anything new?" },
      { id: "q6", type: "text", text: "One sentence: How did this app make you feel overall?" },
      { id: "q7", type: "single-select", text: "Did this app make life feel heavier, lighter, or the same?", options: ["Heavier", "Lighter", "The same"] },
    ],
  },
};

function getGuestTrialStart(): Date | null {
  const stored = localStorage.getItem(GUEST_TRIAL_START_KEY);
  return stored ? new Date(stored) : null;
}

function setGuestTrialStart(): Date {
  const now = new Date();
  localStorage.setItem(GUEST_TRIAL_START_KEY, now.toISOString());
  return now;
}

function getGuestWeekData(weekNumber: number): { status: string; answers: Record<string, string> } | null {
  const stored = localStorage.getItem(`${GUEST_STORAGE_KEY}_week_${weekNumber}`);
  return stored ? JSON.parse(stored) : null;
}

function saveGuestWeekData(weekNumber: number, status: string, answers: Record<string, string>) {
  localStorage.setItem(`${GUEST_STORAGE_KEY}_week_${weekNumber}`, JSON.stringify({
    status,
    answers,
    updatedAt: new Date().toISOString(),
  }));
}

function getCurrentWeek(trialStartAt: Date | null): number {
  if (!trialStartAt) return 1;
  const daysSinceStart = Math.floor((Date.now() - new Date(trialStartAt).getTime()) / (1000 * 60 * 60 * 24));
  if (daysSinceStart < 7) return 1;
  if (daysSinceStart < 14) return 2;
  if (daysSinceStart < 21) return 3;
  return 4;
}

function getSubmittedWeeksGuest(): number[] {
  const submitted: number[] = [];
  for (let i = 1; i <= 4; i++) {
    const data = getGuestWeekData(i);
    if (data?.status === "submitted") {
      submitted.push(i);
    }
  }
  return submitted;
}

export default function WeeklyCheckinPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isGuest, setIsGuest] = useState(true);
  const [guestTrialStart, setGuestTrialStartState] = useState<Date | null>(null);
  const [guestSubmittedWeeks, setGuestSubmittedWeeks] = useState<number[]>([]);

  const { data: checkinState, isLoading: stateLoading } = useQuery<CheckinState>({
    queryKey: ["/api/weekly-checkin/state"],
    retry: false,
  });

  const { data: weekData } = useQuery<WeekResponse | null>({
    queryKey: ["/api/weekly-checkin", selectedWeek],
    enabled: !!selectedWeek && !isGuest,
  });

  useEffect(() => {
    if (checkinState) {
      setIsGuest(false);
    } else {
      setIsGuest(true);
      const trialStart = getGuestTrialStart();
      setGuestTrialStartState(trialStart);
      setGuestSubmittedWeeks(getSubmittedWeeksGuest());
    }
  }, [checkinState]);

  useEffect(() => {
    if (weekData?.answers) {
      setAnswers(weekData.answers as Record<string, string>);
    } else if (selectedWeek && isGuest) {
      const guestData = getGuestWeekData(selectedWeek);
      if (guestData?.answers) {
        setAnswers(guestData.answers);
      }
    }
  }, [weekData, selectedWeek, isGuest]);

  const trialStartAt = isGuest ? guestTrialStart : (checkinState?.trialStartAt ? new Date(checkinState.trialStartAt) : null);
  const currentWeekNumber = getCurrentWeek(trialStartAt);
  const submittedWeeks = isGuest ? guestSubmittedWeeks : (checkinState?.submittedWeeks || []);

  const startTrialMutation = useMutation({
    mutationFn: async () => {
      if (isGuest) {
        const newStart = setGuestTrialStart();
        setGuestTrialStartState(newStart);
        return { trialStartAt: newStart };
      }
      return await apiRequest("POST", "/api/weekly-checkin/start");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-checkin/state"] });
    },
  });

  const handleStartTrial = () => {
    startTrialMutation.mutate();
  };

  const handleSelectWeek = (week: number) => {
    if (week > currentWeekNumber && !submittedWeeks.includes(week)) {
      return;
    }
    setSelectedWeek(week);
    setAnswers({});
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSaveDraft = async () => {
    if (!selectedWeek) return;
    setIsSaving(true);
    try {
      if (isGuest) {
        saveGuestWeekData(selectedWeek, "draft", answers);
      } else {
        await apiRequest("POST", `/api/weekly-checkin/${selectedWeek}/save`, {
          status: "draft",
          answers,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/weekly-checkin", selectedWeek] });
      }
      toast({ title: "Saved", description: "Your draft has been saved. You can come back anytime." });
    } catch {
      toast({ title: "Couldn't save", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedWeek) return;
    const content = WEEK_CONTENT[selectedWeek];
    const requiredQuestions = content.questions.filter(q => q.required);
    const missingRequired = requiredQuestions.filter(q => !answers[q.id]?.trim());
    
    if (missingRequired.length > 0) {
      toast({ 
        title: "Almost there", 
        description: "Please answer the highlighted questions to continue.",
        variant: "destructive" 
      });
      return;
    }

    setIsSaving(true);
    try {
      if (isGuest) {
        saveGuestWeekData(selectedWeek, "submitted", answers);
        setGuestSubmittedWeeks(prev => [...prev, selectedWeek]);
      } else {
        await apiRequest("POST", `/api/weekly-checkin/${selectedWeek}/save`, {
          status: "submitted",
          answers,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/weekly-checkin/state"] });
        queryClient.invalidateQueries({ queryKey: ["/api/weekly-checkin", selectedWeek] });
      }
      toast({ title: "Submitted", description: "Thank you for sharing your thoughts." });
      setSelectedWeek(null);
      setAnswers({});
    } catch {
      toast({ title: "Couldn't submit", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const isSubmitted = !!(selectedWeek && submittedWeeks.includes(selectedWeek));
  const weekContent = selectedWeek ? WEEK_CONTENT[selectedWeek] : null;

  if (stateLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <PageHeader title="Beta Feedback" backPath="/" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </main>
      </div>
    );
  }

  if (!trialStartAt) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <PageHeader title="Beta Feedback" backPath="/" />
        <main className="flex-1 flex items-center justify-center p-6">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
              <CardTitle className="font-display text-xl">Beta Feedback</CardTitle>
              <CardDescription>
                Over the next 30 days, you'll have 4 brief check-ins. Each one takes just a few minutes and helps us understand how the app feels to you.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                No pressure. No streaks. You can skip any question or check-in entirely.
              </p>
              <Button 
                className="w-full" 
                onClick={handleStartTrial}
                disabled={startTrialMutation.isPending}
                data-testid="button-start-trial"
              >
                {startTrialMutation.isPending ? "Starting..." : "Begin"}
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!selectedWeek) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <PageHeader title="Beta Feedback" backPath="/" />
        <main className="flex-1 p-6">
          <div className="max-w-md mx-auto space-y-4">
            <p className="text-sm text-muted-foreground text-center mb-6">
              Answer what you feel like. You can leave anything blank.
            </p>
            {[1, 2, 3, 4].map(week => {
              const isLocked = week > currentWeekNumber && !submittedWeeks.includes(week);
              const isCompleted = submittedWeeks.includes(week);
              const isCurrent = week === currentWeekNumber;
              
              return (
                <Card 
                  key={week} 
                  className={`${isLocked ? "opacity-50" : "hover-elevate cursor-pointer"}`}
                  onClick={() => !isLocked && handleSelectWeek(week)}
                  data-testid={`card-week-${week}`}
                >
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {isLocked ? (
                        <Lock className="h-5 w-5 text-muted-foreground" />
                      ) : isCompleted ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium">Week {week}</p>
                        <p className="text-xs text-muted-foreground">
                          {week === 1 && "First Impressions"}
                          {week === 2 && "Usage & Flow"}
                          {week === 3 && "Value & Trust"}
                          {week === 4 && "Overall Reflection"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isCurrent && !isCompleted && (
                        <Badge variant="secondary" className="text-xs">Current</Badge>
                      )}
                      {isCompleted && (
                        <Badge variant="outline" className="text-xs text-green-600">Submitted</Badge>
                      )}
                      {!isLocked && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </main>
      </div>
    );
  }

  const handleBackToWeeks = () => {
    setSelectedWeek(null);
    setAnswers({});
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-50 bg-background border-b px-4 py-3 flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleBackToWeeks}
          data-testid="button-back-to-weeks-header"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-display text-lg font-semibold">Week {selectedWeek}</h1>
      </div>
      <main className="flex-1 p-6 pb-32">
        <div className="max-w-md mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">
                {selectedWeek === 1 && "First Impressions"}
                {selectedWeek === 2 && "Usage & Flow"}
                {selectedWeek === 3 && "Value & Trust"}
                {selectedWeek === 4 && "Overall Reflection"}
              </CardTitle>
              <CardDescription>{weekContent?.intro}</CardDescription>
            </CardHeader>
          </Card>

          {weekContent?.questions.map((question, index) => {
            if (question.showWhen) {
              const parentAnswer = answers[question.showWhen.parentId];
              if (!parentAnswer || !question.showWhen.values.includes(parentAnswer)) {
                return null;
              }
            }

            return (
              <Card key={question.id} data-testid={`question-${question.id}`}>
                <CardContent className="p-4 space-y-3">
                  <Label className="text-sm font-medium">
                    {question.text}
                    {question.required && <span className="text-muted-foreground ml-1">*</span>}
                  </Label>

                  {question.type === "text" && (
                    <Textarea
                      value={answers[question.id] || ""}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      placeholder="Your answer..."
                      className="min-h-[80px]"
                      disabled={isSubmitted}
                      data-testid={`input-${question.id}`}
                    />
                  )}

                  {(question.type === "single-select" || question.type === "single-select-with-other") && (
                    <RadioGroup
                      value={answers[question.id] || ""}
                      onValueChange={(value) => handleAnswerChange(question.id, value)}
                      disabled={isSubmitted}
                    >
                      {question.options?.map(option => (
                        <div key={option} className="flex items-center space-x-2">
                          <RadioGroupItem 
                            value={option} 
                            id={`${question.id}-${option}`}
                            data-testid={`radio-${question.id}-${option}`}
                          />
                          <Label htmlFor={`${question.id}-${option}`} className="font-normal cursor-pointer">
                            {option}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>

      {!isSubmitted && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
          <div className="max-w-md mx-auto flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={handleSaveDraft}
              disabled={isSaving}
              data-testid="button-save-draft"
            >
              Save Draft
            </Button>
            <Button 
              className="flex-1"
              onClick={handleSubmit}
              disabled={isSaving}
              data-testid="button-submit"
            >
              Submit
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            You can come back anytime.
          </p>
        </div>
      )}

      {isSubmitted && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
          <div className="max-w-md mx-auto">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => { setSelectedWeek(null); setAnswers({}); }}
              data-testid="button-back-to-weeks"
            >
              Back to Weeks
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
