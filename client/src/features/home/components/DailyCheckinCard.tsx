/**
 * DailyCheckinCard – Home card for daily 2-question check-in.
 *
 * Shows a compact form if today's check-in is missing.
 * After completion, shows today's result with an "Edit" option.
 * Gated behind the DAILY_CHECKIN feature flag.
 */

import { useState } from "react";
import { CheckCircle, Edit2, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DWCardContainer } from "./DWCardContainer";
import { useDailyCheckin } from "@/hooks/use-daily-checkin";
import { useLearningProfile } from "@/hooks/use-learning-profile";
import { DAILY_CHECKIN_MOOD_OPTIONS, DAILY_CHECKIN_CONSTRAINT_OPTIONS } from "@/lib/daily-checkin-constants";
import { trackEvent, EVENTS } from "@/lib/analytics";

// ── Sub-components ────────────────────────────────────────────────────────────

interface CheckinFormProps {
  onSubmit: (moodScore: number, constraintType: string, constraintNote?: string) => void;
  isSubmitting: boolean;
}

function CheckinForm({ onSubmit, isSubmitting }: CheckinFormProps) {
  const [moodScore, setMoodScore] = useState<number | null>(null);
  const [constraintType, setConstraintType] = useState("");
  const [constraintNote, setConstraintNote] = useState("");
  const [step, setStep] = useState<1 | 2>(1);

  function handleMoodSelect(score: number) {
    setMoodScore(score);
    setStep(2);
  }

  function handleSubmit() {
    if (!moodScore || !constraintType) return;
    onSubmit(moodScore, constraintType, constraintNote || undefined);
  }

  if (step === 1) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-medium">How's your energy today?</p>
        <div className="flex gap-1.5 flex-wrap">
          {DAILY_CHECKIN_MOOD_OPTIONS.map(({ score, label }) => (
            <button
              key={score}
              type="button"
              onClick={() => handleMoodSelect(score)}
              className="px-2 py-1 text-xs rounded-lg border border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={label}
            >
              {score}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Energy:</span>
        <span className="text-xs font-medium">{moodScore}/5</span>
        <button
          type="button"
          onClick={() => setStep(1)}
          className="ml-1 text-xs text-primary hover:underline focus:outline-none"
        >
          change
        </button>
      </div>
      <p className="text-xs text-muted-foreground font-medium">Biggest constraint today?</p>
      <div className="flex flex-wrap gap-1.5">
        {DAILY_CHECKIN_CONSTRAINT_OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => setConstraintType(opt)}
            className={`px-2 py-1 text-xs rounded-lg border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              constraintType === opt
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/60 hover:border-primary/50 hover:bg-primary/5"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
      {constraintType === "Other" && (
        <input
          type="text"
          value={constraintNote}
          onChange={(e) => setConstraintNote(e.target.value)}
          placeholder="Briefly describe…"
          maxLength={200}
          className="w-full text-xs rounded-lg border border-border/60 bg-background px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-primary/50"
        />
      )}
      <Button
        size="sm"
        className="h-7 text-xs"
        disabled={!constraintType || isSubmitting}
        onClick={handleSubmit}
      >
        {isSubmitting ? "Saving…" : "Save check-in"}
      </Button>
    </div>
  );
}

// ── Main card ─────────────────────────────────────────────────────────────────

export function DailyCheckinCard() {
  const { todayCheckin, isLoading, submitCheckin, isSubmitting, today } = useDailyCheckin();
  const { sendLearningEvent } = useLearningProfile();
  const [editMode, setEditMode] = useState(false);

  if (isLoading) return null;

  async function handleSubmit(moodScore: number, constraintType: string, constraintNote?: string) {
    await submitCheckin({ date: today, moodScore, constraintType, constraintNote });
    trackEvent(EVENTS.CHECKIN_SUBMITTED, { moodScore, constraintType });
    // Fire-and-forget: update learning profile from this check-in
    void sendLearningEvent("checkin", { constraintType, moodScore });
    trackEvent(EVENTS.CHECKIN_SUBMITTED, { moodScore, constraintType });
    setEditMode(false);
  }

  const showForm = !todayCheckin || editMode;

  return (
    <DWCardContainer>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-green-500/10">
            <ClipboardCheck className="h-4 w-4 text-green-500" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Daily Check-in
          </p>
        </div>
        {todayCheckin && !editMode && (
          <button
            type="button"
            onClick={() => setEditMode(true)}
            aria-label="Edit today's check-in"
            className="p-1 rounded hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Edit2 className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {showForm ? (
        <CheckinForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      ) : (
        <div className="flex items-center gap-2 text-sm text-foreground/80">
          <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
          <span>
            Energy <strong>{todayCheckin.moodScore}/5</strong> · {todayCheckin.constraintType}
            {todayCheckin.constraintNote ? ` — ${todayCheckin.constraintNote}` : ""}
          </span>
        </div>
      )}
    </DWCardContainer>
  );
}
