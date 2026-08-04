/**
 * Unified user context snapshot for DW.
 *
 * One server-side aggregator that pulls everything DW knows about a user
 * (identity, body/wearables/screen-time, money, people, spirit, plans,
 * triggers, mood insights) in a single parallel pass, behind a short-lived
 * in-memory cache.
 *
 * Two render helpers are exported:
 *   • toUserLifeContext(snapshot, opts?) — the legacy shape consumed by
 *     generateChatResponse / detectIntentAndRespond[Streaming]. Drop-in
 *     replacement for the hand-rolled userContext objects in routes.ts.
 *   • toPromptString(snapshot) — a compact (<600-token target) natural-language
 *     block suitable for realtime/voice instructions or any prompt that wants
 *     a single readable paragraph instead of a structured object.
 */

import { and, desc, eq, gte } from "drizzle-orm";

import { storage } from "../storage";
import { db } from "../db";
import type { UserLifeContext, EnergyContext } from "../openai";
import {
  people,
  peopleInteractions,
  roleMaps,
  type RoleMapLevel,
  coachingModeEnum,
  type CoachingMode,
  type Goal,
  type Habit,
  type MoodLog,
  type ScheduleBlock,
  type CalendarEvent,
  type Routine,
  type Reminder,
  type Project,
  type LifeSystemProject,
  type Transaction,
  type Budget,
  type SavingsGoal,
  type FinancialAccount,
  type DwJournalEntry,
  type TriggerEvent,
  type AstrologyPrediction,
  type BirthChart,
  type Person,
  type PeopleInteraction,
} from "@shared/schema";
import {
  getYesterdayHeadlineMetrics,
  getMoodCorrelationFactors,
} from "../routes/wearables";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UserContextSnapshot {
  userId: string;
  generatedAt: string;
  /** Local date key (YYYY-MM-DD) and rough time-of-day bucket. */
  today: {
    date: string;
    dayOfWeek: number;
    timeOfDay: "morning" | "afternoon" | "evening" | "night";
    hour: number;
  };
  identity: {
    systemName?: string;
    firstName?: string;
    coachMode: CoachingMode;
    wellnessFocus: string[];
    peakMotivationTime?: string;
    energyLevel?: string;
    fitnessGoal?: string;
  };
  body: {
    yesterday?: {
      sleepMinutes?: number;
      hrv?: number;
      restingHr?: number;
      steps?: number;
      screenTimeMinutes?: number;
    } | null;
    currentMood?: {
      energyLevel: number;
      moodLevel: number;
      clarityLevel?: number;
      loggedAt?: string | Date | null;
    } | null;
    recentMoods: Array<{
      energy: number;
      mood: number;
      clarity?: number;
      date: string;
    }>;
  };
  money: {
    netWorth?: number;
    accountsCount: number;
    monthlySpend?: number;
    monthlyIncome?: number;
    /** Income minus spend this month. Positive = surplus, negative = shortfall. */
    monthlyDelta?: number;
    /** "up" / "down" / "flat" relative to monthlyDelta sign — coarse direction signal. */
    netDirection?: "up" | "down" | "flat";
    topBudget?: { category: string; monthlyLimit: number };
    activeSavingsGoals: Array<{ name: string; current: number; target: number }>;
  };
  people: {
    closeCount: number;
    drainingCount: number;
    overdueContacts: Array<{ name: string; daysSinceContact: number }>;
    /** Birthdays within the next 14 days (MM-DD compared against today). */
    upcomingBirthdays: Array<{ name: string; date: string; daysAway: number }>;
    recentInteractions: Array<{
      name: string;
      kind: string;
      energyAfter?: number;
      occurredAt?: string | Date;
    }>;
  };
  spirit: {
    cosmicConsent: {
      useAstrologyInGuidance: boolean;
      useNumerologyInGuidance: boolean;
    };
    hasBirthChart: boolean;
    sunSign?: string;
    moonSign?: string;
    risingSign?: string;
    upcomingPredictions: Array<{ title: string; date?: string }>;
    wellnessPreferences?: {
      beliefSystem?: string | null;
      traditions?: string[] | null;
      otherTradition?: string | null;
      meditationEnabled?: boolean | null;
      journalEnabled?: boolean | null;
      astrologyEnabled?: boolean | null;
      tarotEnabled?: boolean | null;
      energyWorkEnabled?: boolean | null;
    };
  };
  /** Active Role Map (Level Up): who the user is becoming and where they are on the ladder. */
  roleMap: {
    targetRole: string;
    identityStatement?: string;
    currentLevel: number;
    maxLevel: number;
    currentLevelTitle?: string;
    nextLevelTitle?: string;
    /** Up to 3 not-yet-done milestones for the next level up (or current level if at top). */
    nextMilestones: string[];
  } | null;
  plans: {
    activeGoals: Array<{
      id: string;
      title: string;
      progress: number;
      wellnessDimension?: string;
    }>;
    activeHabits: Array<{
      id: string;
      title: string;
      streak: number;
      frequency?: string;
      completedToday: boolean;
    }>;
    activeProjects: Array<{
      id: string;
      name: string;
      description?: string;
      lastActivity?: string;
    }>;
    lifeSystemProjects: Array<{
      id: string;
      name: string;
      currentFocus?: string;
      lastActivity?: string;
    }>;
    todaySchedule: Array<{
      title: string;
      startTime: string;
      endTime: string;
      category?: string;
    }>;
    todayCalendarEvents: Array<{
      title: string;
      startTime?: string;
      description?: string;
    }>;
    pendingReminders: Array<{ title: string; reminderTime?: string | null }>;
    activeRoutines: Array<{ id: string; name: string; mode?: string }>;
    enabledLifeSystems: string[];
    preferredWakeTime?: string;
    preferredSleepTime?: string;
  };
  triggers: {
    last7Days: number;
    recent: Array<{
      feeling: string;
      outcome?: string | null;
      occurredAt?: string | Date;
    }>;
  };
  insights: {
    recentJournal: Array<{
      content: string;
      mood?: string | null;
      createdAt?: string | Date | null;
    }>;
    moodFactors: Array<{ key: string; label: string; impact: number; detail: string }>;
    moodSampleSize: number;
  };
  /** Documents/preferences the user imported via DW Smart Import. */
  imports: Array<{
    title: string;
    category?: string;
    summary?: string;
    status?: string;
    createdAt?: string | Date | null;
  }>;
}

