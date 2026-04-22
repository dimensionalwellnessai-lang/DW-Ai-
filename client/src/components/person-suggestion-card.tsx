import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PersonSuggestion } from "@/lib/guest-storage";

const CATEGORY_META: Record<string, { label: string; className: string }> = {
  aligned:  { label: "Aligned",  className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
  growth:   { label: "Growth",   className: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30" },
  neutral:  { label: "Neutral",  className: "bg-muted text-muted-foreground border-border" },
  draining: { label: "Draining", className: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30" },
};

export function PersonSuggestionCard({
  suggestion,
  onLog,
  onOpen,
}: {
  suggestion: PersonSuggestion;
  onLog: () => void;
  onOpen: () => void;
}) {
  const meta = (suggestion.category && CATEGORY_META[suggestion.category]) || CATEGORY_META.neutral;
  const score = suggestion.healthScore;
  const scoreColor =
    score == null ? "text-muted-foreground"
    : score >= 75 ? "text-emerald-600 dark:text-emerald-400"
    : score >= 50 ? "text-amber-600 dark:text-amber-400"
    : "text-rose-600 dark:text-rose-400";
  return (
    <div
      className="rounded-lg border border-border bg-card/60 px-3 py-2.5 flex items-center gap-3"
      data-testid={`card-person-suggestion-${suggestion.personId}`}
    >
      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <Heart className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-sm font-medium text-foreground truncate"
            data-testid={`text-person-name-${suggestion.personId}`}
          >
            {suggestion.name}
          </span>
          <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${meta.className}`}>
            {meta.label}
          </span>
        </div>
        {score != null && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Health{" "}
            <span
              className={`font-medium ${scoreColor}`}
              data-testid={`text-person-health-${suggestion.personId}`}
            >
              {score}
            </span>
            {suggestion.daysSinceContact != null && (
              <> · {suggestion.daysSinceContact}d since contact</>
            )}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={onLog}
          data-testid={`button-person-log-${suggestion.personId}`}
        >
          Log
        </Button>
        <Button
          variant="default"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={onOpen}
          data-testid={`button-person-open-${suggestion.personId}`}
        >
          Open
        </Button>
      </div>
    </div>
  );
}
