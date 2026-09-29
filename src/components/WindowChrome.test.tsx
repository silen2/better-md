import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../infrastructure/tauri", () => ({
  isDesktopRuntime: () => false,
  currentDesktopWindow: vi.fn(),
}));

import { WindowChrome } from "./WindowChrome";

const t = (key: string) => key;

describe("WindowChrome", () => {
  it("opens the main menu and settings through its callbacks", () => {
    const onMenu = vi.fn();
    const onSettings = vi.fn();
    render(<WindowChrome menuOpen={false} onMenu={onMenu} onSettings={onSettings} t={t} />);
    fireEvent.click(screen.getByRole("button", { name: "主菜单" }));
    fireEvent.click(screen.getByRole("button", { name: "设置" }));
    expect(onMenu).toHaveBeenCalledOnce();
    expect(onSettings).toHaveBeenCalledOnce();
  });
});
