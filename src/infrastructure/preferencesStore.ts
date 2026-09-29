import {
  normalizeLocale,
  readStoredList,
  readStoredRecord,
} from "../domain/preferences";
import type { Locale } from "../domain/types";

export function loadRecord<T extends object>(key: string, defaults: T): T {
  return readStoredRecord(window.localStorage.getItem(key), defaults);
}

export function loadStringList(key: string) {
  return readStoredList(window.localStorage.getItem(key));
}

export function loadLocale(key: string): Locale {
  return normalizeLocale(window.localStorage.getItem(key));
}

export function savePreference(key: string, value: unknown) {
  window.localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
}
