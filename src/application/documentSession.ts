import { createHistory, type HistoryState } from "../domain/history";
import type { FileNode, ViewMode } from "../domain/types";

export type CsvSessionDefaults = {
  viewMode: "table";
  hasHeader: true;
};

export type DocumentSession = {
  content: string;
  history: HistoryState<string>;
  viewMode: ViewMode;
  csvDefaults?: CsvSessionDefaults;
};

function normalizeJson(content: string) {
  try {
    return JSON.stringify(JSON.parse(content), null, 2);
  } catch {
    return content;
  }
}

export function createDocumentSession(
  node: Pick<FileNode, "extension">,
  source: string,
  markdownView: ViewMode,
): DocumentSession {
  const content = node.extension === "json" ? normalizeJson(source) : source;
  return {
    content,
    history: createHistory(content),
    viewMode: node.extension === "md" ? markdownView : "text",
    csvDefaults:
      node.extension === "csv" ? { viewMode: "table", hasHeader: true } : undefined,
  };
}
