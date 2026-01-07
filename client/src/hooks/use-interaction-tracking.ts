import { useCallback, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

interface TrackEventOptions {
  actionTarget?: string;
  actionValue?: string;
  metadata?: Record<string, unknown>;
}

export function useInteractionTracking() {
  const [location] = useLocation();
  const pageStartTime = useRef<number>(Date.now());
  const lastPage = useRef<string>(location);

  const trackEvent = useCallback(async (
    eventType: string,
    options?: TrackEventOptions
  ) => {
    try {
      await apiRequest("POST", "/api/interactions", {
        eventType,
        pagePath: location,
        actionTarget: options?.actionTarget,
        actionValue: options?.actionValue,
        metadata: options?.metadata,
      });
    } catch {
    }
  }, [location]);

  const trackPageView = useCallback(async (pagePath: string, durationMs?: number) => {
    try {
      await apiRequest("POST", "/api/interactions", {
        eventType: "page_view",
        pagePath,
        durationMs,
        metadata: {
          hour: new Date().getHours(),
          dayOfWeek: new Date().getDay(),
        },
      });
    } catch {
    }
  }, []);

  const trackClick = useCallback((target: string, value?: string) => {
    trackEvent("click", { actionTarget: target, actionValue: value });
  }, [trackEvent]);

  const trackFormSubmit = useCallback((formName: string, success: boolean) => {
    trackEvent("form_submit", { 
      actionTarget: formName, 
      actionValue: success ? "success" : "error" 
    });
  }, [trackEvent]);

  const trackFeatureUse = useCallback((featureName: string, details?: Record<string, unknown>) => {
    trackEvent("feature_use", { 
      actionTarget: featureName, 
      metadata: details 
    });
  }, [trackEvent]);

  useEffect(() => {
    if (lastPage.current !== location) {
      const duration = Date.now() - pageStartTime.current;
      if (duration > 1000) {
        trackPageView(lastPage.current, duration);
      }
      
      lastPage.current = location;
      pageStartTime.current = Date.now();
      
      trackPageView(location);
    }
  }, [location, trackPageView]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      const duration = Date.now() - pageStartTime.current;
      if (duration > 1000) {
        navigator.sendBeacon?.("/api/interactions", JSON.stringify({
          eventType: "page_view",
          pagePath: location,
          durationMs: duration,
        }));
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [location]);

  return {
    trackEvent,
    trackClick,
    trackFormSubmit,
    trackFeatureUse,
    trackPageView,
  };
}
