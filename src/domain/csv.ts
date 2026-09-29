import Papa from "papaparse";
import type { CsvGridRow, CsvTable, Locale } from "./types";

export function parseCsvTable(text: string, hasHeader: boolean, locale: Locale): CsvTable {
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: false });
  const sourceRows = parsed.data.map((row) => row.map((cell) => cell ?? ""));
  while (sourceRows.length && sourceRows.at(-1)?.every((cell) => !cell)) sourceRows.pop();
  const width = Math.max(1, ...sourceRows.map((row) => row.length));
  const firstRow = hasHeader ? sourceRows.shift() ?? [] : [];
  const keys = Array.from({ length: width }, (_, index) => `column_${index}`);
  const headers = keys.map(
    (_, index) =>
      firstRow[index]?.trim() ||
      (locale === "en-US" ? `Column ${index + 1}` : `列 ${index + 1}`),
  );
  const rows = sourceRows.map(
    (row, index) =>
      Object.fromEntries([
        ["__rowId", `row-${index}`],
        ...keys.map((key, column) => [key, row[column] ?? ""]),
      ]) as CsvGridRow,
  );
  return { keys, headers, rows, delimiter: parsed.meta.delimiter || "," };
}

export function serializeCsv(table: CsvTable, rows = table.rows, hasHeader = true) {
  const output = rows.map((row) => table.keys.map((key) => row[key] ?? ""));
  return Papa.unparse(hasHeader ? [table.headers, ...output] : output, {
    delimiter: table.delimiter,
  });
}
