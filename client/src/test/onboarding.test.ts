import { describe, it, expect, beforeEach } from "vitest";
import {
  getOnboardingRoute,
  getOnboardingRouteVersion,
  isOnboardingComplete,
  markOnboardingComplete,
} from "../lib/onboarding";

describe("onboarding completion helpers", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("reports onboarding as incomplete by default", () => {
    expect(isOnboardingComplete()).toBe(false);
  });

  it("markOnboardingComplete persists the completion flag", () => {
    markOnboardingComplete();
    expect(localStorage.getItem("dw_onboarding_completed")).toBe("1");
  });

  it("makes isOnboardingComplete return true after marking complete", () => {
    markOnboardingComplete();
    expect(isOnboardingComplete()).toBe(true);
  });

  it("recognizes a completed guest profile setup", () => {
    localStorage.setItem(
      "dw_guest_data",
      JSON.stringify({ profileSetup: { completedAt: Date.now() } }),
    );
    expect(isOnboardingComplete()).toBe(true);
  });

  it("routes new users to onboarding v2 entry when flag is enabled", () => {
    const version = getOnboardingRouteVersion(null, true);
    expect(version).toBe("v2");
    expect(getOnboardingRoute(version)).toBe("/voice-onboarding?v=2");
  });

  it("preserves existing onboarding route when v2 flag is disabled", () => {
    const version = getOnboardingRouteVersion(null, false);
    expect(version).toBe("v1");
    expect(getOnboardingRoute(version)).toBe("/voice-onboarding");
  });
});
