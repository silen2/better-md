export type ShortcutInput = Pick<
  KeyboardEvent,
  "key" | "ctrlKey" | "metaKey" | "shiftKey" | "altKey"
>;

export function normaliseShortcut(input: ShortcutInput) {
  const parts: string[] = [];
  if (input.ctrlKey || input.metaKey) parts.push("Ctrl");
  if (input.shiftKey) parts.push("Shift");
  if (input.altKey) parts.push("Alt");
  const key = input.key.length === 1 ? input.key.toUpperCase() : input.key;
  if (!["Control", "Shift", "Alt", "Meta"].includes(key)) parts.push(key);
  return parts.join("+");
}

export function canRecordShortcut(input: ShortcutInput) {
  if (["Control", "Shift", "Alt", "Meta"].includes(input.key)) return false;
  const normalized = normaliseShortcut(input);
  return /^F\d{1,2}$/.test(normalized) || input.ctrlKey || input.metaKey || input.altKey;
}
