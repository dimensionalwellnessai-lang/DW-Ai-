import { describe, it, expect, beforeEach } from "vitest";
import { isOnboardingComplete, markOnboardingComplete } from "../lib/onboarding";

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

  it("recognises a completed guest profile setup", () => {
    localStorage.setItem(
      "dw_guest_data",
      JSON.stringify({ profileSetup: { completedAt: Date.now() } }),
    );
    expect(isOnboardingComplete()).toBe(true);
  });
});
