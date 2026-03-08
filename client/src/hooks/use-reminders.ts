/**
 * use-reminders.ts
 *
 * Unified hook for Reminders (PR #7).
 * - Auth users: CRUD via /api/reminders endpoints.
 * - Guests: CRUD via reminder-storage.ts (localStorage).
 */

import { useCallback, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLearningProfile } from "@/hooks/use-learning-profile";
import type { ReminderType, GuestReminder } from "@/lib/reminder-storage";
import {
  getGuestReminders,
  getDueGuestReminders,
  createGuestReminder,
  updateGuestReminder,
  cancelGuestRemindersBySource,
} from "@/lib/reminder-storage";

export interface ReminderRecord {
  id: string;
  type: ReminderType;
  title: string;
  body?: string | null;
  scheduledAt: string;
  status: string;
  sourceEntityType?: string | null;
  sourceEntityId?: string | null;
  createdAt: string;
}

export interface CreateReminderInput {
  type: ReminderType;
  title: string;
  body?: string;
  scheduledAt: Date;
  sourceEntityType?: string;
  sourceEntityId?: string;
}

const QUERY_KEY = "/api/reminders";

function toRecord(r: GuestReminder): ReminderRecord {
  return {
    id: r.id,
    type: r.type,
    title: r.title,
    body: r.body,
    scheduledAt: r.scheduledAt,
    status: r.status,
    sourceEntityType: r.sourceEntityType,
    sourceEntityId: r.sourceEntityId,
    createdAt: r.createdAt,
  };
}

export function useReminders() {
  const { user } = useAuth();
  const isLoggedIn = Boolean(user);
  const queryClient = useQueryClient();
  const { sendLearningEvent } = useLearningProfile();

  // Guest refresh key – force re-read of localStorage after mutations
  const [guestKey, setGuestKey] = useState(0);
  const bumpGuest = useCallback(() => setGuestKey((k) => k + 1), []);

  // ── Auth: fetch all reminders ──────────────────────────────────────────────
  const { data: authReminders = [], isLoading } = useQuery<ReminderRecord[]>({
    queryKey: [QUERY_KEY, "all"],
    queryFn: async () => {
      const res = await fetch("/api/reminders?status=all", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isLoggedIn,
    retry: false,
  });

  // ── Guest: read from localStorage ─────────────────────────────────────────
  const guestReminders: ReminderRecord[] = useMemo(
    () => (!isLoggedIn ? getGuestReminders("all").map(toRecord) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isLoggedIn, guestKey]
  );

  const reminders: ReminderRecord[] = isLoggedIn ? authReminders : guestReminders;

  // ── Auth: create ───────────────────────────────────────────────────────────
  const createAuth = useMutation({
    mutationFn: async (input: CreateReminderInput) => {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...input,
          scheduledAt: input.scheduledAt.toISOString(),
        }),
      });
      if (!res.ok) throw new Error("Failed to create reminder");
      return res.json() as Promise<ReminderRecord>;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });

  // ── Auth: update ───────────────────────────────────────────────────────────
  const updateAuth = useMutation({
    mutationFn: async ({ id, fields }: { id: string; fields: Record<string, unknown> }) => {
      const res = await fetch(`/api/reminders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(fields),
      });
      if (!res.ok) throw new Error("Failed to update reminder");
      return res.json() as Promise<ReminderRecord>;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });

  // ── Unified API ────────────────────────────────────────────────────────────

  const createReminder = useCallback(
    async (input: CreateReminderInput): Promise<ReminderRecord> => {
      if (isLoggedIn) {
        return createAuth.mutateAsync(input);
      }
      const g = createGuestReminder({
        ...input,
        scheduledAt: input.scheduledAt.toISOString(),
        status: "scheduled",
      });
      bumpGuest();
      return toRecord(g);
    },
    [isLoggedIn, createAuth, bumpGuest]
  );

  const dismissReminder = useCallback(
    async (id: string) => {
      if (isLoggedIn) {
        await updateAuth.mutateAsync({ id, fields: { status: "dismissed" } });
      } else {
        updateGuestReminder(id, { status: "dismissed" });
        bumpGuest();
      }
      // Fire-and-forget: update learning profile
      void sendLearningEvent("reminder_dismiss", {});
    },
    [isLoggedIn, updateAuth, bumpGuest, sendLearningEvent]
  );

  const snoozeReminder = useCallback(
    async (id: string, until: Date) => {
      const scheduledHour = until.getHours();
      if (isLoggedIn) {
        await updateAuth.mutateAsync({
          id,
          fields: { status: "scheduled", scheduledAt: until.toISOString() },
        });
      } else {
        updateGuestReminder(id, {
          status: "scheduled",
          scheduledAt: until.toISOString(),
        });
        bumpGuest();
      }
      // Fire-and-forget: update learning profile from snooze behavior
      void sendLearningEvent("reminder_snooze", { scheduledHour });
    },
    [isLoggedIn, updateAuth, bumpGuest, sendLearningEvent]
  );

  const markSent = useCallback(
    async (id: string) => {
      if (isLoggedIn) {
        await updateAuth.mutateAsync({ id, fields: { status: "sent" } });
      } else {
        updateGuestReminder(id, { status: "sent" });
        bumpGuest();
      }
    },
    [isLoggedIn, updateAuth, bumpGuest]
  );

  const cancelBySource = useCallback(
    async (sourceEntityType: string, sourceEntityId: string) => {
      if (isLoggedIn && user) {
        await fetch("/api/reminders/cancel-by-source", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ sourceEntityType, sourceEntityId }),
        }).catch((err) => { console.warn("[useReminders] cancelBySource network error:", err); });
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      } else {
        cancelGuestRemindersBySource(sourceEntityType, sourceEntityId);
        bumpGuest();
      }
    },
    [isLoggedIn, user, queryClient, bumpGuest]
  );

  const getDue = useCallback((): ReminderRecord[] => {
    if (!isLoggedIn) {
      return getDueGuestReminders().map(toRecord);
    }
    const now = new Date();
    return authReminders.filter(
      (r) => r.status === "scheduled" && new Date(r.scheduledAt) <= now
    );
  }, [isLoggedIn, authReminders]);

  return {
    reminders,
    isLoading,
    createReminder,
    dismissReminder,
    snoozeReminder,
    markSent,
    cancelBySource,
    getDue,
    isMutating: createAuth.isPending || updateAuth.isPending,
  };
}
