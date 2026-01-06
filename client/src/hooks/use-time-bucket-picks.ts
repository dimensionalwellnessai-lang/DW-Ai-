import { useMemo, useState, useEffect } from "react";
import { 
  getTimeBucket, 
  getRotatedItems, 
  getTimeBucketLabel, 
  getNextRefreshTime,
  type TimeBucket 
} from "@/lib/time-buckets";

interface UseTimeBucketPicksOptions<T> {
  items: T[];
  category: string;
  userId?: string | null;
  count?: number;
  enabled?: boolean;
}

interface UseTimeBucketPicksResult<T> {
  picks: T[];
  bucket: TimeBucket;
  bucketLabel: string;
  nextRefresh: Date;
  timeUntilRefresh: string;
}

function formatTimeUntilRefresh(nextRefresh: Date): string {
  const now = new Date();
  const diff = nextRefresh.getTime() - now.getTime();
  
  if (diff <= 0) {
    return "Refreshing soon";
  }
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `Refreshes in ${hours}h ${minutes}m`;
  }
  return `Refreshes in ${minutes}m`;
}

export function useTimeBucketPicks<T>({
  items,
  category,
  userId,
  count = 3,
  enabled = true,
}: UseTimeBucketPicksOptions<T>): UseTimeBucketPicksResult<T> {
  const [now, setNow] = useState(() => new Date());
  
  useEffect(() => {
    if (!enabled) return;
    
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000);
    
    return () => clearInterval(interval);
  }, [enabled]);
  
  const bucket = useMemo(() => getTimeBucket(now), [now]);
  const bucketLabel = useMemo(() => getTimeBucketLabel(bucket), [bucket]);
  const nextRefresh = useMemo(() => getNextRefreshTime(), [now]);
  const timeUntilRefresh = useMemo(() => formatTimeUntilRefresh(nextRefresh), [nextRefresh, now]);
  
  const picks = useMemo(() => {
    if (!enabled || items.length === 0) {
      return [];
    }
    
    if (items.length <= count) {
      return items;
    }
    
    return getRotatedItems(items, category, bucket, userId, count);
  }, [items, category, userId, count, enabled, bucket]);
  
  return {
    picks,
    bucket,
    bucketLabel,
    nextRefresh,
    timeUntilRefresh,
  };
}
