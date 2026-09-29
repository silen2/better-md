import { describe, expect, it } from "vitest";
import { findInText } from "./search";

describe("search domain", () => {
  it("finds all matching lines without case sensitivity", () => {
    expect(findInText("BetterMD\nother\nbettermd", "BETTER", "D:\\notes.txt"))
      .toEqual([
        { path: "D:\\notes.txt", line: 1, text: "BetterMD" },
        { path: "D:\\notes.txt", line: 3, text: "bettermd" },
      ]);
  });

  it("does not search for blank input", () => {
    expect(findInText("content", "   ")).toEqual([]);
  });
});
