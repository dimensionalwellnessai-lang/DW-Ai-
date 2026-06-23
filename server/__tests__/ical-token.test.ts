import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../storage", () => ({
  storage: {},
}));

import { makeIcalToken, verifyIcalToken } from "../routes/_shared";

const originalSessionSecret = process.env.SESSION_SECRET;

afterEach(() => {
  if (originalSessionSecret === undefined) {
    delete process.env.SESSION_SECRET;
  } else {
    process.env.SESSION_SECRET = originalSessionSecret;
  }
});

describe("iCal token helpers", () => {
  it("round-trips a signed token when SESSION_SECRET is set", () => {
    process.env.SESSION_SECRET = "test-session-secret";

    const token = makeIcalToken("user-123");

    expect(verifyIcalToken(token)).toBe("user-123");
  });

  it("throws when signing without SESSION_SECRET", () => {
    delete process.env.SESSION_SECRET;

    expect(() => makeIcalToken("user-123")).toThrow(
      "SESSION_SECRET is required for iCal token signing",
    );
  });

  it("throws when verifying without SESSION_SECRET", () => {
    delete process.env.SESSION_SECRET;

    expect(() => verifyIcalToken("invalid.token")).toThrow(
      "SESSION_SECRET is required for iCal token verification",
    );
  });

  it("rejects a tampered token", () => {
    process.env.SESSION_SECRET = "test-session-secret";
    const token = makeIcalToken("user-123");
    const [payload] = token.split(".");

    expect(verifyIcalToken(`${payload}.tampered`)).toBeNull();
  });
});
