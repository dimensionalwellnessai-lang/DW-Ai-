import { describe, expect, it } from "vitest";

import {
  DW_SCAFFOLD,
  applyScaffold,
  buildScaffoldSystemPrompt,
  findScaffoldViolations,
} from "../personality/scaffold";

describe("personality scaffold", () => {
  it("exposes a versioned single source of truth", () => {
    expect(DW_SCAFFOLD.id).toBeTruthy();
    expect(DW_SCAFFOLD.name).toBeTruthy();
    // Semantic version so wording changes can be rolled out deliberately.
    expect(DW_SCAFFOLD.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(DW_SCAFFOLD.tone.length).toBeGreaterThan(0);
    expect(DW_SCAFFOLD.instructions.length).toBeGreaterThan(0);
    expect(DW_SCAFFOLD.forbiddenResponses.length).toBeGreaterThan(0);
  });

  it("builds a system prompt containing identity, tone and banned language", () => {
    const prompt = buildScaffoldSystemPrompt();
    expect(prompt).toContain(DW_SCAFFOLD.name);
    expect(prompt).toContain(DW_SCAFFOLD.version);
    expect(prompt).toContain(DW_SCAFFOLD.tone[0]);
    expect(prompt).toContain(DW_SCAFFOLD.forbiddenResponses[0]);
  });

  it("prepends the scaffold as a system message when none exists", () => {
    const messages = [{ role: "user" as const, content: "hi" }];
    const result = applyScaffold(messages);

    expect(result[0].role).toBe("system");
    expect(result[0].content).toContain(DW_SCAFFOLD.name);
    expect(result).toHaveLength(2);
    expect(result[1]).toEqual(messages[0]);
  });

  it("merges with an existing system message instead of duplicating it", () => {
    const messages = [
      { role: "system" as const, content: "Existing context." },
      { role: "user" as const, content: "hi" },
    ];
    const result = applyScaffold(messages);

    const systemMessages = result.filter((m) => m.role === "system");
    expect(systemMessages).toHaveLength(1);
    expect(result[0].content).toContain(DW_SCAFFOLD.name);
    expect(result[0].content).toContain("Existing context.");
  });

  it("does not duplicate scaffold content when applied multiple times", () => {
    const messages = [{ role: "user" as const, content: "hi" }];
    const once = applyScaffold(messages);
    const twice = applyScaffold(once);

    expect(twice).toEqual(once);
    expect(twice[0].content.match(/scaffold /g)).toHaveLength(1);
  });

  it("detects banned language case-insensitively", () => {
    expect(findScaffoldViolations("You should just fix this")).toEqual(
      expect.arrayContaining(["you should", "fix"]),
    );
    expect(findScaffoldViolations("This is a prefix check")).toEqual([]);
    expect(
      findScaffoldViolations("Let's pause and notice the pattern."),
    ).toHaveLength(0);
  });
});
