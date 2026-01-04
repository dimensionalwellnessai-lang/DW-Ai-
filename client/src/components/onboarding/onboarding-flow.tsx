import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Send, Loader2, Heart, Brain, Smile, Sun, Users, DollarSign, Utensils, Calendar, Check } from "lucide-react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  role: "assistant" | "user";
  content: string;
}

interface WellnessArea {
  id: string;
  name: string;
  description: string;
  icon: typeof Heart;
  color: string;
  questions: string[];
  fields: string[];
}

const WELLNESS_AREAS: WellnessArea[] = [
  {
    id: "schedule",
    name: "Daily Schedule",
    description: "Wake time, sleep time, work hours",
    icon: Calendar,
    color: "text-blue-500",
    questions: [
      "Tell me about your daily schedule - when do you wake up, what time do you work, and when do you go to bed?",
    ],
    fields: ["currentSchedule", "wakeTime", "sleepTime", "workSchedule", "freeTimeHours"],
  },
  {
    id: "physical",
    name: "Physical Health",
    description: "Fitness, energy, movement",
    icon: Heart,
    color: "text-red-500",
    questions: [
      "What are your physical health goals? Think about fitness, energy levels, exercise habits, or any health improvements you'd like to make.",
    ],
    fields: ["physicalGoals"],
  },
  {
    id: "mental",
    name: "Mental Wellness",
    description: "Focus, productivity, learning",
    icon: Brain,
    color: "text-purple-500",
    questions: [
      "What are your mental wellness goals? This could include focus, productivity, learning new skills, or mental clarity.",
    ],
    fields: ["mentalGoals"],
  },
  {
    id: "emotional",
    name: "Emotional Balance",
    description: "Stress, happiness, self-awareness",
    icon: Smile,
    color: "text-yellow-500",
    questions: [
      "What would you like to improve emotionally? Think about stress management, finding more joy, emotional regulation, or self-awareness.",
    ],
    fields: ["emotionalGoals"],
  },
  {
    id: "spiritual",
    name: "Spiritual Growth",
    description: "Purpose, mindfulness, meaning",
    icon: Sun,
    color: "text-orange-500",
    questions: [
      "What spiritual or purpose-driven goals matter to you? This might include mindfulness, meditation, gratitude, or finding deeper meaning.",
    ],
    fields: ["spiritualGoals"],
  },
  {
    id: "social",
    name: "Relationships",
    description: "Family, friends, connections",
    icon: Users,
    color: "text-green-500",
    questions: [
      "What are your goals for relationships? Consider family bonds, friendships, romantic relationships, or building new connections.",
    ],
    fields: ["socialGoals", "commitments"],
  },
  {
    id: "financial",
    name: "Financial Wellness",
    description: "Budgeting, saving, goals",
    icon: DollarSign,
    color: "text-emerald-500",
    questions: [
      "What financial goals would you like to work toward? This could include budgeting, saving, investing, or building more financial freedom.",
    ],
    fields: ["financialGoals"],
  },
  {
    id: "nutrition",
    name: "Nutrition",
    description: "Diet, meal planning, eating habits",
    icon: Utensils,
    color: "text-pink-500",
    questions: [
      "Tell me about your nutrition goals and any dietary needs. Include any restrictions, meal preferences, and what types of foods energize you.",
    ],
    fields: ["dietaryNeeds", "mealPreferences"],
  },
];

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

type OnboardingPhase = "selection" | "conversation" | "naming";

