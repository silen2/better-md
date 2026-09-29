import { describe, expect, it } from "vitest";
import { canRecordShortcut, normaliseShortcut } from "./shortcuts";

describe("shortcut domain", () => {
  it("normalises modifier combinations consistently", () => {
    expect(normaliseShortcut({ key: "f", ctrlKey: true, shiftKey: true, altKey: false, metaKey: false }))
      .toBe("Ctrl+Shift+F");
    expect(normaliseShortcut({ key: "z", ctrlKey: false, shiftKey: false, altKey: false, metaKey: true }))
      .toBe("Ctrl+Z");
  });

  it("only records modifiers or function-key shortcuts", () => {
    expect(canRecordShortcut({ key: "a", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false })).toBe(false);
    expect(canRecordShortcut({ key: "F2", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false })).toBe(true);
    expect(canRecordShortcut({ key: "k", ctrlKey: true, shiftKey: false, altKey: false, metaKey: false })).toBe(true);
  });
});
