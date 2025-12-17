import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  role: "assistant" | "user";
  content: string;
}

interface OnboardingData {
  currentSchedule: string;
  wakeTime: string;
  sleepTime: string;
  workSchedule: string;
  commitments: string;
  freeTimeHours: string;
  physicalGoals: string;
  mentalGoals: string;
  emotionalGoals: string;
  spiritualGoals: string;
  socialGoals: string;
  financialGoals: string;
  dietaryNeeds: string;
  mealPreferences: string;
  systemName: string;
}

const ONBOARDING_STAGES = [
  {
    id: "welcome",
    question: "Welcome! I'm here to help you create your personalized life system. Let's start by understanding your current routine. What does a typical day look like for you?",
    field: "currentSchedule",
  },
  {
    id: "wake_time",
    question: "Great! What time do you usually wake up in the morning?",
    field: "wakeTime",
  },
  {
    id: "sleep_time",
    question: "And what time do you typically go to bed?",
    field: "sleepTime",
  },
  {
    id: "work",
    question: "Tell me about your work or main commitments. What hours do you work? Do you have any recurring meetings or responsibilities throughout the week?",
    field: "workSchedule",
  },
  {
    id: "commitments",
    question: "What other regular commitments do you have? This could include family time, social activities, hobbies, workouts, or anything else that's part of your weekly rhythm.",
    field: "commitments",
  },
  {
    id: "free_time",
    question: "How much free time do you typically have each day for personal wellness activities? (For example: less than 1 hour, 1-2 hours, 2-4 hours, or more than 4 hours)",
    field: "freeTimeHours",
  },
  {
    id: "physical",
    question: "Now let's talk about your wellness goals. Starting with physical health - what are your goals for your body? Think about energy, fitness, movement, or any health improvements you'd like to make.",
    field: "physicalGoals",
  },
  {
    id: "mental",
    question: "What about mental wellness? What goals do you have for focus, productivity, learning, or mental clarity?",
    field: "mentalGoals",
  },
  {
    id: "emotional",
    question: "For emotional wellness - what would you like to improve? This could include stress management, emotional regulation, self-awareness, or finding more joy and peace.",
    field: "emotionalGoals",
  },
  {
    id: "spiritual",
    question: "What about spiritual or purpose-driven goals? This might include mindfulness, meditation, connecting with something greater, or finding deeper meaning in your daily life.",
    field: "spiritualGoals",
  },
  {
    id: "social",
    question: "Let's talk about your social life. What are your goals for relationships - whether with family, friends, romantic partners, or building new connections?",
    field: "socialGoals",
  },
  {
    id: "financial",
    question: "What financial goals would you like to work toward? This could include budgeting, saving, building a business, or creating more financial freedom.",
    field: "financialGoals",
  },
  {
    id: "dietary",
    question: "Now for nutrition. Do you have any dietary needs, restrictions, or preferences I should know about? (vegetarian, allergies, health conditions, etc.)",
    field: "dietaryNeeds",
  },
  {
    id: "meals",
    question: "What are your meal preferences and goals? How do you feel about meal prepping? What types of foods energize you, and what would you like to eat more or less of?",
    field: "mealPreferences",
  },
  {
    id: "system_name",
    question: "Wonderful! I have a great picture of who you are and what you want to achieve. One last thing - let's give your life system a name. This could be something personal like 'The [Your Name] Method' or something aspirational. What would you like to call it?",
    field: "systemName",
  },
];

