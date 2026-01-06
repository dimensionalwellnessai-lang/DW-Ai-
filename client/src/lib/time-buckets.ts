export type TimeBucket = 'morning' | 'afternoon' | 'evening';

export function getTimeBucket(date: Date = new Date()): TimeBucket {
  const hour = date.getHours();
  
  if (hour >= 5 && hour < 12) {
    return 'morning';
  } else if (hour >= 12 && hour < 18) {
    return 'afternoon';
  } else {
    return 'evening';
  }
}

export function getTimeBucketKey(category: string, userId?: string | null): string {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0];
  const bucket = getTimeBucket(date);
  const userPart = userId || 'guest';
  return `${category}_${dateStr}_${bucket}_${userPart}`;
}

export function seededShuffle<T>(array: T[], seed: string): T[] {
  const shuffled = [...array];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash & hash;
  }
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    hash = ((hash << 5) - hash) + i;
    hash = hash & hash;
    const j = Math.abs(hash) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

export function getRotatedItems<T>(items: T[], category: string, userId?: string | null, count: number = 3): T[] {
  const bucketKey = getTimeBucketKey(category, userId);
  const shuffled = seededShuffle(items, bucketKey);
  return shuffled.slice(0, count);
}

export function getTimeBucketLabel(bucket: TimeBucket): string {
  switch (bucket) {
    case 'morning':
      return 'Morning Picks';
    case 'afternoon':
      return 'Afternoon Picks';
    case 'evening':
      return 'Evening Picks';
  }
}

export function getNextRefreshTime(): Date {
  const now = new Date();
  const hour = now.getHours();
  const nextRefresh = new Date(now);
  
  if (hour < 5) {
    nextRefresh.setHours(5, 0, 0, 0);
  } else if (hour < 12) {
    nextRefresh.setHours(12, 0, 0, 0);
  } else if (hour < 18) {
    nextRefresh.setHours(18, 0, 0, 0);
  } else {
    nextRefresh.setDate(nextRefresh.getDate() + 1);
    nextRefresh.setHours(5, 0, 0, 0);
  }
  
  return nextRefresh;
}
