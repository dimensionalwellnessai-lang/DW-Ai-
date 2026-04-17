import { useState } from "react";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ensurePushSubscription, unsubscribePushSubscription } from "@/lib/push-subscription";
import { cancelAllNativeReminders, isCapacitor } from "@/lib/capacitor-notifications";
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
import { isFeatureEnabled } from "@/config/featureFlags";
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
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useTutorialStart, useTutorial } from "@/contexts/tutorial-context";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const MENU_TUTORIAL_KEY = "dw:menuTutorialDone";
const MENU_TUTORIAL_STEP_KEY = "dw:menuTutorialStep";
/** App-level preference key: user can disable browser notifications without revoking permission */
const BROWSER_NOTIF_ENABLED_KEY = "dw_browser_notif_enabled";

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
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { isOpen, startTour, completeTour, skipTour } = useInteractiveTour();

  // Reminders settings
  const remindersEnabled = isFeatureEnabled("REMINDERS");
  const dwLearnsEnabled = isFeatureEnabled("DW_LEARNS");
  const coachModesEnabled = isFeatureEnabled("COACH_MODES");
  const { isEnabled: learningEnabled, updateProfile: updateLearningProfile } = useLearningProfile();
  const { coachMode, setCoachMode, isUpdating: isCoachModeUpdating } = useCoachMode();
  const { consent: cosmicConsent, update: updateCosmicConsent } = useCosmicConsent();

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
    try { localStorage.setItem(CHECKIN_REMINDER_TIME_KEY, val); } catch { /* blocked */ }
  };
  // App-level browser notification preference (separate from OS/browser permission)
  const [browserNotifEnabled, setBrowserNotifEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem(BROWSER_NOTIF_ENABLED_KEY) !== "false"; } catch { return true; }
  });
  // Analytics opt-out preference — "enabled" = not opted-out
  const [analyticsEnabled, setAnalyticsEnabledState] = useState<boolean>(() => !isAnalyticsOptedOut());
  const handleAnalyticsToggle = (checked: boolean) => {
    setAnalyticsOptOut(!checked); // checked=true → opt-out=false (tracking ON)
    setAnalyticsEnabledState(checked);
  };
  const handleBrowserNotifToggle = async (checked: boolean) => {
    if (checked && permission !== "granted") {
      const granted = await requestPermission();
      if (!granted) return; // permission denied by browser – don't update pref
    }
    setBrowserNotifEnabled(checked);
    try { localStorage.setItem(BROWSER_NOTIF_ENABLED_KEY, String(checked)); } catch { /* blocked */ }
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
  
  return (
    <div className="flex flex-col h-full bg-background">
      <PageHeader title="Settings" backPath="/" />

      <div className="flex-1 overflow-auto">
        <main className="p-4 max-w-2xl mx-auto space-y-4 page-enter" data-tour="settings">
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
                onCheckedChange={v => updateCosmicConsent("useAstrologyInGuidance", v)}
                aria-label="Use cosmic insights in guidance"
                data-testid="switch-cosmic-astrology"
              />
            </div>
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
                onCheckedChange={v => updateCosmicConsent("useNumerologyInGuidance", v)}
                aria-label="Use numerology in guidance"
                data-testid="switch-cosmic-numerology"
              />
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
                  onCheckedChange={(checked) =>
                    updateLearningProfile({ learningEnabled: checked })
                  }
                />
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
                    onClick={() => setCoachMode(mode)}
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
              <p className="text-xs text-muted-foreground">
                Default is Gentle. You can change this at any time.
              </p>
            </CardContent>
          </Card>
        )}

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

  const updatePrefs = useMutation({
    mutationFn: async (updates: Partial<NotificationPreferences>) => {
      const res = await apiRequest("PUT", "/api/accountability/preferences", updates);
      return res.json();
    },
    onSuccess: (next) => {
      queryClient.setQueryData(["/api/accountability/preferences"], next);
    },
    onError: () => {
      toast({
        title: "Couldn't save reminder settings",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    },
  });

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
      updatePrefs.mutate({ accountabilityEnabled: true });
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
      updatePrefs.mutate({ accountabilityEnabled: true });
    } else {
      // Going from on → off: persist the pref, drop the web-push subscription
      // for this browser, and cancel any pending native local notifications
      // so the OS won't fire them after the user has opted out.
      updatePrefs.mutate({ accountabilityEnabled: false });
      if (!native) {
        void unsubscribePushSubscription();
      } else {
        void cancelAllNativeReminders();
      }
    }
  };

  const handleSubToggle = (
    field: "preTaskEnabled" | "postTaskEnabled",
    checked: boolean,
  ) => {
    updatePrefs.mutate({ [field]: checked });
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
        <div className="flex items-center gap-3">
          <BellRing className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle className="text-base">Accountability Reminders</CardTitle>
            <CardDescription>
              Get nudges before and after scheduled tasks — even when the app is closed.
            </CardDescription>
          </div>
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
              updatePrefs.isPending ||
              (!native && (!isSupported || permission === "denied"))
            }
            onCheckedChange={handleMasterToggle}
            data-testid="switch-accountability-enabled"
          />
        </div>

        {/* Pre-task */}
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
              updatePrefs.isPending ||
              !accountabilityEnabled
            }
            onCheckedChange={(c) => handleSubToggle("preTaskEnabled", c)}
            data-testid="switch-accountability-pre-task"
          />
        </div>

        {/* Post-task */}
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
              updatePrefs.isPending ||
              !accountabilityEnabled
            }
            onCheckedChange={(c) => handleSubToggle("postTaskEnabled", c)}
            data-testid="switch-accountability-post-task"
          />
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
