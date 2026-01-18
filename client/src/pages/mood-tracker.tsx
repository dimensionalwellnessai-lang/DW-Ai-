import { useState, useEffect } from "react";
import { useTutorialStart } from "@/contexts/tutorial-context";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/use-user-role";
import { 
  Sun, 
  Sunset, 
  Moon,
  Heart,
  Activity,
  Calendar,
  TrendingUp,
  Zap,
  Cloud,
  Smile,
  Frown,
  Meh,
  Sparkles,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ListChecks,
  X,
  Brain,
  Compass,
  Wallet,
  Users,
  Home,
  Sprout,
  Settings,
  Bell,
  BellOff
} from "lucide-react";
import {
  type TimeOfDay,
  type MoodWord,
  type MoodCheckin,
  type ActivityCompletion,
  type DailySynopsis,
  addMoodCheckin,
  getTodayMoodCheckins,
  hasMoodCheckinForTimeOfDay,
  getDailySynopsis,
  getWeeklySynopsis,
  getMoodCheckinsForDate,
  addActivityCompletion,
  getTodayActivityCompletions,
  updateActivityCompletion,
  getActivityCompletionsForDate,
  type TrackerSettings,
  getTrackerSettings,
  saveTrackerSettings,
} from "@/lib/guest-storage";
import { cn } from "@/lib/utils";

const MOOD_OPTIONS: { word: MoodWord; icon: typeof Smile; color: string }[] = [
  { word: "calm", icon: Cloud, color: "text-blue-400" },
  { word: "content", icon: Smile, color: "text-green-400" },
  { word: "hopeful", icon: Sparkles, color: "text-purple-400" },
  { word: "grateful", icon: Heart, color: "text-pink-400" },
  { word: "motivated", icon: Zap, color: "text-yellow-400" },
  { word: "energized", icon: TrendingUp, color: "text-orange-400" },
  { word: "tired", icon: Moon, color: "text-slate-400" },
  { word: "anxious", icon: Activity, color: "text-amber-500" },
  { word: "overwhelmed", icon: Cloud, color: "text-red-400" },
  { word: "frustrated", icon: Frown, color: "text-orange-500" },
  { word: "sad", icon: Frown, color: "text-blue-500" },
  { word: "scattered", icon: Meh, color: "text-slate-500" },
];

const TIME_OF_DAY_CONFIG: Record<TimeOfDay, { label: string; icon: typeof Sun; range: string }> = {
  morning: { label: "Morning", icon: Sun, range: "6am - 12pm" },
  afternoon: { label: "Afternoon", icon: Sunset, range: "12pm - 6pm" },
  evening: { label: "Evening", icon: Moon, range: "6pm - 12am" },
};

function getCurrentTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  return "evening";
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { 
    weekday: "short", 
    month: "short", 
    day: "numeric" 
  });
}

