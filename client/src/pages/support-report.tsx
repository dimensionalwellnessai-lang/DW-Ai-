import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, Send, AlertTriangle, Bug, GitMerge, HelpCircle } from "lucide-react";
import { Link } from "wouter";

const REPORT_TYPES = [
  { id: "bug", label: "Something broke", icon: Bug },
  { id: "mismatch", label: "Wrong result shown", icon: GitMerge },
  { id: "general", label: "General issue", icon: AlertTriangle },
  { id: "other", label: "Other", icon: HelpCircle },
] as const;

type ReportType = (typeof REPORT_TYPES)[number]["id"];

function useQueryParams() {
  return useMemo(() => new URLSearchParams(window.location.search), []);
}

export default function SupportReportPage() {
  const params = useQueryParams();
  const rawType = params.get("type") ?? "general";
  const validTypes: ReportType[] = ["bug", "mismatch", "general", "other"];
  const initialType: ReportType = validTypes.includes(rawType as ReportType)
    ? (rawType as ReportType)
    : "general";
  const initialDesc = params.get("desc") ?? "";

  const { toast } = useToast();
  const [description, setDescription] = useState(initialDesc);
  const [reportType, setReportType] = useState<ReportType>(initialType);
  const [includeTechDetails, setIncludeTechDetails] = useState(true);
  const [includeConversation, setIncludeConversation] = useState(false);
  const [includeContext, setIncludeContext] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    setIsSubmitting(true);

    try {
      const techDetails = includeTechDetails
        ? {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            appVersion: import.meta.env.VITE_APP_VERSION ?? "unknown",
            pageContext: window.location.pathname,
            screenSize: `${window.screen.width}x${window.screen.height}`,
          }
        : null;

      // Collect recent conversation snippet from localStorage when consented
      let conversationSummary: string | null = null;
      if (includeConversation) {
        try {
          const recentMsgs = localStorage.getItem("dw_recent_messages");
          conversationSummary = recentMsgs
            ? JSON.parse(recentMsgs).slice(-6).map((m: { role: string; content: string }) => `[${m.role}]: ${m.content}`).join("\n")
            : "No recent conversation data available";
        } catch {
          conversationSummary = "Conversation data unavailable";
        }
      }

      // Collect brief app context from localStorage when consented
      let contextSummary: string | null = null;
      if (includeContext) {
        try {
          const guestData = localStorage.getItem("dw_guest_data");
          const parsed = guestData ? JSON.parse(guestData) : {};
          const lines: string[] = [];
          if (parsed.profileSetup?.name) lines.push(`Name: ${parsed.profileSetup.name}`);
          if (parsed.energyLevel) lines.push(`Energy level: ${parsed.energyLevel}`);
          if (parsed.currentDimension) lines.push(`Active dimension: ${parsed.currentDimension}`);
          lines.push(`Current path: ${window.location.pathname}`);
          contextSummary = lines.length > 0 ? lines.join("\n") : "No context data available";
        } catch {
          contextSummary = "Context data unavailable";
        }
      }

      await apiRequest("POST", "/api/support/report", {
        description: description.trim(),
        reportType,
        includeTechDetails,
        includeConversation,
        includeContext,
        techDetails,
        conversationSummary,
        contextSummary,
      });

      setSubmitted(true);
      toast({ title: "Report sent", description: "Thank you — we'll look into it." });
    } catch {
      toast({
        title: "Couldn't send report",
        description: "Please try again or email us directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <PageHeader title="Report a Problem" backPath="/settings" />

      <div className="flex-1 overflow-auto">
        <div className="flex items-start justify-center p-6 min-h-full">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-2">
                <AlertTriangle className="h-8 w-8 text-muted-foreground" />
              </div>
              <CardTitle className="font-display text-xl">
                {submitted ? "Report received" : "Report a Problem"}
              </CardTitle>
              <CardDescription>
                {submitted
                  ? "Your report helps us make DW.ai better."
                  : "Help us improve by describing what went wrong."}
              </CardDescription>
            </CardHeader>

            <CardContent>
              {submitted ? (
                <div className="text-center space-y-4">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    We review every report. Thank you for taking the time.
                  </p>
                  <Link href="/settings">
                    <Button className="w-full" data-testid="button-return-settings">
                      Back to Settings
                    </Button>
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Report type */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">What kind of issue is this?</p>
                    <div className="flex flex-wrap gap-2">
                      {REPORT_TYPES.map((rt) => {
                        const Icon = rt.icon;
                        const selected = reportType === rt.id;
                        return (
                          <Badge
                            key={rt.id}
                            variant={selected ? "default" : "outline"}
                            className={`cursor-pointer transition-colors ${selected ? "" : "text-muted-foreground"}`}
                            onClick={() => setReportType(rt.id)}
                            data-testid={`badge-report-type-${rt.id}`}
                          >
                            <Icon className="h-3 w-3 mr-1" />
                            {rt.label}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Describe the problem</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What happened? What did you expect instead?"
                      className="min-h-[120px] resize-none"
                      data-testid="input-support-description"
                    />
                  </div>

                  {/* Consent toggles */}
                  <div className="space-y-3 rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                      Include in report (optional)
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="toggle-tech" className="text-sm">
                          Technical details
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Browser, platform, page path, screen size
                        </p>
                      </div>
                      <Switch
                        id="toggle-tech"
                        checked={includeTechDetails}
                        onCheckedChange={setIncludeTechDetails}
                        data-testid="switch-include-tech"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="toggle-conv" className="text-sm">
                          Recent conversation
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Last few messages with the AI (no audio ever included)
                        </p>
                      </div>
                      <Switch
                        id="toggle-conv"
                        checked={includeConversation}
                        onCheckedChange={setIncludeConversation}
                        data-testid="switch-include-conversation"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="toggle-ctx" className="text-sm">
                          App context
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Current goals, active plan summary
                        </p>
                      </div>
                      <Switch
                        id="toggle-ctx"
                        checked={includeContext}
                        onCheckedChange={setIncludeContext}
                        data-testid="switch-include-context"
                      />
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Audio is never collected or stored. Only data you explicitly enable above is
                    included.
                  </p>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={description.trim().length < 10 || isSubmitting}
                    data-testid="button-submit-report"
                  >
                    {isSubmitting ? (
                      "Sending…"
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Report
                      </>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
