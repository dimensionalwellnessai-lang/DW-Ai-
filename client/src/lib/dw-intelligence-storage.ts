/**
 * dw-intelligence-storage.ts
 *
 * Local storage helpers for DW Insight + Journal Intelligence System.
 * Used by guest users (or as a cache layer) when the feature flag is enabled.
 *
 * Auth users: data lives in the DB via /api/dw/* endpoints.
 * Guests: data lives entirely in localStorage via these helpers.
 */

export interface GuestDwInsight {
  id: string;
  title: string;
  summary: string;
  insightLine?: string;
  quotes?: string[];
  theme?: string;
  tags?: string[];
  switchTag?: string;
  sourceConversationId?: string;
  createdAt: string;
}

export interface GuestDwJournalEntry {
  id: string;
  title: string;
  story: string;
  quotes?: string[];
  tags?: string[];
  sourceConversationId?: string;
  createdAt: string;
}

export interface GuestDwFollowup {
  id: string;
  prompt: string;
  relatedInsightId?: string;
  sourceConversationId?: string;
  status: "pending" | "accepted" | "snoozed" | "answered" | "dismissed";
  snoozedUntil?: string;  // ISO date string
  acceptedAt?: string;
  answeredAt?: string;
  dismissedAt?: string;
  createdAt: string;
}

const DW_INSIGHTS_KEY = "dw_ai_insights";
const DW_JOURNAL_KEY = "dw_ai_journal_entries";
const DW_FOLLOWUPS_KEY = "dw_ai_followups";

function generateId(): string {
  return `guest_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function readJson<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeJson<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Blocked storage – silently fail
  }
}

// ─── DW Insights ─────────────────────────────────────────────────────────────

export function getGuestDwInsights(): GuestDwInsight[] {
  return readJson<GuestDwInsight>(DW_INSIGHTS_KEY);
}

export function getLatestGuestDwInsight(): GuestDwInsight | null {
  const items = getGuestDwInsights();
  if (!items.length) return null;
  return [...items].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];
}

export function saveGuestDwInsight(insight: Omit<GuestDwInsight, "id" | "createdAt">): GuestDwInsight {
  const items = getGuestDwInsights();
  const newItem: GuestDwInsight = {
    ...insight,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  writeJson(DW_INSIGHTS_KEY, [newItem, ...items]);
  return newItem;
}

// ─── DW Journal Entries ───────────────────────────────────────────────────────

export function getGuestDwJournalEntries(): GuestDwJournalEntry[] {
  return readJson<GuestDwJournalEntry>(DW_JOURNAL_KEY);
}

export function getLatestGuestDwJournalEntry(): GuestDwJournalEntry | null {
  const items = getGuestDwJournalEntries();
  if (!items.length) return null;
  return [...items].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];
}

export function saveGuestDwJournalEntry(entry: Omit<GuestDwJournalEntry, "id" | "createdAt">): GuestDwJournalEntry {
  const items = getGuestDwJournalEntries();
  const newItem: GuestDwJournalEntry = {
    ...entry,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  writeJson(DW_JOURNAL_KEY, [newItem, ...items]);
  return newItem;
}

// ─── DW Follow-ups ────────────────────────────────────────────────────────────

export function getGuestDwFollowups(status?: string): GuestDwFollowup[] {
  const items = readJson<GuestDwFollowup>(DW_FOLLOWUPS_KEY);
  if (!status || status === "all") return items;
  if (status === "pending") {
    const now = new Date();
    return items.filter((f) => {
      if (f.status === "pending") return true;
      if (f.status === "snoozed" && f.snoozedUntil && new Date(f.snoozedUntil) <= now) return true;
      return false;
    });
  }
  return items.filter((f) => f.status === status);
}

export function saveGuestDwFollowup(followup: Omit<GuestDwFollowup, "id" | "createdAt">): GuestDwFollowup {
  const items = readJson<GuestDwFollowup>(DW_FOLLOWUPS_KEY);
  const newItem: GuestDwFollowup = {
    ...followup,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  writeJson(DW_FOLLOWUPS_KEY, [newItem, ...items]);
  return newItem;
}

export function updateGuestDwFollowupStatus(id: string, status: GuestDwFollowup["status"], extra?: Partial<Pick<GuestDwFollowup, "snoozedUntil" | "acceptedAt" | "answeredAt" | "dismissedAt">>): void {
  const items = readJson<GuestDwFollowup>(DW_FOLLOWUPS_KEY);
  const now = new Date().toISOString();
  const updated = items.map((f) => {
    if (f.id !== id) return f;
    const patch: Partial<GuestDwFollowup> = { status, ...extra };
    if (status === "accepted" && !patch.acceptedAt) patch.acceptedAt = now;
    if (status === "answered" && !patch.answeredAt) patch.answeredAt = now;
    if (status === "dismissed" && !patch.dismissedAt) patch.dismissedAt = now;
    return { ...f, ...patch };
  });
  writeJson(DW_FOLLOWUPS_KEY, updated);
}

export function clearGuestDwIntelligenceData(): void {
  try {
    localStorage.removeItem(DW_INSIGHTS_KEY);
    localStorage.removeItem(DW_JOURNAL_KEY);
    localStorage.removeItem(DW_FOLLOWUPS_KEY);
  } catch {
    // Blocked storage
  }
}
