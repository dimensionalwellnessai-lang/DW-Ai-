import { useState } from "react";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { SyncIndicator } from "@/components/sync-indicator";
import {
  useAccountabilityPrefsSync,
  type PrefField,
} from "@/hooks/use-accountability-prefs-sync";
import { usePrefSync } from "@/hooks/use-pref-sync";
import { ensurePushSubscription, unsubscribePushSubscription } from "@/lib/push-subscription";
import { cancelAllNativeReminders, isCapacitor, scheduleNativeTestReminder } from "@/lib/capacitor-notifications";
import type { NotificationPreferences } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguagePickerCard } from "@/components/settings/language-picker-card";
import { ThemeSelector } from "@/components/theme-selector";
import { WearableManager } from "@/components/wearable-manager";
import { VoiceSettings } from "@/components/voice-settings";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { PageHeader } from "@/components/page-header";
import { ProfileSetupModal } from "@/components/profile-setup-modal";
import { MobilityCapabilitiesModal } from "@/components/mobility-capabilities-modal";
import { AnalyticsDebugPanel } from "@/components/analytics-debug-panel";
import { useInteractiveTour } from "@/components/interactive-tour";
import { PremiumFeaturesDialog } from "@/components/premium-features-dialog";
import { saveEnhancedOnboarding } from "@/lib/guest-storage";
import { isDemoMode, initializeDemoMode, exitDemoMode } from "@/lib/demo-mode";
import { isFeatureEnabled, type FeatureFlags } from "@/config/featureFlags";
import { useLearningProfile } from "@/hooks/use-learning-profile";
import { useCoachMode, COACHING_MODES, COACHING_MODE_LABELS, COACHING_MODE_DESCRIPTIONS, type CoachingMode } from "@/hooks/use-coach-mode";
import { useCosmicConsent } from "@/hooks/use-cosmic-consent";
import { RemindersPanel } from "@/components/reminders-panel";
import { CHECKIN_REMINDER_TIME_KEY } from "@/hooks/use-reminder-integrations";
import { isAnalyticsOptedOut, setAnalyticsOptOut } from "@/lib/analytics";
import {
  User,
  Bell,
  Shield,
  Trash2,
  Moon,
  BellRing,
  BellOff,
  FileText,
  ChevronRight,
  Settings2,
  Bug,
  RotateCcw,
  HelpCircle,
  Activity,
  Sparkles,
  TestTube,
  Flag,
  Brain,
  MessageSquare,
  Star,
  BookHeart,
  RefreshCw,
  Check,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useTutorialStart, useTutorial } from "@/contexts/tutorial-context";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const MENU_TUTORIAL_KEY = "dw:menuTutorialDone";
const MENU_TUTORIAL_STEP_KEY = "dw:menuTutorialStep";
/** App-level preference key: user can disable browser notifications without revoking permission */
const BROWSER_NOTIF_ENABLED_KEY = "dw_browser_notif_enabled";

interface LabsFlagConfig {
  id: keyof FeatureFlags;
  storageKey: string;
  label: string;
  description: string;
}

const LABS_FLAGS: LabsFlagConfig[] = [
  { id: "exploreCard", storageKey: "dw_explore_card", label: "Explore doorway card", description: "Shows a gentle card for hobbies and curiosities on Today." },
  { id: "entertainmentCard", storageKey: "dw_entertainment_card", label: "Entertainment doorway card", description: "Adds an unwind-focused card on Today." },
  { id: "creatorsCard", storageKey: "dw_creators_card", label: "Creators doorway card", description: "Adds a card for creator content and people you follow." },
  { id: "companionshipCard", storageKey: "dw_companionship_card", label: "Companionship doorway card", description: "Adds a social-support card so you do not have to do this alone." },
  { id: "dwProactiveNotices", storageKey: "dw_proactive_notices", label: "DW proactive notices", description: "Enables the \"DW noticed…\" suggestion layer on Today." },
  { id: "actionEngine", storageKey: "dw_action_engine", label: "Action engine", description: "Turns on client-side action suggestions inside agentic cards." },
  { id: "sharedAttention", storageKey: "dw_shared_attention", label: "Shared attention modes", description: "Enables co-watch and shared-presence actions." },
  { id: "DW_READING_CARD", storageKey: "dw_reading_card", label: "Daily reading card", description: "Shows the dimensional reading card on Today." },
  { id: "MILESTONE_MOMENTS", storageKey: "dw_milestone_moments", label: "Milestone moments", description: "Shows celebration moments for meaningful progress." },
  { id: "ONBOARDING_VALUE_PREVIEW", storageKey: "dw_onboarding_value_preview", label: "Onboarding value preview", description: "Adds the value-preview step before onboarding conversation." },
  { id: "WEEKLY_REVIEW", storageKey: "dw_weekly_review", label: "Weekly review", description: "Turns on weekly reflection with a next-week proposal." },
  { id: "SHARE_EXPORT", storageKey: "dw_share_export", label: "Share and export", description: "Enables sharing and export actions for plans and summaries." },
  { id: "DW_INSIGHT_JOURNAL", storageKey: "dw_insight_journal_enabled", label: "DW insight journal", description: "Turns on DW insight and journal intelligence surfaces." },
  { id: "JOURNAL_AUTOGEN", storageKey: "dw_journal_autogen", label: "Journal autogen", description: "Auto-generates draft journal entries and insight cards." },
  { id: "ELEVATION_ENGINE", storageKey: "dw_elevation_engine", label: "Elevation engine", description: "Enables stagnation detection and elevation nudges." },
  { id: "ELEVATION_PLAN", storageKey: "dw_elevation_plan", label: "Elevation plan", description: "Turns on the 7-day elevation plan builder." },
  { id: "MULTI_PLAN", storageKey: "dw_multi_plan", label: "Multi-plan history", description: "Enables plan history and multiple plan support." },
  { id: "INTERACTION_ENGINE", storageKey: "dw_interaction_engine", label: "Interaction engine", description: "Turns on concise A→B→C style interaction shaping in chat." },
];

