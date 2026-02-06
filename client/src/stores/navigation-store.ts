import { create } from 'zustand';

interface NavigationStore {
  currentPath: string;
  previousPath: string | null;
  history: string[];
  setCurrentPath: (path: string) => void;
  goBack: () => string | null;
  clearHistory: () => void;
}

export const useNavigationStore = create<NavigationStore>((set, get) => ({
  currentPath: '/',
  previousPath: null,
  history: [],

  setCurrentPath: (path) =>
    set((state) => ({
      currentPath: path,
      previousPath: state.currentPath,
      history: [...state.history, path].slice(-50), // Keep last 50 entries
    })),

  goBack: () => {
    const { history, previousPath } = get();
    if (history.length > 1) {
      const newHistory = history.slice(0, -1);
      const newCurrent = newHistory[newHistory.length - 1];
      set({
        currentPath: newCurrent,
        previousPath: history[history.length - 2] || null,
        history: newHistory,
      });
      return newCurrent;
    }
    return previousPath;
  },

  clearHistory: () =>
    set({
      history: [],
      previousPath: null,
    }),
}));
