import { Folder } from "lucide-react";
import appIcon from "../assets/bettermd-icon.png";

type WelcomePageProps = {
  recentFolders: string[];
  onChooseFolder(): void;
  onOpenRecent(folder: string): void;
  onOpenSettings(): void;
  onClearRecent(): void;
  t(key: string): string;
};

function folderName(folder: string) {
  return folder.split(/[\\/]+/).filter(Boolean).at(-1) ?? folder;
}

export function WelcomePage({ recentFolders, onChooseFolder, onOpenRecent, onOpenSettings, onClearRecent, t }: WelcomePageProps) {
  return (
    <div className="welcome-page">
      <div className="welcome-card">
        <div className="app-mark"><img src={appIcon} alt="BetterMD" /></div>
        <p className="eyebrow">BETTERMD</p>
        <h1>{t("从一个文件夹开始")}</h1>
        <p className="welcome-copy">{t("阅读、编辑并对照预览本地的 Markdown、JSON、文本与 CSV 文件。")}</p>
        <div className="welcome-actions">
          <button className="primary-action" onClick={onChooseFolder}>⌘ {t("打开文件夹")}</button>
          <button onClick={onOpenSettings}>⚙ {t("偏好设置")}</button>
        </div>
      </div>
      <div className="recent-folders">
        <div className="recent-heading">
          <h2>{t("最近打开")}</h2>
          {recentFolders.length > 0 && <button className="text-button" onClick={onClearRecent}>{t("清除记录")}</button>}
        </div>
        {recentFolders.length ? (
          <div className="recent-list">
            {recentFolders.map((folder) => (
              <button key={folder} className="recent-item" onClick={() => onOpenRecent(folder)}>
                <span className="recent-icon"><Folder size={15} strokeWidth={1.8} /></span>
                <span><b>{folderName(folder)}</b><small>{folder}</small></span><i>›</i>
              </button>
            ))}
          </div>
        ) : <p className="no-recent">{t("尚未打开过文件夹。你的历史记录只保存在本机。")}</p>}
      </div>
    </div>
  );
}
