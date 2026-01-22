import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { PageHeader } from "@/components/page-header";
import { ProfileSetupModal } from "@/components/profile-setup-modal";
import { MobilityCapabilitiesModal } from "@/components/mobility-capabilities-modal";
import { AnalyticsDebugPanel } from "@/components/analytics-debug-panel";
import { InteractiveTour, useInteractiveTour } from "@/components/interactive-tour";
import { saveEnhancedOnboarding } from "@/lib/guest-storage";
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
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useTutorialStart, useTutorial } from "@/contexts/tutorial-context";
import { useToast } from "@/hooks/use-toast";

const MENU_TUTORIAL_KEY = "fts:menuTutorialDone";
const MENU_TUTORIAL_STEP_KEY = "fts:menuTutorialStep";

export function SettingsPage() {
  useTutorialStart("settings", 1000);
  const { resetAllTutorials } = useTutorial();
  const { permission, isSupported, requestPermission, sendTestNotification } = usePushNotifications();
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [showMobilityModal, setShowMobilityModal] = useState(false);
  const [showAnalyticsDebug, setShowAnalyticsDebug] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { isOpen, startTour, completeTour, skipTour } = useInteractiveTour();
  
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
  
  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Settings" backPath="/" />

      <main className="p-4 max-w-2xl mx-auto space-y-4">
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
                variant="outline"
                onClick={handleReplayMenuTour}
                data-testid="button-replay-tour"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Replay Menu Tour
              </Button>
              <Button 
                variant="outline"
                onClick={handleResetAllTutorials}
                data-testid="button-reset-all-tutorials"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset All Tutorials
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">Reminders</CardTitle>
                <CardDescription>Notification preferences</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Daily check-in reminder</Label>
              <Switch data-testid="switch-daily-reminder" />
            </div>
            <div className="flex items-center justify-between">
              <Label>Challenge reminders</Label>
              <Switch data-testid="switch-challenge-reminder" />
            </div>
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
            <Link href="/privacy-terms">
              <div className="flex items-center justify-between p-3 -mx-3 rounded-md hover-elevate cursor-pointer" data-testid="link-privacy-terms">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Privacy Policy & Terms of Use</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
            <Button variant="destructive" size="sm" data-testid="button-delete-account">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete my data
            </Button>
          </CardContent>
        </Card>

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
      </main>

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

      <InteractiveTour
        open={isOpen}
        onComplete={handleTourComplete}
        onSkip={handleTourSkip}
      />
    </div>
  );
}
