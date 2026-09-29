import { describe, expect, it } from "vitest";
import { createDocumentSession } from "./documentSession";

describe("createDocumentSession", () => {
  it("formats valid JSON and initializes its editing history", () => {
    const session = createDocumentSession(
      { extension: "json" },
      '{"name":"BetterMD"}',
      "split",
    );

    expect(session.content).toBe('{\n  "name": "BetterMD"\n}');
    expect(session.history).toEqual({ entries: [session.content], index: 0 });
    expect(session.viewMode).toBe("text");
  });

  it("preserves malformed JSON and applies Markdown/CSV defaults by type", () => {
    expect(
      createDocumentSession({ extension: "json" }, "{broken", "preview").content,
    ).toBe("{broken");
    expect(
      createDocumentSession({ extension: "md" }, "# Note", "preview").viewMode,
    ).toBe("preview");
    expect(
      createDocumentSession({ extension: "csv" }, "a,b", "split").csvDefaults,
    ).toEqual({ viewMode: "table", hasHeader: true });
  });
});
