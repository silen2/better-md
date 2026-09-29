import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FileSidebar } from "./FileSidebar";

const t = (key: string, values?: Record<string, string | number>) =>
  key === "已选 {count}/4" ? `已选 ${values?.count}/4` : key;

describe("FileSidebar", () => {
  it("forwards filter, history and collapse commands", () => {
    const onHistory = vi.fn();
    const onToggleKind = vi.fn();
    const onToggleCollapsed = vi.fn();
    render(
      <FileSidebar
        nodes={[]}
        expanded={new Set()}
        sidebarCollapsed={false}
        filtersOpen
        kinds={new Set(["md", "json"])}
        shownKinds={["md", "json"]}
        historyBackDisabled={false}
        historyForwardDisabled
        onHistory={onHistory}
        onFiltersOpen={vi.fn()}
        onToggleKind={onToggleKind}
        onLocate={vi.fn()}
        onToggleNode={vi.fn()}
        onOpen={vi.fn()}
        onToggleCollapsed={onToggleCollapsed}
        t={t}
      />,
    );
    fireEvent.click(screen.getByLabelText("后退到上一个打开的文件"));
    fireEvent.click(screen.getByLabelText("收纳文件栏"));
    fireEvent.click(screen.getByLabelText("JSON (.json)"));
    expect(onHistory).toHaveBeenCalledWith(-1);
    expect(onToggleCollapsed).toHaveBeenCalledOnce();
    expect(onToggleKind).toHaveBeenCalledWith("json");
    expect(screen.getByText("已选 2/4")).toBeInTheDocument();
  });
});