function MoodCheckinCard({ 
  selectedMood, 
  setSelectedMood,
  customNote,
  setCustomNote,
  onSubmit,
  isSubmitting,
  timeOfDay,
  hasCheckedIn
}: { 
  selectedMood: MoodWord | null;
  setSelectedMood: (mood: MoodWord) => void;
  customNote: string;
  setCustomNote: (note: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  timeOfDay: TimeOfDay;
  hasCheckedIn: boolean;
}) {
  const config = TIME_OF_DAY_CONFIG[timeOfDay];
  const TimeIcon = config.icon;

  if (hasCheckedIn) {
    return (
      <Card className="border-white/10 bg-slate-800/40 backdrop-blur-xl">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-500/20 p-2">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="font-medium text-white">
                {config.label} check-in complete
              </p>
              <p className="text-sm text-slate-400">
                You've already logged how you're feeling this {timeOfDay}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-white/10 bg-slate-800/40 backdrop-blur-xl">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-xl text-white">
          <div className="rounded-full bg-purple-500/20 p-2">
            <TimeIcon className="h-5 w-5 text-purple-400" />
          </div>
          How are you feeling this {timeOfDay}?
        </CardTitle>
        <p className="text-sm text-slate-400">{config.range}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {MOOD_OPTIONS.map(({ word, icon: Icon, color }) => (
            <button
              key={word}
              type="button"
              onClick={() => setSelectedMood(word)}
              data-testid={`mood-option-${word}`}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border p-3 transition-all",
                selectedMood === word
                  ? "border-purple-500/50 bg-purple-500/20 ring-2 ring-purple-500/30"
                  : "border-white/10 bg-slate-800/30 hover-elevate"
              )}
            >
              <Icon className={cn("h-6 w-6", color)} />
              <span className="text-xs font-medium capitalize text-slate-300">
                {word}
              </span>
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">
            Add a note (optional)
          </label>
          <Textarea
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            placeholder="What's on your mind?"
            className="resize-none border-white/10 bg-slate-800/50 text-slate-100 placeholder:text-slate-500"
            rows={3}
            data-testid="mood-note-input"
          />
        </div>

        <Button
          onClick={onSubmit}
          disabled={!selectedMood || isSubmitting}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 font-semibold shadow-lg shadow-purple-500/50"
          data-testid="submit-mood-checkin"
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Heart className="mr-2 h-4 w-4" />
          )}
          Log Mood
        </Button>
      </CardContent>
    </Card>
  );
}

function DailySynopsisCard({ synopsis }: { synopsis: DailySynopsis }) {
  const { moodSummary, activitySummary, moodCheckins } = synopsis;

  return (
    <Card className="border-white/10 bg-slate-800/40 backdrop-blur-xl">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-xl text-white">
          <div className="rounded-full bg-blue-500/20 p-2">
            <Activity className="h-5 w-5 text-blue-400" />
          </div>
          Today's Journey
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {moodCheckins.length === 0 ? (
          <p className="text-center text-slate-400">
            No mood check-ins yet today. Start by logging how you feel.
          </p>
        ) : (
          <>
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-slate-400">Mood Journey</h4>
              <div className="flex flex-wrap gap-2">
                {(["morning", "afternoon", "evening"] as TimeOfDay[]).map((tod) => {
                  const checkin = moodCheckins.find(c => c.timeOfDay === tod);
                  const config = TIME_OF_DAY_CONFIG[tod];
                  const TimeIcon = config.icon;
                  
                  return (
                    <div
                      key={tod}
                      className={cn(
                        "flex items-center gap-2 rounded-full px-3 py-1.5",
                        checkin 
                          ? "bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-400/30"
                          : "bg-slate-800/30 border border-white/10"
                      )}
                    >
                      <TimeIcon className="h-4 w-4 text-slate-400" />
                      <span className="text-sm capitalize text-slate-300">
                        {checkin ? checkin.mood : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {moodSummary.dominantMood && (
              <div className="rounded-xl border border-white/10 bg-slate-800/30 p-4">
                <p className="text-sm text-slate-400">Most felt today</p>
                <p className="mt-1 text-lg font-medium capitalize text-white">
                  {moodSummary.dominantMood}
                </p>
              </div>
            )}
          </>
        )}

        {activitySummary.total > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-400">Activities</h4>
            <div className="flex items-center gap-4">
              <div className="rounded-xl border border-white/10 bg-slate-800/30 p-4 text-center flex-1">
                <p className="text-2xl font-bold text-green-400">
                  {activitySummary.completed}
                </p>
                <p className="text-xs text-slate-400">Completed</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-800/30 p-4 text-center flex-1">
                <p className="text-2xl font-bold text-purple-400">
                  {activitySummary.completionRate}%
                </p>
                <p className="text-xs text-slate-400">Rate</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type SwitchId = "body" | "mind" | "time" | "purpose" | "money" | "relationships" | "environment" | "identity";

interface PlanItem {
  id: string;
  switchId: SwitchId;
  title: string;
  estimateMinutes: number;
  completed: boolean;
  steps: string[];
}

const PLAN_STORAGE_KEY = "fts_weekly_plan";

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

const SWITCH_COLORS: Record<SwitchId, { text: string; bg: string }> = {
  body: { text: "text-red-400", bg: "bg-red-500/10" },
  mind: { text: "text-purple-400", bg: "bg-purple-500/10" },
  time: { text: "text-blue-400", bg: "bg-blue-500/10" },
  purpose: { text: "text-amber-400", bg: "bg-amber-500/10" },
  money: { text: "text-green-400", bg: "bg-green-500/10" },
  relationships: { text: "text-pink-400", bg: "bg-pink-500/10" },
  environment: { text: "text-cyan-400", bg: "bg-cyan-500/10" },
  identity: { text: "text-emerald-400", bg: "bg-emerald-500/10" },
};

function ActivityCheckinCard({ 
  onActivityLogged,
  todayCompletions 
}: { 
  onActivityLogged: () => void;
  todayCompletions: ActivityCompletion[];
}) {
  const { toast } = useToast();
  const [planItems, setPlanItems] = useState<PlanItem[]>([]);
  
  useEffect(() => {
    setPlanItems(getWeeklyPlan());
  }, []);
  
  const incompletePlanItems = planItems.filter(item => !item.completed);
  const today = formatDate(new Date());
  
  const getCompletionForActivity = (activityId: string) => {
    return todayCompletions.find(c => c.activityId === activityId);
  };
  
  const handleLogActivity = (item: PlanItem, completed: boolean, skipReason?: string) => {
    const existingCompletion = getCompletionForActivity(item.id);
    
    if (existingCompletion) {
      updateActivityCompletion(existingCompletion.id, {
        completed,
        skippedReason: skipReason,
      });
    } else {
      addActivityCompletion({
        date: today,
        activityTitle: item.title,
        activityId: item.id,
        switchId: item.switchId,
        completed,
        skippedReason: skipReason,
      });
    }
    
    toast({
      title: completed ? "Activity completed" : "Activity skipped",
      description: item.title,
    });
    
    onActivityLogged();
  };
  
  if (planItems.length === 0) {
    return (
      <Card className="border-white/10 bg-slate-800/40 backdrop-blur-xl">
        <CardContent className="p-6">
          <div className="text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-slate-700/50 flex items-center justify-center">
              <ListChecks className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-slate-400">
              No activities in your weekly plan yet.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = "/plan"}
              data-testid="go-to-plan-btn"
            >
              Create Your Plan
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="border-white/10 bg-slate-800/40 backdrop-blur-xl">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-xl text-white">
          <div className="rounded-full bg-green-500/20 p-2">
            <ListChecks className="h-5 w-5 text-green-400" />
          </div>
          Activity Check-in
        </CardTitle>
        <p className="text-sm text-slate-400">
          Did you complete any of these today?
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {incompletePlanItems.length === 0 ? (
          <p className="text-center text-slate-400 py-4">
            All activities completed! Great work.
          </p>
        ) : (
          incompletePlanItems.map((item) => {
            const Icon = SWITCH_ICONS[item.switchId];
            const colors = SWITCH_COLORS[item.switchId];
            const completion = getCompletionForActivity(item.id);
            const isLogged = !!completion;
            
            return (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-4 transition-all",
                  isLogged 
                    ? completion.completed
                      ? "border-green-500/30 bg-green-500/10"
                      : "border-slate-500/30 bg-slate-800/30"
                    : "border-white/10 bg-slate-800/30"
                )}
              >
                <div className={cn("rounded-full p-2", colors.bg)}>
                  <Icon className={cn("h-4 w-4", colors.text)} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "font-medium truncate",
                    isLogged && completion.completed ? "text-green-300" : "text-white"
                  )}>
                    {item.title}
                  </p>
                  <p className="text-xs text-slate-500 capitalize">
                    {item.switchId} • {item.estimateMinutes}min
                  </p>
                </div>
                
                {isLogged ? (
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "text-xs",
                      completion.completed ? "bg-green-500/20 text-green-300" : "bg-slate-700 text-slate-400"
                    )}
                  >
                    {completion.completed ? "Done" : "Skipped"}
                  </Badge>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleLogActivity(item, true)}
                      className="h-8 w-8 bg-green-500/10 hover:bg-green-500/20"
                      data-testid={`complete-activity-${item.id}`}
                    >
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleLogActivity(item, false, "skipped")}
                      className="h-8 w-8 bg-slate-700/50 hover:bg-slate-700"
                      data-testid={`skip-activity-${item.id}`}
                    >
                      <X className="h-4 w-4 text-slate-400" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function TrackerSettingsCard() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<TrackerSettings>(getTrackerSettings);
  const [notificationsPermission, setNotificationsPermission] = useState<NotificationPermission | "unsupported">("default");
  
  useEffect(() => {
    if ("Notification" in window) {
      setNotificationsPermission(Notification.permission);
    } else {
      setNotificationsPermission("unsupported");
    }
  }, []);
  
  const handleRequestNotifications = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotificationsPermission(permission);
      if (permission === "granted") {
        toast({
          title: "Notifications enabled",
          description: "You'll receive mood check-in reminders",
        });
      }
    }
  };
  
  const handleToggleSetting = (key: keyof TrackerSettings, value: boolean) => {
    const updated = saveTrackerSettings({ [key]: value });
    setSettings(updated);
    toast({
      title: "Settings updated",
      description: value ? "Feature enabled" : "Feature disabled",
    });
  };
  
  return (
    <Card className="border-white/10 bg-slate-800/40 backdrop-blur-xl">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-xl text-white">
          <div className="rounded-full bg-purple-500/20 p-2">
            <Settings className="h-5 w-5 text-purple-400" />
          </div>
          Tracker Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {notificationsPermission !== "granted" && notificationsPermission !== "unsupported" && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex items-start gap-3">
              <BellOff className="h-5 w-5 text-amber-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-amber-300">Enable Notifications</p>
                <p className="text-sm text-amber-200/70 mt-1">
                  Get reminded to check in with how you're feeling
                </p>
                <Button
                  onClick={handleRequestNotifications}
                  size="sm"
                  className="mt-3 bg-amber-500/20 hover:bg-amber-500/30"
                  data-testid="enable-notifications-btn"
                >
                  <Bell className="mr-2 h-4 w-4" />
                  Enable Notifications
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {notificationsPermission === "granted" && (
          <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-green-400" />
              <p className="text-green-300">Notifications are enabled</p>
            </div>
          </div>
        )}
        
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-800/30 p-4">
            <div className="space-y-1">
              <Label htmlFor="mood-checkins" className="text-white font-medium">
                Mood Check-ins
              </Label>
              <p className="text-sm text-slate-400">
                Reminders to log your mood throughout the day
              </p>
            </div>
            <Switch
              id="mood-checkins"
              checked={settings.moodCheckinsEnabled}
              onCheckedChange={(checked) => handleToggleSetting("moodCheckinsEnabled", checked)}
              data-testid="toggle-mood-checkins"
            />
          </div>
          
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-800/30 p-4">
            <div className="space-y-1">
              <Label htmlFor="activity-reminders" className="text-white font-medium">
                Activity Reminders
              </Label>
              <p className="text-sm text-slate-400">
                Get reminded about planned activities
              </p>
            </div>
            <Switch
              id="activity-reminders"
              checked={settings.activityRemindersEnabled}
              onCheckedChange={(checked) => handleToggleSetting("activityRemindersEnabled", checked)}
              data-testid="toggle-activity-reminders"
            />
          </div>
          
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-800/30 p-4">
            <div className="space-y-1">
              <Label htmlFor="daily-synopsis" className="text-white font-medium">
                Daily Synopsis
              </Label>
              <p className="text-sm text-slate-400">
                End-of-day summary of your mood and activities
              </p>
            </div>
            <Switch
              id="daily-synopsis"
              checked={settings.dailySynopsisEnabled}
              onCheckedChange={(checked) => handleToggleSetting("dailySynopsisEnabled", checked)}
              data-testid="toggle-daily-synopsis"
            />
          </div>
        </div>
        
        {settings.moodCheckinsEnabled && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-400">Check-in Times</h4>
            <div className="flex flex-wrap gap-2">
              {TIME_OF_DAY_CONFIG && Object.entries(TIME_OF_DAY_CONFIG).map(([tod, config]) => (
                <Badge
                  key={tod}
                  variant="secondary"
                  className="bg-purple-500/20 text-purple-300 border border-purple-400/30"
                >
                  {config.icon && <config.icon className="mr-1 h-3 w-3" />}
                  {config.label}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              Morning (9am), Afternoon (2pm), Evening (8pm)
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WeeklyCalendarView() {
  const [weekOffset, setWeekOffset] = useState(0);
  
  const getWeekDates = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + (weekOffset * 7));
    
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(formatDate(date));
    }
    return dates;
  };

  const weekDates = getWeekDates();
  const synopses = weekDates.map(date => getDailySynopsis(date));

  const getMoodColor = (mood: string | null): string => {
    if (!mood) return "bg-slate-700";
    const moodConfig = MOOD_OPTIONS.find(m => m.word === mood);
    if (!moodConfig) return "bg-slate-600";
    
    const colorMap: Record<string, string> = {
      "text-blue-400": "bg-blue-500",
      "text-green-400": "bg-green-500",
      "text-purple-400": "bg-purple-500",
      "text-pink-400": "bg-pink-500",
      "text-yellow-400": "bg-yellow-500",
      "text-orange-400": "bg-orange-500",
      "text-slate-400": "bg-slate-500",
      "text-amber-500": "bg-amber-500",
      "text-red-400": "bg-red-500",
      "text-orange-500": "bg-orange-600",
      "text-blue-500": "bg-blue-600",
      "text-slate-500": "bg-slate-600",
    };
    return colorMap[moodConfig.color] || "bg-slate-600";
  };

  return (
    <Card className="border-white/10 bg-slate-800/40 backdrop-blur-xl">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-xl text-white">
            <div className="rounded-full bg-green-500/20 p-2">
              <Calendar className="h-5 w-5 text-green-400" />
            </div>
            Weekly View
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setWeekOffset(weekOffset - 1)}
              data-testid="prev-week-btn"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setWeekOffset(0)}
              disabled={weekOffset === 0}
            >
              <span className="text-xs">Today</span>
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setWeekOffset(weekOffset + 1)}
              disabled={weekOffset >= 0}
              data-testid="next-week-btn"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {weekDates.map((dateStr, idx) => {
            const synopsis = synopses[idx];
            const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            const date = new Date(dateStr + "T00:00:00");
            const isToday = dateStr === formatDate(new Date());
            
            return (
              <div
                key={dateStr}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border p-2 text-center",
                  isToday 
                    ? "border-purple-500/50 bg-purple-500/10" 
                    : "border-white/10 bg-slate-800/30"
                )}
              >
                <span className="text-xs font-medium text-slate-400">
                  {dayNames[date.getDay()]}
                </span>
                <span className={cn(
                  "text-sm font-semibold",
                  isToday ? "text-purple-400" : "text-white"
                )}>
                  {date.getDate()}
                </span>
                
                <div className="flex gap-1 mt-1">
                  {(["morning", "afternoon", "evening"] as TimeOfDay[]).map((tod) => {
                    const checkin = synopsis.moodCheckins.find(c => c.timeOfDay === tod);
                    return (
                      <div
                        key={tod}
                        className={cn(
                          "h-2 w-2 rounded-full",
                          getMoodColor(checkin?.mood || null)
                        )}
                        title={checkin ? `${tod}: ${checkin.mood}` : `${tod}: not logged`}
                      />
                    );
                  })}
                </div>
                
                {synopsis.activitySummary.total > 0 && (
                  <span className="text-xs text-slate-500 mt-1">
                    {synopsis.activitySummary.completionRate}%
                  </span>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <Sun className="h-3 w-3" /> Morning
          </div>
          <div className="flex items-center gap-1">
            <Sunset className="h-3 w-3" /> Afternoon
          </div>
          <div className="flex items-center gap-1">
            <Moon className="h-3 w-3" /> Evening
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MoodTrackerPage() {
  useTutorialStart("mood-tracker", 1000);
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useUserRole();
  
  const [activeTab, setActiveTab] = useState("checkin");
  const [selectedMood, setSelectedMood] = useState<MoodWord | null>(null);
  const [customNote, setCustomNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [todayCheckins, setTodayCheckins] = useState<MoodCheckin[]>([]);
  const [todayCompletions, setTodayCompletions] = useState<ActivityCompletion[]>([]);
  const [todaySynopsis, setTodaySynopsis] = useState<DailySynopsis | null>(null);
  
  const currentTimeOfDay = getCurrentTimeOfDay();
  const today = formatDate(new Date());
  
  useEffect(() => {
    loadTodayData();
  }, []);
  
  const loadTodayData = () => {
    const checkins = getTodayMoodCheckins();
    const completions = getTodayActivityCompletions();
    setTodayCheckins(checkins);
    setTodayCompletions(completions);
    setTodaySynopsis(getDailySynopsis(today));
  };
  
  const hasCheckedInForCurrentTime = hasMoodCheckinForTimeOfDay(today, currentTimeOfDay);
  
  const handleSubmitMood = async () => {
    if (!selectedMood) return;
    
    setIsSubmitting(true);
    try {
      addMoodCheckin({
        date: today,
        timeOfDay: currentTimeOfDay,
        mood: selectedMood,
        customNote: customNote || undefined,
      });
      
      toast({
        title: "Mood logged",
        description: `Feeling ${selectedMood} this ${currentTimeOfDay}`,
      });
      
      setSelectedMood(null);
      setCustomNote("");
      loadTodayData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log mood. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      <PageHeader 
        title="Mood & Activity Tracker" 
        showBack 
        backPath="/home"
      />
      
      <div className="mx-auto max-w-2xl space-y-6 p-4 pb-24">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800/50">
            <TabsTrigger value="checkin" data-testid="tab-checkin">
              <Heart className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">Check-in</span>
            </TabsTrigger>
            <TabsTrigger value="today" data-testid="tab-today">
              <Activity className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">Today</span>
            </TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">
              <Calendar className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">
              <Settings className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="checkin" className="mt-6 space-y-6">
            <MoodCheckinCard
              selectedMood={selectedMood}
              setSelectedMood={setSelectedMood}
              customNote={customNote}
              setCustomNote={setCustomNote}
              onSubmit={handleSubmitMood}
              isSubmitting={isSubmitting}
              timeOfDay={currentTimeOfDay}
              hasCheckedIn={hasCheckedInForCurrentTime}
            />
            
            <ActivityCheckinCard
              onActivityLogged={loadTodayData}
              todayCompletions={todayCompletions}
            />
            
            {todayCheckins.length > 0 && (
              <Card className="border-white/10 bg-slate-800/40 backdrop-blur-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-white">Today's Check-ins</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {todayCheckins
                      .sort((a, b) => {
                        const order = { morning: 0, afternoon: 1, evening: 2 };
                        return order[a.timeOfDay] - order[b.timeOfDay];
                      })
                      .map((checkin) => {
                        const config = TIME_OF_DAY_CONFIG[checkin.timeOfDay];
                        const TimeIcon = config.icon;
                        const moodConfig = MOOD_OPTIONS.find(m => m.word === checkin.mood);
                        const MoodIcon = moodConfig?.icon || Smile;
                        
                        return (
                          <div
                            key={checkin.id}
                            className="flex items-start gap-3 rounded-lg border border-white/10 bg-slate-800/30 p-3"
                          >
                            <div className="rounded-full bg-slate-700/50 p-1.5">
                              <TimeIcon className="h-4 w-4 text-slate-400" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <MoodIcon className={cn("h-4 w-4", moodConfig?.color)} />
                                <span className="font-medium capitalize text-white">
                                  {checkin.mood}
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                  {config.label}
                                </Badge>
                              </div>
                              {checkin.customNote && (
                                <p className="mt-1 text-sm text-slate-400">
                                  {checkin.customNote}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="today" className="mt-6 space-y-6">
            {todaySynopsis && <DailySynopsisCard synopsis={todaySynopsis} />}
          </TabsContent>
          
          <TabsContent value="history" className="mt-6 space-y-6">
            <WeeklyCalendarView />
          </TabsContent>
          
          <TabsContent value="settings" className="mt-6 space-y-6">
            <TrackerSettingsCard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}