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
  CheckCircle2,
  Compass
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
  isFullTour?: boolean;
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "full-tour",
    title: "Tour the Whole App",
    icon: Sparkles,
    description: "Take a complete guided tour through all of DW.ai's features. Perfect for first-time users.",
    tips: [
      "Learn about all 8 wellness dimensions",
      "See how tracking, planning, and AI work together",
      "Takes about 5-10 minutes"
    ],
    path: "/",
    isFullTour: true
  },
  {
    id: "welcome",
    title: "Welcome to DW.ai",
    icon: Sparkles,
    description: "Your personal AI wellness coach. DW adapts to your energy, understands your struggles, and helps you build the life you want - one small step at a time.",
    tips: [
      "DW is consent-based - it always asks before saving or scheduling",
      "No streaks, no guilt - just support when you need it",
      "Works in both authenticated and guest mode"
    ],
    path: "/talk"
  },
  {
    id: "command-center",
    title: "Life Command Center",
    icon: Target,
    description: "Your home base. See everything at a glance - water intake, calories, goals, habits, and all 8 wellness dimensions.",
    tips: [
      "Tap any card to dive deeper into that area",
      "Quick stats show today's progress",
      "One-tap access to tracking and planning",
      "Real-time updates as you log activities"
    ],
    path: "/"
  },
  {
    id: "talk",
    title: "Talk to DW",
    icon: MessageCircle,
    description: "Chat with your AI coach anytime. Ask questions, vent, get advice, or create personalized plans based on your situation.",
    tips: [
      "Start with how you're feeling - DW adapts to your energy",
      "Ask for meal plans, workout routines, or time management help",
      "DW remembers context from your previous conversations",
      "Upload documents to get AI-powered summaries and plans"
    ],
    path: "/talk"
  },
  {
    id: "life-blueprint",
    title: "Life Blueprint",
    icon: Compass,
    description: "Define who you are across all 8 dimensions: Body, Mind, Time, Purpose, Money, Relationships, Environment, and Identity.",
    tips: [
      "Set your values and vision for each dimension",
      "Create your personal 'Reset Protocol' for tough times",
      "DW references your blueprint to keep you aligned",
      "Update anytime as you grow and evolve"
    ],
    path: "/life-blueprint"
  },
  {
    id: "tracking",
    title: "Tracking Dashboard",
    icon: CheckCircle2,
    description: "Track water, calories, workouts, and habits all in one place. Log quickly and see your progress build over time.",
    tips: [
      "Quick-log water with preset amounts",
      "View calorie summary from meal logs",
      "Check off daily habits and build streaks",
      "One-tap access to detailed meal and workout logging"
    ],
    path: "/tracking"
  },
  {
    id: "plans",
    title: "Your Plans",
    icon: Calendar,
    description: "All your workout routines, meal plans, and project timelines organized in one place.",
    tips: [
      "View and edit saved workout routines",
      "Access meal plans with ingredients and instructions",
      "Track project milestones and tasks",
      "Create new plans with AI assistance"
    ],
    path: "/plans"
  },
  {
    id: "calendar",
    title: "Life Timeline",
    icon: Calendar,
    description: "See your whole life in one calendar. Schedule events, plan your week, and stay organized.",
    tips: [
      "Upload work schedules, class timetables, or event lists",
      "AI analyzes and suggests time structure",
      "View 'Today' for a focused daily schedule",
      "Drag and drop to reschedule events"
    ],
    path: "/calendar"
  },
  {
    id: "getting-started",
    title: "Getting Started",
    icon: Target,
    description: "Your checklist to unlock the full power of DW.ai. Complete these steps to personalize your experience.",
    tips: [
      "Complete your Life Blueprint",
      "Set up your first habit",
      "Log your first meal",
      "Have a conversation with DW"
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
                <Link key={section.id} href={section.path}>
                  <Card 
                    data-testid={`card-guide-${section.id}`}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                  >
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
                          <div key={idx} className="flex items-start gap-2 text-sm text-foreground">
                            <span className="text-muted-foreground">-</span>
                            <span>{tip}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
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
