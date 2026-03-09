/**
 * interactive-tour-context.tsx
 *
 * Lightweight module containing only the tour context, provider, and hook.
 * Intentionally has NO heavy dependencies (no framer-motion, no icon libraries)
 * so it can be imported statically in App.tsx without bloating the initial bundle.
 *
 * The visual InteractiveTour component (which uses framer-motion and icons) lives
 * in interactive-tour.tsx and is lazy-loaded by App.tsx.
 */

import { useState, createContext, useContext } from "react";

export interface InteractiveTourContextValue {
  isOpen: boolean;
  hasCompletedTour: boolean;
  startTour: () => void;
  startTourIfPending: () => void;
  completeTour: () => void;
  skipTour: () => void;
  resetTour: () => void;
}

export const InteractiveTourContext = createContext<InteractiveTourContextValue | null>(null);

export function InteractiveTourProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasCompletedTour, setHasCompletedTour] = useState(() => {
    try {
      return localStorage.getItem("dw:tour_completed") === "true";
    } catch {
      return false;
    }
  });

  const startTour = () => setIsOpen(true);

  // Start the tour if a pending start request was stored in localStorage.
  // Wrapped in try/catch because localStorage can throw (storage disabled/quota).
  const startTourIfPending = () => {
    try {
      if (localStorage.getItem("dw:tour_pending_start") === "true") {
        localStorage.removeItem("dw:tour_pending_start");
        startTour();
      }
    } catch {
      // Storage unavailable — nothing to do
    }
  };

  const completeTour = () => {
    setIsOpen(false);
    setHasCompletedTour(true);
    try {
      localStorage.setItem("dw:tour_completed", "true");
    } catch {
      // Storage unavailable — state is still updated in memory
    }
  };

  const skipTour = () => setIsOpen(false);

  const resetTour = () => {
    setHasCompletedTour(false);
    try {
      localStorage.removeItem("dw:tour_completed");
    } catch {
      // Storage unavailable
    }
  };

  return (
    <InteractiveTourContext.Provider
      value={{ isOpen, hasCompletedTour, startTour, startTourIfPending, completeTour, skipTour, resetTour }}
    >
      {children}
    </InteractiveTourContext.Provider>
  );
}

/** Hook — must be used inside InteractiveTourProvider */
export function useInteractiveTour(): InteractiveTourContextValue {
  const ctx = useContext(InteractiveTourContext);
  if (!ctx) {
    throw new Error("useInteractiveTour must be used inside InteractiveTourProvider");
  }
  return ctx;
}
