/**
 * Accountability Scheduler
 * Manages scheduling of accountability notifications for tasks and calendar events
 */

import {
  schedulePreTaskNotification,
  schedulePostTaskNotification,
  getNotificationPermission
} from './notifications';
import type { Task, CalendarEvent } from '@shared/schema';

export interface SchedulableItem {
  id: string;
  title: string;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  startTime?: string | null;
  endTime?: string | null;
}

/**
 * Check if notifications are enabled and permitted
 */
export function canScheduleNotifications(): boolean {
  return getNotificationPermission() === 'granted';
}

/**
 * Parse time string to Date object
 */
function parseDateTime(dateTimeStr: string): Date | null {
  if (!dateTimeStr) return null;
  
  try {
    const date = new Date(dateTimeStr);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * Check if a date/time is in the quiet hours
 */
export function isInQuietHours(
  dateTime: Date,
  quietHoursEnabled: boolean,
  quietHoursStart: string = '22:00',
  quietHoursEnd: string = '08:00'
): boolean {
  if (!quietHoursEnabled) return false;

  const hour = dateTime.getHours();
  const minute = dateTime.getMinutes();
  const timeInMinutes = hour * 60 + minute;

  const [startHour, startMin] = quietHoursStart.split(':').map(Number);
  const [endHour, endMin] = quietHoursEnd.split(':').map(Number);
  
  const startInMinutes = startHour * 60 + startMin;
  const endInMinutes = endHour * 60 + endMin;

  if (startInMinutes < endInMinutes) {
    // Normal range (e.g., 14:00 - 18:00)
    return timeInMinutes >= startInMinutes && timeInMinutes < endInMinutes;
  } else {
    // Overnight range (e.g., 22:00 - 08:00)
    return timeInMinutes >= startInMinutes || timeInMinutes < endInMinutes;
  }
}

/**
 * Schedule accountability notifications for a task
 */
export async function scheduleTaskAccountability(
  task: Task,
  preTaskMinutes: number = 15,
  quietHoursEnabled: boolean = false,
  quietHoursStart?: string,
  quietHoursEnd?: string
): Promise<{ preTask: boolean; postTask: boolean }> {
  if (!canScheduleNotifications()) {
    return { preTask: false, postTask: false };
  }

  const result = { preTask: false, postTask: false };

  // Get start and end times
  const startTime = parseDateTime(task.scheduledStart || '');
  const endTime = parseDateTime(task.scheduledEnd || '');

  if (!startTime) {
    console.warn(`Task ${task.id} has no scheduled start time`);
    return result;
  }

  // Check if notification time would be in quiet hours
  const preTaskTime = new Date(startTime.getTime() - preTaskMinutes * 60 * 1000);
  if (!isInQuietHours(preTaskTime, quietHoursEnabled, quietHoursStart, quietHoursEnd)) {
    // Schedule pre-task notification
    try {
      await schedulePreTaskNotification(task.id, task.title, startTime, preTaskMinutes);
      result.preTask = true;
    } catch (error) {
      console.error('Error scheduling pre-task notification:', error);
    }
  }

  // Schedule post-task notification if end time exists
  if (endTime) {
    if (!isInQuietHours(endTime, quietHoursEnabled, quietHoursStart, quietHoursEnd)) {
      try {
        await schedulePostTaskNotification(task.id, task.title, endTime);
        result.postTask = true;
      } catch (error) {
        console.error('Error scheduling post-task notification:', error);
      }
    }
  }

  return result;
}

/**
 * Schedule accountability notifications for a calendar event
 */
export async function scheduleEventAccountability(
  event: CalendarEvent,
  preTaskMinutes: number = 15,
  quietHoursEnabled: boolean = false,
  quietHoursStart?: string,
  quietHoursEnd?: string
): Promise<{ preTask: boolean; postTask: boolean }> {
  if (!canScheduleNotifications()) {
    return { preTask: false, postTask: false };
  }

  const result = { preTask: false, postTask: false };

  // Get start and end times
  const startTime = parseDateTime(event.startTime);
  const endTime = parseDateTime(event.endTime);

  if (!startTime) {
    console.warn(`Event ${event.id} has no start time`);
    return result;
  }

  // Check if notification time would be in quiet hours
  const preTaskTime = new Date(startTime.getTime() - preTaskMinutes * 60 * 1000);
  if (!isInQuietHours(preTaskTime, quietHoursEnabled, quietHoursStart, quietHoursEnd)) {
    // Schedule pre-task notification
    try {
      await schedulePreTaskNotification(event.id, event.title, startTime, preTaskMinutes);
      result.preTask = true;
    } catch (error) {
      console.error('Error scheduling pre-event notification:', error);
    }
  }

  // Schedule post-task notification if end time exists
  if (endTime) {
    if (!isInQuietHours(endTime, quietHoursEnabled, quietHoursStart, quietHoursEnd)) {
      try {
        await schedulePostTaskNotification(event.id, event.title, endTime);
        result.postTask = true;
      } catch (error) {
        console.error('Error scheduling post-event notification:', error);
      }
    }
  }

  return result;
}

/**
 * Schedule accountability for all today's tasks
 */
export async function scheduleTodayAccountability(
  tasks: Task[],
  events: CalendarEvent[],
  preTaskMinutes: number = 15,
  quietHoursEnabled: boolean = false,
  quietHoursStart?: string,
  quietHoursEnd?: string
): Promise<{ scheduled: number; skipped: number }> {
  let scheduled = 0;
  let skipped = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Schedule for tasks
  for (const task of tasks) {
    if (!task.scheduledStart) continue;
    
    const startTime = parseDateTime(task.scheduledStart);
    if (!startTime) continue;
    
    // Only schedule for today's tasks
    if (startTime >= today && startTime < tomorrow) {
      const result = await scheduleTaskAccountability(
        task,
        preTaskMinutes,
        quietHoursEnabled,
        quietHoursStart,
        quietHoursEnd
      );
      if (result.preTask || result.postTask) {
        scheduled++;
      } else {
        skipped++;
      }
    }
  }

  // Schedule for events
  for (const event of events) {
    const startTime = parseDateTime(event.startTime);
    if (!startTime) continue;
    
    // Only schedule for today's events
    if (startTime >= today && startTime < tomorrow) {
      const result = await scheduleEventAccountability(
        event,
        preTaskMinutes,
        quietHoursEnabled,
        quietHoursStart,
        quietHoursEnd
      );
      if (result.preTask || result.postTask) {
        scheduled++;
      } else {
        skipped++;
      }
    }
  }

  return { scheduled, skipped };
}

/**
 * Get items schedulable for today
 */
export function getTodaySchedulableItems(
  tasks: Task[],
  events: CalendarEvent[]
): SchedulableItem[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const items: SchedulableItem[] = [];

  // Add tasks
  for (const task of tasks) {
    if (!task.scheduledStart) continue;
    const startTime = parseDateTime(task.scheduledStart);
    if (startTime && startTime >= today && startTime < tomorrow) {
      items.push({
        id: task.id,
        title: task.title,
        scheduledStart: task.scheduledStart,
        scheduledEnd: task.scheduledEnd
      });
    }
  }

  // Add events
  for (const event of events) {
    const startTime = parseDateTime(event.startTime);
    if (startTime && startTime >= today && startTime < tomorrow) {
      items.push({
        id: event.id,
        title: event.title,
        startTime: event.startTime,
        endTime: event.endTime
      });
    }
  }

  // Sort by start time
  items.sort((a, b) => {
    const aTime = parseDateTime(a.scheduledStart || a.startTime || '');
    const bTime = parseDateTime(b.scheduledStart || b.startTime || '');
    if (!aTime || !bTime) return 0;
    return aTime.getTime() - bTime.getTime();
  });

  return items;
}
