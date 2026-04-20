import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Heart,
  ShieldAlert,
  Pause,
  Compass,
  Sparkles,
  MessageSquare,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Play,
} from "lucide-react";
import {
  createTriggerEvent,
  fetchStandards,
  type AggregatedStandard,
  type CreateTriggerInput,
} from "@/lib/triggers";
import type { TriggerOutcome } from "@shared/schema";
import { cn } from "@/lib/utils";

type Step =
  | "identify"
  | "reality"
  | "pause"
  | "root"
  | "reframe"
  | "respond"
  | "standard"
  | "log";

const FEELING_CHIPS = [
  "Anxious",
  "Disrespected",
  "Overthinking",
  "Jealous",
  "Rejected",
  "Something feels off",
];

const ASSUMPTION_CHIPS = [
  "They're cheating",
  "They don't care about me",
  "I'm being played",
  "Something isn't right",
];

const ROOT_CHIPS = [
  "This reminds me of something from my past",
  "I've felt this in other situations",
  "I'm afraid of being hurt",
  "I'm afraid of losing control",
];

const REFRAME_CARDS = [
  "I don't have enough information yet.",
  "This feeling is real, but it may not be accurate.",
  "I can respond calmly instead of reacting fast.",
];

const RESPONSE_TEMPLATES = [
  "I'm feeling a little off right now and I'm working through it. Can we talk about it?",
  "When this happens, I notice I feel insecure. I don't want to react the wrong way, but I'd appreciate reassurance.",
];

