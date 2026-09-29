import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WelcomePage } from "./WelcomePage";

const t = (key: string) => key;

describe("WelcomePage", () => {
  it("offers folder and settings entry points", () => {
    const onChooseFolder = vi.fn(); const onOpenSettings = vi.fn();
    render(<WelcomePage recentFolders={[]} onChooseFolder={onChooseFolder} onOpenRecent={vi.fn()} onOpenSettings={onOpenSettings} onClearRecent={vi.fn()} t={t} />);
    fireEvent.click(screen.getByRole("button", { name: /打开文件夹/ }));
    fireEvent.click(screen.getByRole("button", { name: /偏好设置/ }));
    expect(onChooseFolder).toHaveBeenCalledOnce(); expect(onOpenSettings).toHaveBeenCalledOnce();
  });

  it("opens and clears recent folders", () => {
    const onOpenRecent = vi.fn(); const onClearRecent = vi.fn();
    render(<WelcomePage recentFolders={["D:\\docs"]} onChooseFolder={vi.fn()} onOpenRecent={onOpenRecent} onOpenSettings={vi.fn()} onClearRecent={onClearRecent} t={t} />);
    fireEvent.click(screen.getByRole("button", { name: /docs/ }));
    fireEvent.click(screen.getByRole("button", { name: "清除记录" }));
    expect(onOpenRecent).toHaveBeenCalledWith("D:\\docs"); expect(onClearRecent).toHaveBeenCalledOnce();
  });
});
