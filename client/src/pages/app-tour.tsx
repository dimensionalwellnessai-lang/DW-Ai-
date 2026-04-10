import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/page-header";
import {
  MessageCircle, Calendar, Dumbbell, Utensils, Target, Heart, Sparkles,
  Upload, Clock, CheckCircle2, Compass, BookOpen, RepeatIcon, Wallet,
  ChevronRight, ArrowRight
} from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  hasCompletedBodyScan,
  hasCompletedFinanceProfile,
  hasCompletedSpiritualProfile,
  hasCompletedCommunityProfile,
  getMealPrepPreferences,
} from "@/lib/guest-storage";
import { useQuery } from "@tanstack/react-query";
import { usePageMeta } from "@/hooks/use-page-meta";

interface Milestone {
  id: string;
  title: string;
  description: string;
  icon: typeof MessageCircle;
  path: string;
  color: string;
  check: () => boolean | undefined;
  ctaLabel: string;
}

interface GuideSection {
  id: string;
  title: string;
  icon: typeof MessageCircle;
  description: string;
  tips: string[];
  path: string;
  isFullTour?: boolean;
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "full-tour",
    title: "Tour the Whole App",
    icon: Sparkles,
    description: "Take a complete guided tour through all of DW's features. Perfect for first-time users.",
    tips: ["Learn about all 9 wellness dimensions", "See how tracking, planning, and AI work together", "Takes about 5–10 minutes"],
    path: "/",
    isFullTour: true
  },
  {
    id: "command-center",
    title: "Life Command Center",
    icon: Target,
    description: "Your home base. See everything at a glance — water, calories, goals, habits, and all 9 wellness dimensions.",
    tips: ["Tap any card to dive deeper", "Quick stats show today's progress", "DW proactive nudges live here"],
    path: "/command-center"
  },
  {
    id: "talk",
    title: "Talk to DW",
    icon: MessageCircle,
    description: "Chat with your AI coach anytime. Ask questions, vent, get advice, or create personalized plans.",
    tips: ["Start with how you're feeling — DW adapts to your energy", "Ask for meal plans, workout routines, or time management help", "Upload documents to get AI-powered summaries"],
    path: "/talk"
  },
  {
    id: "goals",
    title: "Goals",
    icon: Target,
    description: "Set meaningful goals across 9 wellness dimensions and track your progress.",
    tips: ["Choose your wellness dimension for each goal", "Explain why the goal matters to you", "Create supporting habits directly from your goals"],
    path: "/goals"
  },
  {
    id: "habits",
    title: "Habits",
    icon: RepeatIcon,
    description: "Build daily habits with frequency tracking, reminders, and visual streaks.",
    tips: ["Set a reminder time to stay consistent", "See your 7-day completion history", "Track streaks to build momentum"],
    path: "/habits"
  },
  {
    id: "finances",
    title: "Financial Wellness",
    icon: Wallet,
    description: "Track savings goals, get AI financial coaching, and build a healthy relationship with money.",
    tips: ["Set up your financial profile for personalized support", "Use the AI coach for budgeting advice", "Track savings goals with progress rings"],
    path: "/finances"
  },
  {
    id: "spiritual",
    title: "Meditation & Mindfulness",
    icon: Sparkles,
    description: "30+ spiritual practices, AI-generated meditations, and streak tracking.",
    tips: ["Filter practices by category or your needs", "Generate a custom guided meditation", "Track your daily practice streak"],
    path: "/spiritual"
  },
  {
    id: "workout",
    title: "Workouts",
    icon: Dumbbell,
    description: "AI-generated workout plans, video form guides, and recovery tracking.",
    tips: ["Describe your fitness goals and get a custom plan", "Add workouts to your calendar", "Track recovery to avoid burnout"],
    path: "/workout"
  },
  {
    id: "meal-prep",
    title: "Meal Planning",
    icon: Utensils,
    description: "AI-generated meal plans based on your goals, preferences, and budget.",
    tips: ["Set dietary preferences for personalized results", "Add meal events to your calendar", "Budget-conscious options available"],
    path: "/meal-prep"
  },
  {
    id: "journal",
    title: "Journal",
    icon: BookOpen,
    description: "Daily journaling with AI reflection, mood tracking, and emotional pattern insights.",
    tips: ["DW responds to your entries with thoughtful reflections", "Access mood trends over time", "Private and secure"],
    path: "/journal"
  },
  {
    id: "calendar",
    title: "Life Calendar",
    icon: Calendar,
    description: "See your whole life in one calendar — workouts, meals, habits, and more.",
    tips: ["Default week view shows your immediate schedule", "Color-coded by dimension", "Add events from any feature"],
    path: "/calendar"
  },
  {
    id: "cosmic",
    title: "Cosmic Profile",
    icon: Compass,
    description: "Explore your birth chart, daily cosmic guidance, and dimensional energies.",
    tips: ["Add your birth details for personalized insights", "See today's cosmic weather", "Explore your natal chart wheel"],
    path: "/cosmic"
  },
];

