/**
 * Utility for tracking recently visited pages in localStorage
 */

const STORAGE_KEY = 'dw_recent_pages';
const MAX_RECENT_PAGES = 5;

export interface RecentPage {
  id: string;
  name: string;
  path: string;
  icon?: string;
  timestamp: number;
}

/**
 * Get recent pages from localStorage
 */
export function getRecentPages(): RecentPage[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error reading recent pages:', error);
    return [];
  }
}

/**
 * Add a page to recent pages
 */
export function addRecentPage(page: Omit<RecentPage, 'timestamp'>): void {
  try {
    const recent = getRecentPages();
    
    // Remove if already exists (to update position)
    const filtered = recent.filter(p => p.path !== page.path);
    
    // Add to front
    const updated: RecentPage[] = [
      { ...page, timestamp: Date.now() },
      ...filtered
    ].slice(0, MAX_RECENT_PAGES);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving recent page:', error);
  }
}

/**
 * Clear recent pages
 */
export function clearRecentPages(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing recent pages:', error);
  }
}

/**
 * Hook to track page visits automatically
 */
export function usePageTracking(pageInfo: Omit<RecentPage, 'timestamp'>) {
  // Track on mount, but exclude command center and common pages from tracking
  const shouldTrack = ![
    '/',
    '/login',
    '/signup',
  ].includes(pageInfo.path);

  if (shouldTrack && typeof window !== 'undefined') {
    // Add slight delay to avoid tracking bounces
    const timer = setTimeout(() => {
      addRecentPage(pageInfo);
    }, 2000);
    
    return () => clearTimeout(timer);
  }
}
