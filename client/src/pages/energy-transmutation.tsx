import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { usePageMeta } from "@/hooks/use-page-meta";
import { apiRequest, parseApiError } from "@/lib/queryClient";
import { BookmarkPlus, CalendarPlus, Loader2, Sparkles } from "lucide-react";

interface TransmutationResponse {
  practiceId?: string;
  title: string;
  reframe: string;
  exercise: string;
}

export default function EnergyTransmutationPage() {
  usePageMeta("Energy Transmutation", "Reframe a charged situation and move some of that energy into a gentler next step.");

  const { toast } = useToast();
  const [situation, setSituation] = useState("");
  const [result, setResult] = useState<TransmutationResponse | null>(null);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/energy-practices/transmute", { situation });
      const data = await response.json() as { practice?: { id: string }; reframe: string; exercise: string };
      return {
        practiceId: data.practice?.id,
        title: "Energy transmutation",
        reframe: data.reframe,
        exercise: data.exercise,
      } satisfies TransmutationResponse;
    },
    onSuccess: (data) => setResult(data),
    onError: (error) => {
      toast({ title: "Couldn't generate that yet", description: parseApiError(error), variant: "destructive" });
    },
  });

  const addToTodayMutation = useMutation({
    mutationFn: async () => {
      if (!result) throw new Error("No transmutation to add yet");
      if (result.practiceId) {
        await apiRequest("PATCH", `/api/energy-practices/${result.practiceId}`, { action: "add_to_today" });
      }
      await apiRequest("POST", "/api/reminders", {
        type: "custom",
        title: result.title || "Energy transmutation",
        body: `${result.reframe}\n\n${result.exercise}`,
        scheduledAt: new Date().toISOString(),
        responseState: "pending",
      });
    },
    onSuccess: () => toast({ title: "Added to today", description: "You can revisit this reflection from your reminders." }),
    onError: (error) => toast({ title: "Couldn't add that yet", description: parseApiError(error), variant: "destructive" }),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!result) throw new Error("No transmutation to save yet");
      if (result.practiceId) {
        await apiRequest("PATCH", `/api/energy-practices/${result.practiceId}`, { action: "save" });
      }
      await apiRequest("POST", "/api/saved-content", {
        contentType: "reframe",
        title: result.title || "Saved reframe",
        description: `${result.reframe}\n\n${result.exercise}`,
        url: `transmutation:${encodeURIComponent(result.title || situation.slice(0, 40) || "entry")}`,
        source: "DW",
        duration: "Reflection",
      });
    },
    onSuccess: () => toast({ title: "Saved", description: "Your reframe is waiting in your saved content." }),
    onError: (error) => toast({ title: "Couldn't save that yet", description: parseApiError(error), variant: "destructive" }),
  });

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Energy Transmutation" />
      <div className="mx-auto max-w-3xl space-y-4 px-4 pb-24 pt-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-5 w-5 text-primary" />
              Bring a situation here
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Share what feels charged, heavy, or sticky. DW will help you soften the meaning and choose a grounded next step.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={situation}
              onChange={(event) => setSituation(event.target.value)}
              placeholder="For example: I keep replaying a conversation, or I feel frozen about the thing I know I need to face."
              className="min-h-36"
            />
            <Button className="w-full" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending || situation.trim().length < 8}>
              {generateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate reframe + exercise
            </Button>
          </CardContent>
        </Card>

        {generateMutation.isPending && (
          <Card>
            <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Turning this over gently…
            </CardContent>
          </Card>
        )}

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>{result.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <section className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Perspective reframe</p>
                <p className="whitespace-pre-line text-sm leading-6 text-foreground">{result.reframe}</p>
              </section>

              <section className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Transmutation exercise</p>
                <p className="whitespace-pre-line text-sm leading-6 text-foreground">{result.exercise}</p>
              </section>

              <div className="grid gap-2 sm:grid-cols-2">
                <Button variant="outline" onClick={() => addToTodayMutation.mutate()} disabled={addToTodayMutation.isPending}>
                  {addToTodayMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarPlus className="mr-2 h-4 w-4" />}
                  Add to Today
                </Button>
                <Button variant="outline" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BookmarkPlus className="mr-2 h-4 w-4" />}
                  Save reframe
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
