import { describe, expect, it } from "vitest";

import { studioShortcut } from "@/components/studio/studio-shortcuts";

describe("advertised Studio shortcuts", () => {
  it.each([
    ["p", "pencil"],
    ["f", "fill"],
    ["i", "eyedropper"],
    ["e", "restore"],
  ])("switches %s to its paint tool", (key, tool) => {
    expect(studioShortcut({ key })).toEqual({ kind: "paint", tool });
    expect(studioShortcut({ key: key.toUpperCase() })).toEqual({
      kind: "paint",
      tool,
    });
  });

  it("selects regions with S", () => {
    expect(studioShortcut({ key: "s" })).toEqual({ kind: "select" });
  });

  it("supports undo and redo on both platforms", () => {
    expect(studioShortcut({ key: "z", metaKey: true })).toEqual({
      kind: "undo",
    });
    expect(studioShortcut({ key: "Z", ctrlKey: true, shiftKey: true })).toEqual(
      { kind: "redo" },
    );
  });

  it("does not intercept browser shortcuts or unrelated keys", () => {
    expect(studioShortcut({ key: "p", metaKey: true })).toBeNull();
    expect(studioShortcut({ key: "f", ctrlKey: true })).toBeNull();
    expect(studioShortcut({ key: "s", altKey: true })).toBeNull();
    expect(studioShortcut({ key: "q" })).toBeNull();
  });
});
