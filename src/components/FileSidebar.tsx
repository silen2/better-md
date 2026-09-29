import {
  ChevronLeft,
  ChevronRight,
  ListFilter,
  LocateFixed,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import type { FileNode, FileKind } from "../domain/types";
import type { Translator } from "../i18n";
import { FileTree } from "./FileTree";

type FileSidebarProps = {
  nodes: FileNode[];
  expanded: Set<string>;
  activePath?: string;
  sidebarCollapsed: boolean;
  filtersOpen: boolean;
  kinds: Set<FileKind>;
  shownKinds: FileKind[];
  historyBackDisabled: boolean;
  historyForwardDisabled: boolean;
  onHistory: (direction: -1 | 1) => void;
  onFiltersOpen: () => void;
  onToggleKind: (kind: FileKind) => void;
  onLocate: () => void;
  onToggleNode: (path: string) => void;
  onOpen: (node: FileNode) => void;
  onToggleCollapsed: () => void;
  t: Translator;
};

const kinds: FileKind[] = ["md", "json", "text", "csv"];
const labels: Record<FileKind, string> = {
  md: "Markdown (.md)",
  json: "JSON (.json)",
  text: "文本 (.txt)",
  csv: "CSV (.csv)",
};

export function FileSidebar({
  nodes,
  expanded,
  activePath,
  sidebarCollapsed,
  filtersOpen,
  kinds: selectedKinds,
  shownKinds,
  historyBackDisabled,
  historyForwardDisabled,
  onHistory,
  onFiltersOpen,
  onToggleKind,
  onLocate,
  onToggleNode,
  onOpen,
  onToggleCollapsed,
  t,
}: FileSidebarProps) {
  return (
    <aside className={sidebarCollapsed ? "collapsed" : ""}>
      <header>
        <strong>{t("项目")}</strong>
        <span className="spacer" />
        <span className="sidebar-tools">
          <span className="sidebar-tool-group">
            <button className="icon-button history-button" title={t("后退到上一个打开的文件")} aria-label={t("后退到上一个打开的文件")} disabled={historyBackDisabled} onClick={() => onHistory(-1)}>
              <ChevronLeft size={16} strokeWidth={2.2} />
            </button>
            <button className="icon-button history-button" title={t("前进到下一个打开的文件")} aria-label={t("前进到下一个打开的文件")} disabled={historyForwardDisabled} onClick={() => onHistory(1)}>
              <ChevronRight size={16} strokeWidth={2.2} />
            </button>
          </span>
          <span className="sidebar-tool-group">
            <button className="icon-button" title={t("筛选显示的文件类型")} aria-label={t("筛选显示的文件类型")} aria-expanded={filtersOpen} onClick={onFiltersOpen}>
              <ListFilter size={15} strokeWidth={2} />
            </button>
            <button className="icon-button" title={t("定位当前编辑的文件")} aria-label={t("定位当前编辑的文件")} disabled={!activePath} onClick={onLocate}>
              <LocateFixed size={15} strokeWidth={2} />
            </button>
          </span>
        </span>
      </header>
      {filtersOpen && (
        <div className="filters-popover">
          {kinds.map((kind) => (
            <label key={kind}>
              <input type="checkbox" checked={selectedKinds.has(kind)} onChange={() => onToggleKind(kind)} />
              {t(labels[kind])}
            </label>
          ))}
          <div className="filter-summary" title={shownKinds.join(", ")}>
            {t("已选 {count}/4", { count: shownKinds.length })}
          </div>
        </div>
      )}
      <FileTree nodes={nodes} expanded={expanded} onToggle={onToggleNode} onOpen={onOpen} activePath={activePath} />
      <button className="collapse-handle" title={t(sidebarCollapsed ? "展开文件栏" : "收纳文件栏")} aria-label={t(sidebarCollapsed ? "展开文件栏" : "收纳文件栏")} onClick={onToggleCollapsed}>
        {sidebarCollapsed ? <PanelLeftOpen size={15} strokeWidth={2} /> : <PanelLeftClose size={15} strokeWidth={2} />}
      </button>
    </aside>
  );
}
