import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EditorToolbar } from "./EditorToolbar";

const t = (key: string) => key;
const base = { currentPath: "D:\\data.json", isJson: false, isCsv: false, isMarkdown: false, viewMode: "split" as const, csvViewMode: "table" as const, csvHasHeader: true, modeLabels: { text: "纯文本", split: "对比预览", preview: "纯预览" }, onJsonAction: vi.fn(), onCsvViewMode: vi.fn(), onFormatCsv: vi.fn(), onToggleCsvHeader: vi.fn(), onAddCsvRow: vi.fn(), onDeleteCsvRows: vi.fn(), onMarkdownMode: vi.fn(), onSettings: vi.fn(), t };

describe("EditorToolbar", () => {
  it("dispatches JSON tools", () => {
    const onJsonAction = vi.fn(); render(<EditorToolbar {...base} isJson onJsonAction={onJsonAction} />);
    fireEvent.click(screen.getByRole("button", { name: "格式化" }));
    expect(onJsonAction).toHaveBeenCalledWith("format");
  });
  it("switches CSV and Markdown views", () => {
    const onCsvViewMode = vi.fn(); const onMarkdownMode = vi.fn();
    render(<EditorToolbar {...base} isCsv isMarkdown onCsvViewMode={onCsvViewMode} onMarkdownMode={onMarkdownMode} />);
    fireEvent.click(screen.getByRole("button", { name: "原始文本" })); fireEvent.click(screen.getByRole("button", { name: "纯预览" }));
    expect(onCsvViewMode).toHaveBeenCalledWith("text"); expect(onMarkdownMode).toHaveBeenCalledWith("preview");
  });
});
