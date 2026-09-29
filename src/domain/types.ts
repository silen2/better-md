export type FileKind = "md" | "json" | "text" | "csv";
export type ViewMode = "text" | "split" | "preview";
export type Locale = "zh-CN" | "en-US";

export type FileNode = {
  name: string;
  path: string;
  is_dir: boolean;
  extension?: FileKind;
  children?: FileNode[];
};

export type SearchMatch = { path: string; line: number; text: string };

export type CsvGridRow = Record<string, string> & { __rowId: string };
export type CsvTable = {
  keys: string[];
  headers: string[];
  rows: CsvGridRow[];
  delimiter: string;
};
