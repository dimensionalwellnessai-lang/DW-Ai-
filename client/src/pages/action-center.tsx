/**
 * ActionCenterPage – manage DW follow-up prompts end-to-end.
 *
 * Shows pending, snoozed, and completed follow-ups. Each item supports:
 *   Accept → /talk?prefill=...&src=followup_accept
 *   Snooze → pick 2h / tomorrow / 3 days
 *   Dismiss
 *   Mark answered
 *
 * Works for both authenticated users (via /api/dw/followups PATCH) and
 * guests (via dw-intelligence-storage localStorage helpers).
 *
 * Route: /action-center
 */

import { useState, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, CheckCheck, BellOff, ChevronDown, ChevronUp, Clock, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { isFeatureEnabled } from "@/config/featureFlags";
import {
  getGuestDwFollowups,
  updateGuestDwFollowupStatus,
  type GuestDwFollowup,
} from "@/lib/dw-intelligence-storage";
import { useReminders } from "@/hooks/use-reminders";
import { COPY } from "@/copy/en";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FollowupRecord {
  id: string;
  prompt: string;
  status: string;
  snoozedUntil?: string | null;
  acceptedAt?: string | null;
  answeredAt?: string | null;
  dismissedAt?: string | null;
  relatedInsightId?: string | null;
  sourceConversationId?: string | null;
  createdAt: string;
}

// ─── Snooze options ───────────────────────────────────────────────────────────

interface SnoozeOption {
  label: string;
  getUntil: () => Date;
}

const SNOOZE_OPTIONS: SnoozeOption[] = [
  {
    label: "2 hours",
    getUntil: () => new Date(Date.now() + 2 * 60 * 60 * 1000),
  },
  {
    label: "Tomorrow",
    getUntil: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      return d;
    },
  },
  {
    label: "3 days",
    getUntil: () => new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isSnoozedExpired(followup: FollowupRecord): boolean {
  if (followup.status !== "snoozed") return false;
  if (!followup.snoozedUntil) return true;
  return new Date(followup.snoozedUntil) <= new Date();
}

function isActionable(followup: FollowupRecord): boolean {
  return followup.status === "pending" || isSnoozedExpired(followup);
}

function isSnoozedActive(followup: FollowupRecord): boolean {
  return followup.status === "snoozed" && !isSnoozedExpired(followup);
}

function isCompleted(followup: FollowupRecord): boolean {
  return followup.status === "answered" || followup.status === "dismissed" || followup.status === "accepted";
}

function formatSnoozedUntil(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffH = Math.round(diffMs / (1000 * 60 * 60));
  if (diffH < 24) return `in ${diffH}h`;
  const diffD = Math.round(diffH / 24);
  return `in ${diffD}d`;
}

// ─── Single follow-up card ────────────────────────────────────────────────────

interface FollowupCardProps {
  followup: FollowupRecord;
  onAccept: (id: string, prompt: string) => void;
  onSnooze: (id: string, until: Date) => void;
  onDismiss: (id: string) => void;
  onMarkAnswered: (id: string) => void;
  isLoading: boolean;
}

function FollowupItem({ followup, onAccept, onSnooze, onDismiss, onMarkAnswered, isLoading }: FollowupCardProps) {
  const [showSnooze, setShowSnooze] = useState(false);
  const actionable = isActionable(followup);
  const snoozedActive = isSnoozedActive(followup);
  const completed = isCompleted(followup);

  return (
    <div className={`rounded-xl border border-border/60 bg-card p-4 space-y-3 ${completed ? "opacity-60" : ""}`}>
      {/* Status badge */}
      {snoozedActive && followup.snoozedUntil && (
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
          <Clock className="h-3 w-3" />
          Snoozed {formatSnoozedUntil(followup.snoozedUntil)}
        </div>
      )}
      {followup.status === "answered" && (
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-green-600 dark:text-green-400">
          <CheckCheck className="h-3 w-3" />
          Answered
        </div>
      )}
      {followup.status === "dismissed" && (
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          <X className="h-3 w-3" />
          Dismissed
        </div>
      )}
      {followup.status === "accepted" && (
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
          <MessageCircle className="h-3 w-3" />
          In progress
        </div>
      )}

      {/* Prompt text */}
      <p className="text-sm text-foreground/90 leading-relaxed">{followup.prompt}</p>

      {/* Actions – for actionable (pending/snooze-expired) and actively-snoozed items */}
      {((actionable && !completed) || snoozedActive) && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => onAccept(followup.id, followup.prompt)}
              className="flex-1 rounded-lg bg-primary/10 text-primary text-sm font-medium px-3 py-1.5 hover:bg-primary/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
            >
              Explore with DW →
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => onMarkAnswered(followup.id)}
              aria-label="Mark as answered"
              className="rounded-lg bg-green-500/10 text-green-700 dark:text-green-400 text-sm font-medium px-3 py-1.5 hover:bg-green-500/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 disabled:opacity-50"
            >
              <CheckCheck className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => setShowSnooze((s) => !s)}
              className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-muted/50 text-muted-foreground text-sm font-medium px-3 py-1.5 hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
            >
              <BellOff className="h-3.5 w-3.5" />
              Snooze
              {showSnooze ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => onDismiss(followup.id)}
              className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-muted/50 text-muted-foreground text-sm font-medium px-3 py-1.5 hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
              Dismiss
            </button>
          </div>

          {showSnooze && (
            <div className="flex gap-2 flex-wrap">
              {SNOOZE_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    onSnooze(followup.id, opt.getUntil());
                    setShowSnooze(false);
                  }}
                  className="rounded-lg border border-border/60 bg-background text-sm font-medium px-3 py-1.5 hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ActionCenterPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const isLoggedIn = Boolean(user);
  const queryClient = useQueryClient();
  const featureEnabled = isFeatureEnabled("DW_INSIGHT_JOURNAL");
  const remindersEnabled = isFeatureEnabled("REMINDERS");
  const [showCompleted, setShowCompleted] = useState(false);
  // Used to force re-read from localStorage after guest mutations
  const [guestRefreshKey, setGuestRefreshKey] = useState(0);

  // Reminders integration
  const { createReminder, cancelBySource } = useReminders();

  // ── Fetch all followups ──────────────────────────────────────────────────

  // For auth users fetch all statuses so we can bucket them client-side
  const { data: allAuthFollowups = [], isLoading: allAuthLoading } = useQuery<FollowupRecord[]>({
    queryKey: ["/api/dw/followups/all"],
    queryFn: async () => {
      const res = await fetch("/api/dw/followups?status=all", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isLoggedIn && featureEnabled,
    retry: false,
  });

  // Guest: read from localStorage (re-reads when guestRefreshKey changes)
  const guestFollowups: FollowupRecord[] = useMemo(
    () =>
      !isLoggedIn
        ? getGuestDwFollowups("all").map((f: GuestDwFollowup) => ({
            id: f.id,
            prompt: f.prompt,
            status: f.status,
            snoozedUntil: f.snoozedUntil ?? null,
            acceptedAt: f.acceptedAt ?? null,
            answeredAt: f.answeredAt ?? null,
            dismissedAt: f.dismissedAt ?? null,
            relatedInsightId: f.relatedInsightId ?? null,
            sourceConversationId: f.sourceConversationId ?? null,
            createdAt: f.createdAt,
          }))
        : [],
    // guestRefreshKey triggers re-read from localStorage after each mutation
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isLoggedIn, guestRefreshKey]
  );

  const rawFollowups: FollowupRecord[] = isLoggedIn ? allAuthFollowups : guestFollowups;
  const isLoading = isLoggedIn ? allAuthLoading : false;

  // ── Derived lists ────────────────────────────────────────────────────────

  const pending = rawFollowups.filter(isActionable);
  const snoozed = rawFollowups.filter(isSnoozedActive);
  const completed = rawFollowups.filter(isCompleted);

  // ── Mutations ────────────────────────────────────────────────────────────

  const [mutating, setMutating] = useState<string | null>(null);

  async function patchAuthFollowup(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/dw/followups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Failed to update follow-up");
    return res.json();
  }

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/dw/followups/all"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dw/followups"] });
  }, [queryClient]);

  const handleAccept = useCallback(
    async (id: string, prompt: string) => {
      setMutating(id);
      try {
        if (isLoggedIn) {
          await patchAuthFollowup(id, { status: "accepted" });
          invalidate();
        } else {
          updateGuestDwFollowupStatus(id, "accepted");
          setGuestRefreshKey((k) => k + 1);
        }
        const params = new URLSearchParams();
        params.set("prefill", prompt);
        params.set("src", "followup_accept");
        navigate(`/talk?${params.toString()}`);
      } finally {
        setMutating(null);
      }
    },
    [isLoggedIn, navigate, invalidate]
  );

  const handleSnooze = useCallback(
    async (id: string, until: Date) => {
      setMutating(id);
      try {
        if (isLoggedIn) {
          await patchAuthFollowup(id, { status: "snoozed", snoozedUntil: until.toISOString() });
          invalidate();
        } else {
          updateGuestDwFollowupStatus(id, "snoozed", { snoozedUntil: until.toISOString() });
          setGuestRefreshKey((k) => k + 1);
        }
        // Create/replace a reminder so the snooze fires at the right time
        if (remindersEnabled) {
          try {
            // Cancel any existing reminder for this follow-up first
            await cancelBySource("followup", id);
            await createReminder({
              type: "followup",
              title: "Follow-up reminder",
              body: "You snoozed a follow-up — ready to revisit it now?",
              scheduledAt: until,
              sourceEntityType: "followup",
              sourceEntityId: id,
            });
          } catch (reminderError) {
            // Don't let reminder failures break the core snooze flow
            console.error("Failed to create follow-up snooze reminder", reminderError);
          }
        }
      } finally {
        setMutating(null);
      }
    },
    [isLoggedIn, invalidate, remindersEnabled, cancelBySource, createReminder]
  );

  const handleDismiss = useCallback(
    async (id: string) => {
      setMutating(id);
      try {
        if (isLoggedIn) {
          await patchAuthFollowup(id, { status: "dismissed" });
          invalidate();
        } else {
          updateGuestDwFollowupStatus(id, "dismissed");
          setGuestRefreshKey((k) => k + 1);
        }
        // Cancel any pending reminders for this follow-up
        if (remindersEnabled) {
          try {
            await cancelBySource("followup", id);
          } catch (reminderError) {
            console.error("Failed to cancel follow-up reminder on dismiss", reminderError);
          }
        }
      } finally {
        setMutating(null);
      }
    },
    [isLoggedIn, invalidate, remindersEnabled, cancelBySource]
  );

  const handleMarkAnswered = useCallback(
    async (id: string) => {
      setMutating(id);
      try {
        if (isLoggedIn) {
          await patchAuthFollowup(id, { status: "answered" });
          invalidate();
        } else {
          updateGuestDwFollowupStatus(id, "answered");
          setGuestRefreshKey((k) => k + 1);
        }
        // Cancel any pending reminders for this follow-up
        if (remindersEnabled) {
          try {
            await cancelBySource("followup", id);
          } catch (reminderError) {
            console.error("Failed to cancel follow-up reminder on mark-answered", reminderError);
          }
        }
      } finally {
        setMutating(null);
      }
    },
    [isLoggedIn, invalidate, remindersEnabled, cancelBySource]
  );

  // ── Render ───────────────────────────────────────────────────────────────

  if (!featureEnabled) {
    return (
      <div className="flex flex-col h-full bg-background">
        <PageHeader title="Action Center" />
        <div className="flex-1 flex items-center justify-center p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {COPY.actionCenter.featureOff}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <PageHeader title="Action Center" />

      <div className="flex-1 overflow-auto">
        <div className="max-w-lg mx-auto px-4 py-4 space-y-6 pb-24">

          {/* ── Pending / Actionable ─────────────────────────────────────── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">
                Pending
                {pending.length > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5">
                    {pending.length}
                  </span>
                )}
              </h2>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="rounded-xl border border-border/60 bg-card p-4 animate-pulse">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : pending.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/60 p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {COPY.actionCenter.pendingEmpty}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-xs text-primary"
                  onClick={() => {
                    const params = new URLSearchParams();
                    params.set("src", "action_center_empty");
                    navigate(`/talk?${params.toString()}`);
                  }}
                >
                  {COPY.actionCenter.pendingEmptyCTA} →
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {pending.map((f) => (
                  <FollowupItem
                    key={f.id}
                    followup={f}
                    onAccept={handleAccept}
                    onSnooze={handleSnooze}
                    onDismiss={handleDismiss}
                    onMarkAnswered={handleMarkAnswered}
                    isLoading={mutating === f.id}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ── Snoozed ─────────────────────────────────────────────────── */}
          {snoozed.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <BellOff className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <h2 className="text-sm font-semibold text-foreground">
                  Snoozed
                  <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-bold px-1.5 py-0.5">
                    {snoozed.length}
                  </span>
                </h2>
              </div>
              <div className="space-y-3">
                {snoozed.map((f) => (
                  <FollowupItem
                    key={f.id}
                    followup={f}
                    onAccept={handleAccept}
                    onSnooze={handleSnooze}
                    onDismiss={handleDismiss}
                    onMarkAnswered={handleMarkAnswered}
                    isLoading={mutating === f.id}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ── Completed (toggle) ───────────────────────────────────────── */}
          {completed.length > 0 && (
            <section>
              <button
                type="button"
                onClick={() => setShowCompleted((s) => !s)}
                className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <CheckCheck className="h-4 w-4" />
                Completed ({completed.length})
                {showCompleted ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
              </button>

              {showCompleted && (
                <div className="mt-3 space-y-3">
                  {completed.map((f) => (
                    <FollowupItem
                      key={f.id}
                      followup={f}
                      onAccept={handleAccept}
                      onSnooze={handleSnooze}
                      onDismiss={handleDismiss}
                      onMarkAnswered={handleMarkAnswered}
                      isLoading={mutating === f.id}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
