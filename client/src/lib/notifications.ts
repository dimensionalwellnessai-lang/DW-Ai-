/**
 * Notification management for accountability tracking
 * Handles permission requests, subscription, and notification scheduling
 */

export interface NotificationPermissionResult {
  granted: boolean;
  supported: boolean;
}

/**
 * Check if notifications are supported in the current environment
 */
export function isNotificationSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionResult> {
  if (!isNotificationSupported()) {
    return { granted: false, supported: false };
  }

  try {
    const permission = await Notification.requestPermission();
    return {
      granted: permission === 'granted',
      supported: true
    };
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return { granted: false, supported: true };
  }
}

/**
 * Show a local notification (not push)
 */
export async function showLocalNotification(
  title: string,
  options: NotificationOptions
): Promise<void> {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, options);
  } catch (error) {
    console.error('Error showing notification:', error);
  }
}

/**
 * Schedule a pre-task notification
 */
export async function schedulePreTaskNotification(
  taskId: string,
  taskName: string,
  scheduledTime: Date,
  minutesBefore: number = 15
): Promise<void> {
  const notificationTime = new Date(scheduledTime.getTime() - minutesBefore * 60 * 1000);
  const now = new Date();

  // Calculate delay in milliseconds
  const delay = notificationTime.getTime() - now.getTime();

  if (delay <= 0) {
    // Task is starting now or already started
    return;
  }

  // Store the notification scheduling info
  const scheduledNotification = {
    type: 'pre_task',
    taskId,
    taskName,
    scheduledTime: scheduledTime.toISOString(),
    notificationTime: notificationTime.toISOString(),
    delay
  };

  // Store in localStorage for persistence
  const scheduled = JSON.parse(localStorage.getItem('scheduled_notifications') || '[]');
  scheduled.push(scheduledNotification);
  localStorage.setItem('scheduled_notifications', JSON.stringify(scheduled));

  // Schedule the notification
  setTimeout(async () => {
    await showPreTaskNotification(taskId, taskName, scheduledTime);
  }, Math.min(delay, 2147483647)); // Max setTimeout value
}

/**
 * Show a pre-task notification asking if user will do the task
 */
async function showPreTaskNotification(
  taskId: string,
  taskName: string,
  scheduledTime: Date
): Promise<void> {
  const timeStr = scheduledTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  await showLocalNotification(
    `⏰ Coming Up: ${taskName}`,
    {
      body: `Scheduled for ${timeStr}. Will you be doing this?`,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `pre-task-${taskId}`,
      requireInteraction: true,
      data: {
        notificationType: 'pre_task',
        taskData: {
          taskId,
          taskName,
          scheduledTime: scheduledTime.toISOString()
        }
      },
      actions: [
        { action: 'commit_yes', title: '✅ Yes, I\'ll do it' },
        { action: 'remind_later', title: '⏰ Remind me later' },
        { action: 'skip', title: '❌ Skip this time' }
      ]
    }
  );
}

/**
 * Schedule a post-task confirmation notification
 */
export async function schedulePostTaskNotification(
  taskId: string,
  taskName: string,
  endTime: Date
): Promise<void> {
  const now = new Date();
  const delay = endTime.getTime() - now.getTime();

  if (delay <= 0) {
    // Task has already ended
    await showPostTaskNotification(taskId, taskName);
    return;
  }

  // Schedule the notification
  setTimeout(async () => {
    await showPostTaskNotification(taskId, taskName);
  }, Math.min(delay, 2147483647)); // Max setTimeout value
}

/**
 * Show a post-task notification asking if user completed the task
 */
async function showPostTaskNotification(
  taskId: string,
  taskName: string
): Promise<void> {
  await showLocalNotification(
    `${taskName} - Time's Up!`,
    {
      body: 'Did you complete this task?',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `post-task-${taskId}`,
      requireInteraction: true,
      data: {
        notificationType: 'post_task',
        taskData: {
          taskId,
          taskName
        }
      },
      actions: [
        { action: 'completed', title: '✅ Yes, I did it!' },
        { action: 'partial', title: '🔄 Partially' },
        { action: 'skipped', title: '❌ No, I didn\'t' }
      ]
    }
  );
}

/**
 * Show morning briefing notification
 */
export async function showMorningBriefing(taskCount: number): Promise<void> {
  await showLocalNotification(
    '📋 Your Day Ahead',
    {
      body: `You have ${taskCount} task${taskCount !== 1 ? 's' : ''} scheduled today.`,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'morning-briefing',
      data: {
        notificationType: 'morning_briefing',
        url: '/command-center'
      },
      actions: [
        { action: 'open', title: 'View & Commit' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    }
  );
}

/**
 * Show evening summary notification
 */
export async function showEveningSummary(
  completed: number,
  total: number,
  streak: number
): Promise<void> {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  await showLocalNotification(
    '📊 Today\'s Accountability',
    {
      body: `✅ Completed: ${completed}/${total} tasks (${percentage}%)\n🔥 Current streak: ${streak} days`,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'evening-summary',
      data: {
        notificationType: 'evening_summary',
        url: '/accountability'
      },
      actions: [
        { action: 'open', title: 'View Details' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    }
  );
}

/**
 * Clear all scheduled notifications
 */
export function clearScheduledNotifications(): void {
  localStorage.removeItem('scheduled_notifications');
}

/**
 * Get all scheduled notifications
 */
export function getScheduledNotifications(): any[] {
  return JSON.parse(localStorage.getItem('scheduled_notifications') || '[]');
}
