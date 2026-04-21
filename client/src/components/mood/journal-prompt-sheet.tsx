import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Heart, Loader2 } from "lucide-react";

const PROMPTS = [
  { key: "whatHappened", label: "What happened?", placeholder: "Just describe it. No editing." },
  { key: "whatINeed", label: "What do I need right now?", placeholder: "Rest, a walk, to talk to someone, food, quiet…" },
  { key: "toAFriend", label: "What would I tell a friend feeling this?", placeholder: "Say it to yourself the way you'd say it to them." },
] as const;

export interface JournalPromptSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Mood log this reflection is linked to. */
  moodLogId: string | null;
  /** Optional intro text describing why we're prompting. */
  intro?: string;
}

/**
 * Journal-on-mood reflection sheet. Shown when a user logs a low mood (≤4)
 * or taps "Stressed" / "Off" on the home command center. Submits a journal
 * entry tagged to the originating mood log via POST /api/mood/journal.
 */
export function JournalPromptSheet({ open, onOpenChange, moodLogId, intro }: JournalPromptSheetProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: async () => {
      if (!moodLogId) throw new Error("Missing mood log id");
      return apiRequest("POST", "/api/mood/journal", { moodLogId, ...answers });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dw/journalEntries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mood", moodLogId, "journal"] });
      toast({
        title: "Reflection saved",
        description: "Open the Mood tab to see the pattern.",
        action: (
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate("/mood-tracker")}
            data-testid="toast-action-open-mood"
          >
            Open Mood
          </Button>
        ) as any,
      });
      setAnswers({});
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Couldn't save reflection",
        description: "Try again in a moment.",
        variant: "destructive",
      });
    },
  });

  const hasAny = PROMPTS.some(p => (answers[p.key] ?? "").trim().length > 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[90vh] overflow-y-auto"
        data-testid="sheet-journal-prompt"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-rose-500" />
            A small reflection
          </SheetTitle>
          <SheetDescription>
            {intro ?? "Three short prompts. Skip any. This is just for you."}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {PROMPTS.map((p) => (
            <div key={p.key} className="space-y-2">
              <Label htmlFor={`prompt-${p.key}`} className="font-medium">
                {p.label}
              </Label>
              <Textarea
                id={`prompt-${p.key}`}
                rows={3}
                placeholder={p.placeholder}
                value={answers[p.key] ?? ""}
                onChange={e => setAnswers(prev => ({ ...prev, [p.key]: e.target.value }))}
                data-testid={`input-prompt-${p.key}`}
              />
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-2 sticky bottom-0 bg-background py-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => { setAnswers({}); onOpenChange(false); }}
            data-testid="button-skip-journal"
          >
            Skip
          </Button>
          <Button
            className="flex-1"
            disabled={!hasAny || !moodLogId || mutation.isPending}
            onClick={() => mutation.mutate()}
            data-testid="button-save-journal"
          >
            {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save reflection
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
