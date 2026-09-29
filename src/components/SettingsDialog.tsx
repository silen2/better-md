import type { PropsWithChildren } from "react";
import type { Translator } from "../i18n";
import {
  SettingsNavigation,
  type SettingsCategory,
} from "./SettingsNavigation";

type SettingsDialogProps = PropsWithChildren<{
  category: SettingsCategory;
  textTypesOpen: boolean;
  onCategory: (category: SettingsCategory) => void;
  onToggleTextTypes: () => void;
  onClose: () => void;
  t: Translator;
}>;

function titleFor(category: SettingsCategory, t: Translator) {
  if (category === "general") return t("通用");
  if (category === "appearance") return t("外观");
  if (category === "shortcuts") return t("快捷键");
  return "Markdown";
}

export function SettingsDialog({
  category,
  textTypesOpen,
  onCategory,
  onToggleTextTypes,
  onClose,
  t,
  children,
}: SettingsDialogProps) {
  return (
    <div className="modal" role="presentation">
      <div className="settings-dialog" role="dialog" aria-modal="true">
        <SettingsNavigation
          category={category}
          textTypesOpen={textTypesOpen}
          onCategory={onCategory}
          onToggleTextTypes={onToggleTextTypes}
          t={t}
        />
        <div className="settings-content">
          <header>
            <div>
              <p className="eyebrow">{t("偏好设置")}</p>
              <h2>{titleFor(category, t)}</h2>
            </div>
            <button className="close-button" title={t("关闭设置")} onClick={onClose}>
              ×
            </button>
          </header>
          {children}
        </div>
      </div>
    </div>
  );
}