const QUICK_TIPS = [
  { icon: Clock, text: "Take your time — there's no rush here" },
  { icon: Upload, text: "Upload documents to let AI help organize your schedule" },
  { icon: MessageCircle, text: "The AI adapts to your communication style" },
  { icon: Target, text: "Focus on one dimension at a time for best results" }
];

function MilestoneList() {
  const { data: goals = [] } = useQuery<any[]>({ queryKey: ["/api/goals"] });
  const { data: habits = [] } = useQuery<any[]>({ queryKey: ["/api/habits"] });
  const { data: journalEntries = [] } = useQuery<any[]>({ queryKey: ["/api/journal"] });

  const milestones: Milestone[] = [
    {
      id: "body-scan",
      title: "Complete a body scan",
      description: "Set your physical baseline for personalized recommendations",
      icon: Heart,
      path: "/life-blueprint",
      color: "text-blue-500",
      check: () => hasCompletedBodyScan() || undefined,
      ctaLabel: "Set up",
    },
    {
      id: "first-goal",
      title: "Set your first goal",
      description: "Define what you're working toward across any wellness dimension",
      icon: Target,
      path: "/goals",
      color: "text-violet-500",
      check: () => Array.isArray(goals) && goals.length > 0 ? true : undefined,
      ctaLabel: "Set a goal",
    },
    {
      id: "first-habit",
      title: "Create your first habit",
      description: "Build a small daily action that supports your goals",
      icon: RepeatIcon,
      path: "/habits",
      color: "text-emerald-500",
      check: () => Array.isArray(habits) && habits.length > 0 ? true : undefined,
      ctaLabel: "Add habit",
    },
    {
      id: "meal-prefs",
      title: "Set meal preferences",
      description: "Help DW suggest meals you'll actually enjoy",
      icon: Utensils,
      path: "/meal-prep",
      color: "text-orange-500",
      check: () => getMealPrepPreferences() !== null ? true : undefined,
      ctaLabel: "Set preferences",
    },
    {
      id: "spiritual-profile",
      title: "Set up spiritual profile",
      description: "Tell DW what spiritual practices resonate with you",
      icon: Sparkles,
      path: "/spiritual",
      color: "text-purple-500",
      check: () => hasCompletedSpiritualProfile() ? true : undefined,
      ctaLabel: "Set up",
    },
    {
      id: "finance-profile",
      title: "Set up financial profile",
      description: "Help DW provide financially sensitive suggestions",
      icon: Wallet,
      path: "/finances",
      color: "text-green-500",
      check: () => hasCompletedFinanceProfile() ? true : undefined,
      ctaLabel: "Set up",
    },
    {
      id: "journal-entry",
      title: "Write your first journal entry",
      description: "Start reflecting — DW responds with personalized insights",
      icon: BookOpen,
      path: "/journal",
      color: "text-teal-500",
      check: () => Array.isArray(journalEntries) && journalEntries.length > 0 ? true : undefined,
      ctaLabel: "Write entry",
    },
    {
      id: "dw-conversation",
      title: "Have a conversation with DW",
      description: "Ask anything — DW is here to support you",
      icon: MessageCircle,
      path: "/talk",
      color: "text-primary",
      check: () => {
        try {
          const history = localStorage.getItem("dw:chat_history") || localStorage.getItem("dw:conversations");
          return history && history.length > 50 ? true : undefined;
        } catch { return undefined; }
      },
      ctaLabel: "Start chatting",
    },
  ];

  const completed = milestones.filter(m => m.check() === true).length;
  const pct = Math.round((completed / milestones.length) * 100);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Setup Progress</CardTitle>
            <span className="text-sm font-semibold">{pct}%</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={pct} className="h-2.5" />
          <p className="text-xs text-muted-foreground">
            {completed} of {milestones.length} steps complete — {milestones.length - completed} remaining
          </p>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {milestones.map(milestone => {
          const isDone = milestone.check() === true;
          const Icon = milestone.icon;
          return (
            <Link key={milestone.id} href={milestone.path}>
              <Card
                className={`cursor-pointer hover:shadow-md transition-all ${isDone ? "border-green-500/30 bg-green-500/5" : ""}`}
                data-testid={`card-milestone-${milestone.id}`}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isDone ? "bg-green-500/15" : "bg-muted"}`}>
                    {isDone
                      ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                      : <Icon className={`h-4 w-4 ${milestone.color}`} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isDone ? "text-muted-foreground line-through" : ""}`}>
                      {milestone.title}
                    </p>
                    {!isDone && <p className="text-xs text-muted-foreground">{milestone.description}</p>}
                  </div>
                  {!isDone && (
                    <Badge variant="outline" className="text-xs shrink-0">{milestone.ctaLabel}</Badge>
                  )}
                  {isDone && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function AppTourPage() {
  usePageMeta("App Tour", "Explore the key features of DW Wellness AI.");
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"start" | "guide">("start");

  const handleStartFullTour = () => {
    try { localStorage.setItem("dw:tour_pending_start", "true"); } catch {}
    setLocation("/");
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <PageHeader title="App Tour" />

      <div className="flex-1 overflow-auto">
        <div className="p-4 max-w-2xl mx-auto space-y-6 pb-8">

          <div className="text-center py-2">
            <h2 className="text-xl font-semibold mb-1">Welcome to DW Wellness AI</h2>
            <p className="text-muted-foreground text-sm">
              Your intelligent companion across all 9 dimensions of wellness.
            </p>
          </div>

          {/* Tab switch */}
          <div className="flex rounded-xl bg-muted p-1 gap-1">
            <button
              onClick={() => setActiveTab("start")}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === "start" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
            >
              Getting Started
            </button>
            <button
              onClick={() => setActiveTab("guide")}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === "guide" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
            >
              Features Guide
            </button>
          </div>

          {activeTab === "start" && (
            <div className="space-y-4">
              {/* Full tour CTA */}
              <Card className="bg-primary/5 border-primary/20 cursor-pointer hover:shadow-md transition-all" onClick={handleStartFullTour}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">Take the Guided Tour</p>
                    <p className="text-sm text-muted-foreground">5–10 min interactive walkthrough of everything DW can do</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-primary shrink-0" />
                </CardContent>
              </Card>

              <MilestoneList />

              <Card className="bg-muted/30 border-dashed">
                <CardContent className="p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-3">Quick Tips</p>
                  <div className="space-y-2">
                    {QUICK_TIPS.map((tip, i) => {
                      const Icon = tip.icon;
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="text-xs text-muted-foreground">{tip.text}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "guide" && (
            <div className="space-y-3">
              {GUIDE_SECTIONS.map((section) => {
                const Icon = section.icon;
                const cardElement = (
                  <Card
                    key={section.id}
                    data-testid={`card-guide-${section.id}`}
                    className="cursor-pointer hover:shadow-md transition-all"
                  >
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="w-4.5 h-4.5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm">{section.title}</h4>
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0" />
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>
                        </div>
                      </div>
                      <div className="ml-12 space-y-1">
                        {section.tips.map((tip, idx) => (
                          <div key={idx} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                            <span className="mt-0.5 shrink-0">·</span>
                            <span>{tip}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );

                if (section.isFullTour) {
                  return <div key={section.id} onClick={handleStartFullTour}>{cardElement}</div>;
                }
                return (
                  <Link key={section.id} href={section.path}>
                    {cardElement}
                  </Link>
                );
              })}

              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4 text-center space-y-3">
                  <Sparkles className="w-8 h-8 text-primary mx-auto" />
                  <div>
                    <h4 className="font-medium">Need more help?</h4>
                    <p className="text-sm text-muted-foreground mt-1">Just ask DW anything. It's here to support you.</p>
                  </div>
                  <Link href="/talk">
                    <Button data-testid="button-talk-to-ai">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Talk to DW
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
