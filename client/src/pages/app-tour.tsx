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
    id: "talk",
    title: "Talk It Out",
    icon: MessageCircle,
    description: "Your main way to interact with Flip the Switch. Share what's on your mind, ask for help, or just chat.",
    tips: [
      "Start with how you're feeling - no judgment here",
      "Ask for specific help like 'help me plan my morning'",
      "The AI remembers context from your conversations"
    ],
    path: "/talk"
  },
  {
    id: "life-dashboard",
    title: "Life Dashboard",
    icon: Target,
    description: "See your wellness across all dimensions. Answer questions to build your personal anchor plans.",
    tips: [
      "Each dimension has questions to understand your needs",
      "Your answers create personalized support strategies",
      "Revisit anytime to update as you grow"
    ],
    path: "/life-dashboard",
    estimatedMinutes: 15,
    hasQuestionnaire: true,
    completionKey: "life-dashboard"
  },
  {
    id: "calendar",
    title: "Calendar & Schedule",
    icon: Calendar,
    description: "Plan your day, week, or month. Upload documents and let AI help organize your life.",
    tips: [
      "Upload work schedules, class timetables, or event lists",
      "AI will analyze and suggest how to structure your time",
      "View 'Today' for a focused daily view"
    ],
    path: "/calendar"
  },
  {
    id: "meal-prep",
    title: "Meal Prep",
    icon: Utensils,
    description: "Get personalized meal suggestions based on your dietary preferences and goals.",
    tips: [
      "Set your dietary style and restrictions",
      "Each meal has ingredients and cooking instructions",
      "Swap ingredients if needed"
    ],
    path: "/meal-prep",
    estimatedMinutes: 3,
    hasQuestionnaire: true,
    completionKey: "meal-prep"
  },
  {
    id: "workout",
    title: "Workout",
    icon: Dumbbell,
    description: "Find exercises that match your body goals and energy level.",
    tips: [
      "Complete a Body Scan to personalize recommendations",
      "Each workout has video demonstrations",
      "Save favorites to your routines"
    ],
    path: "/workout",
    estimatedMinutes: 5,
    hasQuestionnaire: true,
    completionKey: "body-scan"
  },
  {
    id: "meditation",
    title: "Meditation",
    icon: Heart,
    description: "Guided practices for calm, focus, and inner peace.",
    tips: [
      "Choose based on your current mood or need",
      "Sessions range from 5 to 30 minutes",
      "Follow along with step-by-step guidance"
    ],
    path: "/spiritual",
    estimatedMinutes: 4,
    hasQuestionnaire: true,
    completionKey: "spiritual"
  },
  {
    id: "astrology",
    title: "Astrology",
    icon: Sparkles,
    description: "Explore your birth chart, daily horoscopes, and cosmic insights.",
    tips: [
      "Enter your birth details to generate your chart",
      "Get AI-powered readings for any timeframe",
      "Track moon phases and retrogrades"
    ],
    path: "/astrology",
    estimatedMinutes: 2,
    hasQuestionnaire: true,
    completionKey: "astrology"
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
            <h2 className="text-xl font-display font-semibold mb-2">Welcome to Flip the Switch</h2>
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
                <Card key={section.id} data-testid={`card-guide-${section.id}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium">{section.title}</h4>
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
                <h4 className="font-medium">Need more help?</h4>
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
