/**
 * Accountability Settings
 * Allows users to configure notification preferences for accountability tracking.
 *
 * Each persisted preference control surfaces a subtle "Synced across devices"
 * indicator after a successful change, and an inline error message when the
 * server rejects the update. The pattern matches the upcoming-reminders
 * horizon select so the UX is consistent across every preference.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Bell, Moon, Sun, CheckCircle2, Cloud, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { requestNotificationPermission, getNotificationPermission } from "@/lib/notifications";
import { UpcomingReminders } from "@/components/upcoming-reminders";
import { SyncIndicator } from "@/components/sync-indicator";
import {
  useAccountabilityPrefsSync,
  type PrefField,
} from "@/hooks/use-accountability-prefs-sync";
import type { NotificationPreferences } from "@shared/schema";

export function AccountabilitySettings() {
  const { toast } = useToast();
  const [notificationPermission, setNotificationPermission] = useState(getNotificationPermission());

  // Fetch preferences
  const { data: preferences, isLoading } = useQuery<NotificationPreferences>({
    queryKey: ['/api/accountability/preferences'],
  });

  const prefsSync = useAccountabilityPrefsSync();

  const handleRequestPermission = async () => {
    const result = await requestNotificationPermission();
    if (result.granted) {
      setNotificationPermission('granted');
      toast({
        title: "Notifications enabled",
        description: "You'll now receive accountability reminders.",
      });
    } else {
      toast({
        title: "Permission denied",
        description: "You can enable notifications in your browser settings.",
        variant: "destructive"
      });
    }
  };

  const handleToggle = (field: PrefField, value: boolean) => {
    prefsSync.update({ [field]: value } as Partial<NotificationPreferences>);
  };

  const handleTimeChange = (field: PrefField, value: string) => {
    prefsSync.update({ [field]: value } as Partial<NotificationPreferences>);
  };

  const handleNumberChange = (field: PrefField, value: number) => {
    if (!Number.isFinite(value)) return;
    prefsSync.update({ [field]: value } as Partial<NotificationPreferences>);
  };

  /** Renders the per-field sync indicator. We hide the static "Synced across
   * devices" idle state at the field level and show it once per card via
   * `<CardSyncBaseline />` to avoid a wall of redundant lines. */
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

  if (isLoading || !preferences) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-2xl">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Accountability Settings</h1>
        <p className="text-muted-foreground">
          Configure your notification preferences for accountability tracking
        </p>
      </div>

      {/* Notification Permission */}
      {notificationPermission !== 'granted' && (
        <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900 dark:text-orange-100">
              <Bell className="w-5 h-5" />
              Enable Notifications
            </CardTitle>
            <CardDescription className="text-orange-700 dark:text-orange-300">
              Allow notifications to receive accountability reminders and stay on track with your commitments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleRequestPermission} className="w-full">
              <Bell className="w-4 h-4 mr-2" />
              Enable Notifications
            </Button>
          </CardContent>
        </Card>
      )}

      {notificationPermission === 'granted' && (
        <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-green-900 dark:text-green-100">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-semibold">Notifications enabled</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Reminders */}
      <UpcomingReminders />

      {/* Main Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Notification Types</CardTitle>
              <CardDescription>
                Choose which accountability notifications you want to receive
              </CardDescription>
            </div>
            <CardSyncBaseline testId="status-notification-types-baseline" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Master Toggle */}
          <div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="accountability-enabled">
                  Accountability Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Enable all accountability tracking notifications
                </p>
              </div>
              <Switch
                id="accountability-enabled"
                checked={preferences.accountabilityEnabled ?? false}
                onCheckedChange={(checked) => handleToggle('accountabilityEnabled', checked)}
                disabled={notificationPermission !== 'granted'}
                data-testid="switch-accountability-enabled"
              />
            </div>
            {fieldIndicator('accountabilityEnabled', 'status-accountability-enabled')}
          </div>

          <Separator />

          {/* Pre-Task Notifications */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="pre-task-enabled">
                    Pre-Task Reminders
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    "Will you be doing this?" notifications before tasks
                  </p>
                </div>
                <Switch
                  id="pre-task-enabled"
                  checked={preferences.preTaskEnabled ?? false}
                  onCheckedChange={(checked) => handleToggle('preTaskEnabled', checked)}
                  disabled={!preferences.accountabilityEnabled || notificationPermission !== 'granted'}
                  data-testid="switch-pre-task-enabled"
                />
              </div>
              {fieldIndicator('preTaskEnabled', 'status-pre-task-enabled')}
            </div>

            {preferences.preTaskEnabled && (
              <div className="ml-6 space-y-2">
                <Label htmlFor="pre-task-minutes">
                  Remind me (minutes before task)
                </Label>
                <Input
                  id="pre-task-minutes"
                  type="number"
                  min="5"
                  max="60"
                  value={preferences.preTaskMinutes ?? 15}
                  onChange={(e) => handleNumberChange('preTaskMinutes', parseInt(e.target.value))}
                  className="w-32"
                  data-testid="input-pre-task-minutes"
                />
                {fieldIndicator('preTaskMinutes', 'status-pre-task-minutes')}
              </div>
            )}
          </div>

          <Separator />

          {/* Post-Task Notifications */}
          <div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="post-task-enabled">
                  Post-Task Check-ins
                </Label>
                <p className="text-sm text-muted-foreground">
                  "Did you complete this?" notifications after tasks
                </p>
              </div>
              <Switch
                id="post-task-enabled"
                checked={preferences.postTaskEnabled ?? false}
                onCheckedChange={(checked) => handleToggle('postTaskEnabled', checked)}
                disabled={!preferences.accountabilityEnabled || notificationPermission !== 'granted'}
                data-testid="switch-post-task-enabled"
              />
            </div>
            {fieldIndicator('postTaskEnabled', 'status-post-task-enabled')}
          </div>

          <Separator />

          {/* Relationship Nudges */}
          <div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="relationship-nudges-enabled" className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-500" />
                  Relationship Nudges
                </Label>
                <p className="text-sm text-muted-foreground">
                  A daily gentle nudge when a tracked person feels overdue or has an open repair
                </p>
              </div>
              <Switch
                id="relationship-nudges-enabled"
                checked={preferences.relationshipNudgesEnabled ?? false}
                onCheckedChange={(checked) => handleToggle('relationshipNudgesEnabled', checked)}
                disabled={!preferences.accountabilityEnabled}
                data-testid="switch-relationship-nudges-enabled"
              />
            </div>
            {fieldIndicator('relationshipNudgesEnabled', 'status-relationship-nudges-enabled')}
          </div>

          <Separator />

          {/* Morning Briefing */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="morning-briefing-enabled">
                    Morning Briefing
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Daily overview of your scheduled tasks
                  </p>
                </div>
                <Switch
                  id="morning-briefing-enabled"
                  checked={preferences.morningBriefingEnabled ?? false}
                  onCheckedChange={(checked) => handleToggle('morningBriefingEnabled', checked)}
                  disabled={!preferences.accountabilityEnabled || notificationPermission !== 'granted'}
                  data-testid="switch-morning-briefing-enabled"
                />
              </div>
              {fieldIndicator('morningBriefingEnabled', 'status-morning-briefing-enabled')}
            </div>

            {preferences.morningBriefingEnabled && (
              <div className="ml-6 space-y-2">
                <Label htmlFor="morning-briefing-time">
                  <Sun className="w-4 h-4 inline mr-1" />
                  Morning briefing time
                </Label>
                <Input
                  id="morning-briefing-time"
                  type="time"
                  value={preferences.morningBriefingTime ?? "08:00"}
                  onChange={(e) => handleTimeChange('morningBriefingTime', e.target.value)}
                  className="w-32"
                  data-testid="input-morning-briefing-time"
                />
                {fieldIndicator('morningBriefingTime', 'status-morning-briefing-time')}
              </div>
            )}
          </div>

          <Separator />

          {/* Evening Summary */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="evening-summary-enabled">
                    Evening Summary
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Daily recap of your accountability progress
                  </p>
                </div>
                <Switch
                  id="evening-summary-enabled"
                  checked={preferences.eveningSummaryEnabled ?? false}
                  onCheckedChange={(checked) => handleToggle('eveningSummaryEnabled', checked)}
                  disabled={!preferences.accountabilityEnabled || notificationPermission !== 'granted'}
                  data-testid="switch-evening-summary-enabled"
                />
              </div>
              {fieldIndicator('eveningSummaryEnabled', 'status-evening-summary-enabled')}
            </div>

            {preferences.eveningSummaryEnabled && (
              <div className="ml-6 space-y-2">
                <Label htmlFor="evening-summary-time">
                  <Moon className="w-4 h-4 inline mr-1" />
                  Evening summary time
                </Label>
                <Input
                  id="evening-summary-time"
                  type="time"
                  value={preferences.eveningSummaryTime ?? "21:00"}
                  onChange={(e) => handleTimeChange('eveningSummaryTime', e.target.value)}
                  className="w-32"
                  data-testid="input-evening-summary-time"
                />
                {fieldIndicator('eveningSummaryTime', 'status-evening-summary-time')}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Quiet Hours</CardTitle>
              <CardDescription>
                Set times when you don't want to receive notifications
              </CardDescription>
            </div>
            <CardSyncBaseline testId="status-quiet-hours-baseline" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="quiet-hours-enabled">
                  Enable Quiet Hours
                </Label>
                <p className="text-sm text-muted-foreground">
                  Pause notifications during specific hours
                </p>
              </div>
              <Switch
                id="quiet-hours-enabled"
                checked={preferences.quietHoursEnabled ?? false}
                onCheckedChange={(checked) => handleToggle('quietHoursEnabled', checked)}
                disabled={!preferences.accountabilityEnabled || notificationPermission !== 'granted'}
                data-testid="switch-quiet-hours-enabled"
              />
            </div>
            {fieldIndicator('quietHoursEnabled', 'status-quiet-hours-enabled')}
          </div>

          {preferences.quietHoursEnabled && (
            <div className="grid grid-cols-2 gap-4 ml-6">
              <div className="space-y-2">
                <Label htmlFor="quiet-hours-start">
                  <Moon className="w-4 h-4 inline mr-1" />
                  Start time
                </Label>
                <Input
                  id="quiet-hours-start"
                  type="time"
                  value={preferences.quietHoursStart ?? "22:00"}
                  onChange={(e) => handleTimeChange('quietHoursStart', e.target.value)}
                  data-testid="input-quiet-hours-start"
                />
                {fieldIndicator('quietHoursStart', 'status-quiet-hours-start')}
              </div>
              <div className="space-y-2">
                <Label htmlFor="quiet-hours-end">
                  <Sun className="w-4 h-4 inline mr-1" />
                  End time
                </Label>
                <Input
                  id="quiet-hours-end"
                  type="time"
                  value={preferences.quietHoursEnd ?? "08:00"}
                  onChange={(e) => handleTimeChange('quietHoursEnd', e.target.value)}
                  data-testid="input-quiet-hours-end"
                />
                {fieldIndicator('quietHoursEnd', 'status-quiet-hours-end')}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** Compact baseline label shown once per card so users always know these
 * preferences are stored centrally, even when no save is in flight. */
function CardSyncBaseline({ testId }: { testId: string }) {
  return (
    <span
      className="flex items-center gap-1 text-xs text-muted-foreground shrink-0"
      data-testid={testId}
    >
      <Cloud className="w-3 h-3" />
      Synced across devices
    </span>
  );
}
