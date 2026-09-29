import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SettingsNavigation } from "./SettingsNavigation";

const t = (key: string) => key;

describe("SettingsNavigation", () => {
  it("switches settings categories", () => {
    const onCategory = vi.fn();
    render(<SettingsNavigation category="general" textTypesOpen onCategory={onCategory} onToggleTextTypes={vi.fn()} t={t} />);
    fireEvent.click(screen.getByRole("button", { name: "外观" }));
    expect(onCategory).toHaveBeenCalledWith("appearance");
  });

  it("opens the markdown text-type category and toggles its menu", () => {
    const onCategory = vi.fn(); const onToggleTextTypes = vi.fn();
    render(<SettingsNavigation category="general" textTypesOpen={false} onCategory={onCategory} onToggleTextTypes={onToggleTextTypes} t={t} />);
    fireEvent.click(screen.getByRole("button", { name: /文本类型/ }));
    expect(onToggleTextTypes).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "Markdown" })).not.toBeInTheDocument();
  });
});
