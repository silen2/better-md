import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FileTree } from "./FileTree";

const nodes = [{
  name: "docs",
  path: "D:\\docs",
  is_dir: true,
  children: [{ name: "readme.md", path: "D:\\docs\\readme.md", is_dir: false, extension: "md" as const }],
}];

describe("FileTree", () => {
  it("reveals children when a folder is expanded", () => {
    const onToggle = vi.fn();
    const { rerender } = render(<FileTree nodes={nodes} expanded={new Set()} onToggle={onToggle} onOpen={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /docs/ }));
    expect(onToggle).toHaveBeenCalledWith("D:\\docs");
    rerender(<FileTree nodes={nodes} expanded={new Set(["D:\\docs"])} onToggle={onToggle} onOpen={vi.fn()} />);
    expect(screen.getByRole("button", { name: /readme\.md/ })).toBeInTheDocument();
  });

  it("opens a file and marks the active file", () => {
    const onOpen = vi.fn();
    render(<FileTree nodes={nodes} expanded={new Set([nodes[0].path])} onToggle={vi.fn()} onOpen={onOpen} activePath={nodes[0].children?.[0]?.path} />);
    const file = screen.getByRole("button", { name: /readme\.md/ });
    fireEvent.click(file);
    expect(onOpen).toHaveBeenCalledWith(nodes[0].children?.[0]);
    expect(file).toHaveClass("active");
  });
});
