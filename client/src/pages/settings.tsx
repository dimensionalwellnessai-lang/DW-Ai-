import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { usePWAInstall } from "@/hooks/use-pwa-install";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { PageHeader } from "@/components/page-header";
import {
  User,
  Bell,
  Shield,
  Trash2,
  Moon,
  Smartphone,
  Download,
  Check,
  BellRing,
  BellOff,
  FileText,
  ChevronRight,
} from "lucide-react";
import { Link } from "wouter";

export function SettingsPage() {
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const { permission, isSupported, requestPermission, sendTestNotification } = usePushNotifications();
  
  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Settings" backPath="/" />

      <main className="p-4 max-w-2xl mx-auto space-y-4">
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
              <Smartphone className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">Install App</CardTitle>
                <CardDescription>Add to your home screen for easy access</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {isInstalled ? (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <Check className="h-4 w-4" />
                App installed on your device
              </div>
            ) : isIOS ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  To install on iOS: tap the Share button in Safari, then "Add to Home Screen"
                </p>
              </div>
            ) : isInstallable ? (
              <Button onClick={promptInstall} data-testid="button-install-app">
                <Download className="h-4 w-4 mr-2" />
                Add to Home Screen
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Install option will appear when supported by your browser
              </p>
            )}
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
      </main>
    </div>
  );
}
