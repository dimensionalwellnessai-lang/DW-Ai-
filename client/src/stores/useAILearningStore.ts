import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FeatureUsage {
  [featureId: string]: number;
}

interface LastUsed {
  [featureId: string]: number; // timestamp
}

interface AILearningState {
  featureUsage: FeatureUsage;
  lastUsed: LastUsed;
  
  trackFeatureUse: (featureId: string) => void;
  getMostUsed: (limit?: number) => string[];
  getRecentlyUsed: (limit?: number) => string[];
  resetLearning: () => void;
}

export const useAILearningStore = create<AILearningState>()(
  persist(
    (set, get) => ({
      featureUsage: {},
      lastUsed: {},
      
      trackFeatureUse: (featureId: string) => {
        set((state) => ({
          featureUsage: {
            ...state.featureUsage,
            [featureId]: (state.featureUsage[featureId] || 0) + 1,
          },
          lastUsed: {
            ...state.lastUsed,
            [featureId]: Date.now(),
          },
        }));
      },
      
      getMostUsed: (limit = 4) => {
        const state = get();
        const entries = Object.entries(state.featureUsage);
        
        // Sort by usage count descending
        const sorted = entries.sort((a, b) => b[1] - a[1]);
        
        // Return top N feature IDs
        return sorted.slice(0, limit).map(([featureId]) => featureId);
      },
      
      getRecentlyUsed: (limit = 4) => {
        const state = get();
        const entries = Object.entries(state.lastUsed);
        
        // Sort by timestamp descending
        const sorted = entries.sort((a, b) => b[1] - a[1]);
        
        // Return top N feature IDs
        return sorted.slice(0, limit).map(([featureId]) => featureId);
      },
      
      resetLearning: () => {
        set({
          featureUsage: {},
          lastUsed: {},
        });
      },
    }),
    {
      name: 'dw-ai-learning-storage',
    }
  )
);
