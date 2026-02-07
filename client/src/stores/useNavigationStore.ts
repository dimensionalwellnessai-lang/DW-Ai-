import { create } from 'zustand';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

interface NavigationState {
  currentPage: string;
  navigationHistory: string[];
  menuOpen: boolean;
  allFeaturesOpen: boolean;
  timeOfDay: TimeOfDay;
  
  setCurrentPage: (page: string) => void;
  toggleMenu: () => void;
  toggleAllFeatures: () => void;
  updateTimeOfDay: () => void;
  closeMenu: () => void;
  closeAllFeatures: () => void;
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
  currentPage: 'home',
  navigationHistory: [],
  menuOpen: false,
  allFeaturesOpen: false,
  timeOfDay: 'morning',
  
  setCurrentPage: (page: string) => {
    set((state) => ({
      currentPage: page,
      navigationHistory: [...state.navigationHistory, page].slice(-10), // Keep last 10
    }));
  },
  
  toggleMenu: () => set((state) => ({ menuOpen: !state.menuOpen })),
  
  toggleAllFeatures: () => set((state) => ({ allFeaturesOpen: !state.allFeaturesOpen })),
  
  closeMenu: () => set({ menuOpen: false }),
  
  closeAllFeatures: () => set({ allFeaturesOpen: false }),
  
  updateTimeOfDay: () => {
    const hour = new Date().getHours();
    let timeOfDay: TimeOfDay = 'morning';
    
    if (hour >= 11 && hour < 17) {
      timeOfDay = 'afternoon';
    } else if (hour >= 17 && hour < 22) {
      timeOfDay = 'evening';
    } else if (hour >= 22 || hour < 6) {
      timeOfDay = 'night';
    }
    
    set({ timeOfDay });
  },
}));
