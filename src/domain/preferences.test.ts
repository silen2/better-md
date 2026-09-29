import { describe, expect, it } from "vitest";
import {
  clampAppearance,
  defaultAppearance,
  defaultShortcuts,
  normalizeLocale,
  readStoredList,
  readStoredRecord,
} from "./preferences";

describe("preferences domain", () => {
  it("merges valid saved values and recovers from malformed storage", () => {
    expect(readStoredRecord('{"find":"Alt+F"}', defaultShortcuts))
      .toEqual({ find: "Alt+F", projectFind: "Ctrl+Shift+F" });
    expect(readStoredRecord("{broken", defaultShortcuts)).toEqual(defaultShortcuts);
  });

  it("accepts only string lists from storage", () => {
    expect(readStoredList('["D:\\\\docs", "D:\\\\notes"]')).toHaveLength(2);
    expect(readStoredList('["D:\\\\docs", 3]')).toEqual([]);
  });

  it("normalizes locale and constrains appearance values", () => {
    expect(normalizeLocale("en-US")).toBe("en-US");
    expect(normalizeLocale("other")).toBe("zh-CN");
    expect(clampAppearance(defaultAppearance, "fontSize", 99).fontSize).toBe(24);
    expect(clampAppearance(defaultAppearance, "lineHeight", 0).lineHeight).toBe(1.2);
  });
});
