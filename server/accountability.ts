/**
 * Accountability Service
 * Handles tracking of task commitments, completions, and statistics
 */

import { db } from "./db";
import { pool } from "./db";
import {
  taskAccountability,
  accountabilityStats,
  notificationPreferences,
  type InsertTaskAccountability,
  type TaskAccountability,
  type AccountabilityStats,
  type NotificationPreferences
} from "@shared/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

/**
 * Record a user's commitment response to a task
 */
export async function recordCommitment(
  userId: string,
  taskId: string | null,
  calendarEventId: string | null,
  taskName: string,
  scheduledTime: Date,
  scheduledEndTime: Date | null,
  commitmentResponse: 'yes' | 'remind_later' | 'skip'
): Promise<TaskAccountability> {
  // Check if record already exists
  const existing = await db
    .select()
    .from(taskAccountability)
    .where(
      and(
        eq(taskAccountability.userId, userId),
        taskId ? eq(taskAccountability.taskId, taskId) : undefined,
        calendarEventId ? eq(taskAccountability.calendarEventId, calendarEventId) : undefined
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Update existing record
    const [updated] = await db
      .update(taskAccountability)
      .set({
        committedAt: new Date(),
        commitmentResponse
      })
      .where(eq(taskAccountability.id, existing[0].id))
      .returning();
    return updated;
  }

  // Create new record
  const [record] = await db
    .insert(taskAccountability)
    .values({
      userId,
      taskId,
      calendarEventId,
      taskName,
      scheduledTime,
      scheduledEndTime,
      committedAt: new Date(),
      commitmentResponse
    })
    .returning();

  // Update stats if committed "yes"
  if (commitmentResponse === 'yes') {
    await incrementTasksCommitted(userId);
  }

  return record;
}

/**
 * Record a user's completion response to a task
 */
export async function recordCompletion(
  userId: string,
  taskId: string | null,
  calendarEventId: string | null,
  completionStatus: 'completed' | 'partial' | 'skipped' | 'no_response',
  reflectionNote?: string
): Promise<TaskAccountability | null> {
  // Find the accountability record
  const [existing] = await db
    .select()
    .from(taskAccountability)
    .where(
      and(
        eq(taskAccountability.userId, userId),
        taskId ? eq(taskAccountability.taskId, taskId) : undefined,
        calendarEventId ? eq(taskAccountability.calendarEventId, calendarEventId) : undefined
      )
    )
    .limit(1);

  if (!existing) {
    // No commitment record exists, create one with completion
    const [record] = await db
      .insert(taskAccountability)
      .values({
        userId,
        taskId,
        calendarEventId,
        taskName: 'Unknown Task',
        scheduledTime: new Date(),
        confirmedAt: new Date(),
        completionStatus,
        reflectionNote
      })
      .returning();
    
    // Update stats
    await updateStatsForCompletion(userId, completionStatus);
    return record;
  }

  // Update existing record
  const [updated] = await db
    .update(taskAccountability)
    .set({
      confirmedAt: new Date(),
      completionStatus,
      reflectionNote
    })
    .where(eq(taskAccountability.id, existing.id))
    .returning();

  // Update stats
  await updateStatsForCompletion(userId, completionStatus);

  return updated;
}

/**
 * Get user's accountability records for a date range
 */
export async function getAccountabilityRecords(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<TaskAccountability[]> {
  return await db
    .select()
    .from(taskAccountability)
    .where(
      and(
        eq(taskAccountability.userId, userId),
        gte(taskAccountability.scheduledTime, startDate),
        lte(taskAccountability.scheduledTime, endDate)
      )
    )
    .orderBy(desc(taskAccountability.scheduledTime));
}

/**
 * Get user's accountability stats
 */
export async function getAccountabilityStats(
  userId: string
): Promise<AccountabilityStats | null> {
  const [stats] = await db
    .select()
    .from(accountabilityStats)
    .where(eq(accountabilityStats.userId, userId))
    .limit(1);

  if (!stats) {
    // Create initial stats record
    const [newStats] = await db
      .insert(accountabilityStats)
      .values({
        userId,
        tasksCommitted: 0,
        tasksCompleted: 0,
        tasksPartial: 0,
        tasksSkipped: 0,
        followThroughRate: 0,
        currentStreak: 0,
        longestStreak: 0
      })
      .returning();
    return newStats;
  }

  return stats;
}

/**
 * Increment tasks committed count
 */
async function incrementTasksCommitted(userId: string): Promise<void> {
  // Get current stats
  const stats = await getAccountabilityStats(userId);
  if (!stats) return;

  // Increment count
  await db
    .update(accountabilityStats)
    .set({
      tasksCommitted: stats.tasksCommitted + 1,
      updatedAt: new Date()
    })
    .where(eq(accountabilityStats.userId, userId));
}

/**
 * Update stats based on completion status
 */
async function updateStatsForCompletion(
  userId: string,
  completionStatus: 'completed' | 'partial' | 'skipped' | 'no_response'
): Promise<void> {
  const stats = await getAccountabilityStats(userId);
  if (!stats) return;

  const updates: Partial<AccountabilityStats> = {
    updatedAt: new Date()
  };

  // Update counts based on status
  if (completionStatus === 'completed') {
    updates.tasksCompleted = stats.tasksCompleted + 1;
    updates.lastCompletedDate = new Date();
    
    // Update streak
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastCompleted = stats.lastCompletedDate ? new Date(stats.lastCompletedDate) : null;
    
    if (lastCompleted) {
      lastCompleted.setHours(0, 0, 0, 0);
      const daysSince = Math.floor((today.getTime() - lastCompleted.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSince === 0) {
        // Same day, maintain streak
        updates.currentStreak = stats.currentStreak;
      } else if (daysSince === 1) {
        // Consecutive day, increment streak
        updates.currentStreak = stats.currentStreak + 1;
        if (updates.currentStreak > stats.longestStreak) {
          updates.longestStreak = updates.currentStreak;
        }
      } else {
        // Broke streak
        updates.currentStreak = 1;
      }
    } else {
      // First completion
      updates.currentStreak = 1;
      updates.longestStreak = 1;
    }
  } else if (completionStatus === 'partial') {
    updates.tasksPartial = stats.tasksPartial + 1;
  } else if (completionStatus === 'skipped') {
    updates.tasksSkipped = stats.tasksSkipped + 1;
    // Skipped task resets streak
    updates.currentStreak = 0;
  }

  // Calculate follow-through rate
  const totalTasks = (updates.tasksCompleted || stats.tasksCompleted) + 
                     (updates.tasksPartial || stats.tasksPartial) + 
                     (updates.tasksSkipped || stats.tasksSkipped);
  
  if (totalTasks > 0) {
    const completed = updates.tasksCompleted || stats.tasksCompleted;
    const partial = updates.tasksPartial || stats.tasksPartial;
    updates.followThroughRate = ((completed + partial * 0.5) / totalTasks) * 100;
  }

  // Update database
  await db
    .update(accountabilityStats)
    .set(updates)
    .where(eq(accountabilityStats.userId, userId));
}

/**
 * Get or create notification preferences
 */
export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreferences> {
  const [prefs] = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);

  if (!prefs) {
    // Create default preferences
    const [newPrefs] = await db
      .insert(notificationPreferences)
      .values({
        userId,
        accountabilityEnabled: true,
        preTaskEnabled: true,
        postTaskEnabled: true,
        morningBriefingEnabled: true,
        eveningSummaryEnabled: true,
        preTaskMinutes: 15,
        morningBriefingTime: '08:00',
        eveningSummaryTime: '21:00',
        quietHoursEnabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00'
      })
      .returning();
    return newPrefs;
  }

  return prefs;
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  userId: string,
  updates: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const [updated] = await db
    .update(notificationPreferences)
    .set({
      ...updates,
      updatedAt: new Date()
    })
    .where(eq(notificationPreferences.userId, userId))
    .returning();

  return updated;
}

/**
 * Get today's accountability summary
 */
export async function getTodayAccountabilitySummary(
  userId: string
): Promise<{
  tasksScheduled: number;
  tasksCommitted: number;
  tasksCompleted: number;
  tasksPartial: number;
  tasksSkipped: number;
  followThroughRate: number;
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const records = await getAccountabilityRecords(userId, today, tomorrow);

  const summary = {
    tasksScheduled: records.length,
    tasksCommitted: records.filter(r => r.commitmentResponse === 'yes').length,
    tasksCompleted: records.filter(r => r.completionStatus === 'completed').length,
    tasksPartial: records.filter(r => r.completionStatus === 'partial').length,
    tasksSkipped: records.filter(r => r.completionStatus === 'skipped').length,
    followThroughRate: 0
  };

  const totalResponded = summary.tasksCompleted + summary.tasksPartial + summary.tasksSkipped;
  if (totalResponded > 0) {
    summary.followThroughRate = ((summary.tasksCompleted + summary.tasksPartial * 0.5) / totalResponded) * 100;
  }

  return summary;
}

/**
 * Generate weekly synopsis data
 */
export async function getWeeklySynopsis(
  userId: string
): Promise<{
  weekStart: Date;
  weekEnd: Date;
  totalTasks: number;
  committed: number;
  completed: number;
  partial: number;
  skipped: number;
  followThroughRate: number;
  currentStreak: number;
  longestStreak: number;
  bestDays: string[];
  patterns: string[];
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Get start of week (Monday)
  const weekStart = new Date(today);
  const dayOfWeek = weekStart.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust to Monday
  weekStart.setDate(weekStart.getDate() + diff);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const records = await getAccountabilityRecords(userId, weekStart, weekEnd);
  const stats = await getAccountabilityStats(userId);

  const completed = records.filter(r => r.completionStatus === 'completed').length;
  const partial = records.filter(r => r.completionStatus === 'partial').length;
  const skipped = records.filter(r => r.completionStatus === 'skipped').length;
  const committed = records.filter(r => r.commitmentResponse === 'yes').length;
  
  const totalResponded = completed + partial + skipped;
  const followThroughRate = totalResponded > 0 
    ? ((completed + partial * 0.5) / totalResponded) * 100 
    : 0;

  // Analyze patterns by day of week
  const dayStats: { [key: string]: { completed: number; total: number } } = {};
  records.forEach(record => {
    const dayName = record.scheduledTime.toLocaleDateString('en-US', { weekday: 'long' });
    if (!dayStats[dayName]) {
      dayStats[dayName] = { completed: 0, total: 0 };
    }
    dayStats[dayName].total++;
    if (record.completionStatus === 'completed') {
      dayStats[dayName].completed++;
    }
  });

  // Find best days
  const bestDays = Object.entries(dayStats)
    .sort(([, a], [, b]) => {
      const rateA = a.total > 0 ? a.completed / a.total : 0;
      const rateB = b.total > 0 ? b.completed / b.total : 0;
      return rateB - rateA;
    })
    .slice(0, 2)
    .map(([day]) => day);

  // Generate pattern insights
  const patterns: string[] = [];
  if (followThroughRate >= 75) {
    patterns.push('Strong consistency this week');
  }
  if (bestDays.length > 0) {
    patterns.push(`Most productive on ${bestDays.join(' and ')}`);
  }
  if (stats && stats.currentStreak >= 3) {
    patterns.push(`Building momentum with ${stats.currentStreak}-day streak`);
  }

  return {
    weekStart,
    weekEnd,
    totalTasks: records.length,
    committed,
    completed,
    partial,
    skipped,
    followThroughRate,
    currentStreak: stats?.currentStreak || 0,
    longestStreak: stats?.longestStreak || 0,
    bestDays,
    patterns
  };
}
