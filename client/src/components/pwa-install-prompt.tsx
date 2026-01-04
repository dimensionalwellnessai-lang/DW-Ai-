import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Bell, Share, Plus, Check } from "lucide-react";
import { usePWAInstall } from "@/hooks/use-pwa-install";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useTutorial } from "@/contexts/tutorial-context";

const PROMPT_DISMISSED_KEY = "fts_pwa_prompt_dismissed";
const PROMPT_DELAY_MS = 5000;

export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [step, setStep] = useState<"install" | "notifications" | "done">("install");
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const { permission, isSupported, requestPermission, sendTestNotification } = usePushNotifications();
  const { state: tutorialState, hasSeenNavigationTutorial } = useTutorial();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isInstalled) return;
    
    // Don't show if tutorial is active or hasn't been completed
    if (tutorialState.isActive || !hasSeenNavigationTutorial()) return;
    
    try {
      const dismissed = localStorage.getItem(PROMPT_DISMISSED_KEY);
      if (dismissed) {
        const dismissedTime = parseInt(dismissed, 10);
        const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
        if (daysSinceDismissed < 7) return;
      }
    } catch {
      return;
    }

    const timer = setTimeout(() => {
      if (isInstallable && !isInstalled) {
        setShowPrompt(true);
      }
    }, PROMPT_DELAY_MS);

    return () => clearTimeout(timer);
  }, [isInstallable, isInstalled, tutorialState.isActive, hasSeenNavigationTutorial]);

  const handleInstall = async () => {
    if (isIOS) {
      setStep("notifications");
      return;
    }

    const installed = await promptInstall();
    if (installed) {
      setStep("notifications");
    }
  };

  const handleEnableNotifications = async () => {
    const granted = await requestPermission();
    if (granted) {
      sendTestNotification();
    }
    setStep("done");
  };

  const handleSkipNotifications = () => {
    setStep("done");
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem(PROMPT_DISMISSED_KEY, Date.now().toString());
    } catch {}
    setShowPrompt(false);
  };

  const handleComplete = () => {
    setShowPrompt(false);
  };

  const handleDialogClose = (open: boolean) => {
    if (!open && step === "install") {
      handleDismiss();
    } else if (!open) {
      setShowPrompt(false);
    }
  };

  if (!showPrompt) return null;

  return (
    <Dialog open={showPrompt} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-md">
        {step === "install" && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                Add to Home Screen
              </DialogTitle>
              <DialogDescription>
                Get quick access and a better experience by adding this app to your home screen.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {isIOS ? (
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <p className="text-sm font-medium">To install on your device:</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">1</div>
                        <span>Tap the <Share className="inline h-4 w-4" /> Share button</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">2</div>
                        <span>Scroll and tap <Plus className="inline h-4 w-4" /> Add to Home Screen</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">3</div>
                        <span>Tap Add to confirm</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-emerald-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Works offline</p>
                      <p className="text-xs text-muted-foreground">Access your wellness tools anytime</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-emerald-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Quick launch</p>
                      <p className="text-xs text-muted-foreground">Open directly from your home screen</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-emerald-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Full-screen experience</p>
                      <p className="text-xs text-muted-foreground">No browser chrome, just the app</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDismiss} className="flex-1" data-testid="button-dismiss-install">
                Maybe Later
              </Button>
              <Button onClick={handleInstall} className="flex-1" data-testid="button-install-app">
                <Download className="h-4 w-4 mr-2" />
                {isIOS ? "Got It" : "Install"}
              </Button>
            </div>
          </>
        )}

        {step === "notifications" && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Enable Notifications
              </DialogTitle>
              <DialogDescription>
                Get gentle reminders for check-ins and wellness moments.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Bell className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Mindful reminders</p>
                    <p className="text-xs text-muted-foreground">Gentle nudges for daily check-ins</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Bell className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Wellness moments</p>
                    <p className="text-xs text-muted-foreground">Timely prompts for self-care</p>
                  </div>
                </div>
              </div>

              {permission === "denied" && (
                <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                  <CardContent className="p-3">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      Notifications were previously blocked. You can enable them in your browser settings.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSkipNotifications} className="flex-1" data-testid="button-skip-notifications">
                Skip
              </Button>
              {isSupported && permission !== "denied" && (
                <Button onClick={handleEnableNotifications} className="flex-1" data-testid="button-enable-notifications">
                  <Bell className="h-4 w-4 mr-2" />
                  Enable
                </Button>
              )}
            </div>
          </>
        )}

        {step === "done" && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2">
                <Check className="h-5 w-5 text-emerald-500" />
                You're All Set
              </DialogTitle>
              <DialogDescription>
                {permission === "granted" 
                  ? "The app is ready with notifications enabled."
                  : "The app is ready. You can enable notifications later in settings."
                }
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <Button onClick={handleComplete} className="w-full" data-testid="button-complete-setup">
                Get Started
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
