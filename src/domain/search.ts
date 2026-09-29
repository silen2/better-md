import type { SearchMatch } from "./types";

export function findInText(content: string, query: string, path = ""): SearchMatch[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return [];
  return content.split(/\r?\n/).flatMap((text, index) =>
    text.toLocaleLowerCase().includes(normalizedQuery)
      ? [{ path, line: index + 1, text }]
      : [],
  );
}