const PAUSE_CHOICES = [5, 20, 30] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TriggerProtocolSheet({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>("identify");

  // Captured values
  const [feeling, setFeeling] = useState("");
  const [assumption, setAssumption] = useState("");
  const [hadProof, setHadProof] = useState<boolean | null>(null);
  const [pauseMinutes, setPauseMinutes] = useState<number | null>(null);
  const [rootNote, setRootNote] = useState("");
  const [reframe, setReframe] = useState<string | null>(null);
  const [responseChoice, setResponseChoice] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<TriggerOutcome | null>(null);

  const standardsQ = useQuery({
    queryKey: ["/api/trigger-events/standards"],
    queryFn: fetchStandards,
    enabled: open,
  });

  const save = useMutation({
    mutationFn: (input: CreateTriggerInput) => createTriggerEvent(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/trigger-events"] });
    },
  });

  // Reset everything when the sheet closes.
  useEffect(() => {
    if (!open) {
      setStep("identify");
      setFeeling("");
      setAssumption("");
      setHadProof(null);
      setPauseMinutes(null);
      setRootNote("");
      setReframe(null);
      setResponseChoice(null);
      setOutcome(null);
    }
  }, [open]);

  async function finish(finalOutcome: TriggerOutcome) {
    setOutcome(finalOutcome);
    try {
      await save.mutateAsync({
        feeling: feeling || "Triggered",
        assumption: assumption || null,
        hadProof,
        pauseMinutes,
        rootNote: rootNote || null,
        reframe,
        responseChoice,
        outcome: finalOutcome,
      });
      toast({ title: "Logged.", description: "Saved to your patterns." });
      onOpenChange(false);
    } catch {
      toast({
        title: "Couldn't save",
        description: "Something went wrong. Try again?",
        variant: "destructive",
      });
    }
  }

  const canContinueIdentify = feeling.trim().length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[92vh] overflow-y-auto p-0"
        data-testid="sheet-trigger-protocol"
      >
        <div className="max-w-xl mx-auto px-5 py-6">
          <SheetHeader className="text-left mb-4">
            <SheetTitle className="text-2xl flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary" />
              Trigger reset
            </SheetTitle>
            <SheetDescription>
              Move from reactive to intentional. You can stop at any step.
            </SheetDescription>
          </SheetHeader>

          {/* progress dots */}
          <StepDots step={step} />

          {step === "identify" && (
            <Section
              icon={<Heart className="w-5 h-5" />}
              title="What's happening right now?"
            >
              <ChipGrid
                values={FEELING_CHIPS}
                selected={feeling}
                onSelect={setFeeling}
                testIdPrefix="chip-feeling"
              />
              <p className="text-sm text-muted-foreground mt-5 mb-2">What are you assuming?</p>
              <ChipGrid
                values={ASSUMPTION_CHIPS}
                selected={assumption}
                onSelect={setAssumption}
                testIdPrefix="chip-assumption"
              />
              <Footer
                onNext={() => setStep("reality")}
                nextDisabled={!canContinueIdentify}
                onSkip={() => setStep("reality")}
              />
            </Section>
          )}

          {step === "reality" && (
            <Section
              icon={<ShieldAlert className="w-5 h-5" />}
              title="Pause. Let's check this."
            >
              <p className="text-base text-foreground mb-4">
                Do you <span className="font-semibold">know</span> this is happening, or do you <span className="font-semibold">feel</span> it?
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={hadProof === true ? "default" : "outline"}
                  onClick={() => setHadProof(true)}
                  className="h-14"
                  data-testid="button-have-proof"
                >
                  I have proof
                </Button>
                <Button
                  variant={hadProof === false ? "default" : "outline"}
                  onClick={() => setHadProof(false)}
                  className="h-14"
                  data-testid="button-no-proof"
                >
                  I don't have proof
                </Button>
              </div>
              {hadProof === false && (
                <p className="text-sm text-muted-foreground mt-4 italic">
                  Your brain is trying to protect you, not confirm truth.
                </p>
              )}
              <Footer
                onBack={() => setStep("identify")}
                onNext={() => setStep("pause")}
                nextDisabled={hadProof === null}
              />
            </Section>
          )}

          {step === "pause" && (
            <PauseStep
              chosen={pauseMinutes}
              onChoose={setPauseMinutes}
              onBack={() => setStep("reality")}
              onContinue={() => setStep("root")}
              onSkipFlow={() => finish("paused")}
            />
          )}

          {step === "root" && (
            <Section
              icon={<Compass className="w-5 h-5" />}
              title="Where is this coming from?"
            >
              <ChipGrid
                values={ROOT_CHIPS}
                selected={rootNote}
                onSelect={setRootNote}
                testIdPrefix="chip-root"
                multiline
              />
              <p className="text-sm text-muted-foreground mt-4 mb-2">Or say it clearly (optional)</p>
              <Textarea
                value={rootNote}
                onChange={e => setRootNote(e.target.value)}
                placeholder="What is this really about?"
                rows={3}
                data-testid="input-root-note"
              />
              <Footer
                onBack={() => setStep("pause")}
                onNext={() => setStep("reframe")}
                onSkip={() => setStep("reframe")}
              />
            </Section>
          )}

          {step === "reframe" && (
            <Section
              icon={<Sparkles className="w-5 h-5" />}
              title="Choose a grounded perspective"
            >
              <div className="space-y-2">
                {REFRAME_CARDS.map(card => (
                  <Card
                    key={card}
                    className={cn(
                      "p-4 cursor-pointer transition border-2",
                      reframe === card
                        ? "border-primary bg-primary/5"
                        : "border-transparent hover-elevate",
                    )}
                    onClick={() => setReframe(card)}
                    data-testid={`card-reframe-${card.slice(0, 12).replace(/\W+/g, "-")}`}
                  >
                    <p className="text-base">{card}</p>
                  </Card>
                ))}
              </div>
              <Footer
                onBack={() => setStep("root")}
                onNext={() => setStep("respond")}
                nextDisabled={!reframe}
                onSkip={() => setStep("respond")}
              />
            </Section>
          )}

          {step === "respond" && (
            <Section
              icon={<MessageSquare className="w-5 h-5" />}
              title="How do you want to respond?"
            >
              <div className="space-y-2">
                {RESPONSE_TEMPLATES.map(t => (
                  <Card
                    key={t}
                    className={cn(
                      "p-4 cursor-pointer transition border-2",
                      responseChoice === t
                        ? "border-primary bg-primary/5"
                        : "border-transparent hover-elevate",
                    )}
                    onClick={() => setResponseChoice(t)}
                    data-testid={`card-response-${t.slice(0, 12).replace(/\W+/g, "-")}`}
                  >
                    <p className="text-base">{t}</p>
                  </Card>
                ))}
              </div>
              <Textarea
                value={responseChoice ?? ""}
                onChange={e => setResponseChoice(e.target.value)}
                placeholder="Or write your own…"
                rows={3}
                className="mt-3"
                data-testid="input-response-custom"
              />
              <Footer
                onBack={() => setStep("reframe")}
                onNext={() => setStep("standard")}
                onSkip={() => setStep("standard")}
              />
            </Section>
          )}

          {step === "standard" && (
            <StandardsStep
              standards={standardsQ.data ?? []}
              loading={standardsQ.isLoading}
              onBack={() => setStep("respond")}
              onNext={() => setStep("log")}
            />
          )}

          {step === "log" && (
            <Section
              icon={<CheckCircle2 className="w-5 h-5" />}
              title="How did you handle it?"
            >
              <div className="grid grid-cols-1 gap-3">
                <Button
                  variant="outline"
                  className="h-14 justify-start"
                  onClick={() => finish("reacted")}
                  disabled={save.isPending}
                  data-testid="button-outcome-reacted"
                >
                  I reacted
                </Button>
                <Button
                  variant="outline"
                  className="h-14 justify-start"
                  onClick={() => finish("paused")}
                  disabled={save.isPending}
                  data-testid="button-outcome-paused"
                >
                  I paused
                </Button>
                <Button
                  className="h-14 justify-start"
                  onClick={() => finish("responded")}
                  disabled={save.isPending}
                  data-testid="button-outcome-responded"
                >
                  I responded calmly
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-4 text-center">
                {save.isPending ? "Saving…" : "We'll add this to your weekly patterns."}
              </p>
            </Section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

const STEP_ORDER: Step[] = [
  "identify",
  "reality",
  "pause",
  "root",
  "reframe",
  "respond",
  "standard",
  "log",
];

function StepDots({ step }: { step: Step }) {
  const idx = STEP_ORDER.indexOf(step);
  return (
    <div className="flex items-center gap-1.5 mb-5" data-testid="dots-step">
      {STEP_ORDER.map((s, i) => (
        <div
          key={s}
          className={cn(
            "h-1.5 rounded-full transition-all",
            i <= idx ? "bg-primary w-6" : "bg-muted w-3",
          )}
        />
      ))}
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
        {icon}
        <span>{title}</span>
      </div>
      {children}
    </div>
  );
}

function ChipGrid({
  values,
  selected,
  onSelect,
  testIdPrefix,
  multiline,
}: {
  values: string[];
  selected: string;
  onSelect: (v: string) => void;
  testIdPrefix: string;
  multiline?: boolean;
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", multiline && "flex-col")}>
      {values.map(v => {
        const active = selected === v;
        return (
          <Badge
            key={v}
            variant={active ? "default" : "outline"}
            className={cn(
              "cursor-pointer text-sm px-3 py-2 hover-elevate",
              multiline && "w-full justify-start py-3",
            )}
            onClick={() => onSelect(active ? "" : v)}
            data-testid={`${testIdPrefix}-${v.toLowerCase().replace(/\W+/g, "-")}`}
          >
            {v}
          </Badge>
        );
      })}
    </div>
  );
}

function Footer({
  onBack,
  onNext,
  nextDisabled,
  onSkip,
}: {
  onBack?: () => void;
  onNext?: () => void;
  nextDisabled?: boolean;
  onSkip?: () => void;
}) {
  return (
    <div className="flex items-center justify-between mt-6 pt-4 border-t">
      <div>
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            data-testid="button-step-back"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {onSkip && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkip}
            data-testid="button-step-skip"
          >
            Skip
          </Button>
        )}
        {onNext && (
          <Button
            onClick={onNext}
            disabled={nextDisabled}
            data-testid="button-step-next"
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}

function PauseStep({
  chosen,
  onChoose,
  onBack,
  onContinue,
  onSkipFlow,
}: {
  chosen: number | null;
  onChoose: (m: number | null) => void;
  onBack: () => void;
  onContinue: () => void;
  onSkipFlow: () => void;
}) {
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!running || secondsLeft === null) return;
    if (secondsLeft <= 0) {
      setRunning(false);
      return;
    }
    const t = setTimeout(() => setSecondsLeft(s => (s === null ? null : s - 1)), 1000);
    return () => clearTimeout(t);
  }, [running, secondsLeft]);

  function start(min: number) {
    onChoose(min);
    setSecondsLeft(min * 60);
    setRunning(true);
  }

  const mm = secondsLeft !== null ? Math.floor(secondsLeft / 60) : null;
  const ss = secondsLeft !== null ? secondsLeft % 60 : null;

  return (
    <Section icon={<Pause className="w-5 h-5" />} title="Don't react yet.">
      {!running && (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            Pick how long you want to sit with this. The timer is the protocol — the rest is optional.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {PAUSE_CHOICES.map(m => (
              <Button
                key={m}
                variant={chosen === m ? "default" : "outline"}
                className="h-16 text-base"
                onClick={() => start(m)}
                data-testid={`button-pause-${m}`}
              >
                <Play className="w-4 h-4 mr-1" />
                {m} min
              </Button>
            ))}
          </div>
        </>
      )}

      {running && secondsLeft !== null && (
        <div className="flex flex-col items-center py-6">
          <div className="relative w-40 h-40 flex items-center justify-center mb-4">
            <div
              className="absolute inset-0 rounded-full bg-primary/10 animate-pulse"
              style={{ animationDuration: "4s" }}
            />
            <div className="absolute inset-3 rounded-full bg-primary/20 animate-pulse" style={{ animationDuration: "4s", animationDelay: "0.5s" }} />
            <div className="relative text-3xl font-semibold tabular-nums" data-testid="text-pause-clock">
              {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
            </div>
          </div>
          <p className="text-sm text-muted-foreground italic">You are safe. Let the reaction pass.</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-4"
            onClick={() => {
              setRunning(false);
              setSecondsLeft(null);
            }}
            data-testid="button-pause-end"
          >
            I'm ready
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between mt-6 pt-4 border-t">
        <Button variant="ghost" size="sm" onClick={onBack} data-testid="button-step-back">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkipFlow}
            data-testid="button-pause-only"
          >
            Just pause, log later
          </Button>
          <Button onClick={onContinue} data-testid="button-step-next">
            Keep going <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </Section>
  );
}

function StandardsStep({
  standards,
  loading,
  onBack,
  onNext,
}: {
  standards: AggregatedStandard[];
  loading: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  // Group by source for clarity.
  const grouped = useMemo(() => {
    const map = new Map<string, AggregatedStandard[]>();
    for (const s of standards) {
      const arr = map.get(s.sourceLabel) ?? [];
      arr.push(s);
      map.set(s.sourceLabel, arr);
    }
    return Array.from(map.entries());
  }, [standards]);

  return (
    <Section icon={<Sparkles className="w-5 h-5 text-primary" />} title="Stay aligned.">
      <p className="text-sm text-muted-foreground mb-3">
        This is who you decided to be — pulled from the standards you've already set across your system.
      </p>
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!loading && grouped.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          You haven't set any standards yet. Add some to your Emotional Regulation pillar to see them here.
        </p>
      )}
      <div className="space-y-4 max-h-72 overflow-y-auto" data-testid="list-standards">
        {grouped.map(([label, items]) => (
          <div key={label}>
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
            <ul className="space-y-1">
              {items.map(s => (
                <li
                  key={`${label}-${s.text}`}
                  className="text-sm flex gap-2"
                  data-testid={`text-standard-${s.text.slice(0, 16).replace(/\W+/g, "-")}`}
                >
                  <span className="text-primary">•</span>
                  <span>{s.text}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <Footer onBack={onBack} onNext={onNext} />
    </Section>
  );
}