export function OnboardingFlow() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [stage, setStage] = useState(0);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: ONBOARDING_STAGES[0].question },
  ]);
  const [data, setData] = useState<OnboardingData>({
    currentSchedule: "",
    wakeTime: "",
    sleepTime: "",
    workSchedule: "",
    commitments: "",
    freeTimeHours: "",
    physicalGoals: "",
    mentalGoals: "",
    emotionalGoals: "",
    spiritualGoals: "",
    socialGoals: "",
    financialGoals: "",
    dietaryNeeds: "",
    mealPreferences: "",
    systemName: "",
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const extractInfoFromResponse = (response: string, currentData: OnboardingData): Partial<OnboardingData> => {
    const extracted: Partial<OnboardingData> = {};
    const lower = response.toLowerCase();
    
    const wakeMatch = response.match(/(?:wake|get up|up at|morning at|start my day at)\s*(?:at\s*)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
    if (wakeMatch && !currentData.wakeTime) {
      extracted.wakeTime = wakeMatch[1];
    }
    
    const sleepMatch = response.match(/(?:sleep|bed|asleep|go to bed)\s*(?:at\s*|around\s*)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
    if (sleepMatch && !currentData.sleepTime) {
      extracted.sleepTime = sleepMatch[1];
    }
    
    const workMatch = response.match(/(?:work|job|office)\s*(?:from\s*)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*(?:to|-)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
    if (workMatch && !currentData.workSchedule) {
      extracted.workSchedule = response;
    }
    
    if (!currentData.freeTimeHours) {
      if (lower.includes("less than 1") || lower.includes("under an hour") || lower.includes("30 min") || lower.includes("no free time")) {
        extracted.freeTimeHours = "less than 1 hour";
      } else if (lower.includes("1-2 hour") || lower.includes("couple hour") || lower.includes("one to two")) {
        extracted.freeTimeHours = "1-2 hours";
      } else if (lower.includes("2-4 hour") || lower.includes("few hour") || lower.includes("several hour")) {
        extracted.freeTimeHours = "2-4 hours";
      } else if (lower.includes("4+ hour") || lower.includes("more than 4") || lower.includes("lot of free time")) {
        extracted.freeTimeHours = "more than 4 hours";
      }
    }
    
    return extracted;
  };

  const findNextUnansweredStage = (currentStage: number, currentData: OnboardingData): number => {
    for (let i = currentStage + 1; i < ONBOARDING_STAGES.length; i++) {
      const field = ONBOARDING_STAGES[i].field as keyof OnboardingData;
      if (!currentData[field]) {
        return i;
      }
    }
    return ONBOARDING_STAGES.length - 1;
  };

  const submitMutation = useMutation({
    mutationFn: async (onboardingData: OnboardingData) => {
      const responsibilities: string[] = [];
      if (onboardingData.workSchedule) responsibilities.push("work");
      if (onboardingData.physicalGoals) responsibilities.push("health");
      if (onboardingData.socialGoals) responsibilities.push("relationships");
      if (onboardingData.financialGoals) responsibilities.push("financial");
      
      const commitmentsLower = onboardingData.commitments?.toLowerCase() || "";
      if (commitmentsLower.includes("hobby") || commitmentsLower.includes("creative") || commitmentsLower.includes("art") || commitmentsLower.includes("music") || commitmentsLower.includes("sport")) {
        responsibilities.push("hobbies");
      }
      if (commitmentsLower.includes("home") || commitmentsLower.includes("house") || commitmentsLower.includes("chore") || commitmentsLower.includes("clean")) {
        responsibilities.push("home");
      }
      if (commitmentsLower.includes("family") || commitmentsLower.includes("kid") || commitmentsLower.includes("child") || commitmentsLower.includes("parent")) {
        responsibilities.push("family");
      }

      const wellnessFocus: string[] = [];
      if (onboardingData.physicalGoals) wellnessFocus.push("energy");
      if (onboardingData.mentalGoals) wellnessFocus.push("focus");
      if (onboardingData.emotionalGoals) wellnessFocus.push("emotional");
      if (onboardingData.spiritualGoals) wellnessFocus.push("purpose");
      if (onboardingData.socialGoals) wellnessFocus.push("connection");

      const peakTime = onboardingData.wakeTime?.toLowerCase() || "";
      const peakMotivationTime = peakTime.includes("5") || peakTime.includes("6") || peakTime.includes("early") 
        ? "morning" 
        : peakTime.includes("7") || peakTime.includes("8") 
          ? "morning" 
          : "varies";

      const freeTimeLower = onboardingData.freeTimeHours?.toLowerCase() || "";
      let freeTimeEnum = "2-4";
      if (freeTimeLower.includes("less than") || freeTimeLower.includes("30 min") || freeTimeLower.includes("under 1") || freeTimeLower.includes("no time")) {
        freeTimeEnum = "less-1";
      } else if (freeTimeLower.includes("1-2") || freeTimeLower.includes("one to two") || freeTimeLower.includes("couple") || freeTimeLower.includes("1 hour") || freeTimeLower.includes("an hour")) {
        freeTimeEnum = "1-2";
      } else if (freeTimeLower.includes("2-4") || freeTimeLower.includes("two to four") || freeTimeLower.includes("few hours") || freeTimeLower.includes("2 hour") || freeTimeLower.includes("3 hour")) {
        freeTimeEnum = "2-4";
      } else if (freeTimeLower.includes("4+") || freeTimeLower.includes("more than 4") || freeTimeLower.includes("lot of") || freeTimeLower.includes("plenty") || freeTimeLower.includes("5") || freeTimeLower.includes("6")) {
        freeTimeEnum = "4-plus";
      }

      return apiRequest("POST", "/api/onboarding/complete", {
        responsibilities,
        priorities: wellnessFocus,
        freeTimeHours: freeTimeEnum,
        peakMotivationTime,
        wellnessFocus,
        systemName: onboardingData.systemName || "My Life System",
        lifeAreaDetails: {
          schedule: { goals: onboardingData.currentSchedule, schedule: onboardingData.currentSchedule, challenges: "" },
          work: { goals: onboardingData.workSchedule, schedule: onboardingData.workSchedule, challenges: "" },
          health: { goals: onboardingData.physicalGoals, schedule: `Wake: ${onboardingData.wakeTime}, Sleep: ${onboardingData.sleepTime}`, challenges: "" },
          relationships: { goals: onboardingData.socialGoals, schedule: onboardingData.commitments, challenges: "" },
          financial: { goals: onboardingData.financialGoals, schedule: "", challenges: "" },
          nutrition: { goals: onboardingData.dietaryNeeds, schedule: onboardingData.mealPreferences, challenges: "" },
          commitments: { goals: onboardingData.commitments, schedule: onboardingData.freeTimeHours, challenges: "" },
        },
        shortTermGoals: `Current routine: ${onboardingData.currentSchedule}. Physical: ${onboardingData.physicalGoals}. Mental: ${onboardingData.mentalGoals}. Emotional: ${onboardingData.emotionalGoals}`,
        longTermGoals: `Spiritual: ${onboardingData.spiritualGoals}. Social: ${onboardingData.socialGoals}. Financial: ${onboardingData.financialGoals}`,
        relationshipGoals: onboardingData.socialGoals,
        conversationData: onboardingData,
      });
    },
    onSuccess: () => {
      toast({
        title: "Your life system is ready!",
        description: "Let's start building your best life.",
      });
      setLocation("/dashboard");
    },
    onError: () => {
      toast({
        title: "Something went wrong",
        description: "Please try again.",
        variant: "destructive",
      });
      setIsGenerating(false);
    },
  });

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    
    const currentField = ONBOARDING_STAGES[stage].field as keyof OnboardingData;
    const extractedData = extractInfoFromResponse(userMessage, data);
    const updatedData = { ...data, [currentField]: userMessage, ...extractedData };
    setData(updatedData);
    setInput("");

    if (stage < ONBOARDING_STAGES.length - 1) {
      setTimeout(() => {
        const nextStage = findNextUnansweredStage(stage, updatedData);
        setStage(nextStage);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: ONBOARDING_STAGES[nextStage].question },
        ]);
      }, 500);
    } else {
      setIsGenerating(true);
      const finalData = updatedData;
      
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Perfect! I'm now creating "${finalData.systemName || "Your Life System"}" - a personalized routine with your schedule, wellness goals, and meal planning built in. This will include morning rituals, work blocks, evening wind-down, meal prep times, and activities aligned with all your goals. Let me put it all together for you...`,
          },
        ]);
        
        setTimeout(() => {
          submitMutation.mutate(finalData);
        }, 1500);
      }, 500);
    }
  };

  const progress = ((stage + 1) / ONBOARDING_STAGES.length) * 100;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl h-[80vh] flex flex-col">
        <div className="p-4 border-b flex items-center gap-3">
          <div className="p-2 rounded-full bg-chart-1/10">
            <Sparkles className="w-5 h-5 text-chart-1" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold" data-testid="text-onboarding-title">Creating Your Life System</h2>
            <p className="text-sm text-muted-foreground">Step {stage + 1} of {ONBOARDING_STAGES.length}</p>
          </div>
          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-chart-1 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <CardContent className="flex-1 p-0 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] p-4 rounded-2xl ${
                      message.role === "user"
                        ? "bg-chart-1 text-primary-foreground"
                        : "bg-muted"
                    }`}
                    data-testid={`message-onboarding-${index}`}
                  >
                    <p className={message.role === "assistant" ? "font-serif leading-relaxed" : ""}>
                      {message.content}
                    </p>
                  </div>
                </div>
              ))}
              {isGenerating && (
                <div className="flex justify-start">
                  <div className="bg-muted p-4 rounded-2xl flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-muted-foreground">Building your life system...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your response..."
                className="resize-none min-h-[44px] max-h-32"
                disabled={isGenerating}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                data-testid="input-onboarding-message"
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!input.trim() || isGenerating}
                data-testid="button-send-onboarding"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
