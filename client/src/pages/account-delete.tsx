import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/page-header";
import { AlertTriangle, Trash2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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

export default function AccountDeletePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [confirmed, setConfirmed] = useState(false);
  const [showFinalDialog, setShowFinalDialog] = useState(false);

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/delete-account", {
        method: "DELETE",
        credentials: "include",
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete account");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.clear();
      localStorage.clear();
      toast({
        title: "Account deleted",
        description: "Your account and all data have been permanently deleted.",
      });
      setLocation("/login");
    },
    onError: (error: Error) => {
      toast({
        title: "Deletion failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleExportData = async () => {
    try {
      // Fetch user data for export
      const endpoints = [
        '/api/goals',
        '/api/habits',
        '/api/mood-logs',
        '/api/conversations',
        '/api/routines',
        '/api/tasks',
        '/api/projects',
        '/api/challenges',
      ];

      const data: Record<string, any> = {};

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, { credentials: 'include' });
          if (response.ok) {
            const name = endpoint.split('/').pop() || endpoint;
            data[name] = await response.json();
          }
        } catch (e) {
          console.error(`Failed to fetch ${endpoint}:`, e);
        }
      }

      // Create downloadable JSON file
      const dataStr = JSON.stringify(data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fts-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Data exported",
        description: "Your data has been downloaded as a JSON file.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Could not export your data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClick = () => {
    if (!confirmed) {
      toast({
        title: "Confirmation required",
        description: "Please check the confirmation box to proceed.",
        variant: "destructive",
      });
      return;
    }
    setShowFinalDialog(true);
  };

  const handleFinalConfirm = () => {
    setShowFinalDialog(false);
    deleteAccountMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Delete Account" backPath="/settings" />

      <main className="p-4 max-w-2xl mx-auto space-y-4">
        <Card className="border-destructive">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <CardTitle className="text-base text-destructive">Warning: This Action Cannot Be Undone</CardTitle>
                <CardDescription>
                  Deleting your account will permanently remove all your data from our systems.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">What will be deleted:</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Your account and profile information</li>
              <li>All conversations with your wellness AI</li>
              <li>Goals, habits, and habit tracking data</li>
              <li>Mood logs and check-ins</li>
              <li>Wellness blueprints and baseline profiles</li>
              <li>Routines, tasks, and projects</li>
              <li>Calendar events and schedule blocks</li>
              <li>Meal plans and shopping lists</li>
              <li>Workout plans and body scans</li>
              <li>Challenges and progress tracking</li>
              <li>Wearable device connections and data</li>
              <li>Astrology charts and predictions</li>
              <li>All uploaded documents and attachments</li>
              <li>System preferences and settings</li>
              <li>All other personal wellness data</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Export Your Data (Recommended)</CardTitle>
            <CardDescription>
              Download a copy of your wellness data before deleting your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={handleExportData}
              data-testid="button-export-data"
            >
              <Download className="h-4 w-4 mr-2" />
              Download My Data
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Confirm Deletion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="confirm-delete"
                checked={confirmed}
                onCheckedChange={(checked) => setConfirmed(checked === true)}
                data-testid="checkbox-confirm-delete"
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="confirm-delete"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I understand this action cannot be undone
                </Label>
                <p className="text-sm text-muted-foreground">
                  All my data will be permanently deleted from DW.ai servers.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="destructive"
                onClick={handleDeleteClick}
                disabled={!confirmed || deleteAccountMutation.isPending}
                data-testid="button-delete-account-confirm"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {deleteAccountMutation.isPending ? "Deleting..." : "Delete My Account"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation("/settings")}
                disabled={deleteAccountMutation.isPending}
                data-testid="button-cancel-delete"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      <AlertDialog open={showFinalDialog} onOpenChange={setShowFinalDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your account and all associated data.
              This action cannot be undone. You will be logged out immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFinalConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Delete My Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
