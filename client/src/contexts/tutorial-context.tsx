import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { getTutorialForPage, type PageTutorial, type TutorialStep } from "@/config/tutorials";

const STORAGE_KEY = "fts_seen_tutorials";

interface TutorialState {
  isActive: boolean;
  currentPageId: string | null;
  currentStepIndex: number;
  tutorial: PageTutorial | null;
}

interface TutorialContextValue {
  state: TutorialState;
  startTutorial: (pageId: string, force?: boolean) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
  resetAllTutorials: () => void;
  hasSeenTutorial: (pageId: string) => boolean;
  currentStep: TutorialStep | null;
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
}

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TutorialState>({
    isActive: false,
    currentPageId: null,
    currentStepIndex: 0,
    tutorial: null
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
      tutorial
    });
  }, [hasSeenTutorial]);

  const completeTutorial = useCallback(() => {
    if (state.currentPageId) {
      markTutorialSeen(state.currentPageId);
    }
    setState({
      isActive: false,
      currentPageId: null,
      currentStepIndex: 0,
      tutorial: null
    });
  }, [state.currentPageId]);

  const skipTutorial = useCallback(() => {
    completeTutorial();
  }, [completeTutorial]);

  const nextStep = useCallback(() => {
    if (!state.tutorial) return;

    if (state.currentStepIndex >= state.tutorial.steps.length - 1) {
      completeTutorial();
    } else {
      setState(prev => ({
        ...prev,
        currentStepIndex: prev.currentStepIndex + 1
      }));
    }
  }, [state.tutorial, state.currentStepIndex, completeTutorial]);

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

  const currentStep = state.tutorial?.steps[state.currentStepIndex] || null;

  return (
    <TutorialContext.Provider
      value={{
        state,
        startTutorial,
        nextStep,
        prevStep,
        skipTutorial,
        completeTutorial,
        resetAllTutorials,
        hasSeenTutorial,
        currentStep
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