export type SnapshotDetail = "brief" | "full";

export interface SnapshotOptions {
  /** Skip cache and rebuild from scratch. */
  forceFresh?: boolean;
  /**
   * "full" (default) loads every domain (body, money, people, spirit,
   * insights, etc). "brief" trims to identity + plans + body so cheap
   * surfaces (proactive checks, suggestion chips) skip the heavy work.
   */
  detail?: SnapshotDetail;
}

// ─── Cache ───────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 60_000;
type CacheEntry = { snap: UserContextSnapshot; expiresAt: number };
const cache = new Map<string, CacheEntry>();

const cacheKey = (userId: string, detail: SnapshotDetail): string =>
  `${userId}::${detail}`;

/** Drop a single user's cached snapshot (both detail levels). */
export function invalidateUserContext(userId: string): void {
  cache.delete(cacheKey(userId, "full"));
  cache.delete(cacheKey(userId, "brief"));
}

// ─── Aggregator ──────────────────────────────────────────────────────────────

const safe = <T>(p: Promise<T>): Promise<T | null> =>
  p.then((v) => v).catch(() => null);

function asCoachMode(v: string | null | undefined): CoachingMode {
  return (coachingModeEnum as readonly string[]).includes(v ?? "")
    ? (v as CoachingMode)
    : "gentle";
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function getUserContextSnapshot(
  userId: string,
  opts: SnapshotOptions = {},
): Promise<UserContextSnapshot> {
  const now = Date.now();
  const detail: SnapshotDetail = opts.detail ?? "full";
  const key = cacheKey(userId, detail);
  if (!opts.forceFresh) {
    const hit = cache.get(key);
    if (hit && hit.expiresAt > now) return hit.snap;
    // A "brief" caller can be served from a fresh "full" entry.
    if (detail === "brief") {
      const fullHit = cache.get(cacheKey(userId, "full"));
      if (fullHit && fullHit.expiresAt > now) return fullHit.snap;
    }
  }

  const today = new Date();
  const todayStr = dayKey(today);
  const dayOfWeek = today.getDay();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const isFull = detail === "full";
  // Wraps a promise in safe() when `when` is true; resolves to null otherwise.
  // Lets us skip heavy fetches at the brief-detail level while keeping the
  // destructured tuple's element types intact.
  const maybe = <T>(p: Promise<T>, when: boolean): Promise<T | null> =>
    when ? safe(p) : Promise.resolve(null);

  const [
    user,
    profile,
    systemPrefs,
    wellnessPrefs,
    goals,
    habits,
    todayHabitLogs,
    moodLogs,
    scheduleBlocks,
    calendarEvents,
    routines,
    pendingReminders,
    recentJournal,
    projects,
    lifeSystemProjects,
    accounts,
    transactions,
    budgets,
    netWorth,
    savingsGoals,
    peopleRows,
    peopleInteractionsRows,
    triggerEvents,
    moodInsights,
    moodFactorsResult,
    yesterdayMetrics,
    birthChart,
    astrologyPredictions,
    importedDocs,
    activeRoleMapRows,
  ] = await Promise.all([
    safe(storage.getUser(userId)),
    safe(storage.getUserProfile(userId)),
    safe(storage.getUserSystemPreferences(userId)),
    safe(storage.getWellnessPreferences(userId)),
    safe(storage.getGoals(userId)),
    safe(storage.getHabits(userId)),
    safe(storage.getTodayHabitLogsByUser(userId)),
    safe(storage.getMoodLogs(userId)),
    safe(storage.getScheduleBlocks(userId)),
    safe(storage.getCalendarEvents(userId)),
    safe(storage.getRoutines(userId)),
    safe(storage.getReminders(userId, "scheduled")),
    maybe(storage.getDwJournalEntries(userId, 5), isFull),
    safe(storage.getProjects(userId)),
    safe(storage.getLifeSystemProjects(userId)),
    maybe(storage.getFinancialAccounts(userId), isFull),
    maybe(storage.getTransactions(userId), isFull),
    maybe(storage.getBudgets(userId), isFull),
    maybe(storage.getNetWorthSnapshots(userId, 1), isFull),
    maybe(storage.getSavingsGoals(userId), isFull),
    maybe(
      db
        .select()
        .from(people)
        .where(and(eq(people.userId, userId), eq(people.isActive, true)))
        .limit(50),
      isFull,
    ),
    maybe(
      db
        .select()
        .from(peopleInteractions)
        .where(
          and(
            eq(peopleInteractions.userId, userId),
            gte(peopleInteractions.occurredAt, thirtyDaysAgo),
          ),
        )
        .orderBy(desc(peopleInteractions.occurredAt))
        .limit(50),
      isFull,
    ),
    maybe(storage.listTriggerEvents(userId, 20), isFull),
    maybe(storage.getMoodInsights(userId), isFull),
    maybe(getMoodCorrelationFactors(userId, 14), isFull),
    maybe(getYesterdayHeadlineMetrics(userId), isFull),
    maybe(storage.getBirthChart(userId), isFull),
    maybe(
      storage.getAstrologyPredictions(
        userId,
        today,
        new Date(now + 7 * 24 * 60 * 60 * 1000),
      ),
      isFull,
    ),
    maybe(storage.getImportedDocuments(userId), isFull),
    safe(
      db
        .select()
        .from(roleMaps)
        .where(and(eq(roleMaps.userId, userId), eq(roleMaps.status, "active")))
        .limit(1),
    ),
  ]);

  // ── Identity ──
  // userProfiles uses `goals` for wellness focus and `fitnessGoal`. Some
  // legacy installs include an `energyLevel` text column; cast narrowly
  // to read it without re-typing the whole row.
  const identity: UserContextSnapshot["identity"] = {
    systemName: user?.systemName ?? undefined,
    firstName: (user?.firstName ?? user?.username ?? "").trim() || undefined,
    coachMode: asCoachMode(user?.coachingMode ?? null),
    wellnessFocus: profile?.goals ?? [],
    peakMotivationTime: systemPrefs?.preferredWakeTime ?? undefined,
    energyLevel:
      (profile as { energyLevel?: string | null } | null)?.energyLevel ??
      undefined,
    fitnessGoal: profile?.fitnessGoal ?? undefined,
  };

  // ── Body / mood ──
  const completedHabitIds = new Set(
    (todayHabitLogs ?? []).map((l) => l.habitId),
  );
  const moodList: MoodLog[] = moodLogs ?? [];
  const latestMood: MoodLog | null = moodList.length > 0 ? moodList[0] : null;
  const recentMoods = moodList.slice(0, 5).map((m) => ({
    energy: m.energyLevel,
    mood: m.moodLevel,
    clarity: m.clarityLevel ?? undefined,
    date: m.createdAt ? dayKey(new Date(m.createdAt)) : "",
  }));

  // ── Money ──
  const monthStartKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const txList: Transaction[] = transactions ?? [];
  const monthlyTx = txList.filter(
    (t) => typeof t.date === "string" && t.date >= monthStartKey,
  );
  const monthlySpend = monthlyTx
    .filter((t) => (t.amount ?? 0) < 0)
    .reduce((s, t) => s + Math.abs(t.amount ?? 0), 0);
  const monthlyIncome = monthlyTx
    .filter((t) => (t.amount ?? 0) > 0)
    .reduce((s, t) => s + (t.amount ?? 0), 0);
  const budgetList: Budget[] = budgets ?? [];
  const topBudget = budgetList
    .slice()
    .sort((a, b) => (b.monthlyLimit ?? 0) - (a.monthlyLimit ?? 0))[0];

  const monthlyDelta =
    monthlyTx.length > 0 ? Math.round(monthlyIncome - monthlySpend) : undefined;
  const netDirection: UserContextSnapshot["money"]["netDirection"] =
    monthlyDelta == null
      ? undefined
      : monthlyDelta > 25
        ? "up"
        : monthlyDelta < -25
          ? "down"
          : "flat";

  const money: UserContextSnapshot["money"] = {
    netWorth: netWorth?.[0]?.netWorth ?? undefined,
    accountsCount: (accounts ?? []).length,
    monthlySpend: monthlyTx.length > 0 ? Math.round(monthlySpend) : undefined,
    monthlyIncome: monthlyTx.length > 0 ? Math.round(monthlyIncome) : undefined,
    monthlyDelta,
    netDirection,
    topBudget: topBudget
      ? { category: topBudget.category, monthlyLimit: topBudget.monthlyLimit }
      : undefined,
    activeSavingsGoals: (savingsGoals ?? []).slice(0, 3).map((g) => ({
      name: g.name,
      current: g.currentAmount ?? 0,
      target: g.targetAmount,
    })),
  };

  // ── People ──
  const closeCount = (peopleRows ?? []).filter(
    (p) => p.category === "aligned" || p.relationship === "partner" || p.relationship === "close-friend" || p.relationship === "family",
  ).length;
  const drainingCount = (peopleRows ?? []).filter(
    (p) => p.category === "draining",
  ).length;
  const overdueContacts: UserContextSnapshot["people"]["overdueContacts"] = [];
  for (const p of peopleRows ?? []) {
    if (!p.contactFrequencyDays || !p.lastInteractionAt) continue;
    const days = Math.floor(
      (now - new Date(p.lastInteractionAt).getTime()) / (24 * 60 * 60 * 1000),
    );
    if (days > p.contactFrequencyDays) {
      overdueContacts.push({ name: p.name, daysSinceContact: days });
    }
  }
  overdueContacts.sort((a, b) => b.daysSinceContact - a.daysSinceContact);

  // Upcoming birthdays in the next 14 days. Schema stores `birthday` as a
  // YYYY-MM-DD or MM-DD text — we only need month/day to compute proximity.
  const upcomingBirthdays: Array<{ name: string; date: string; daysAway: number }> = [];
  for (const p of peopleRows ?? []) {
    const bday = (p as Person & { birthday?: string | null }).birthday;
    if (!bday) continue;
    const m = /(\d{1,2})-(\d{1,2})\s*$/.exec(bday);
    if (!m) continue;
    const month = parseInt(m[1]!, 10) - 1;
    const day = parseInt(m[2]!, 10);
    if (Number.isNaN(month) || Number.isNaN(day)) continue;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let next = new Date(today.getFullYear(), month, day);
    if (next.getTime() < today.getTime()) next = new Date(today.getFullYear() + 1, month, day);
    const daysAway = Math.round((next.getTime() - today.getTime()) / 86_400_000);
    if (daysAway <= 14) {
      upcomingBirthdays.push({
        name: p.name,
        date: `${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        daysAway,
      });
    }
  }
  upcomingBirthdays.sort((a, b) => a.daysAway - b.daysAway);

  const peopleById = new Map((peopleRows ?? []).map((p) => [p.id, p.name]));
  const recentInteractions = (peopleInteractionsRows ?? [])
    .slice(0, 5)
    .map((i) => ({
      name: peopleById.get(i.personId) ?? "Someone",
      kind: i.kind ?? "in-person",
      energyAfter: i.energyAfter ?? undefined,
      occurredAt: i.occurredAt ?? undefined,
    }));

  // ── Spirit ──
  const cosmicConsent = {
    useAstrologyInGuidance: Boolean(wellnessPrefs?.useAstrologyInGuidance),
    useNumerologyInGuidance: Boolean(wellnessPrefs?.useNumerologyInGuidance),
  };
  const predictionList: AstrologyPrediction[] = astrologyPredictions ?? [];
  const upcomingPredictions = predictionList.slice(0, 3).map((p) => ({
    title: p.moodAlignment || p.moonPhase || "Prediction",
    date: p.date ? new Date(p.date).toISOString().slice(0, 10) : undefined,
  }));

  // BirthChart row exposes the planet placements via a JSON `chartData`
  // field, not as flat columns — pick out the three signs we care about.
  const chartPlacements =
    (birthChart as
      | (BirthChart & {
          sunSign?: string | null;
          moonSign?: string | null;
          risingSign?: string | null;
        })
      | null) ?? null;

  const spirit: UserContextSnapshot["spirit"] = {
    cosmicConsent,
    hasBirthChart: Boolean(birthChart),
    sunSign: chartPlacements?.sunSign ?? undefined,
    moonSign: chartPlacements?.moonSign ?? undefined,
    risingSign: chartPlacements?.risingSign ?? undefined,
    upcomingPredictions,
    wellnessPreferences: wellnessPrefs
      ? {
          beliefSystem: wellnessPrefs.beliefSystem,
          traditions: wellnessPrefs.traditions,
          otherTradition: wellnessPrefs.otherTradition,
          meditationEnabled: wellnessPrefs.meditationEnabled,
          journalEnabled: wellnessPrefs.journalEnabled,
          astrologyEnabled: wellnessPrefs.astrologyEnabled,
          tarotEnabled: wellnessPrefs.tarotEnabled,
          energyWorkEnabled: wellnessPrefs.energyWorkEnabled,
        }
      : undefined,
  };

  // ── Plans ──
  const goalList: Goal[] = goals ?? [];
  const habitList: Habit[] = habits ?? [];
  const scheduleBlockList: ScheduleBlock[] = scheduleBlocks ?? [];
  const calendarEventList: CalendarEvent[] = calendarEvents ?? [];
  const projectList: Project[] = projects ?? [];
  const lifeSystemProjectList: LifeSystemProject[] = lifeSystemProjects ?? [];
  const reminderList: Reminder[] = pendingReminders ?? [];
  const routineList: Routine[] = routines ?? [];

  const activeGoals = goalList
    .filter((g) => g.isActive)
    .map((g) => ({
      id: g.id,
      title: g.title,
      progress: 0,
      wellnessDimension:
        (g as Goal & { wellnessDimension?: string | null }).wellnessDimension ??
        undefined,
    }));
  const activeHabits = habitList
    .filter((h) => h.isActive)
    .map((h) => ({
      id: h.id,
      title: h.title,
      streak: h.streak ?? 0,
      frequency: h.frequency ?? "daily",
      completedToday: completedHabitIds.has(h.id),
    }));
  const todaySchedule = scheduleBlockList
    .filter((b) => b.dayOfWeek === dayOfWeek)
    .map((b) => ({
      title: b.title,
      startTime: b.startTime,
      endTime: b.endTime,
      category: b.category ?? undefined,
    }));
  // calendarEvents.startTime is a numeric (unix ms) column in the schema, so
  // narrow to a Date and compare against today's day key.
  const todayCalendarEvents = calendarEventList
    .filter((e) => {
      if (e.startTime == null) return false;
      const d = new Date(e.startTime as unknown as number | string);
      return !Number.isNaN(d.valueOf()) && dayKey(d) === todayStr;
    })
    .map((e) => ({
      title: e.title,
      startTime:
        e.startTime != null
          ? new Date(e.startTime as unknown as number | string).toISOString()
          : undefined,
      description: e.description ?? undefined,
    }));

  const plans: UserContextSnapshot["plans"] = {
    activeGoals,
    activeHabits,
    activeProjects: projectList
      .filter(
        (p) =>
          (p as Project & { isActive?: boolean | null }).isActive !== false,
      )
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description ?? undefined,
        lastActivity:
          (p as Project & { updatedAt?: Date | string | null }).updatedAt
            ? new Date(
                (p as Project & { updatedAt?: Date | string | null })
                  .updatedAt as Date | string,
              ).toISOString()
            : undefined,
      })),
    lifeSystemProjects: lifeSystemProjectList
      .filter((p) => p.status === "active" || p.status === "vision")
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        name: p.name,
        currentFocus:
          (p as LifeSystemProject & { currentFocus?: string | null })
            .currentFocus ?? undefined,
        lastActivity:
          (p as LifeSystemProject & { updatedAt?: Date | string | null })
            .updatedAt
            ? new Date(
                (p as LifeSystemProject & { updatedAt?: Date | string | null })
                  .updatedAt as Date | string,
              ).toISOString()
            : undefined,
      })),
    todaySchedule,
    todayCalendarEvents,
    pendingReminders: reminderList.slice(0, 5).map((r) => ({
      title: r.title,
      reminderTime:
        (r as Reminder & { reminderTime?: string | null }).reminderTime ?? null,
    })),
    activeRoutines: routineList
      .filter(
        (r) =>
          (r as Routine & { isActive?: boolean | null }).isActive !== false,
      )
      .map((r) => ({
        id: r.id,
        name: r.name,
        mode:
          (r as Routine & { mode?: string | null }).mode ?? undefined,
      })),
    enabledLifeSystems: systemPrefs?.enabledSystems ?? [],
    preferredWakeTime: systemPrefs?.preferredWakeTime ?? undefined,
    preferredSleepTime: systemPrefs?.preferredSleepTime ?? undefined,
  };

  // ── Triggers ──
  const triggersList: TriggerEvent[] = triggerEvents ?? [];
  const last7Days = triggersList.filter(
    (t) => t.createdAt && new Date(t.createdAt) >= sevenDaysAgo,
  ).length;

  const triggers: UserContextSnapshot["triggers"] = {
    last7Days,
    recent: triggersList.slice(0, 3).map((t) => ({
      feeling:
        (t as TriggerEvent & { feeling?: string | null }).feeling ?? "trigger",
      outcome:
        (t as TriggerEvent & { outcome?: string | null }).outcome ?? null,
      occurredAt: t.createdAt ?? undefined,
    })),
  };

  // ── Insights ──
  const journalList: DwJournalEntry[] = recentJournal ?? [];
  const insights: UserContextSnapshot["insights"] = {
    recentJournal: journalList.slice(0, 3).map((j) => ({
      content: (
        (j as DwJournalEntry & { content?: string | null; story?: string | null })
          .content ??
        (j as DwJournalEntry & { story?: string | null }).story ??
        ""
      ).slice(0, 200),
      mood:
        (j as DwJournalEntry & { mood?: string | null }).mood ?? null,
      createdAt: j.createdAt ?? null,
    })),
    moodFactors: (moodFactorsResult?.factors ?? [])
      .slice()
      .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
      .slice(0, 4),
    moodSampleSize: moodFactorsResult?.sampleSize ?? (moodInsights?.length ?? 0),
  };

  // ── Imports ──
  const importsList: UserContextSnapshot["imports"] = (importedDocs ?? [])
    .filter((d) => d.status !== "error" && Boolean(d.documentTitle || d.fileName))
    .slice(0, 5)
    .map((d) => ({
      title: (d.documentTitle || d.fileName) as string,
      category: d.primaryCategory ?? undefined,
      summary: d.summary ?? undefined,
      status: d.status ?? undefined,
      createdAt: d.createdAt ?? null,
    }));

  // ── Role Map ──
  const activeRoleMap = (activeRoleMapRows ?? [])[0] ?? null;
  let roleMapCtx: UserContextSnapshot["roleMap"] = null;
  if (activeRoleMap) {
    const levels = (Array.isArray(activeRoleMap.levels)
      ? activeRoleMap.levels
      : []) as RoleMapLevel[];
    const maxLevel = levels.length
      ? Math.max(...levels.map((l) => l.level))
      : activeRoleMap.currentLevel;
    const currentDef = levels.find((l) => l.level === activeRoleMap.currentLevel);
    const nextDef =
      levels.find((l) => l.level === activeRoleMap.currentLevel + 1) ?? currentDef;
    roleMapCtx = {
      targetRole: activeRoleMap.targetRole,
      identityStatement: activeRoleMap.identityStatement ?? undefined,
      currentLevel: activeRoleMap.currentLevel,
      maxLevel,
      currentLevelTitle: currentDef?.title,
      nextLevelTitle: nextDef?.title,
      nextMilestones: (nextDef?.milestones ?? [])
        .filter((m) => !m.done)
        .slice(0, 3)
        .map((m) => m.title),
    };
  }

  const nowDate = new Date();
  const hour = nowDate.getHours();
  const timeOfDay: UserContextSnapshot["today"]["timeOfDay"] =
    hour < 5 ? "night" : hour < 12 ? "morning" : hour < 17 ? "afternoon" : hour < 22 ? "evening" : "night";

  const snap: UserContextSnapshot = {
    userId,
    generatedAt: nowDate.toISOString(),
    today: {
      date: nowDate.toISOString().slice(0, 10),
      dayOfWeek: nowDate.getDay(),
      timeOfDay,
      hour,
    },
    identity,
    body: {
      yesterday: yesterdayMetrics ?? null,
      currentMood: latestMood
        ? {
            energyLevel: latestMood.energyLevel,
            moodLevel: latestMood.moodLevel,
            clarityLevel: latestMood.clarityLevel ?? undefined,
            loggedAt: latestMood.createdAt ?? null,
          }
        : null,
      recentMoods,
    },
    money,
    people: {
      closeCount,
      drainingCount,
      overdueContacts: overdueContacts.slice(0, 3),
      upcomingBirthdays: upcomingBirthdays.slice(0, 5),
      recentInteractions,
    },
    spirit,
    roleMap: roleMapCtx,
    plans,
    triggers,
    insights,
    imports: importsList,
  };

  cache.set(key, { snap, expiresAt: now + CACHE_TTL_MS });
  return snap;
}

// ─── Render: legacy UserLifeContext shape ────────────────────────────────────

export interface ToUserLifeContextOpts {
  category?: string;
  energyContext?: EnergyContext;
  lifeSystem?: UserLifeContext["lifeSystem"];
}

/**
 * Convert a snapshot into the object shape expected by
 * generateChatResponse / detectIntentAndRespond[Streaming]. Also packs the
 * natural-language `contextSnapshot` block so the prompt picks up the
 * unified domain summary alongside the existing per-field rendering.
 */
export function toUserLifeContext(
  snap: UserContextSnapshot,
  opts: ToUserLifeContextOpts = {},
): UserLifeContext {
  const toIso = (d: string | Date | null | undefined): string | undefined => {
    if (d == null) return undefined;
    const v = d instanceof Date ? d : new Date(d);
    return Number.isNaN(v.valueOf()) ? undefined : v.toISOString();
  };

  return {
    category: opts.category,
    systemName: snap.identity.systemName,
    wellnessFocus: snap.identity.wellnessFocus,
    peakMotivationTime: snap.identity.peakMotivationTime,
    coachMode: snap.identity.coachMode,
    activeGoals: snap.plans.activeGoals,
    habits: snap.plans.activeHabits,
    todaySchedule: snap.plans.todaySchedule,
    todayCalendarEvents: snap.plans.todayCalendarEvents,
    currentMood: snap.body.currentMood
      ? {
          energyLevel: snap.body.currentMood.energyLevel,
          moodLevel: snap.body.currentMood.moodLevel,
          clarityLevel: snap.body.currentMood.clarityLevel,
          loggedAt: toIso(snap.body.currentMood.loggedAt),
        }
      : null,
    recentMoods: snap.body.recentMoods,
    recentJournalEntries: snap.insights.recentJournal.map((j) => ({
      content: j.content,
      mood: j.mood ?? undefined,
      createdAt: toIso(j.createdAt),
    })),
    pendingReminders: snap.plans.pendingReminders.map((r) => ({
      title: r.title,
      reminderTime: r.reminderTime ?? undefined,
    })),
    activeRoutines: snap.plans.activeRoutines.map((r) => ({
      id: r.id,
      name: r.name,
      mode: r.mode ?? "routine",
    })),
    routines: snap.plans.activeRoutines.map((r) => ({
      title: r.name,
      type: r.mode ?? "routine",
      isActive: true,
    })),
    cosmicConsent: snap.spirit.cosmicConsent,
    wellnessPreferences: snap.spirit.wellnessPreferences,
    lifeSystem:
      opts.lifeSystem ?? {
        preferences: {
          enabledSystems: snap.plans.enabledLifeSystems,
          preferredWakeTime: snap.plans.preferredWakeTime,
          preferredSleepTime: snap.plans.preferredSleepTime,
        },
        scheduleEvents: snap.plans.todaySchedule.map((b) => ({
          title: b.title,
          scheduledTime: b.startTime,
          systemReference: b.category,
        })),
      },
    energyContext: opts.energyContext,
    contextSnapshot: toPromptString(snap),
  };
}

// ─── Render: natural-language prompt block ───────────────────────────────────

function fmtMin(mins?: number): string {
  if (mins == null) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`;
}

/**
 * Compact natural-language summary of everything DW knows about the user.
 * Designed to stay under ~600 tokens. Sections are omitted entirely when
 * they contain no useful data, so the block stays small for new users.
 */
export function toPromptString(snap: UserContextSnapshot): string {
  const lines: string[] = [];
  const { identity, body, money, people, spirit, plans, triggers, insights, today } = snap;

  lines.push(`TODAY: ${today.date} (${today.timeOfDay}, hour ${today.hour}).`);

  // Identity
  const idBits: string[] = [];
  if (identity.firstName) idBits.push(`name ${identity.firstName}`);
  if (identity.systemName) idBits.push(`system "${identity.systemName}"`);
  idBits.push(`coach mode ${identity.coachMode}`);
  if (identity.wellnessFocus.length)
    idBits.push(`focus ${identity.wellnessFocus.slice(0, 3).join("/")}`);
  if (identity.peakMotivationTime) idBits.push(`peak ${identity.peakMotivationTime}`);
  if (identity.fitnessGoal) idBits.push(`fitness goal ${identity.fitnessGoal}`);
  lines.push(`IDENTITY: ${idBits.join(" • ")}.`);

  // Body
  const bodyBits: string[] = [];
  if (body.currentMood) {
    bodyBits.push(
      `current energy ${body.currentMood.energyLevel}/5, mood ${body.currentMood.moodLevel}/5${
        body.currentMood.clarityLevel ? `, clarity ${body.currentMood.clarityLevel}/5` : ""
      }`,
    );
  }
  if (body.yesterday) {
    const y = body.yesterday;
    const yBits: string[] = [];
    if (y.sleepMinutes != null) yBits.push(`slept ${fmtMin(y.sleepMinutes)}`);
    if (y.hrv != null) yBits.push(`HRV ${y.hrv}`);
    if (y.restingHr != null) yBits.push(`RHR ${y.restingHr}`);
    if (y.steps != null) yBits.push(`${y.steps} steps`);
    if (y.screenTimeMinutes != null) yBits.push(`screen ${fmtMin(y.screenTimeMinutes)}`);
    if (yBits.length) bodyBits.push(`yesterday: ${yBits.join(", ")}`);
  }
  if (body.recentMoods.length > 1) {
    const avg = (k: "energy" | "mood") =>
      (
        body.recentMoods.reduce((s, m) => s + (m[k] ?? 0), 0) /
        body.recentMoods.length
      ).toFixed(1);
    bodyBits.push(`avg energy ${avg("energy")}/5, mood ${avg("mood")}/5 over ${body.recentMoods.length} logs`);
  }
  if (bodyBits.length) lines.push(`BODY: ${bodyBits.join("; ")}.`);

  // Money
  const moneyBits: string[] = [];
  if (money.netWorth != null) moneyBits.push(`net worth $${Math.round(money.netWorth).toLocaleString()}`);
  if (money.accountsCount > 0) moneyBits.push(`${money.accountsCount} linked account(s)`);
  if (money.monthlySpend != null)
    moneyBits.push(`MTD spend $${money.monthlySpend.toLocaleString()}${money.monthlyIncome ? `, income $${money.monthlyIncome.toLocaleString()}` : ""}`);
  if (money.monthlyDelta != null && money.netDirection)
    moneyBits.push(`net ${money.netDirection} (${money.monthlyDelta >= 0 ? "+" : ""}$${money.monthlyDelta.toLocaleString()})`);
  if (money.topBudget)
    moneyBits.push(`top budget ${money.topBudget.category} $${money.topBudget.monthlyLimit}/mo`);
  if (money.activeSavingsGoals.length) {
    moneyBits.push(
      `goals: ${money.activeSavingsGoals
        .map((g) => `${g.name} ${Math.round((g.current / Math.max(g.target, 1)) * 100)}%`)
        .join(", ")}`,
    );
  }
  if (moneyBits.length) lines.push(`MONEY: ${moneyBits.join("; ")}.`);

  // People
  const peopleBits: string[] = [];
  if (people.closeCount || people.drainingCount)
    peopleBits.push(`${people.closeCount} close, ${people.drainingCount} draining`);
  if (people.overdueContacts.length)
    peopleBits.push(
      `overdue: ${people.overdueContacts.map((p) => `${p.name} (${p.daysSinceContact}d)`).join(", ")}`,
    );
  if (people.upcomingBirthdays.length)
    peopleBits.push(
      `birthdays: ${people.upcomingBirthdays
        .map((b) => `${b.name} ${b.daysAway === 0 ? "today" : `in ${b.daysAway}d`}`)
        .join(", ")}`,
    );
  if (people.recentInteractions.length) {
    peopleBits.push(
      `recent: ${people.recentInteractions
        .slice(0, 3)
        .map((i) => `${i.name}/${i.kind}${i.energyAfter != null ? ` (e${i.energyAfter > 0 ? "+" : ""}${i.energyAfter})` : ""}`)
        .join(", ")}`,
    );
  }
  if (peopleBits.length) lines.push(`PEOPLE: ${peopleBits.join("; ")}.`);

  // Spirit
  const spiritBits: string[] = [];
  if (spirit.hasBirthChart) {
    const sig = [spirit.sunSign && `☉${spirit.sunSign}`, spirit.moonSign && `☾${spirit.moonSign}`, spirit.risingSign && `↑${spirit.risingSign}`]
      .filter(Boolean)
      .join(" ");
    spiritBits.push(`chart ${sig || "on file"}`);
  }
  if (spirit.cosmicConsent.useAstrologyInGuidance)
    spiritBits.push("astrology lens ON");
  if (spirit.cosmicConsent.useNumerologyInGuidance)
    spiritBits.push("numerology lens ON");
  if (spirit.wellnessPreferences?.beliefSystem)
    spiritBits.push(`belief: ${spirit.wellnessPreferences.beliefSystem}`);
  if (spirit.upcomingPredictions.length)
    spiritBits.push(`upcoming: ${spirit.upcomingPredictions.map((p) => p.title).join(", ")}`);
  if (spiritBits.length) lines.push(`SPIRIT: ${spiritBits.join("; ")}.`);

  // Role Map (Level Up)
  if (snap.roleMap) {
    const rm = snap.roleMap;
    const rmBits: string[] = [
      `becoming "${rm.targetRole}", level ${rm.currentLevel}/${rm.maxLevel}${rm.currentLevelTitle ? ` (${rm.currentLevelTitle})` : ""}`,
    ];
    if (rm.nextLevelTitle && rm.currentLevel < rm.maxLevel)
      rmBits.push(`next level: ${rm.nextLevelTitle}`);
    if (rm.nextMilestones.length)
      rmBits.push(`next milestones: ${rm.nextMilestones.join("; ")}`);
    lines.push(`ROLE MAP: ${rmBits.join(" • ")}.`);
  }

  // Plans
  const planBits: string[] = [];
  if (plans.activeGoals.length)
    planBits.push(
      `${plans.activeGoals.length} goal(s): ${plans.activeGoals
        .slice(0, 3)
        .map((g) => `${g.title} ${g.progress}%`)
        .join(", ")}`,
    );
  if (plans.activeHabits.length) {
    const done = plans.activeHabits.filter((h) => h.completedToday).length;
    planBits.push(
      `${plans.activeHabits.length} habit(s), ${done} done today: ${plans.activeHabits
        .slice(0, 4)
        .map((h) => `${h.title}${h.completedToday ? "✓" : ""} (${h.streak}d)`)
        .join(", ")}`,
    );
  }
  if (plans.todaySchedule.length) {
    planBits.push(
      `today: ${plans.todaySchedule
        .slice(0, 4)
        .map((b) => `${b.startTime} ${b.title}`)
        .join(", ")}`,
    );
  } else {
    planBits.push("no schedule blocks today");
  }
  if (plans.todayCalendarEvents.length)
    planBits.push(`calendar: ${plans.todayCalendarEvents.slice(0, 3).map((e) => e.title).join(", ")}`);
  if (plans.activeRoutines.length)
    planBits.push(`routines: ${plans.activeRoutines.map((r) => r.name).join(", ")}`);
  if (plans.activeProjects.length || plans.lifeSystemProjects.length) {
    const proj = [...plans.activeProjects, ...plans.lifeSystemProjects].slice(0, 3);
    planBits.push(`projects: ${proj.map((p) => p.name).join(", ")}`);
  }
  if (planBits.length) lines.push(`PLANS: ${planBits.join("; ")}.`);

  // Triggers
  if (triggers.last7Days > 0 || triggers.recent.length > 0) {
    const tBits: string[] = [];
    if (triggers.last7Days) tBits.push(`${triggers.last7Days} trigger event(s) in last 7d`);
    if (triggers.recent.length)
      tBits.push(
        `recent: ${triggers.recent
          .map((t) => `${t.feeling}${t.outcome ? `→${t.outcome}` : ""}`)
          .join(", ")}`,
      );
    lines.push(`TRIGGERS: ${tBits.join("; ")}.`);
  }

  // Insights
  if (insights.moodFactors.length || insights.recentJournal.length) {
    const iBits: string[] = [];
    if (insights.moodFactors.length) {
      iBits.push(
        `mood drivers (n=${insights.moodSampleSize}): ${insights.moodFactors
          .map((f) => `${f.label} ${f.impact > 0 ? "+" : ""}${f.impact}`)
          .join(", ")}`,
      );
    }
    if (insights.recentJournal.length) {
      iBits.push(
        `journal: ${insights.recentJournal
          .slice(0, 2)
          .map((j) => `"${j.content.slice(0, 80)}"`)
          .join(" | ")}`,
      );
    }
    lines.push(`INSIGHTS: ${iBits.join("; ")}.`);
  }

  // Imports — documents/preferences the user brought in; reference when relevant.
  if (snap.imports.length) {
    lines.push(
      `IMPORTS (user-provided documents & preferences — use these to personalize): ${snap.imports
        .map(
          (d) =>
            `${d.title}${d.category ? ` [${d.category}]` : ""}${
              d.summary ? `: ${d.summary.slice(0, 120)}` : ""
            }`,
        )
        .join(" | ")}.`,
    );
  }

  return lines.join("\n");
}
