import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { getTutorialForPage, NAVIGATION_TUTORIAL, type PageTutorial, type TutorialStep } from "@/config/tutorials";

const STORAGE_KEY = "fts_seen_tutorials";
const NAV_TUTORIAL_KEY = "fts_seen_nav_tutorial";

interface TutorialState {
  isActive: boolean;
  currentPageId: string | null;
  currentStepIndex: number;
  tutorial: PageTutorial | null;
  isNavigationTutorial: boolean;
  navigationSteps: TutorialStep[];
}

interface TutorialContextValue {
  state: TutorialState;
  startTutorial: (pageId: string, force?: boolean) => void;
  startNavigationTutorial: (force?: boolean) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
  resetAllTutorials: () => void;
  hasSeenTutorial: (pageId: string) => boolean;
  hasSeenNavigationTutorial: () => boolean;
  currentStep: TutorialStep | null;
  requiresMenuOpen: boolean;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

function getSeenTutorials(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function markTutorialSeen(pageId: string): void {
  const seen = getSeenTutorials();
  if (!seen.includes(pageId)) {
    seen.push(pageId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seen));
  }
}

function clearSeenTutorials(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(NAV_TUTORIAL_KEY);
}

function hasSeenNavTutorial(): boolean {
  return localStorage.getItem(NAV_TUTORIAL_KEY) === "true";
}

function markNavTutorialSeen(): void {
  localStorage.setItem(NAV_TUTORIAL_KEY, "true");
}

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TutorialState>({
    isActive: false,
    currentPageId: null,
    currentStepIndex: 0,
    tutorial: null,
    isNavigationTutorial: false,
    navigationSteps: []
  });

  const hasSeenTutorial = useCallback((pageId: string): boolean => {
    return getSeenTutorials().includes(pageId);
  }, []);

  const startTutorial = useCallback((pageId: string, force = false) => {
    if (!force && hasSeenTutorial(pageId)) {
      return;
    }

    const tutorial = getTutorialForPage(pageId);
    if (!tutorial || tutorial.steps.length === 0) {
      return;
    }

    setState({
      isActive: true,
      currentPageId: pageId,
      currentStepIndex: 0,
      tutorial,
      isNavigationTutorial: false,
      navigationSteps: []
    });
  }, [hasSeenTutorial]);

  const startNavigationTutorial = useCallback((force = false) => {
    if (!force && hasSeenNavTutorial()) {
      return;
    }

    setState({
      isActive: true,
      currentPageId: "navigation",
      currentStepIndex: 0,
      tutorial: null,
      isNavigationTutorial: true,
      navigationSteps: NAVIGATION_TUTORIAL
    });
  }, []);

  const hasSeenNavigationTutorial = useCallback((): boolean => {
    return hasSeenNavTutorial();
  }, []);

  const completeTutorial = useCallback(() => {
    if (state.isNavigationTutorial) {
      markNavTutorialSeen();
    } else if (state.currentPageId) {
      markTutorialSeen(state.currentPageId);
    }
    setState({
      isActive: false,
      currentPageId: null,
      currentStepIndex: 0,
      tutorial: null,
      isNavigationTutorial: false,
      navigationSteps: []
    });
  }, [state.currentPageId, state.isNavigationTutorial]);

  const skipTutorial = useCallback(() => {
    completeTutorial();
  }, [completeTutorial]);

  const nextStep = useCallback(() => {
    const steps = state.isNavigationTutorial ? state.navigationSteps : state.tutorial?.steps;
    if (!steps || steps.length === 0) return;

    if (state.currentStepIndex >= steps.length - 1) {
      completeTutorial();
    } else {
      setState(prev => ({
        ...prev,
        currentStepIndex: prev.currentStepIndex + 1
      }));
    }
  }, [state.tutorial, state.isNavigationTutorial, state.navigationSteps, state.currentStepIndex, completeTutorial]);

  const prevStep = useCallback(() => {
    if (state.currentStepIndex > 0) {
      setState(prev => ({
        ...prev,
        currentStepIndex: prev.currentStepIndex - 1
      }));
    }
  }, [state.currentStepIndex]);

  const resetAllTutorials = useCallback(() => {
    clearSeenTutorials();
  }, []);

  const currentStep = state.isNavigationTutorial
    ? state.navigationSteps[state.currentStepIndex] || null
    : state.tutorial?.steps[state.currentStepIndex] || null;
  
  const requiresMenuOpen = currentStep?.requiresMenuOpen || false;

  return (
    <TutorialContext.Provider
      value={{
        state,
        startTutorial,
        startNavigationTutorial,
        nextStep,
        prevStep,
        skipTutorial,
        completeTutorial,
        resetAllTutorials,
        hasSeenTutorial,
        hasSeenNavigationTutorial,
        currentStep,
        requiresMenuOpen
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error("useTutorial must be used within a TutorialProvider");
  }
  return context;
}

export function useTutorialStart(pageId: string, delay = 500) {
  const { startTutorial, hasSeenTutorial } = useTutorial();

  useEffect(() => {
    if (hasSeenTutorial(pageId)) return;

    const timer = setTimeout(() => {
      startTutorial(pageId);
    }, delay);

    return () => clearTimeout(timer);
  }, [pageId, startTutorial, hasSeenTutorial, delay]);
}
