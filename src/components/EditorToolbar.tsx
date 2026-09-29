import type { ViewMode } from "../domain/types";

type JsonAction = "format" | "minify" | "escape" | "unescape" | "validate";
type CsvViewMode = "table" | "text";

type EditorToolbarProps = {
  currentPath?: string;
  isJson: boolean;
  isCsv: boolean;
  isMarkdown: boolean;
  viewMode: ViewMode;
  csvViewMode: CsvViewMode;
  csvHasHeader: boolean;
  jsonMessage?: string;
  csvMessage?: string;
  modeLabels: Record<ViewMode, string>;
  onJsonAction(action: JsonAction): void;
  onCsvViewMode(mode: CsvViewMode): void;
  onFormatCsv(): void;
  onToggleCsvHeader(): void;
  onAddCsvRow(): void;
  onDeleteCsvRows(): void;
  onMarkdownMode(mode: ViewMode): void;
  onSettings(): void;
  t(key: string): string;
};

export function EditorToolbar(props: EditorToolbarProps) {
  const { t } = props;
  return (
    <header>
      <span>{props.currentPath ?? t("未打开文件")}</span><span className="spacer" />
      {props.isJson && <div className="json-tools" aria-label={t("JSON 工具")}>
        <button title={t("格式化 JSON")} onClick={() => props.onJsonAction("format")}>{t("格式化")}</button>
        <button title={t("压缩 JSON")} onClick={() => props.onJsonAction("minify")}>{t("压缩")}</button>
        <button title={t("转义 JSON 文本")} onClick={() => props.onJsonAction("escape")}>{t("转义")}</button>
        <button title={t("去转义 JSON 文本")} onClick={() => props.onJsonAction("unescape")}>{t("去转义")}</button>
        <button title={t("校验 JSON 格式")} onClick={() => props.onJsonAction("validate")}>{t("校验")}</button>
        {props.jsonMessage && <span>{props.jsonMessage}</span>}
      </div>}
      {props.isCsv && <div className="csv-tools" aria-label={t("CSV 工具")}>
        <div className="csv-view-toggle">
          <button className={props.csvViewMode === "table" ? "selected" : ""} onClick={() => props.onCsvViewMode("table")}>{t("表格")}</button>
          <button className={props.csvViewMode === "text" ? "selected" : ""} onClick={() => props.onCsvViewMode("text")}>{t("原始文本")}</button>
        </div>
        <button onClick={props.onFormatCsv}>{t("规范化")}</button>
        <button className={props.csvHasHeader ? "selected" : ""} onClick={props.onToggleCsvHeader}>{t("首行表头")}</button>
        {props.csvViewMode === "table" && <><button onClick={props.onAddCsvRow}>{t("添加行")}</button><button onClick={props.onDeleteCsvRows}>{t("删除选中行")}</button></>}
        {props.csvMessage && <span>{props.csvMessage}</span>}
      </div>}
      {props.isMarkdown && <div className="view-modes" aria-label={t("Markdown 视图模式")}>
        {(["text", "split", "preview"] as ViewMode[]).map((mode) => <button key={mode} className={props.viewMode === mode ? "selected" : ""} onClick={() => props.onMarkdownMode(mode)}>{props.modeLabels[mode]}</button>)}
      </div>}
      <button onClick={props.onSettings}>⚙ {t("设置")}</button>
    </header>
  );
}
