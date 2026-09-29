import { Menu, Settings } from "lucide-react";
import appIcon from "../assets/bettermd-icon.png";
import { currentDesktopWindow, isDesktopRuntime } from "../infrastructure/tauri";

type WindowChromeProps = {
  menuOpen: boolean;
  onMenu(): void;
  onSettings(): void;
  t(key: string): string;
};

export function WindowChrome({ menuOpen, onMenu, onSettings, t }: WindowChromeProps) {
  const control = async (action: "minimize" | "maximize" | "close") => {
    if (!isDesktopRuntime()) return;
    const appWindow = currentDesktopWindow();
    if (action === "minimize") await appWindow.minimize();
    if (action === "maximize") await appWindow.toggleMaximize();
    if (action === "close") await appWindow.close();
  };

  return (
    <div className="window-chrome">
      <div className="chrome-brand"><img src={appIcon} alt="BetterMD" /></div>
      <button className={`chrome-menu ${menuOpen ? "active" : ""}`} title={t("主菜单")} aria-label={t("主菜单")} aria-expanded={menuOpen} onClick={onMenu}>
        <Menu size={20} strokeWidth={2} />
      </button>
      <div className="window-drag" data-tauri-drag-region onMouseDown={(event) => {
        if (event.button === 0 && isDesktopRuntime()) void currentDesktopWindow().startDragging();
      }}>
        <span className="chrome-project">BetterMD</span><span className="chrome-chevron">⌄</span>
      </div>
      <div className="window-controls">
        <button className="chrome-settings" title={t("设置")} aria-label={t("设置")} onClick={onSettings}><Settings size={15} strokeWidth={1.8} /></button>
        <button title={t("最小化")} aria-label={t("最小化")} onClick={() => void control("minimize")}>−</button>
        <button title={t("最大化或还原")} aria-label={t("最大化或还原")} onClick={() => void control("maximize")}>□</button>
        <button className="close-window" title={t("关闭窗口")} aria-label={t("关闭窗口")} onClick={() => void control("close")}>×</button>
      </div>
    </div>
  );
}
