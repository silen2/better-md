import type { Locale } from "./domain/types";

export type Translator = (
  key: string,
  values?: Record<string, string | number>,
) => string;

export const translations: Record<Locale, Record<string, string>> = {
  "zh-CN": {},
  "en-US": {
    "主菜单": "Main menu", "设置": "Settings", "最小化": "Minimize", "最大化或还原": "Maximize or restore", "关闭窗口": "Close window",
    "新建功能即将支持": "New files will be supported soon", "新建(N)": "New (N)", "打开(O)…": "Open (O)…", "最近的项目(R)": "Recent Projects (R)", "没有最近项目": "No recent projects", "关闭项目(J)": "Close Project (J)", "设置(I)…": "Settings (I)…", "项目": "Project",
    "后退到上一个打开的文件": "Back to the previous file", "前进到下一个打开的文件": "Forward to the next file", "筛选显示的文件类型": "Filter displayed file types", "定位当前编辑的文件": "Locate current file", "已选 {count}/4": "{count}/4 selected", "选择一个文件夹以开始阅读。": "Choose a folder to start reading.", "展开文件栏": "Expand file pane", "收纳文件栏": "Collapse file pane",
    "从一个文件夹开始": "Start with a folder", "阅读、编辑并对照预览本地的 Markdown、JSON、文本与 CSV 文件。": "Read, edit, and preview local Markdown, JSON, text, and CSV files side by side.", "打开文件夹": "Open Folder", "偏好设置": "Preferences", "最近打开": "Recently Opened", "清除记录": "Clear history", "尚未打开过文件夹。你的历史记录只保存在本机。": "No folders have been opened yet. Your history is stored only on this device.",
    "未打开文件": "No file open", "JSON 工具": "JSON tools", "格式化": "Format", "压缩": "Minify", "转义": "Escape", "去转义": "Unescape", "校验": "Validate", "CSV 工具": "CSV tools", "表格": "Table", "原始文本": "Raw text", "规范化": "Normalize", "首行表头": "First row header", "添加行": "Add row", "删除选中行": "Delete selected rows", "Markdown 视图模式": "Markdown view mode", "纯文本": "Text", "对比预览": "Split preview", "纯预览": "Preview",
    "还没有打开文件": "No file is open", "从左侧项目栏选择一个文件，开始阅读或编辑。": "Choose a file from the project pane to start reading or editing.", "文件编辑器": "File editor", "从左侧打开文件": "Open a file from the project pane", "通用": "General", "外观": "Appearance", "编辑器": "Editor", "快捷键": "Keyboard Shortcuts", "文本类型": "Text Types", "关闭设置": "Close settings",
    "应用更新": "App Updates", "发现 BetterMD {version}，可下载并安装。": "BetterMD {version} is available to download and install.", "当前已是最新版本。": "You're up to date.", "正在检查更新…": "Checking for updates…", "正在下载并安装更新…": "Downloading and installing update…", "从 BetterMD 的正式发布版本检查更新。": "Check official BetterMD releases for updates.", "下载并安装 {version}": "Download and install {version}", "检查更新": "Check for updates", "最近文件夹仅保存在当前设备，可从启动页快速重新打开。": "Recent folders are stored only on this device and can be reopened from the start page.", "清除最近记录": "Clear recent history",
    "编辑器字体": "Editor Font", "仅影响源文本编辑区，不影响 Markdown 预览排版。": "Only affects the source editor, not Markdown preview typography.", "字体": "Font", "字号": "Font size", "行间距": "Line height", "皮肤": "Theme", "选择更贴近 JetBrains IDE 的基础深色，或层次更柔和的暗色皮肤。": "Choose a JetBrains IDE-inspired dark theme or a softer dark theme.", "IDE 深色": "IDE Dark", "柔和暗色": "Soft Dark", "Markdown 默认视图": "Default Markdown View", "新打开的 Markdown 文件默认进入对比预览模式，以便同时查看源内容和渲染结果。": "New Markdown files open in split preview by default so source and rendering can be viewed together.", "后续设置": "More Settings", "这里将承载自动换行、缩进、保存策略和语言高亮等编辑器偏好。": "This area will hold editor preferences such as wrapping, indentation, saving, and syntax highlighting.", "默认预览方式": "Default Preview Mode", "之后每次打开 Markdown 文件时，都会自动使用此视图。": "This view will be used whenever a Markdown file is opened.", "JSON 的树形预览、格式化和校验选项将在这里提供。": "JSON tree preview, formatting, and validation options will be available here.", "文本": "Text", "纯文本的换行、编码和阅读宽度选项将在这里提供。": "Plain-text wrapping, encoding, and reading-width options will be available here.", "CSV 的分隔符、首行表头和表格视图选项将在这里提供。": "CSV delimiter, first-row header, and table-view options will be available here.",
    "搜索当前文件": "Search Current File", "在当前正在编辑的文件中搜索。点击快捷键后直接按下组合键。": "Search the file currently being edited. Click the shortcut and press a key combination.", "请按下快捷键…": "Press shortcut…", "未设置": "Not set", "搜索当前项目": "Search Current Project", "仅搜索文件栏中当前已勾选的文件类型。点击后直接录制组合键。": "Search only the file types currently selected in the file pane. Click to record a key combination.", "支持 Ctrl / Shift / Alt 组合与功能键。按 Esc 取消；按 Backspace 或 Delete 清空。": "Supports Ctrl / Shift / Alt combinations and function keys. Press Esc to cancel; Backspace or Delete to clear.", "输入关键词，按 Enter 搜索": "Enter keywords and press Enter to search", "第 {line} 行": "Line {line}", "关闭": "Close", "无法执行此操作": "Unable to complete this action", "知道了": "OK",
    "界面语言": "Interface Language", "选择 BetterMD 的显示语言，修改后立即生效。": "Choose the display language for BetterMD. Changes take effect immediately.", "简体中文": "Simplified Chinese", "English": "English", "Markdown (.md)": "Markdown (.md)", "JSON (.json)": "JSON (.json)", "文本 (.txt)": "Text (.txt)", "CSV (.csv)": "CSV (.csv)",
    "格式化 JSON": "Format JSON", "压缩 JSON": "Minify JSON", "转义 JSON 文本": "Escape JSON text", "去转义 JSON 文本": "Unescape JSON text", "校验 JSON 格式": "Validate JSON", "“打开文件夹”需要在 Tauri 桌面应用中运行。请关闭浏览器页面，并在项目目录执行 npm run tauri dev。": "\"Open Folder\" is available only in the Tauri desktop app. Close this browser page and run npm run tauri dev from the project folder.", "工作区": "Workspace", "无法创建编辑器窗口：{reason}": "Unable to create editor window: {reason}", "无法打开编辑器窗口：{reason}": "Unable to open editor window: {reason}", "选择工作区文件夹": "Select workspace folder", "无法打开文件夹选择器：{reason}": "Unable to open folder picker: {reason}", "无法打开链接文件：{reason}": "Unable to open linked file: {reason}", "找不到该搜索结果对应的文件。请重新扫描项目后再试。": "The file for this search result could not be found. Rescan the project and try again.",
    "JSON 格式有效": "Valid JSON", "已格式化": "Formatted", "已压缩": "Minified", "已转义": "Escaped", "已去转义": "Unescaped", "JSON 操作失败：{reason}": "JSON operation failed: {reason}", "已添加空白行": "Blank row added", "请先选择要删除的行": "Select rows to delete first", "已删除 {count} 行": "Deleted {count} rows", "已规范化（{delimiter} 分隔）": "Normalized ({delimiter} delimited)", "命中表头，已保留搜索结果": "Match found in header; search result retained", "未能定位到对应单元格": "Unable to locate the matching cell", "检查更新仅在已安装的 BetterMD 桌面应用中可用。": "Update checks are available only in the installed BetterMD desktop app.", "检查更新失败：{reason}": "Update check failed: {reason}", "下载更新失败：{reason}": "Update download failed: {reason}",
  },
};

export function translate(locale: Locale, key: string, values?: Record<string, string | number>) {
  const text = translations[locale][key] ?? key;
  return values
    ? Object.entries(values).reduce(
        (result, [name, value]) => result.replaceAll(`{${name}}`, String(value)),
        text,
      )
    : text;
}
