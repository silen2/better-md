import { afterEach, describe, expect, it } from "vitest";
import {
  loadLocale,
  loadRecord,
  loadStringList,
  savePreference,
} from "./preferencesStore";

afterEach(() => window.localStorage.clear());

describe("preferencesStore", () => {
  it("serializes preferences and restores domain-safe values", () => {
    savePreference("appearance", { fontSize: 16 });
    expect(loadRecord("appearance", { fontSize: 13, fontFamily: "Mono" })).toEqual({
      fontSize: 16,
      fontFamily: "Mono",
    });
  });

  it("reads locale and lists safely from browser storage", () => {
    savePreference("locale", "en-US");
    savePreference("folders", ["D:/notes"]);
    expect(loadLocale("locale")).toBe("en-US");
    expect(loadStringList("folders")).toEqual(["D:/notes"]);
    expect(loadLocale("unknown")).toBe("zh-CN");
  });
});
