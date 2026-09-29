import { describe, expect, it } from "vitest";
import { appendHistory, createHistory, currentHistoryValue, moveHistory } from "./history";

describe("history domain", () => {
  it("adds edits and removes redo entries after a new branch", () => {
    let history = createHistory("first");
    history = appendHistory(history, "second", 200);
    history = appendHistory(history, "third", 200);
    history = moveHistory(history, -1);
    history = appendHistory(history, "replacement", 200);
    expect(history).toEqual({ entries: ["first", "second", "replacement"], index: 2 });
  });

  it("keeps navigation inside valid bounds", () => {
    const history = createHistory("only");
    expect(moveHistory(history, -1)).toEqual(history);
    expect(moveHistory(history, 1)).toEqual(history);
  });

  it("honours history limits and returns the current value", () => {
    let history = createHistory("one");
    history = appendHistory(history, "two", 2);
    history = appendHistory(history, "three", 2);
    expect(history).toEqual({ entries: ["two", "three"], index: 1 });
    expect(currentHistoryValue(history)).toBe("three");
  });
});
