import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/page-header";
import { 
  MessageCircle, 
  Calendar, 
  Dumbbell, 
  Utensils, 
  Target,
  Heart,
  Sparkles,
  Upload,
  Clock,
  CheckCircle2
} from "lucide-react";
import { Link } from "wouter";
import {
  hasCompletedBodyScan,
  hasCompletedFinanceProfile,
  hasCompletedSpiritualProfile,
  hasCompletedCommunityProfile,
  getMealPrepPreferences,
} from "@/lib/guest-storage";

interface GuideSection {
  id: string;
  title: string;
  icon: typeof MessageCircle;
  description: string;
  tips: string[];
  path: string;
  estimatedMinutes?: number;
  hasQuestionnaire?: boolean;
  completionKey?: string;
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "welcome",
    title: "Welcome to DW.ai",
    icon: Sparkles,
    description: "Your personal AI wellness coach. DW helps you track, plan, and improve across 8 dimensions of your life.",
    tips: [
      "DW learns your patterns and remembers your values",
      "Everything adapts to your energy and needs",
      "No judgment, just support"
    ],
    path: "/"
  },
  {
    id: "command-center",
    title: "Life Command Center",
    icon: Target,
    description: "This is your home - everything at a glance. Tap any card to dive deeper into that area.",
    tips: [
      "See water, calories, habits, and goals all at once",
      "Tap any card to dive deeper",
      "View today's schedule and active goals",
      "Monitor all 8 wellness dimensions"
    ],
    path: "/"
  },
  {
    id: "talk",
    title: "Talk to DW",
    icon: MessageCircle,
    description: "Your AI concierge is always here. Ask anything - from 'what should I eat?' to 'I need to vent'.",
    tips: [
      "Start with how you're feeling - no judgment here",
      "Ask for specific help like 'help me plan my morning'",
      "DW learns your patterns and remembers your values",
      "The AI adapts to your communication style"
    ],
    path: "/talk"
  },
  {
    id: "life-blueprint",
    title: "Life Blueprint",
    icon: Target,
    description: "Define who you are and what you stand for. Your Reset Protocol for when things get hard.",
    tips: [
      "Create blueprints for Body, Mind, Time, Purpose, Money, Relationships, Environment, and Identity",
      "Set your 'Reset Protocol' for when things get tough",
      "Your AI references these values to keep you aligned",
      "Update anytime as you grow and evolve"
    ],
    path: "/life-blueprint"
  },
  {
    id: "tracking",
    title: "Tracking Dashboard",
    icon: CheckCircle2,
    description: "Track everything in one place. Water, calories, workouts, sleep, and more. Tap to log, see your progress over time.",
    tips: [
      "Quick log water intake with preset amounts",
      "View calorie summary from logged meals",
      "Check off daily habits and build streaks",
      "One-tap access to log meals and workouts"
    ],
    path: "/tracking"
  },
  {
    id: "plans",
    title: "Your Plans",
    icon: Calendar,
    description: "Workouts, meals, vacations, projects - all organized. DW can create any plan for you.",
    tips: [
      "Upload documents and let AI help organize your schedule",
      "View all your plans in one place",
      "DW will analyze and suggest how to structure your time"
    ],
    path: "/plans"
  },
  {
    id: "calendar",
    title: "Life Timeline",
    icon: Calendar,
    description: "See your whole life in one calendar. Workouts, meals, events, all color-coded.",
    tips: [
      "View day, week, or month at a glance",
      "All events are color-coded by dimension",
      "Upload work schedules, class timetables, or event lists",
      "View 'Today' for a focused daily view"
    ],
    path: "/calendar"
  },
  {
    id: "getting-started",
    title: "Getting Started Checklist",
    icon: CheckCircle2,
    description: "Complete these steps to get the most out of DW.ai",
    tips: [
      "Complete your Life Blueprint",
      "Set up your first goal",
      "Log your first meal",
      "Talk to DW and ask a question"
    ],
    path: "/app-tour"
  }
];

