/**
 * Accountability Settings
 * Allows users to configure notification preferences for accountability tracking
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Bell, Clock, Moon, Sun, CheckCircle2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { requestNotificationPermission, getNotificationPermission } from "@/lib/notifications";
import type { NotificationPreferences } from "@shared/schema";

export function AccountabilitySettings() {
  const { toast } = useToast();
  const [notificationPermission, setNotificationPermission] = useState(getNotificationPermission());

  // Fetch preferences
  const { data: preferences, isLoading } = useQuery<NotificationPreferences>({
    queryKey: ['/api/accountability/preferences'],
  });

  // Update preferences mutation
  const updatePreferences = useMutation({
    mutationFn: async (updates: Partial<NotificationPreferences>) => {
      const res = await apiRequest('PUT', '/api/accountability/preferences', updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accountability/preferences'] });
      toast({
        title: "Settings saved",
        description: "Your notification preferences have been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive"
      });
    }
  });

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

  const handleToggle = (field: keyof NotificationPreferences, value: boolean) => {
    updatePreferences.mutate({ [field]: value });
  };

  const handleTimeChange = (field: keyof NotificationPreferences, value: string) => {
    updatePreferences.mutate({ [field]: value });
  };

  const handleNumberChange = (field: keyof NotificationPreferences, value: number) => {
    updatePreferences.mutate({ [field]: value });
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

      {/* Main Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
          <CardDescription>
            Choose which accountability notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Master Toggle */}
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
            />
          </div>

          <Separator />

          {/* Pre-Task Notifications */}
          <div className="space-y-4">
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
              />
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
                />
              </div>
            )}
          </div>

          <Separator />

          {/* Post-Task Notifications */}
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
            />
          </div>

          <Separator />

          {/* Morning Briefing */}
          <div className="space-y-4">
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
              />
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
                />
              </div>
            )}
          </div>

          <Separator />

          {/* Evening Summary */}
          <div className="space-y-4">
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
              />
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
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle>Quiet Hours</CardTitle>
          <CardDescription>
            Set times when you don't want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
            />
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
                />
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
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