export function SettingsPage() {
  usePageMeta("Settings", "Customize your DW.ai preferences and account settings.");
  useTutorialStart("settings", 1000);
  const { resetAllTutorials } = useTutorial();
  const { permission, isSupported, requestPermission, sendTestNotification } = usePushNotifications();
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [showMobilityModal, setShowMobilityModal] = useState(false);
  const [showAnalyticsDebug, setShowAnalyticsDebug] = useState(false);
  const [showPremiumDialog, setShowPremiumDialog] = useState(false);
  const [demoActive, setDemoActive] = useState(() => isDemoMode());
  const [labsState, setLabsState] = useState<Record<string, boolean>>(
    () => Object.fromEntries(LABS_FLAGS.map((flag) => [flag.id, isFeatureEnabled(flag.id)])),
  );
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { isOpen, startTour, completeTour, skipTour } = useInteractiveTour();

  // Reminders settings
  const remindersEnabled = isFeatureEnabled("REMINDERS");
  const dwLearnsEnabled = isFeatureEnabled("DW_LEARNS");
  const coachModesEnabled = isFeatureEnabled("COACH_MODES");
  const { isEnabled: learningEnabled, updateProfile: updateLearningProfile } = useLearningProfile();
  const { coachMode, setCoachModeAsync, isUpdating: isCoachModeUpdating } = useCoachMode();
  const { consent: cosmicConsent, update: updateCosmicConsent } = useCosmicConsent();

  // Per-field save status driving the inline `<SyncIndicator />`s on this
  // page. Mirrors the pattern used by accountability preferences so users get
  // the same reassurance ("Synced across devices") for every preference they
  // change here.
  const settingsSync = usePrefSync({ logTag: "settings-prefs" });
  const fieldIndicator = (field: string, testIdPrefix: string) => {
    const { status, error } = settingsSync.statusFor(field);
    if (status === "idle") return null;
    return (
      <SyncIndicator
        status={status}
        error={error}
        testIdPrefix={testIdPrefix}
        showIdle={false}
        className="mt-1"
      />
    );
  };

  // ── Full account reset ───────────────────────────────────────────────────
  const [showResetDialog, setShowResetDialog] = useState(false);
  const resetMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/user/life-system/reset"),
    onSuccess: () => {
      setShowResetDialog(false);
      // Clear onboarding flags so the welcome/onboarding flow runs again
      try {
        localStorage.removeItem("dw_onboarding_completed");
        const guestData = localStorage.getItem("dw_guest_data");
        if (guestData) {
          const parsed = JSON.parse(guestData);
          if (parsed.profileSetup) {
            delete parsed.profileSetup;
            localStorage.setItem("dw_guest_data", JSON.stringify(parsed));
          }
        }
      } catch { /* ignore */ }
      // Navigate to welcome to restart onboarding
      window.location.href = "/welcome";
    },
    onError: () => {
      toast({ title: "Reset failed", description: "Something went wrong. Please try again.", variant: "destructive" });
    },
  });
  const [checkinReminderTime, setCheckinReminderTime] = useState<string>(() => {
    try { return localStorage.getItem(CHECKIN_REMINDER_TIME_KEY) ?? "18:00"; } catch { return "18:00"; }
  });
  const handleCheckinTimeChange = (val: string) => {
    setCheckinReminderTime(val);
    void settingsSync.run("checkinReminderTime", () => {
      // Throws if storage is blocked — surfaced inline by the sync indicator.
      localStorage.setItem(CHECKIN_REMINDER_TIME_KEY, val);
    });
  };
  // App-level browser notification preference (separate from OS/browser permission)
  const [browserNotifEnabled, setBrowserNotifEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem(BROWSER_NOTIF_ENABLED_KEY) !== "false"; } catch { return true; }
  });
  // Analytics opt-out preference — "enabled" = not opted-out
  const [analyticsEnabled, setAnalyticsEnabledState] = useState<boolean>(() => !isAnalyticsOptedOut());
  const handleAnalyticsToggle = (checked: boolean) => {
    setAnalyticsEnabledState(checked);
    void settingsSync.run("analyticsEnabled", () => {
      setAnalyticsOptOut(!checked); // checked=true → opt-out=false (tracking ON)
    });
  };
  const handleBrowserNotifToggle = async (checked: boolean) => {
    if (checked && permission !== "granted") {
      const granted = await requestPermission();
      if (!granted) return; // permission denied by browser – don't update pref
    }
    setBrowserNotifEnabled(checked);
    void settingsSync.run("browserNotifEnabled", () => {
      localStorage.setItem(BROWSER_NOTIF_ENABLED_KEY, String(checked));
    });
  };
  const handleCosmicConsentToggle = (
    key: "useAstrologyInGuidance" | "useNumerologyInGuidance",
    value: boolean,
  ) => {
    void settingsSync.run(key, () => updateCosmicConsent(key, value));
  };
  const handleLearningEnabledToggle = (checked: boolean) => {
    void settingsSync.run("learningEnabled", () =>
      updateLearningProfile({ learningEnabled: checked }),
    );
  };
  const handleCoachModeChange = (mode: CoachingMode) => {
    void settingsSync.run("coachMode", () => setCoachModeAsync(mode));
  };
  
  const handleReplayMenuTour = () => {
    localStorage.removeItem(MENU_TUTORIAL_KEY);
    localStorage.removeItem(MENU_TUTORIAL_STEP_KEY);
    toast({
      title: "Menu tour reset",
      description: "Navigate to the main chat to start the tour",
    });
    setLocation("/chat");
  };
  
  const handleResetAllTutorials = () => {
    resetAllTutorials();
    localStorage.removeItem(MENU_TUTORIAL_KEY);
    localStorage.removeItem(MENU_TUTORIAL_STEP_KEY);
    toast({
      title: "All tutorials reset",
      description: "Visit any screen to see its tutorial again",
    });
  };

  const handleStartInteractiveTour = () => {
    startTour();
  };

  const handleTourComplete = () => {
    saveEnhancedOnboarding({ tourCompleted: true });
    completeTour();
    toast({
      title: "Tour completed",
      description: "You can replay it anytime from Settings",
    });
  };

  const handleTourSkip = () => {
    skipTour();
  };

  const handleToggleDemo = (checked: boolean) => {
    if (checked) {
      initializeDemoMode();
      setDemoActive(true);
      toast({ title: "Demo Mode enabled", description: "Sample wellness data loaded" });
    } else {
      exitDemoMode();
      setDemoActive(false);
      toast({ title: "Demo Mode disabled", description: "Demo data cleared" });
      setLocation("/login");
    }
  };

  const handleLabsToggle = (flag: LabsFlagConfig, checked: boolean) => {
    setLabsState((prev) => ({ ...prev, [flag.id]: checked }));
    try {
      localStorage.setItem(flag.storageKey, String(checked));
      window.location.reload();
    } catch {
      toast({
        title: "Could not save that toggle",
        description: "Your browser blocked local storage for this setting.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="flex flex-col h-full bg-background">
      <PageHeader title="Settings" backPath="/" />

      <div className="flex-1 overflow-auto">
        <main className="p-4 pb-24 max-w-2xl mx-auto space-y-4 page-enter" data-tour="settings">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Settings2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">Quick Setup</CardTitle>
                <CardDescription>Edit your schedule, times, and focus area</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              onClick={() => setShowProfileSetup(true)}
              data-testid="button-edit-quick-setup"
            >
              Edit Quick Setup
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">Practice Preferences</CardTitle>
                <CardDescription>Set your mobility, equipment, and intensity preferences</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              onClick={() => setShowMobilityModal(true)}
              data-testid="button-edit-mobility"
            >
              Edit Mobility & Capabilities
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <BookHeart className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">Values &amp; Rules</CardTitle>
                <CardDescription>Dietary rules, movement constraints, and life boundaries</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Link href="/values-rules-profile">
              <Button variant="outline" data-testid="button-edit-values-rules">
                Edit Values &amp; Rules
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* ── Life Check-in — keep DW in sync as life changes ──────────────── */}
        <Card data-testid="card-life-checkin">
          <CardHeader>
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">Life Check-in</CardTitle>
                <CardDescription>Life changes. Keep DW in sync.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setLocation("/voice-onboarding?review=1")}
              data-testid="button-life-checkin-quick"
            >
              Quick update
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/voice-onboarding?refresh=1")}
              data-testid="button-life-checkin-refresh"
            >
              Full life refresh
            </Button>
          </CardContent>
        </Card>

        {/* ── Cosmic Guidance Consent ───────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Star className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">Cosmic Guidance</CardTitle>
                <CardDescription>
                  Optional cosmic lenses — cosmic insights and numerology — for self-reflection. Practical guidance is always primary.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="cosmic-astrology-toggle" className="flex flex-col gap-0.5 cursor-pointer">
                  <span>Cosmic insights</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    Include your birth chart in personalized DW guidance
                  </span>
                </Label>
                <Switch
                  id="cosmic-astrology-toggle"
                  checked={cosmicConsent.useAstrologyInGuidance}
                  onCheckedChange={v => handleCosmicConsentToggle("useAstrologyInGuidance", v)}
                  aria-label="Use cosmic insights in guidance"
                  data-testid="switch-cosmic-astrology"
                />
              </div>
              {fieldIndicator("useAstrologyInGuidance", "status-cosmic-astrology")}
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="cosmic-numerology-toggle" className="flex flex-col gap-0.5 cursor-pointer">
                  <span>Numerology insights</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    Include your numbers in personalized DW guidance
                  </span>
                </Label>
                <Switch
                  id="cosmic-numerology-toggle"
                  checked={cosmicConsent.useNumerologyInGuidance}
                  onCheckedChange={v => handleCosmicConsentToggle("useNumerologyInGuidance", v)}
                  aria-label="Use numerology in guidance"
                  data-testid="switch-cosmic-numerology"
                />
              </div>
              {fieldIndicator("useNumerologyInGuidance", "status-cosmic-numerology")}
            </div>
            <p className="text-xs text-muted-foreground">
              When enabled, DW may reference your chart or numbers where relevant — always alongside practical guidance, never as a replacement.
            </p>
          </CardContent>
        </Card>

        <Card className="card-modern">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-accent" />
              <div>
                <CardTitle className="text-base">Premium Features</CardTitle>
                <CardDescription>Optional tools for power users</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              All core wellness features are free forever. Premium tools add convenience for power users.
            </p>
            <Button 
              variant="outline" 
              onClick={() => setShowPremiumDialog(true)}
              data-testid="button-view-premium"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              View Premium Options
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">Account</CardTitle>
                <CardDescription>Manage your account settings</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Email notifications</Label>
              <Switch data-testid="switch-email-notifications" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">Notifications</CardTitle>
                <CardDescription>Receive gentle reminders for check-ins</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {!isSupported ? (
              <p className="text-sm text-muted-foreground">
                Push notifications are not supported in your browser
              </p>
            ) : permission === "granted" ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <BellRing className="h-4 w-4" />
                  Notifications enabled
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={sendTestNotification}
                  data-testid="button-test-notification"
                >
                  Send Test Notification
                </Button>
              </div>
            ) : permission === "denied" ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BellOff className="h-4 w-4" />
                Notifications blocked. Enable in browser settings.
              </div>
            ) : (
              <Button 
                onClick={requestPermission}
                data-testid="button-enable-notifications"
              >
                <Bell className="h-4 w-4 mr-2" />
                Enable Notifications
              </Button>
            )}
          </CardContent>
        </Card>

        {/* ── Reminders (PR #7) ──────────────────────────────────────────── */}
        {remindersEnabled && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <BellRing className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle className="text-base">Reminders</CardTitle>
                  <CardDescription>Manage in-app reminders and browser notifications</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Browser notifications opt-in */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="browser-notif-toggle" className="text-sm font-medium">
                      Browser notifications
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Get notified while DW is open in this browser
                      {!isSupported && " (not supported in this browser)"}
                    </p>
                  </div>
                  {isSupported ? (
                    <Switch
                      id="browser-notif-toggle"
                      checked={browserNotifEnabled && permission === "granted"}
                      disabled={permission === "denied"}
                      onCheckedChange={handleBrowserNotifToggle}
                      data-testid="switch-browser-notifications"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">Unavailable</span>
                  )}
                </div>
                {permission === "denied" && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <BellOff className="h-3.5 w-3.5 shrink-0" />
                    Permission denied — enable notifications in your browser settings to use this feature.
                  </div>
                )}
                {permission === "granted" && browserNotifEnabled && (
                  <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                    <BellRing className="h-3.5 w-3.5 shrink-0" />
                    Browser notifications active. Only fires while the app is open.
                  </div>
                )}
                {fieldIndicator("browserNotifEnabled", "status-browser-notifications")}
              </div>

              {/* Daily check-in reminder time */}
              <div className="space-y-1.5">
                <Label htmlFor="checkin-time" className="text-sm font-medium">
                  Daily check-in reminder time
                </Label>
                <p className="text-xs text-muted-foreground">
                  If you haven't checked in by this time, a reminder will appear.
                </p>
                <Input
                  id="checkin-time"
                  type="time"
                  value={checkinReminderTime}
                  onChange={(e) => handleCheckinTimeChange(e.target.value)}
                  className="w-36"
                  data-testid="input-checkin-reminder-time"
                />
                {fieldIndicator("checkinReminderTime", "status-checkin-reminder-time")}
              </div>

              {/* Scheduled reminders list */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Scheduled reminders</Label>
                <RemindersPanel />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Theme Selector */}
        <ThemeSelector />

        {/* Wearable Device Manager */}
        <WearableManager />

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Moon className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">Appearance</CardTitle>
                <CardDescription>Customize how the app looks</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label>Theme</Label>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>

        <LanguagePickerCard />

        {/* Voice Settings */}
        <VoiceSettings />

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <HelpCircle className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">App Tours</CardTitle>
                <CardDescription>Learn how to use each feature</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Replay tutorials to learn how each screen works.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/tours-hub">
                <Button variant="default" data-testid="button-tours-hub">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Tours Hub
                  <span className="ml-1 text-xs opacity-70">— view &amp; replay all tours</span>
                </Button>
              </Link>
              <Button 
                variant="default"
                onClick={handleStartInteractiveTour}
                data-testid="button-start-interactive-tour"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Take Interactive Tour
              </Button>
              <Button 
                variant="secondary"
                onClick={handleReplayMenuTour}
                data-testid="button-replay-tour"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Replay Menu Tour
              </Button>
              <Button 
                variant="secondary"
                onClick={handleResetAllTutorials}
                data-testid="button-reset-all-tutorials"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset All Tutorials
              </Button>
            </div>
          </CardContent>
        </Card>

        <AccountabilityRemindersSection
          permission={permission}
          isSupported={isSupported}
          requestPermission={requestPermission}
        />

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Flag className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">Support</CardTitle>
                <CardDescription>Report an issue or unexpected behavior</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Link href="/support/report">
              <div className="flex items-center justify-between p-3 -mx-3 rounded-md hover-elevate cursor-pointer" data-testid="link-support-report">
                <div className="flex items-center gap-3">
                  <Flag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Report a problem</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          </CardContent>
        </Card>

        {/* ── DW Learns (PR #8) ──────────────────────────────────────────────── */}
        {dwLearnsEnabled && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Brain className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base">DW Learns</CardTitle>
                  <CardDescription>
                    Quiet personalization — DW adapts to your patterns to offer more relevant guidance
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="dw-learns-toggle" className="flex flex-col gap-0.5">
                    <span>Personalization</span>
                    <span className="text-xs text-muted-foreground font-normal">
                      {learningEnabled
                        ? "DW is learning from your activity"
                        : "Personalization is off"}
                    </span>
                  </Label>
                  <Switch
                    id="dw-learns-toggle"
                    checked={learningEnabled}
                    onCheckedChange={handleLearningEnabledToggle}
                    data-testid="switch-dw-learns-enabled"
                  />
                </div>
                {fieldIndicator("learningEnabled", "status-dw-learns")}
              </div>
              <Link href="/dw-learns">
                <div className="flex items-center justify-between p-3 -mx-3 rounded-md hover-elevate cursor-pointer" data-testid="link-dw-learns">
                  <div className="flex items-center gap-3">
                    <Brain className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">View what DW learned</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* ── Coach Mode / Tone Settings (PR #16) ────────────────────────────── */}
        {coachModesEnabled && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base">Coach Mode</CardTitle>
                  <CardDescription>
                    Choose how DW communicates with you — affects tone, prompts, and guidance style
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div
                role="radiogroup"
                aria-label="Coach Mode"
                className="grid grid-cols-1 gap-2"
                data-testid="coach-mode-selector"
              >
                {COACHING_MODES.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={coachMode === mode}
                    disabled={isCoachModeUpdating}
                    onClick={() => handleCoachModeChange(mode as CoachingMode)}
                    data-testid={`coach-mode-${mode}`}
                    className={cn(
                      "flex flex-col gap-0.5 rounded-md border px-4 py-3 text-left transition-colors",
                      coachMode === mode
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-primary/40 hover:bg-muted/40"
                    )}
                  >
                    <span className="text-sm font-medium">{COACHING_MODE_LABELS[mode as CoachingMode]}</span>
                    <span className="text-xs text-muted-foreground">
                      {COACHING_MODE_DESCRIPTIONS[mode as CoachingMode]}
                    </span>
                  </button>
                ))}
              </div>
              {fieldIndicator("coachMode", "status-coach-mode")}
              <p className="text-xs text-muted-foreground">
                Default is Gentle. You can change this at any time.
              </p>
            </CardContent>
          </Card>
        )}

        <Card data-testid="card-labs-flags">
          <CardHeader>
            <div className="flex items-center gap-3">
              <TestTube className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">Labs</CardTitle>
                <CardDescription>Experimental features you can opt into locally.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {LABS_FLAGS.map((flag) => (
              <div key={flag.id} className="flex items-start justify-between gap-3">
                <Label htmlFor={`labs-${flag.id}`} className="flex flex-col gap-0.5 cursor-pointer pr-2">
                  <span>{flag.label}</span>
                  <span className="text-xs text-muted-foreground font-normal">{flag.description}</span>
                </Label>
                <Switch
                  id={`labs-${flag.id}`}
                  checked={labsState[flag.id] ?? false}
                  onCheckedChange={(checked) => handleLabsToggle(flag, checked)}
                  data-testid={`switch-labs-${flag.id}`}
                />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Changes apply after reload.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">Privacy</CardTitle>
                <CardDescription>Your data and privacy options</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your data is stored securely. You can delete your account and all associated data at any time.
            </p>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="analytics-toggle" className="flex flex-col gap-0.5">
                  <span>Usage analytics</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    {analyticsEnabled
                      ? "Anonymous usage events are tracked to improve DW"
                      : "Analytics tracking is off"}
                  </span>
                </Label>
                <Switch
                  id="analytics-toggle"
                  checked={analyticsEnabled}
                  onCheckedChange={handleAnalyticsToggle}
                  data-testid="switch-analytics-enabled"
                />
              </div>
              {fieldIndicator("analyticsEnabled", "status-analytics-enabled")}
            </div>
            <Link href="/privacy-terms">
              <div className="flex items-center justify-between p-3 -mx-3 rounded-md hover-elevate cursor-pointer" data-testid="link-privacy-terms">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Privacy Policy & Terms of Use</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                size="sm"
                className="border-orange-500/50 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 w-full sm:w-auto"
                onClick={() => setShowResetDialog(true)}
                data-testid="button-reset-life-system"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Start over
              </Button>
              <Link href="/account/delete">
                <Button variant="destructive" size="sm" data-testid="button-delete-account" className="w-full sm:w-auto">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete my data
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* ── Reset Life System confirmation dialog ─────────────────────── */}
        <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Start completely over?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>DW will wipe your life system data and relearn you from scratch through onboarding.</p>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 space-y-1.5">
                      <p className="font-medium text-destructive text-xs uppercase tracking-wide">Gets cleared</p>
                      {[
                        "Goals & targets",
                        "Habits & core rules",
                        "Schedule & events",
                        "Routines",
                        "Grocery list",
                        "DW's memory of you",
                        "Onboarding answers",
                      ].map(item => (
                        <p key={item} className="text-xs flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-destructive shrink-0" />{item}
                        </p>
                      ))}
                    </div>
                    <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 space-y-1.5">
                      <p className="font-medium text-green-600 dark:text-green-400 text-xs uppercase tracking-wide">Always kept</p>
                      {[
                        "Your email & password",
                        "Login credentials",
                        "Chat history",
                        "Account & profile",
                      ].map(item => (
                        <p key={item} className="text-xs flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-green-500 shrink-0" />{item}
                        </p>
                      ))}
                    </div>
                  </div>

                  <p className="text-xs">After confirming you'll go through onboarding again. This cannot be undone.</p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="btn-reset-cancel">Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => resetMutation.mutate()}
                disabled={resetMutation.isPending}
                data-testid="btn-reset-confirm"
              >
                {resetMutation.isPending ? "Clearing everything…" : "Yes, start over"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {import.meta.env.DEV && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Bug className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle className="text-base">Developer Tools</CardTitle>
                  <CardDescription>Debug options (dev only)</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowAnalyticsDebug(true)}
                data-testid="button-analytics-debug"
              >
                View Analytics Events
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <TestTube className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">Demo Mode</CardTitle>
                <CardDescription>
                  Explore with pre-populated sample data — no account required
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="demo-mode-toggle" className="text-sm">
                {demoActive ? "Demo Mode is active" : "Demo Mode is off"}
              </Label>
              <Switch
                id="demo-mode-toggle"
                checked={demoActive}
                onCheckedChange={handleToggleDemo}
                data-testid="switch-demo-mode"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Enabling Demo Mode loads sample wellness data so you can explore all features without creating an account.
              Disabling it clears demo data and returns you to the login screen.
            </p>
          </CardContent>
        </Card>
      </main>
      </div>

      <ProfileSetupModal
        isOpen={showProfileSetup}
        onComplete={() => setShowProfileSetup(false)}
      />

      <MobilityCapabilitiesModal
        isOpen={showMobilityModal}
        onClose={() => setShowMobilityModal(false)}
      />

      <AnalyticsDebugPanel
        open={showAnalyticsDebug}
        onClose={() => setShowAnalyticsDebug(false)}
      />

      <PremiumFeaturesDialog
        open={showPremiumDialog}
        onOpenChange={setShowPremiumDialog}
      />
    </div>
  );
}

interface AccountabilityRemindersSectionProps {
  permission: NotificationPermission | "default";
  isSupported: boolean;
  requestPermission: () => Promise<boolean>;
}

function AccountabilityRemindersSection({
  permission,
  isSupported,
  requestPermission,
}: AccountabilityRemindersSectionProps) {
  const { toast } = useToast();
  const native = isCapacitor();

  const { data: prefs, isLoading } = useQuery<NotificationPreferences>({
    queryKey: ["/api/accountability/preferences"],
  });

  // Shared mutation wrapper that drives a per-field SyncIndicator instead of
  // a one-off error toast. Failures stay on screen until the next attempt.
  const prefsSync = useAccountabilityPrefsSync();

  const fieldIndicator = (field: PrefField, testIdPrefix: string) => {
    const { status, error } = prefsSync.statusFor(field);
    if (status === "idle") return null;
    return (
      <SyncIndicator
        status={status}
        error={error}
        testIdPrefix={testIdPrefix}
        showIdle={false}
        className="mt-1"
      />
    );
  };

  const accountabilityEnabled = prefs?.accountabilityEnabled ?? false;
  const preTaskEnabled = prefs?.preTaskEnabled ?? false;
  const postTaskEnabled = prefs?.postTaskEnabled ?? false;

  const handleEnableNotifications = async () => {
    const granted = await requestPermission();
    if (!granted) {
      toast({
        title: "Permission denied",
        description: "Enable notifications in your browser settings to receive reminders.",
        variant: "destructive",
      });
      return;
    }
    const ok = await ensurePushSubscription();
    if (!ok) {
      toast({
        title: "Couldn't subscribe to reminders",
        description: "Notifications were allowed, but we couldn't register this browser.",
        variant: "destructive",
      });
      return;
    }
    if (!accountabilityEnabled) {
      prefsSync.update({ accountabilityEnabled: true });
    }
    toast({
      title: "Reminders on",
      description: "We'll nudge you about upcoming and finished tasks.",
    });
  };

  const handleMasterToggle = async (checked: boolean) => {
    if (checked) {
      // Going from off → on: make sure we have permission + a push sub.
      if (!native) {
        if (!isSupported) {
          toast({
            title: "Not supported",
            description: "This browser doesn't support push notifications.",
            variant: "destructive",
          });
          return;
        }
        if (permission !== "granted") {
          const granted = await requestPermission();
          if (!granted) {
            toast({
              title: "Permission denied",
              description: "Enable notifications in your browser settings to receive reminders.",
              variant: "destructive",
            });
            return;
          }
        }
        const ok = await ensurePushSubscription();
        if (!ok) {
          toast({
            title: "Couldn't subscribe to reminders",
            description: "We couldn't register this browser. Try again.",
            variant: "destructive",
          });
          return;
        }
      }
      prefsSync.update({ accountabilityEnabled: true });
    } else {
      // Going from on → off: persist the pref, drop the web-push subscription
      // for this browser, and cancel any pending native local notifications
      // so the OS won't fire them after the user has opted out.
      prefsSync.update({ accountabilityEnabled: false });
      if (!native) {
        void unsubscribePushSubscription();
      } else {
        void cancelAllNativeReminders();
      }
    }
  };

  const sendTestReminder = useMutation({
    mutationFn: async () => {
      if (native) {
        const ok = await scheduleNativeTestReminder(5);
        if (!ok) throw new Error("native_failed");
        return { mode: "native" as const };
      }
      const res = await apiRequest("POST", "/api/push/test", {});
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        sent?: number;
        removed?: number;
      };
      return { mode: "web" as const, body };
    },
    onSuccess: (result) => {
      if (result.mode === "native") {
        toast({
          title: "Test reminder scheduled",
          description: "Watch for a notification in about 5 seconds.",
        });
        return;
      }
      const { sent = 0, removed = 0 } = result.body;
      if (sent === 0) {
        toast({
          title: "No active subscriptions",
          description:
            removed > 0
              ? "Your saved devices were no longer reachable and have been cleared. Toggle reminders off and on again to re-register this browser."
              : "We couldn't reach any registered devices. Toggle reminders off and on again to re-register this browser.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Test reminder sent",
        description:
          sent === 1
            ? "It should arrive on your device in a few seconds."
            : `Sent to ${sent} devices. It should arrive in a few seconds.`,
      });
    },
    onError: async (err: any) => {
      let description = "Please try again in a moment.";
      if (err?.message === "native_failed") {
        description =
          "Allow notifications for this app in system settings, then try again.";
      } else {
        // apiRequest throws errors shaped like "<status>: <body>". Parse the
        // JSON body when present so we can branch on a structured `error`
        // code instead of relying purely on the status-prefix string.
        const raw: string = err?.message || "";
        const colon = raw.indexOf(":");
        const status = colon > 0 ? parseInt(raw.slice(0, colon), 10) : NaN;
        const tail = colon > 0 ? raw.slice(colon + 1).trim() : raw;
        let parsed: { error?: string; message?: string } | null = null;
        try {
          parsed = tail ? JSON.parse(tail) : null;
        } catch {
          parsed = null;
        }
        if (parsed?.error === "no_subscription" || status === 404) {
          description =
            parsed?.message ||
            "No subscription is registered yet. Toggle reminders on first.";
        } else if (parsed?.message) {
          description = parsed.message;
        }
      }
      toast({
        title: "Couldn't send test reminder",
        description,
        variant: "destructive",
      });
    },
  });

  const canSendTest =
    accountabilityEnabled &&
    !sendTestReminder.isPending &&
    (native || (isSupported && permission === "granted"));

  const handleSubToggle = (
    field: "preTaskEnabled" | "postTaskEnabled",
    checked: boolean,
  ) => {
    prefsSync.update({ [field]: checked });
    if (!checked && native) {
      // On native, the in-OS schedule is rebuilt by the accountability
      // scheduler the next time it runs, but cancel proactively so the user
      // sees an immediate effect.
      void cancelAllNativeReminders();
    }
  };

  return (
    <Card data-testid="card-accountability-reminders">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <BellRing className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">Accountability Reminders</CardTitle>
              <CardDescription>
                Get nudges before and after scheduled tasks — even when the app is closed.
              </CardDescription>
            </div>
          </div>
          <span
            className="flex items-center gap-1 text-xs text-muted-foreground shrink-0"
            data-testid="status-accountability-reminders-baseline"
          >
            <Check className="w-3 h-3" />
            Synced across devices
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Permission gate (web only) */}
        {!native && isSupported && permission !== "granted" && (
          <div className="rounded-md border border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/30 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm text-orange-900 dark:text-orange-100">
              <Bell className="h-4 w-4" />
              {permission === "denied"
                ? "Notifications are blocked in this browser."
                : "Allow notifications to receive reminders."}
            </div>
            {permission === "denied" ? (
              <p className="text-xs text-orange-700 dark:text-orange-300">
                Re-enable notifications for this site in your browser settings, then come back.
              </p>
            ) : (
              <Button
                size="sm"
                onClick={handleEnableNotifications}
                data-testid="button-enable-accountability-notifications"
              >
                <Bell className="h-4 w-4 mr-2" />
                Enable Notifications
              </Button>
            )}
          </div>
        )}
        {!native && !isSupported && (
          <p className="text-sm text-muted-foreground">
            Push notifications aren't supported in this browser.
          </p>
        )}

        {/* Master toggle */}
        <div>
          <div className="flex items-center justify-between gap-3">
            <Label
              htmlFor="accountability-master-toggle"
              className="flex flex-col gap-0.5 cursor-pointer"
            >
              <span>Reminders</span>
              <span className="text-xs text-muted-foreground font-normal">
                {accountabilityEnabled
                  ? "On — pre-task and post-task nudges"
                  : "Off — no accountability reminders"}
              </span>
            </Label>
            <Switch
              id="accountability-master-toggle"
              checked={accountabilityEnabled}
              disabled={
                isLoading ||
                prefsSync.isPending ||
                (!native && (!isSupported || permission === "denied"))
              }
              onCheckedChange={handleMasterToggle}
              data-testid="switch-accountability-enabled"
            />
          </div>
          {fieldIndicator("accountabilityEnabled", "status-settings-accountability-enabled")}
        </div>

        {/* Pre-task */}
        <div>
          <div className="flex items-center justify-between gap-3">
            <Label
              htmlFor="accountability-pre-toggle"
              className="flex flex-col gap-0.5 cursor-pointer"
            >
              <span>Pre-task reminders</span>
              <span className="text-xs text-muted-foreground font-normal">
                "Will you be doing this?" before each scheduled item
              </span>
            </Label>
            <Switch
              id="accountability-pre-toggle"
              checked={preTaskEnabled}
              disabled={
                isLoading ||
                prefsSync.isPending ||
                !accountabilityEnabled
              }
              onCheckedChange={(c) => handleSubToggle("preTaskEnabled", c)}
              data-testid="switch-accountability-pre-task"
            />
          </div>
          {fieldIndicator("preTaskEnabled", "status-settings-pre-task-enabled")}
        </div>

        {/* Post-task */}
        <div>
          <div className="flex items-center justify-between gap-3">
            <Label
              htmlFor="accountability-post-toggle"
              className="flex flex-col gap-0.5 cursor-pointer"
            >
              <span>Post-task reminders</span>
              <span className="text-xs text-muted-foreground font-normal">
                "Did you complete this?" after each scheduled item
              </span>
            </Label>
            <Switch
              id="accountability-post-toggle"
              checked={postTaskEnabled}
              disabled={
                isLoading ||
                prefsSync.isPending ||
                !accountabilityEnabled
              }
              onCheckedChange={(c) => handleSubToggle("postTaskEnabled", c)}
              data-testid="switch-accountability-post-task"
            />
          </div>
          {fieldIndicator("postTaskEnabled", "status-settings-post-task-enabled")}
        </div>

        {/* Send a test reminder */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm">Send a test reminder</span>
            <span className="text-xs text-muted-foreground">
              {native
                ? "Fires a local notification in about 5 seconds."
                : "Pushes a one-off notification to all your registered devices."}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={!canSendTest}
            onClick={() => sendTestReminder.mutate()}
            data-testid="button-send-test-reminder"
          >
            <BellRing className="h-4 w-4 mr-2" />
            {sendTestReminder.isPending ? "Sending…" : "Send test"}
          </Button>
        </div>

        <Link href="/accountability/settings">
          <div
            className="flex items-center justify-between p-3 -mx-3 rounded-md hover-elevate cursor-pointer"
            data-testid="link-accountability-advanced"
          >
            <div className="flex items-center gap-3">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Advanced reminder settings</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}
