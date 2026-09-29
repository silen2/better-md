import { describe, expect, it } from "vitest";
import { parseCsvTable, serializeCsv } from "./csv";

describe("csv domain", () => {
  it("parses quoted delimiters and preserves values when serialised", () => {
    const table = parseCsvTable('name,note\nAda,"hello, world"\n', true, "en-US");
    expect(table.headers).toEqual(["name", "note"]);
    expect(table.rows[0].column_1).toBe("hello, world");
    expect(serializeCsv(table)).toBe('name,note\r\nAda,"hello, world"');
  });

  it("creates localized column headers when a header row is absent", () => {
    expect(parseCsvTable("a,b", false, "zh-CN").headers).toEqual(["列 1", "列 2"]);
    expect(parseCsvTable("a,b", false, "en-US").headers).toEqual(["Column 1", "Column 2"]);
  });
});
