import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle2, Send } from "lucide-react";
import { APP_VERSION } from "@/routes/registry";

const CATEGORIES = [
  { value: "bug", label: "Bug / Something broken" },
  { value: "demo_mismatch", label: "Demo mismatch" },
  { value: "voice", label: "Voice issue" },
  { value: "content_feed", label: "Content / Feed issue" },
  { value: "scheduling", label: "Scheduling issue" },
  { value: "other", label: "Other" },
] as const;

type Category = (typeof CATEGORIES)[number]["value"];

interface ReportPayload {
  category: Category;
  description: string;
  stepsToReproduce?: string;
  includeTechnicalDetails: boolean;
  technicalDetails?: {
    appVersion?: string;
    platform?: string;
    userAgent?: string;
  };
  includeRecentContext: boolean;
  recentContext?: {
    route?: string;
    lastAction?: string;
  };
  includeConversationSnippet: boolean;
  includeConstraintsSnapshot: boolean;
}

async function submitSupportReport(payload: ReportPayload) {
  const res = await fetch("/api/support/report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      typeof body?.error === "string"
        ? body.error
        : "Failed to submit report";
    throw new Error(message);
  }
  return res.json();
}

export default function SupportReportPage() {
  const { toast } = useToast();
  const [category, setCategory] = useState<Category | "">("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState("");
  const [includeTech, setIncludeTech] = useState(true);
  const [includeContext, setIncludeContext] = useState(false);
  const [includeConversation, setIncludeConversation] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: submitSupportReport,
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to send report",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!category) {
      toast({ title: "Please select a category", variant: "destructive" });
      return;
    }
    if (!description.trim()) {
      toast({ title: "Please add a description", variant: "destructive" });
      return;
    }

    const payload: ReportPayload = {
      category,
      description: description.trim(),
      stepsToReproduce: steps.trim() || undefined,
      includeTechnicalDetails: includeTech,
      technicalDetails: includeTech
        ? {
            appVersion: APP_VERSION,
            platform: navigator.platform,
            userAgent: navigator.userAgent,
          }
        : undefined,
      includeRecentContext: includeContext,
      recentContext: includeContext
        ? { route: window.location.pathname }
        : undefined,
      includeConversationSnippet: includeConversation,
      conversationSnippet: includeConversation
        ? {
            lastUserMessage: description.trim(),
            lastDwReply: "(Conversation history not yet captured in beta — description included as context)",
          }
        : undefined,
      includeConstraintsSnapshot: false,
    };

    mutation.mutate(payload);
  };

  if (submitted) {
    return (
      <div className="flex flex-col h-full bg-background">
        <PageHeader title="Report a Problem" backPath="/settings" />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-4 max-w-sm">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <h2 className="text-xl font-semibold">Report sent</h2>
            <p className="text-muted-foreground text-sm">
              Thank you for helping improve DW.ai. We'll review your report and follow up if
              needed.
            </p>
            <Button variant="outline" onClick={() => setSubmitted(false)}>
              Send another report
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <PageHeader title="Report a Problem" backPath="/settings" />

      <div className="flex-1 overflow-auto">
        <main className="p-4 max-w-2xl mx-auto space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
                Describe the issue
              </CardTitle>
              <CardDescription>
                Your report helps us improve DW.ai. Only the fields you choose to include will be
                shared.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as Category)}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select a category…" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="What happened? What did you expect?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="steps">Steps to reproduce (optional)</Label>
                <Textarea
                  id="steps"
                  placeholder="1. Go to… 2. Tap… 3. See…"
                  value={steps}
                  onChange={(e) => setSteps(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">What to include</CardTitle>
              <CardDescription>
                You're in control of what gets shared with the report.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="toggle-tech" className="text-sm font-medium">
                    Technical details
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    App version, platform, browser
                  </p>
                </div>
                <Switch
                  id="toggle-tech"
                  checked={includeTech}
                  onCheckedChange={setIncludeTech}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="toggle-context" className="text-sm font-medium">
                    Recent app context
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Current screen / last action
                  </p>
                </div>
                <Switch
                  id="toggle-context"
                  checked={includeContext}
                  onCheckedChange={setIncludeContext}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="toggle-conversation" className="text-sm font-medium">
                    Conversation snippet
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Your description will be included as context. Full conversation history is not yet captured in beta.
                  </p>
                </div>
                <Switch
                  id="toggle-conversation"
                  checked={includeConversation}
                  onCheckedChange={setIncludeConversation}
                />
              </div>
            </CardContent>
          </Card>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={mutation.isPending}
          >
            <Send className="h-4 w-4 mr-2" />
            {mutation.isPending ? "Sending…" : "Send Report"}
          </Button>
        </main>
      </div>
    </div>
  );
}