export function OnboardingFlow() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [phase, setPhase] = useState<OnboardingPhase>("selection");
  const [selectedAreas, setSelectedAreas] = useState<string[]>(["schedule"]);
  const [currentAreaIndex, setCurrentAreaIndex] = useState(0);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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

  const toggleArea = (areaId: string) => {
    if (areaId === "schedule") return;
    setSelectedAreas((prev) =>
      prev.includes(areaId) ? prev.filter((id) => id !== areaId) : [...prev, areaId]
    );
  };

  const startConversation = () => {
    const orderedAreas = WELLNESS_AREAS.filter((area) => selectedAreas.includes(area.id));
    const firstArea = orderedAreas[0];
    setMessages([
      {
        role: "assistant",
        content: `Great choices! Let's start building your personalized life system. I'll ask you about each area you selected.\n\n${firstArea.questions[0]}`,
      },
    ]);
    setPhase("conversation");
  };

  const extractDataFromResponse = (response: string, areaId: string): Partial<OnboardingData> => {
    const extracted: Partial<OnboardingData> = {};
    const lower = response.toLowerCase();

    if (areaId === "schedule") {
      extracted.currentSchedule = response;
      
      const wakeMatch = response.match(/(?:wake|get up|up at|morning at|start.{0,10}day)\s*(?:at\s*|around\s*)?(\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)?)/i);
      if (wakeMatch) extracted.wakeTime = wakeMatch[1];
      
      const sleepMatch = response.match(/(?:sleep|bed|asleep|go to bed|turn in)\s*(?:at\s*|around\s*|by\s*)?(\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)?)/i);
      if (sleepMatch) extracted.sleepTime = sleepMatch[1];
      
      const workMatch = response.match(/(?:work|job|office|shift)\s*(?:from\s*|at\s*)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*(?:to|-|until)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
      if (workMatch) extracted.workSchedule = workMatch[0];
      
      if (lower.includes("less than 1") || lower.includes("under an hour") || lower.includes("30 min") || lower.includes("no free time") || lower.includes("very busy")) {
        extracted.freeTimeHours = "less than 1 hour";
      } else if (lower.includes("1-2") || lower.includes("one to two") || lower.includes("couple hour") || lower.includes("hour or two")) {
        extracted.freeTimeHours = "1-2 hours";
      } else if (lower.includes("2-4") || lower.includes("two to four") || lower.includes("few hour") || lower.includes("several hour")) {
        extracted.freeTimeHours = "2-4 hours";
      } else if (lower.includes("4+") || lower.includes("more than 4") || lower.includes("lot of free") || lower.includes("plenty of time")) {
        extracted.freeTimeHours = "more than 4 hours";
      }
    }

    if (areaId === "physical") {
      extracted.physicalGoals = response;
    }

    if (areaId === "mental") {
      extracted.mentalGoals = response;
    }

    if (areaId === "emotional") {
      extracted.emotionalGoals = response;
    }

    if (areaId === "spiritual") {
      extracted.spiritualGoals = response;
    }

    if (areaId === "social") {
      extracted.socialGoals = response;
      if (lower.includes("family") || lower.includes("kid") || lower.includes("parent") || lower.includes("spouse") || lower.includes("partner")) {
        extracted.commitments = response;
      }
    }

    if (areaId === "financial") {
      extracted.financialGoals = response;
    }

    if (areaId === "nutrition") {
      extracted.dietaryNeeds = response;
      extracted.mealPreferences = response;
    }

    return extracted;
  };

  const submitMutation = useMutation({
    mutationFn: async (onboardingData: OnboardingData) => {
      const responsibilities: string[] = [];
      if (onboardingData.workSchedule || onboardingData.currentSchedule?.toLowerCase().includes("work")) {
        responsibilities.push("work");
      }
      if (onboardingData.physicalGoals) responsibilities.push("health");
      if (onboardingData.socialGoals) responsibilities.push("relationships");
      if (onboardingData.financialGoals) responsibilities.push("financial");

      const commitmentsLower = (onboardingData.commitments + " " + onboardingData.currentSchedule + " " + onboardingData.socialGoals).toLowerCase();
      if (commitmentsLower.includes("hobby") || commitmentsLower.includes("creative") || commitmentsLower.includes("art") || commitmentsLower.includes("music") || commitmentsLower.includes("sport") || commitmentsLower.includes("game")) {
        responsibilities.push("hobbies");
      }
      if (commitmentsLower.includes("home") || commitmentsLower.includes("house") || commitmentsLower.includes("chore") || commitmentsLower.includes("clean") || commitmentsLower.includes("cook")) {
        responsibilities.push("home");
      }
      if (commitmentsLower.includes("family") || commitmentsLower.includes("kid") || commitmentsLower.includes("child") || commitmentsLower.includes("parent") || commitmentsLower.includes("spouse")) {
        responsibilities.push("family");
      }

      const wellnessFocus: string[] = [];
      if (onboardingData.physicalGoals) wellnessFocus.push("energy");
      if (onboardingData.mentalGoals) wellnessFocus.push("focus");
      if (onboardingData.emotionalGoals) wellnessFocus.push("emotional");
      if (onboardingData.spiritualGoals) wellnessFocus.push("purpose");
      if (onboardingData.socialGoals) wellnessFocus.push("connection");

      const scheduleInfo = (onboardingData.currentSchedule + " " + onboardingData.wakeTime).toLowerCase();
      const peakMotivationTime = scheduleInfo.includes("5am") || scheduleInfo.includes("6am") || scheduleInfo.includes("early") || scheduleInfo.includes("5 am") || scheduleInfo.includes("6 am")
        ? "morning"
        : scheduleInfo.includes("7am") || scheduleInfo.includes("8am") || scheduleInfo.includes("7 am") || scheduleInfo.includes("8 am")
          ? "morning"
          : "varies";

      const freeTimeLower = onboardingData.freeTimeHours?.toLowerCase() || "";
      let freeTimeEnum = "2-4";
      if (freeTimeLower.includes("less than") || freeTimeLower.includes("under") || freeTimeLower.includes("30 min") || freeTimeLower.includes("no")) {
        freeTimeEnum = "less-1";
      } else if (freeTimeLower.includes("1-2") || freeTimeLower.includes("one") || freeTimeLower.includes("couple") || freeTimeLower.includes("hour or two")) {
        freeTimeEnum = "1-2";
      } else if (freeTimeLower.includes("2-4") || freeTimeLower.includes("few") || freeTimeLower.includes("several") || freeTimeLower.includes("2") || freeTimeLower.includes("3")) {
        freeTimeEnum = "2-4";
      } else if (freeTimeLower.includes("4") || freeTimeLower.includes("more") || freeTimeLower.includes("lot") || freeTimeLower.includes("plenty")) {
        freeTimeEnum = "4-plus";
      }

      return apiRequest("POST", "/api/onboarding/complete", {
        responsibilities,
        priorities: wellnessFocus,
        freeTimeHours: freeTimeEnum,
        peakMotivationTime,
        wellnessFocus,
        systemName: onboardingData.systemName || "My Life System",
        selectedAreas,
        lifeAreaDetails: {
          schedule: { goals: onboardingData.currentSchedule, schedule: `Wake: ${onboardingData.wakeTime || "not specified"}, Sleep: ${onboardingData.sleepTime || "not specified"}, Work: ${onboardingData.workSchedule || "not specified"}`, challenges: "" },
          work: { goals: onboardingData.workSchedule, schedule: onboardingData.workSchedule, challenges: "" },
          health: { goals: onboardingData.physicalGoals, schedule: "", challenges: "" },
          mental: { goals: onboardingData.mentalGoals, schedule: "", challenges: "" },
          emotional: { goals: onboardingData.emotionalGoals, schedule: "", challenges: "" },
          spiritual: { goals: onboardingData.spiritualGoals, schedule: "", challenges: "" },
          relationships: { goals: onboardingData.socialGoals, schedule: onboardingData.commitments, challenges: "" },
          financial: { goals: onboardingData.financialGoals, schedule: "", challenges: "" },
          nutrition: { goals: onboardingData.dietaryNeeds, schedule: onboardingData.mealPreferences, challenges: "" },
        },
        shortTermGoals: `Schedule: ${onboardingData.currentSchedule}. Physical: ${onboardingData.physicalGoals}. Mental: ${onboardingData.mentalGoals}. Emotional: ${onboardingData.emotionalGoals}`,
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
        title: "That didn't go through just yet.",
        description: "You can try again, or come back later.",
        variant: "destructive",
      });
      setIsGenerating(false);
    },
  });

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    const orderedAreas = WELLNESS_AREAS.filter((area) => selectedAreas.includes(area.id));
    const currentArea = orderedAreas[currentAreaIndex];

    const extractedData = extractDataFromResponse(userMessage, currentArea.id);
    const updatedData = { ...data, ...extractedData };
    setData(updatedData);
    setInput("");

    const nextIndex = currentAreaIndex + 1;

    if (nextIndex < orderedAreas.length) {
      setTimeout(() => {
        const nextArea = orderedAreas[nextIndex];
        setCurrentAreaIndex(nextIndex);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Got it! Now let's talk about ${nextArea.name.toLowerCase()}.\n\n${nextArea.questions[0]}`,
          },
        ]);
      }, 500);
    } else {
      setPhase("naming");
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Wonderful! I have a great picture of who you are and what you want to achieve. One last thing - let's give your life system a name. This could be something personal like 'The [Your Name] Method' or something aspirational. What would you like to call it?",
          },
        ]);
      }, 500);
    }
  };

  const handleNameSubmit = () => {
    if (!input.trim()) return;

    const systemName = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: systemName }]);
    setInput("");
    setIsGenerating(true);

    const finalData = { ...data, systemName };
    setData(finalData);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Perfect! I'm now creating "${systemName}" - a personalized routine with your schedule, wellness goals, and recommendations all built in. Let me put it all together for you...`,
        },
      ]);

      setTimeout(() => {
        submitMutation.mutate(finalData);
      }, 1500);
    }, 500);
  };

  if (phase === "selection") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-3xl">
          <CardHeader className="text-center">
            <div className="mx-auto p-3 rounded-full bg-chart-1/10 w-fit mb-4">
              <Sparkles className="w-8 h-8 text-chart-1" />
            </div>
            <CardTitle className="text-2xl" data-testid="text-selection-title">
              What areas of life would you like to improve?
            </CardTitle>
            <CardDescription className="text-base">
              Select all the areas you want your life system to help you with. Your schedule is always included.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {WELLNESS_AREAS.map((area) => {
                const Icon = area.icon;
                const isSelected = selectedAreas.includes(area.id);
                const isRequired = area.id === "schedule";

                return (
                  <button
                    key={area.id}
                    onClick={() => toggleArea(area.id)}
                    disabled={isRequired}
                    className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? "border-chart-1 bg-chart-1/5"
                        : "border-border hover-elevate"
                    } ${isRequired ? "opacity-90" : ""}`}
                    data-testid={`button-area-${area.id}`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <Check className="w-4 h-4 text-chart-1" />
                      </div>
                    )}
                    <Icon className={`w-6 h-6 mb-2 ${area.color}`} />
                    <p className="font-medium text-sm">{area.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{area.description}</p>
                    {isRequired && (
                      <span className="text-xs text-muted-foreground italic">(Required)</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-center pt-4">
              <Button
                size="lg"
                onClick={startConversation}
                disabled={selectedAreas.length === 0}
                data-testid="button-start-conversation"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Start Building My System ({selectedAreas.length} area{selectedAreas.length !== 1 ? "s" : ""})
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const orderedAreas = WELLNESS_AREAS.filter((area) => selectedAreas.includes(area.id));
  const progress = phase === "naming" 
    ? 100 
    : ((currentAreaIndex + 1) / orderedAreas.length) * 100;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl h-[80vh] flex flex-col">
        <div className="p-4 border-b flex items-center gap-3">
          <div className="p-2 rounded-full bg-chart-1/10">
            <Sparkles className="w-5 h-5 text-chart-1" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold" data-testid="text-onboarding-title">
              {phase === "naming" ? "Name Your System" : `Discussing: ${orderedAreas[currentAreaIndex]?.name || ""}`}
            </h2>
            <p className="text-sm text-muted-foreground">
              {phase === "naming" 
                ? "Final step!" 
                : `Area ${currentAreaIndex + 1} of ${orderedAreas.length}`}
            </p>
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
                    <p className={message.role === "assistant" ? "font-serif leading-relaxed whitespace-pre-line" : ""}>
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
                    if (phase === "naming") {
                      handleNameSubmit();
                    } else {
                      handleSend();
                    }
                  }
                }}
                data-testid="input-onboarding-message"
              />
              <Button
                size="icon"
                onClick={phase === "naming" ? handleNameSubmit : handleSend}
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
