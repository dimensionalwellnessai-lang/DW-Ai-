import { ChevronRight, RotateCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { DashboardAdaptiveState } from "../dashboard-adaptation";

interface DashboardCommandBlocksProps {
  state: DashboardAdaptiveState;
  onNavigate: (path: string, block: "where_i_stand" | "what_to_do_now" | "calendar" | "lane_card") => void;
  onRealign: (path: string, mode: "quick_update" | "full_refresh") => void;
}

function pulseClass(pulse: DashboardAdaptiveState["whereIStand"]["pulse"]): string {
  if (pulse === "recover") return "bg-amber-500";
  if (pulse === "watch") return "bg-sky-500";
  return "bg-emerald-500";
}

export function DashboardCommandBlocks({ state, onNavigate, onRealign }: DashboardCommandBlocksProps) {
  return (
    <section className="space-y-3" data-testid="dashboard-command-center">
      <Card data-testid="dashboard-block-where-i-stand" className="border-border/60">
        <CardContent className="p-4">
          <button
            type="button"
            onClick={() => onNavigate("/insights", "where_i_stand")}
            className="w-full text-left flex items-start gap-3"
          >
            <span className={`mt-1 h-2.5 w-2.5 rounded-full ${pulseClass(state.whereIStand.pulse)}`} aria-hidden="true" />
            <div className="flex-1">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Where I Stand</p>
              <p className="text-sm font-semibold mt-0.5">{state.whereIStand.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{state.whereIStand.body}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        </CardContent>
      </Card>

      <Card data-testid="dashboard-block-what-to-do-now" className="border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <button
            type="button"
            onClick={() => onNavigate(state.whatToDoNow.path, "what_to_do_now")}
            className="w-full text-left flex items-start gap-3"
          >
            <div className="flex-1">
              <p className="text-[11px] uppercase tracking-wide text-primary/90">What To Do Now</p>
              <p className="text-sm font-semibold mt-0.5">{state.whatToDoNow.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{state.whatToDoNow.description}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        </CardContent>
      </Card>

      <Card data-testid="dashboard-block-why-it-matters">
        <CardContent className="p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Why It Matters</p>
          <p className="text-xs text-foreground/90 mt-1.5 leading-relaxed">{state.whyItMatters}</p>
        </CardContent>
      </Card>

      <Card data-testid="dashboard-block-realign">
        <CardContent className="p-4 space-y-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Realign / Reset</p>
            <p className="text-xs text-muted-foreground mt-1">Non-destructive update by default. Full refresh remains optional.</p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-11 text-xs px-3"
              onClick={() => onRealign(state.realign.quickPath, "quick_update")}
            >
              Realign now
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-11 text-xs px-3"
              onClick={() => onRealign(state.realign.resetPath, "full_refresh")}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Full refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="dashboard-calendar-suggestion" className="border-border/60">
        <CardContent className="p-4">
          <button
            type="button"
            className="w-full text-left flex items-start gap-3"
            onClick={() => onNavigate(state.calendar.path, "calendar")}
          >
            <div className="flex-1">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Calendar-aware</p>
              <p className="text-sm font-semibold mt-0.5">{state.calendar.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{state.calendar.body}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        </CardContent>
      </Card>

      <section className="space-y-3" data-testid="dashboard-adaptive-lanes">
        {state.lanes.map((lane) => (
          <div key={lane.lane} data-testid={`dashboard-lane-${lane.lane}`}>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">{lane.label}</p>
            <div className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory">
              {lane.cards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => onNavigate(card.path, "lane_card")}
                  className="snap-start min-w-[210px] max-w-[210px] rounded-xl border border-border bg-card px-3 py-2 text-left hover:border-primary/30 transition-colors"
                  data-testid={`dashboard-lane-card-${card.id}`}
                >
                  <p className="text-sm font-medium leading-snug">{card.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{card.description}</p>
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>
    </section>
  );
}