function getCompletionStatus(): Record<string, boolean> {
  return {
    "body-scan": hasCompletedBodyScan(),
    "meal-prep": getMealPrepPreferences() !== null,
    "spiritual": hasCompletedSpiritualProfile(),
    "astrology": false,
    "life-dashboard": hasCompletedBodyScan() && hasCompletedFinanceProfile() && hasCompletedSpiritualProfile() && hasCompletedCommunityProfile(),
  };
}

function getOverallCompletion(): number {
  const status = getCompletionStatus();
  const questionnaireSections = GUIDE_SECTIONS.filter(s => s.hasQuestionnaire);
  
  // If no questionnaire sections, return 0 to avoid NaN
  if (questionnaireSections.length === 0) {
    return 0;
  }
  
  const completed = questionnaireSections.filter(s => s.completionKey && status[s.completionKey]).length;
  return Math.round((completed / questionnaireSections.length) * 100);
}

function getTotalSetupTime(): number {
  return GUIDE_SECTIONS.reduce((sum, s) => sum + (s.estimatedMinutes || 0), 0);
}

const QUICK_TIPS = [
  { icon: Clock, text: "Take your time - there's no rush here" },
  { icon: Upload, text: "Upload documents to let AI help organize your schedule" },
  { icon: MessageCircle, text: "The AI adapts to your communication style" },
  { icon: Target, text: "Focus on one dimension at a time for best results" }
];

export default function AppTourPage() {
  const completionStatus = getCompletionStatus();
  const overallCompletion = getOverallCompletion();
  const totalTime = getTotalSetupTime();
  const hasQuestionnaires = GUIDE_SECTIONS.some(s => s.hasQuestionnaire);
  
  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="App Tour" />
      
      <ScrollArea className="h-[calc(100vh-57px)]">
        <div className="p-4 max-w-2xl mx-auto space-y-6 pb-8">
          <div className="text-center py-4">
            <h2 className="text-xl font-display font-semibold mb-2">Welcome to Dimensional Wellness</h2>
            <p className="text-muted-foreground">
              Your wellness companion that adapts to you. Here's how to get the most out of it.
            </p>
          </div>

          {hasQuestionnaires && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-4">
                  <CardTitle className="text-base">Your Progress</CardTitle>
                  <span className="text-sm font-medium">{overallCompletion}% complete</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress value={overallCompletion} className="h-2" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Complete the questionnaires below to personalize your experience</span>
                  <Badge variant="outline" className="gap-1">
                    <Clock className="w-3 h-3" />
                    ~{totalTime} min total
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Quick Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {QUICK_TIPS.map((tip, index) => {
                const Icon = tip.icon;
                return (
                  <div key={index} className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm">{tip.text}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <div className="space-y-3">
            <h3 className="font-medium text-sm text-muted-foreground">Features Guide</h3>
            
            {GUIDE_SECTIONS.map((section) => {
              const Icon = section.icon;
              const isCompleted = section.completionKey ? completionStatus[section.completionKey] : false;
              
              return (
                <Card key={section.id} data-testid={`card-guide-${section.id}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium text-foreground">{section.title}</h4>
                          {section.hasQuestionnaire && (
                            <>
                              {isCompleted ? (
                                <Badge variant="secondary" className="gap-1 text-xs">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Complete
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="gap-1 text-xs">
                                  <Clock className="w-3 h-3" />
                                  {section.estimatedMinutes} min
                                </Badge>
                              )}
                            </>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {section.description}
                        </p>
                      </div>
                    </div>
                    
                    <div className="ml-[52px] space-y-2">
                      {section.tips.map((tip, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <span className="text-muted-foreground">-</span>
                          <span>{tip}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="ml-[52px]">
                      <Link href={section.path}>
                        <Button variant="outline" size="sm" data-testid={`button-go-${section.id}`}>
                          {section.hasQuestionnaire && isCompleted ? "View" : "Try it out"}
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 text-center space-y-3">
              <Sparkles className="w-8 h-8 text-primary mx-auto" />
              <div>
                <h4 className="font-medium text-foreground">Need more help?</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Just ask the AI anything. It's here to support you.
                </p>
              </div>
              <Link href="/talk">
                <Button data-testid="button-talk-to-ai">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Talk to AI
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
