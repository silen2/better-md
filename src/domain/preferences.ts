import type { Locale, ViewMode } from "./types";

export type ShortcutSettings = { find: string; projectFind: string };
export type AppearanceSettings = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  theme: "ide-dark" | "dim-dark";
};
export type TextTypeSettings = { markdownView: ViewMode };

export const preferenceKeys = {
  shortcuts: "better-md.shortcuts",
  recentFolders: "better-md.recent-folders",
  appearance: "better-md.appearance",
  textTypes: "better-md.text-type-settings",
  locale: "better-md.locale",
} as const;

export const defaultShortcuts: ShortcutSettings = {
  find: "Ctrl+F",
  projectFind: "Ctrl+Shift+F",
};
export const defaultAppearance: AppearanceSettings = {
  fontFamily: "JetBrains Mono",
  fontSize: 13,
  lineHeight: 1.65,
  theme: "ide-dark",
};
export const defaultTextTypeSettings: TextTypeSettings = { markdownView: "split" };

export function readStoredRecord<T extends object>(serialized: string | null, defaults: T): T {
  if (!serialized) return { ...defaults };
  try {
    const value: unknown = JSON.parse(serialized);
    return value && typeof value === "object" && !Array.isArray(value)
      ? { ...defaults, ...(value as Partial<T>) }
      : { ...defaults };
  } catch {
    return { ...defaults };
  }
}

export function readStoredList(serialized: string | null) {
  try {
    const value: unknown = JSON.parse(serialized ?? "[]");
    return Array.isArray(value) && value.every((item) => typeof item === "string")
      ? value
      : [];
  } catch {
    return [];
  }
}

export function normalizeLocale(value: string | null): Locale {
  return value === "en-US" ? "en-US" : "zh-CN";
}

export function clampAppearance(
  appearance: AppearanceSettings,
  field: "fontSize" | "lineHeight",
  value: number,
): AppearanceSettings {
  const fallback = field === "fontSize" ? defaultAppearance.fontSize : defaultAppearance.lineHeight;
  const safeValue = Number.isFinite(value) ? value : fallback;
  return {
    ...appearance,
    [field]: field === "fontSize"
      ? Math.max(11, Math.min(24, safeValue))
      : Math.max(1.2, Math.min(2.4, safeValue)),
  };
}
