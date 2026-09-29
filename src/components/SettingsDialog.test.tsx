import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SettingsDialog } from "./SettingsDialog";

const t = (key: string) => key;

describe("SettingsDialog", () => {
  it("renders navigation, category title, content, and closes", () => {
    const onClose = vi.fn();
    render(
      <SettingsDialog
        category="appearance"
        textTypesOpen={false}
        onCategory={vi.fn()}
        onToggleTextTypes={vi.fn()}
        onClose={onClose}
        t={t}
      >
        <p>appearance content</p>
      </SettingsDialog>,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "外观" })).toBeInTheDocument();
    expect(screen.getByText("appearance content")).toBeInTheDocument();
    fireEvent.click(screen.getByTitle("关闭设置"));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
