import { FileText, Keyboard, Palette, SlidersHorizontal, Type } from "lucide-react";
import appIcon from "../assets/bettermd-icon.png";

export type SettingsCategory = "general" | "appearance" | "shortcuts" | "md";

type SettingsNavigationProps = {
  category: SettingsCategory;
  textTypesOpen: boolean;
  onCategory(category: SettingsCategory): void;
  onToggleTextTypes(): void;
  t(key: string): string;
};

export function SettingsNavigation({ category, textTypesOpen, onCategory, onToggleTextTypes, t }: SettingsNavigationProps) {
  const items = [
    { id: "general" as const, label: t("通用"), icon: SlidersHorizontal },
    { id: "appearance" as const, label: t("外观"), icon: Palette },
    { id: "shortcuts" as const, label: t("快捷键"), icon: Keyboard },
  ];
  return (
    <nav>
      <div className="settings-brand"><img src={appIcon} alt="" /> BetterMD</div>
      {items.map((item) => (
        <button key={item.id} className={category === item.id ? "active" : ""} onClick={() => onCategory(item.id)}>
          <span><item.icon size={14} strokeWidth={1.8} /></span>{item.label}
        </button>
      ))}
      <button className={`text-types-toggle ${category === "md" ? "active" : ""}`} onClick={onToggleTextTypes}>
        <span><Type size={14} strokeWidth={1.8} /></span>{t("文本类型")} <i>{textTypesOpen ? "⌄" : "›"}</i>
      </button>
      {textTypesOpen && (
        <div className="text-type-submenu">
          <button className={category === "md" ? "active" : ""} onClick={() => onCategory("md")}>
            <FileText size={13} /> Markdown
          </button>
        </div>
      )}
    </nav>
  );
}
