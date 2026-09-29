import { describe, expect, it } from "vitest";
import { transformJson } from "./json";

describe("json domain", () => {
  it("formats and minifies valid JSON", () => {
    expect(transformJson('{"name":"BetterMD","items":[1,2]}', "format"))
      .toBe('{\n  "name": "BetterMD",\n  "items": [\n    1,\n    2\n  ]\n}');
    expect(transformJson('{ "name": "BetterMD" }', "minify"))
      .toBe('{"name":"BetterMD"}');
  });

  it("escapes and unescapes JSON text", () => {
    const source = 'line one\n"quoted"';
    const escaped = transformJson(source, "escape");
    expect(transformJson(escaped, "unescape")).toBe(source);
  });

  it("rejects invalid JSON during validation", () => {
    expect(() => transformJson("{invalid}", "validate")).toThrow();
  });
});
