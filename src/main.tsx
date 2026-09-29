import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { bracketMatching } from "@codemirror/language";
import { RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  ViewPlugin,
  type DecorationSet,
} from "@codemirror/view";
import { oneDark } from "@codemirror/theme-one-dark";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  colorSchemeDark,
  themeQuartz,
  type ColDef,
} from "ag-grid-community";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  FileText,
} from "lucide-react";
import {
  allFileKinds as allKinds,
  expandedPathsForFile,
  findNodeByPath,
  lineRange,
  resolveWorkspaceLink,
  supportedFileKind,
} from "./domain/document";
import { parseCsvTable, serializeCsv } from "./domain/csv";
import { transformJson as applyJsonTransform } from "./domain/json";
import { appendHistory, currentHistoryValue, moveHistory } from "./domain/history";
import { createDocumentSession } from "./application/documentSession";
import { findInText } from "./domain/search";
import { canRecordShortcut, normaliseShortcut } from "./domain/shortcuts";
import type {
  CsvGridRow,
  CsvTable,
  FileKind,
  FileNode as Node,
  Locale,
  SearchMatch,
  ViewMode,
} from "./domain/types";
import {
  checkForDesktopUpdate,
  chooseWorkspaceDirectory,
  createEditorWindow,
  currentDesktopWindow,
  invokeCommand,
  isDesktopRuntime,
} from "./infrastructure/tauri";
import {
  clampAppearance,
  defaultAppearance,
  defaultShortcuts as initialShortcuts,
  defaultTextTypeSettings,
  preferenceKeys,
} from "./domain/preferences";
import type {
  AppearanceSettings as Appearance,
  ShortcutSettings as Shortcut,
  TextTypeSettings,
} from "./domain/preferences";
import {
  loadLocale,
  loadRecord,
  loadStringList,
  savePreference,
} from "./infrastructure/preferencesStore";
import { FileSidebar } from "./components/FileSidebar";
import { WindowChrome } from "./components/WindowChrome";
import { WelcomePage } from "./components/WelcomePage";
import { type SettingsCategory } from "./components/SettingsNavigation";
import { SettingsDialog } from "./components/SettingsDialog";
import { SearchDialog } from "./components/SearchDialog";
import { ErrorDialog } from "./components/ErrorDialog";
import { EditorToolbar } from "./components/EditorToolbar";
import { translate } from "./i18n";
import "./styles.css";

type StartupFile = { path: string; workspace: string };
type CsvViewMode = "table" | "text";
type SearchFocus = { path: string; line: number; query: string };

const rainbowBracketColors = [
  "#6fa8ff",
  "#f0b778",
  "#a9d47d",
  "#d799d8",
  "#78cbd0",
  "#e6d77a",
];
const rainbowBracketTheme = EditorView.baseTheme(
  Object.fromEntries(
    rainbowBracketColors.map((color, index) => [
      `.cm-rainbow-bracket-${index}`,
      { color, fontWeight: "700" },
    ]),
  ),
);
const rainbowBrackets = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    update(update: { docChanged: boolean; view: EditorView }) {
      if (update.docChanged) this.decorations = this.buildDecorations(update.view);
    }

    private buildDecorations(view: EditorView) {
      const stack: { bracket: string; position: number }[] = [];
      const ranges: { from: number; to: number; depth: number }[] = [];
      const text = view.state.doc.toString();
      let inString = false;
      let escaped = false;

      for (let position = 0; position < text.length; position += 1) {
        const character = text[position];
        if (inString) {
          if (escaped) escaped = false;
          else if (character === "\\") escaped = true;
          else if (character === '"') inString = false;
          continue;
        }
        if (character === '"') {
          inString = true;
          continue;
        }
        if (character === "{" || character === "[") {
          stack.push({ bracket: character, position });
          continue;
        }
        const expectedOpening = character === "}" ? "{" : character === "]" ? "[" : undefined;
        if (!expectedOpening) continue;
        const opening = stack.at(-1);
        if (!opening || opening.bracket !== expectedOpening) continue;
        stack.pop();
        const depth = stack.length % rainbowBracketColors.length;
        ranges.push({ from: opening.position, to: opening.position + 1, depth });
        ranges.push({ from: position, to: position + 1, depth });
      }

      const builder = new RangeSetBuilder<Decoration>();
      ranges
        .sort((left, right) => left.from - right.from)
        .forEach((range) =>
          builder.add(
            range.from,
            range.to,
            Decoration.mark({ class: `cm-rainbow-bracket-${range.depth}` }),
          ),
        );
      return builder.finish();
    }
  },
  { decorations: (plugin) => plugin.decorations },
);
const jsonEditorExtensions = [
  json(),
  bracketMatching(),
  rainbowBracketTheme,
  rainbowBrackets,
];
function createCsvGridTheme(fontFamily: string) {
  return themeQuartz
    .withPart(colorSchemeDark)
    .withParams({
      accentColor: "#5792ff",
      fontFamily,
      borderRadius: 8,
    });
}

function App() {
  const [maximized, setMaximized] = useState(false);
  const launchParameters = useMemo(
    () => new URLSearchParams(window.location.search),
    [],
  );
  const startupPath = launchParameters.get("file") ?? undefined;
  const [root, setRoot] = useState<string | undefined>(
    () => launchParameters.get("workspace") ?? undefined,
  );
  const didOpenStartupFile = useRef(false);
  const didHandleAssociatedFile = useRef(false);
  const [tree, setTree] = useState<Node[]>([]);
  const [kinds, setKinds] = useState<Set<FileKind>>(new Set(allKinds));
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [current, setCurrent] = useState<Node>();
  const [content, setContent] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [fileHistory, setFileHistory] = useState<Node[]>([]);
  const [fileHistoryIndex, setFileHistoryIndex] = useState(-1);
  const [shortcuts, setShortcuts] = useState<Shortcut>(() => ({
    ...loadRecord(preferenceKeys.shortcuts, initialShortcuts),
  }));
  const [locale, setLocale] = useState<Locale>(() =>
    loadLocale(preferenceKeys.locale),
  );
  const [recordingShortcut, setRecordingShortcut] = useState<keyof Shortcut>();
  const [settings, setSettings] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [recentMenuOpen, setRecentMenuOpen] = useState(false);
  const [settingsCategory, setSettingsCategory] = useState<SettingsCategory>("general");
  const [textTypesOpen, setTextTypesOpen] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [recentFolders, setRecentFolders] = useState<string[]>(() => {
    return loadStringList(preferenceKeys.recentFolders);
  });
  const [appearance, setAppearance] = useState<Appearance>(() => {
    return loadRecord(preferenceKeys.appearance, defaultAppearance);
  });
  const [textTypeSettings, setTextTypeSettings] = useState<TextTypeSettings>(
    () => {
      return loadRecord(preferenceKeys.textTypes, defaultTextTypeSettings);
    },
  );
  const [search, setSearch] = useState<"file" | "project" | null>(null);
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [pendingSearchFocus, setPendingSearchFocus] = useState<SearchFocus>();
  const [csvSearchCell, setCsvSearchCell] = useState<{
    rowId: string;
    key: string;
  }>();
  const [error, setError] = useState<string>();
  const [jsonToolMessage, setJsonToolMessage] = useState<string>();
  const [csvViewMode, setCsvViewMode] = useState<CsvViewMode>("table");
  const [csvHasHeader, setCsvHasHeader] = useState(true);
  const [csvToolMessage, setCsvToolMessage] = useState<string>();
  const csvGridRef = useRef<AgGridReact<CsvGridRow>>(null);
  const plainTextEditorRef = useRef<HTMLTextAreaElement>(null);
  const jsonEditorRef = useRef<ReactCodeMirrorRef>(null);
  const pendingUpdate = useRef<Awaited<ReturnType<typeof checkForDesktopUpdate>>>(null);
  const [updateStatus, setUpdateStatus] = useState<
    "idle" | "checking" | "available" | "current" | "installing" | "error"
  >("idle");
  const [updateVersion, setUpdateVersion] = useState<string>();
  const t = useCallback(
    (key: string, values?: Record<string, string | number>) =>
      translate(locale, key, values),
    [locale],
  );
  const editorTypography = useMemo(
    () => ({
      fontFamily: `${appearance.fontFamily}, "JetBrains Mono", "DM Mono", Consolas, monospace`,
      fontSize: `${appearance.fontSize}px`,
      lineHeight: String(appearance.lineHeight),
    }),
    [appearance.fontFamily, appearance.fontSize, appearance.lineHeight],
  );
  const csvGridTheme = useMemo(
    () => createCsvGridTheme(appearance.fontFamily),
    [appearance.fontFamily],
  );

  const rescan = useCallback(
    async (folder = root, selected = kinds) => {
      if (!folder) return;
      const result = await invokeCommand<Node[]>("scan_workspace", {
        root: folder,
        extensions: [...selected],
      });
      setTree(result);
    },
    [root, kinds],
  );

  useEffect(() => {
    void rescan();
  }, [rescan]);
  useEffect(() => {
    if (!isDesktopRuntime()) return;
    const appWindow = currentDesktopWindow();
    let unlisten: (() => void) | undefined;
    const syncMaximized = () => {
      void appWindow.isMaximized().then(setMaximized);
    };
    syncMaximized();
    void appWindow.onResized(syncMaximized).then((stop) => {
      unlisten = stop;
    });
    return () => unlisten?.();
  }, []);
  useEffect(() => {
    if (root || !isDesktopRuntime() || didHandleAssociatedFile.current) return;
    didHandleAssociatedFile.current = true;
    void invokeCommand<StartupFile | null>("startup_file").then((file) => {
      if (file) void openWorkspace(file.workspace, file.path);
    });
  }, [root]);
  useEffect(() => {
    savePreference(preferenceKeys.shortcuts, shortcuts);
  }, [shortcuts]);
  useEffect(() => {
    savePreference(preferenceKeys.locale, locale);
    document.documentElement.lang = locale;
  }, [locale]);
  useEffect(() => {
    savePreference(preferenceKeys.recentFolders, recentFolders);
  }, [recentFolders]);
  useEffect(() => {
    savePreference(preferenceKeys.appearance, appearance);
  }, [appearance]);
  useEffect(() => {
    savePreference(preferenceKeys.textTypes, textTypeSettings);
  }, [textTypeSettings]);
  useEffect(() => {
    if (!settings) setRecordingShortcut(undefined);
  }, [settings]);
  useEffect(() => {
    const closeMenuOnOutsidePress = (event: MouseEvent) => {
      const target = event.target as Element;
      if (menuOpen && !target.closest(".main-menu, .chrome-menu")) closeMenu();
    };
    document.addEventListener("mousedown", closeMenuOnOutsidePress);
    return () =>
      document.removeEventListener("mousedown", closeMenuOnOutsidePress);
  }, [menuOpen]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (recordingShortcut) {
        event.preventDefault();
        event.stopPropagation();
        if (event.key === "Escape") {
          setRecordingShortcut(undefined);
          return;
        }
        if (event.key === "Backspace" || event.key === "Delete") {
          setShortcuts((value) => ({ ...value, [recordingShortcut]: "" }));
          setRecordingShortcut(undefined);
          return;
        }
        if (["Control", "Shift", "Alt", "Meta"].includes(event.key)) return;
        if (!canRecordShortcut(event)) return;
        const recorded = normaliseShortcut(event);
        setShortcuts((value) => ({ ...value, [recordingShortcut]: recorded }));
        setRecordingShortcut(undefined);
        return;
      }
      const key = normaliseShortcut(event);
      if (current && key === "Ctrl+Z" && historyIndex > 0) {
        event.preventDefault();
        setContent(history[historyIndex - 1]);
        setHistoryIndex(historyIndex - 1);
        return;
      }
      if (
        current &&
        (key === "Ctrl+Y" || key === "Ctrl+Shift+Z") &&
        historyIndex < history.length - 1
      ) {
        event.preventDefault();
        setContent(history[historyIndex + 1]);
        setHistoryIndex(historyIndex + 1);
        return;
      }
      if (key === shortcuts.find) {
        event.preventDefault();
        setSearch("file");
        setQuery("");
        setMatches([]);
      }
      if (key === shortcuts.projectFind) {
        event.preventDefault();
        setSearch("project");
        setQuery("");
        setMatches([]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcuts, current, history, historyIndex, recordingShortcut]);
  useEffect(() => {
    const openWorkspaceFileLink = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest(
        ".markdown-preview a",
      ) as HTMLAnchorElement | null;
      const href = anchor?.getAttribute("href");
      if (!anchor || !href || !current || /^(https?:|mailto:|#)/i.test(href))
        return;
      const targetPath = resolveWorkspaceLink(current.path, href);
      const extension = supportedFileKind(targetPath);
      if (!extension) return;
      event.preventDefault();
      void openFile({
        name: targetPath.split(/[\\/]+/).at(-1) ?? targetPath,
        path: targetPath,
        is_dir: false,
        extension,
      });
    };
    document.addEventListener("click", openWorkspaceFileLink);
    return () => document.removeEventListener("click", openWorkspaceFileLink);
  }, [current]);
  useEffect(() => {
    if (!root || !startupPath || didOpenStartupFile.current) return;
    const extension = supportedFileKind(startupPath);
    if (!extension) return;
    didOpenStartupFile.current = true;
    void openFile({
      name: startupPath.split(/[\\/]+/).at(-1) ?? startupPath,
      path: startupPath,
      is_dir: false,
      extension,
    });
  }, [root, startupPath]);

  const openWorkspace = async (folder: string, fileToOpen?: string) => {
    setRecentFolders((items) =>
      [folder, ...items.filter((item) => item !== folder)].slice(0, 7),
    );
    if (!isDesktopRuntime()) {
      setError(
        t("“打开文件夹”需要在 Tauri 桌面应用中运行。请关闭浏览器页面，并在项目目录执行 npm run tauri dev。"),
      );
      return;
    }
    try {
      const name =
        folder
          .split(/[\\/]+/)
          .filter(Boolean)
          .slice(-1)[0] || t("工作区");
      const editor = createEditorWindow(
        `editor-${Date.now()}`,
        `/?workspace=${encodeURIComponent(folder)}${fileToOpen ? `&file=${encodeURIComponent(fileToOpen)}` : ""}`,
        `${name} — BetterMD`,
      );
      editor.once("tauri://created", () => {
        void currentDesktopWindow().close();
      });
      editor.once("tauri://error", (event) =>
        setError(t("无法创建编辑器窗口：{reason}", { reason: String(event.payload) })),
      );
    } catch (reason) {
      setError(t("无法打开编辑器窗口：{reason}", { reason: String(reason) }));
    }
  };
  const chooseFolder = async () => {
    if (!isDesktopRuntime()) {
      setError(
        t("“打开文件夹”需要在 Tauri 桌面应用中运行。请关闭浏览器页面，并在项目目录执行 npm run tauri dev。"),
      );
      return;
    }
    try {
      const picked = await chooseWorkspaceDirectory(t("选择工作区文件夹"));
      if (typeof picked === "string") void openWorkspace(picked);
    } catch (reason) {
      setError(t("无法打开文件夹选择器：{reason}", { reason: String(reason) }));
    }
  };
  const toggleKind = (kind: FileKind) =>
    setKinds((old) => {
      const next = new Set(old);
      next.has(kind) ? next.delete(kind) : next.add(kind);
      return next;
    });
  const openFile = async (node: Node, recordFileHistory = true) => {
    try {
      const fileContent = await invokeCommand<string>("read_text_file", {
        path: node.path,
      });
      const session = createDocumentSession(
        node,
        fileContent,
        textTypeSettings.markdownView,
      );
      if (session.csvDefaults) {
        setCsvViewMode(session.csvDefaults.viewMode);
        setCsvHasHeader(session.csvDefaults.hasHeader);
        setCsvToolMessage(undefined);
      }
      setCurrent(node);
      setContent(session.content);
      setHistory(session.history.entries);
      setHistoryIndex(session.history.index);
      setViewMode(session.viewMode);
      if (recordFileHistory) {
        const baseFileHistory = fileHistory.slice(0, fileHistoryIndex + 1);
        if (baseFileHistory[baseFileHistory.length - 1]?.path !== node.path) {
          const nextFileHistory = [...baseFileHistory, node].slice(-100);
          setFileHistory(nextFileHistory);
          setFileHistoryIndex(nextFileHistory.length - 1);
        }
      }
    } catch (reason) {
      setError(t("无法打开链接文件：{reason}", { reason: String(reason) }));
    }
  };
  const updateContent = (nextContent: string) => {
    const nextHistory = appendHistory(
      { entries: history, index: historyIndex },
      nextContent,
      200,
    );
    setContent(nextContent);
    setHistory(nextHistory.entries);
    setHistoryIndex(nextHistory.index);
  };
  const undo = () => {
    const nextHistory = moveHistory({ entries: history, index: historyIndex }, -1);
    setContent(currentHistoryValue(nextHistory));
    setHistoryIndex(nextHistory.index);
  };
  const redo = () => {
    const nextHistory = moveHistory({ entries: history, index: historyIndex }, 1);
    setContent(currentHistoryValue(nextHistory));
    setHistoryIndex(nextHistory.index);
  };
  const navigateFileHistory = (direction: -1 | 1) => {
    const nextIndex = fileHistoryIndex + direction;
    const target = fileHistory[nextIndex];
    if (!target) return;
    setFileHistoryIndex(nextIndex);
    void openFile(target, false);
  };
  const locateCurrent = () => {
    if (!current) return;
    setExpanded(expandedPathsForFile(current.path));
  };
  const runSearch = async () => {
    if (!query.trim()) return setMatches([]);
    if (search === "file") {
      setMatches(findInText(content, query, current?.path ?? ""));
    } else if (root)
      setMatches(
        await invokeCommand("search_workspace", {
          root,
          extensions: [...kinds],
          query,
        }),
      );
  };
  const focusSearchMatch = (match: SearchMatch) => {
    const target = match.path ? findNodeByPath(tree, match.path) : current;
    if (!target) {
      setError(t("找不到该搜索结果对应的文件。请重新扫描项目后再试。"));
      return;
    }
    setPendingSearchFocus({ path: target.path, line: match.line, query });
    setSearch(null);
    if (target.path !== current?.path) void openFile(target);
  };
  const transformJson = (
    action: "format" | "minify" | "escape" | "unescape" | "validate",
  ) => {
    try {
      let next = content;
      next = applyJsonTransform(content, action);
      if (action === "validate") {
        setJsonToolMessage(t("JSON 格式有效"));
        return;
      }
      updateContent(next);
      setJsonToolMessage(
        action === "format"
          ? t("已格式化")
          : action === "minify"
            ? t("已压缩")
            : action === "escape"
              ? t("已转义")
              : t("已去转义"),
      );
    } catch (reason) {
      setJsonToolMessage(undefined);
      setError(t("JSON 操作失败：{reason}", { reason: String(reason) }));
    }
  };
  const isCsv = current?.extension === "csv";
  const csvTable = useMemo(
    () => (isCsv ? parseCsvTable(content, csvHasHeader, locale) : undefined),
    [content, csvHasHeader, isCsv, locale],
  );
  const writeCsv = (table: CsvTable, rows = table.rows, header = csvHasHeader) => {
    updateContent(serializeCsv(table, rows, header));
  };
  const addCsvRow = () => {
    if (!csvTable) return;
    const row = Object.fromEntries([
      ["__rowId", `row-${Date.now()}`],
      ...csvTable.keys.map((key) => [key, ""]),
    ]) as CsvGridRow;
    writeCsv(csvTable, [...csvTable.rows, row]);
    setCsvToolMessage(t("已添加空白行"));
  };
  const deleteSelectedCsvRows = () => {
    if (!csvTable) return;
    const selected = csvGridRef.current?.api.getSelectedRows() ?? [];
    if (!selected.length) {
      setCsvToolMessage(t("请先选择要删除的行"));
      return;
    }
    const selectedIds = new Set(selected.map((row) => row.__rowId));
    writeCsv(csvTable, csvTable.rows.filter((row) => !selectedIds.has(row.__rowId)));
    setCsvToolMessage(t("已删除 {count} 行", { count: selected.length }));
  };
  const formatCsv = () => {
    if (!csvTable) return;
    writeCsv(csvTable);
    setCsvToolMessage(t("已规范化（{delimiter} 分隔）", { delimiter: csvTable.delimiter === "\t" ? "Tab" : csvTable.delimiter }));
  };
  const shownKinds = useMemo(() => [...kinds], [kinds]);

  const isMarkdown = current?.extension === "md";
  const isJson = current?.extension === "json";
  const csvColumns = useMemo<ColDef<CsvGridRow>[]>(
    () =>
      csvTable
        ? csvTable.keys.map((key, index) => ({
            field: key,
            headerName: csvTable.headers[index],
            editable: true,
            sortable: true,
            filter: true,
            resizable: true,
            minWidth: 120,
            flex: 1,
            cellClassRules: {
              "csv-search-hit": (params) =>
                csvSearchCell?.rowId === params.data?.__rowId &&
                csvSearchCell?.key === key,
            },
          }))
        : [],
    [csvSearchCell, csvTable],
  );
  useEffect(() => {
    if (!pendingSearchFocus || current?.path !== pendingSearchFocus.path) return;
    const { start, end } = lineRange(content, pendingSearchFocus.line);
    const lineText = content.slice(start, end).replace(/\r$/, "");
    const matchOffset = lineText.toLocaleLowerCase().indexOf(
      pendingSearchFocus.query.toLocaleLowerCase(),
    );
    const from = start + Math.max(0, matchOffset);
    const to = from + Math.max(1, pendingSearchFocus.query.length);

    if (current?.extension === "csv" && csvViewMode === "table") {
      const rowIndex = pendingSearchFocus.line - (csvHasHeader ? 2 : 1);
      const row = csvTable?.rows[rowIndex];
      const key = row
        ? csvTable?.keys.find((column) =>
            row[column]
              ?.toLocaleLowerCase()
              .includes(pendingSearchFocus.query.toLocaleLowerCase()),
          )
        : undefined;
      if (row && key) {
        setCsvSearchCell({ rowId: row.__rowId, key });
        requestAnimationFrame(() => {
          const api = csvGridRef.current?.api;
          api?.ensureIndexVisible(rowIndex, "middle");
          api?.ensureColumnVisible(key, "middle");
          api?.setFocusedCell(rowIndex, key);
        });
      } else {
        setCsvToolMessage(
          t(rowIndex < 0 ? "命中表头，已保留搜索结果" : "未能定位到对应单元格"),
        );
      }
    } else {
      setCsvSearchCell(undefined);
      if (current?.extension === "md" && viewMode === "preview") {
        setViewMode("split");
      }
      requestAnimationFrame(() => {
        if (current?.extension === "json") {
          const view = jsonEditorRef.current?.view;
          view?.dispatch({
            selection: { anchor: from, head: to },
            effects: EditorView.scrollIntoView(from, { y: "center" }),
          });
          view?.focus();
        } else {
          const editor = plainTextEditorRef.current;
          editor?.focus();
          editor?.setSelectionRange(from, to);
        }
      });
    }
    setPendingSearchFocus(undefined);
  }, [
    content,
    csvHasHeader,
    csvTable,
    csvViewMode,
    current?.extension,
    current?.path,
    pendingSearchFocus,
    viewMode,
  ]);
  const modeLabels: Record<ViewMode, string> = {
    text: t("纯文本"),
    split: t("对比预览"),
    preview: t("纯预览"),
  };
  const closeMenu = () => {
    setMenuOpen(false);
    setRecentMenuOpen(false);
  };
  const showSettings = () => {
    closeMenu();
    setSettingsCategory("general");
    setSettings(true);
  };
  const checkForUpdates = async () => {
    if (!isDesktopRuntime()) {
      setUpdateStatus("error");
      setError(t("检查更新仅在已安装的 BetterMD 桌面应用中可用。"));
      return;
    }
    setUpdateStatus("checking");
    try {
      const update = await checkForDesktopUpdate();
      pendingUpdate.current = update;
      setUpdateVersion(update?.version);
      setUpdateStatus(update ? "available" : "current");
    } catch (reason) {
      setUpdateStatus("error");
      setError(t("检查更新失败：{reason}", { reason: String(reason) }));
    }
  };
  const installUpdate = async () => {
    const update = pendingUpdate.current;
    if (!update) return;
    setUpdateStatus("installing");
    try {
      await update.downloadAndInstall();
    } catch (reason) {
      setUpdateStatus("error");
      setError(t("下载更新失败：{reason}", { reason: String(reason) }));
    }
  };

  return (
    <div
      className={`app-shell ${maximized ? "window-maximized" : ""}`}
      data-theme={appearance.theme}
      style={
        {
          "--editor-font": appearance.fontFamily,
          "--editor-font-size": `${appearance.fontSize}px`,
          "--editor-line-height": String(appearance.lineHeight),
        } as React.CSSProperties
      }
    >
      <WindowChrome
        menuOpen={menuOpen}
        onMenu={() => {
          setMenuOpen((open) => !open);
          setRecentMenuOpen(false);
        }}
        onSettings={showSettings}
        t={t}
      />
      {menuOpen && (
        <div className="main-menu">
          <button disabled title={t("新建功能即将支持")}>
            <span>{t("新建(N)")}</span>
            <i>›</i>
          </button>
          <button
            onClick={() => {
              closeMenu();
              void chooseFolder();
            }}
          >
            <span>▱&nbsp; {t("打开(O)…")}</span>
          </button>
          <button onClick={() => setRecentMenuOpen((open) => !open)}>
            <span>{t("最近的项目(R)")}</span>
            <i>›</i>
          </button>
          {recentMenuOpen && (
            <div className="recent-submenu">
              {recentFolders.length ? (
                recentFolders.map((folder) => (
                  <button
                    key={folder}
                    title={folder}
                    onClick={() => {
                      closeMenu();
                      void openWorkspace(folder);
                    }}
                  >
                    {folder
                      .split(/[\\/]+/)
                      .filter(Boolean)
                      .at(-1)}
                  </button>
                ))
              ) : (
                <span>{t("没有最近项目")}</span>
              )}
            </div>
          )}
          <button
            disabled={!root}
            onClick={() => void currentDesktopWindow().close()}
          >
            <span>{t("关闭项目(J)")}</span>
          </button>
          <hr />
          <button onClick={showSettings}>
            <span>⚙&nbsp; {t("设置(I)…")}</span>
            <kbd>Ctrl+Alt+S</kbd>
          </button>
        </div>
      )}
      <main className={!root ? "navigator-window" : ""}>
        {root && (
          <FileSidebar
            nodes={tree}
            expanded={expanded}
            activePath={current?.path}
            sidebarCollapsed={sidebarCollapsed}
            filtersOpen={filtersOpen}
            kinds={kinds}
            shownKinds={shownKinds}
            historyBackDisabled={fileHistoryIndex <= 0}
            historyForwardDisabled={fileHistoryIndex >= fileHistory.length - 1}
            onHistory={navigateFileHistory}
            onFiltersOpen={() => setFiltersOpen((open) => !open)}
            onToggleKind={toggleKind}
            onLocate={locateCurrent}
            onToggleNode={(path) => setExpanded((old) => {
              const next = new Set(old);
              next.has(path) ? next.delete(path) : next.add(path);
              return next;
            })}
            onOpen={openFile}
            onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
            t={t}
          />
        )}
        <section className="editor">
          {!root ? (
            <WelcomePage
              recentFolders={recentFolders}
              onChooseFolder={() => void chooseFolder()}
              onOpenRecent={(folder) => void openWorkspace(folder)}
              onOpenSettings={() => { setSettingsCategory("general"); setSettings(true); }}
              onClearRecent={() => setRecentFolders([])}
              t={t}
            />
          ) : (
            <>
              <EditorToolbar
                currentPath={current?.path}
                isJson={isJson}
                isCsv={isCsv}
                isMarkdown={isMarkdown}
                viewMode={viewMode}
                csvViewMode={csvViewMode}
                csvHasHeader={csvHasHeader}
                jsonMessage={jsonToolMessage}
                csvMessage={csvToolMessage}
                modeLabels={modeLabels}
                onJsonAction={transformJson}
                onCsvViewMode={setCsvViewMode}
                onFormatCsv={formatCsv}
                onToggleCsvHeader={() => setCsvHasHeader((value) => !value)}
                onAddCsvRow={addCsvRow}
                onDeleteCsvRows={deleteSelectedCsvRows}
                onMarkdownMode={setViewMode}
                onSettings={() => { setSettingsCategory("general"); setSettings(true); }}
                t={t}
              />
              {!current ? (
                <div className="editor-empty-state">
                  <div className="editor-empty-icon">
                    <FileText size={28} strokeWidth={1.65} />
                  </div>
                  <h2>{t("还没有打开文件")}</h2>
                  <p>{t("从左侧项目栏选择一个文件，开始阅读或编辑。")}</p>
                  <div className="editor-empty-formats">
                    <span>Markdown</span>
                    <span>JSON</span>
                    <span>Text</span>
                    <span>CSV</span>
                  </div>
                </div>
              ) : isJson ? (
                <div className="json-editor-shell">
                  <CodeMirror
                    ref={jsonEditorRef}
                    value={content}
                    height="100%"
                    style={editorTypography}
                    theme={oneDark}
                    extensions={jsonEditorExtensions}
                    onChange={(value) => {
                      updateContent(value);
                      setJsonToolMessage(undefined);
                    }}
                    basicSetup={{ lineNumbers: true, foldGutter: true }}
                  />
                </div>
              ) : isCsv && csvViewMode === "table" && csvTable ? (
                <div className="csv-editor-shell" style={editorTypography}>
                  <AgGridReact<CsvGridRow>
                    ref={csvGridRef}
                    theme={csvGridTheme}
                    modules={[AllCommunityModule]}
                    rowData={csvTable.rows}
                    columnDefs={csvColumns}
                    getRowId={(params) => params.data.__rowId}
                    rowSelection={{ mode: "multiRow" }}
                    defaultColDef={{ editable: true, sortable: true, resizable: true }}
                    onCellValueChanged={(event) => {
                      const rows: CsvGridRow[] = [];
                      event.api.forEachNode((node) => {
                        if (node.data) rows.push(node.data);
                      });
                      writeCsv(csvTable, rows);
                      setCsvToolMessage(undefined);
                    }}
                  />
                </div>
              ) : (
                <div
                  className={`document-view ${isMarkdown ? `markdown-${viewMode}` : "plain-text"}`}
                >
                  {(!isMarkdown || viewMode !== "preview") && (
                    <textarea
                      ref={plainTextEditorRef}
                      aria-label={t("文件编辑器")}
                      style={editorTypography}
                      value={content}
                      onChange={(e) => updateContent(e.target.value)}
                      placeholder={t("从左侧打开文件")}
                    />
                  )}
                  {isMarkdown && viewMode !== "text" && (
                    <article className="markdown-preview">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {content}
                      </ReactMarkdown>
                    </article>
                  )}
                </div>
              )}
            </>
          )}
        </section>
        {settings && (
          <SettingsDialog
            category={settingsCategory}
            textTypesOpen={textTypesOpen}
            onCategory={setSettingsCategory}
            onToggleTextTypes={() => setTextTypesOpen((open) => !open)}
            onClose={() => setSettings(false)}
            t={t}
          >
                {settingsCategory === "general" && (
                  <div className="settings-panel">
                    <section>
                      <h3>{t("界面语言")}</h3>
                      <p>{t("选择 BetterMD 的显示语言，修改后立即生效。")}</p>
                      <div className="theme-options">
                        <button
                          className={locale === "zh-CN" ? "selected" : ""}
                          onClick={() => setLocale("zh-CN")}
                        >
                          {t("简体中文")}
                        </button>
                        <button
                          className={locale === "en-US" ? "selected" : ""}
                          onClick={() => setLocale("en-US")}
                        >
                          {t("English")}
                        </button>
                      </div>
                    </section>
                    <section>
                      <h3>{t("应用更新")}</h3>
                      <p>
                        {updateStatus === "available"
                          ? t("发现 BetterMD {version}，可下载并安装。", { version: updateVersion ?? "" })
                          : updateStatus === "current"
                            ? t("当前已是最新版本。")
                            : updateStatus === "checking"
                              ? t("正在检查更新…")
                              : updateStatus === "installing"
                                ? t("正在下载并安装更新…")
                                : t("从 BetterMD 的正式发布版本检查更新。")}
                      </p>
                      {updateStatus === "available" ? (
                        <button onClick={() => void installUpdate()}>
                          {t("下载并安装 {version}", { version: updateVersion ?? "" })}
                        </button>
                      ) : (
                        <button
                          onClick={() => void checkForUpdates()}
                          disabled={
                            updateStatus === "checking" ||
                            updateStatus === "installing"
                          }
                        >
                          {t("检查更新")}
                        </button>
                      )}
                    </section>
                    <section>
                      <h3>{t("最近打开")}</h3>
                      <p>
                        {t("最近文件夹仅保存在当前设备，可从启动页快速重新打开。")}
                      </p>
                      <button
                        onClick={() => setRecentFolders([])}
                        disabled={!recentFolders.length}
                      >
                        {t("清除最近记录")}
                      </button>
                    </section>
                  </div>
                )}
                {settingsCategory === "appearance" && (
                  <div className="settings-panel">
                    <section>
                      <h3>{t("编辑器字体")}</h3>
                      <p>{t("仅影响源文本编辑区，不影响 Markdown 预览排版。")}</p>
                      <label>
                        {t("字体")}
                        <select
                          value={appearance.fontFamily}
                          onChange={(e) =>
                            setAppearance((value) => ({
                              ...value,
                              fontFamily: e.target.value,
                            }))
                          }
                        >
                          <option>JetBrains Mono</option>
                          <option>Consolas</option>
                          <option>Microsoft YaHei Mono</option>
                        </select>
                      </label>
                      <label>
                        {t("字号")}
                        <input
                          type="number"
                          min="11"
                          max="24"
                          value={appearance.fontSize}
                          onChange={(e) =>
                            setAppearance((value) =>
                              clampAppearance(value, "fontSize", Number(e.target.value)),
                            )
                          }
                        />
                      </label>
                      <label>
                        {t("行间距")}
                        <input
                          type="number"
                          min="1.2"
                          max="2.4"
                          step="0.05"
                          value={appearance.lineHeight}
                          onChange={(e) =>
                            setAppearance((value) =>
                              clampAppearance(value, "lineHeight", Number(e.target.value)),
                            )
                          }
                        />
                      </label>
                    </section>
                    <section>
                      <h3>{t("皮肤")}</h3>
                      <p>
                        {t("选择更贴近 JetBrains IDE 的基础深色，或层次更柔和的暗色皮肤。")}
                      </p>
                      <div className="theme-options">
                        <button
                          className={
                            appearance.theme === "ide-dark" ? "selected" : ""
                          }
                          onClick={() =>
                            setAppearance((value) => ({
                              ...value,
                              theme: "ide-dark",
                            }))
                          }
                        >
                          {t("IDE 深色")}
                        </button>
                        <button
                          className={
                            appearance.theme === "dim-dark" ? "selected" : ""
                          }
                          onClick={() =>
                            setAppearance((value) => ({
                              ...value,
                              theme: "dim-dark",
                            }))
                          }
                        >
                          {t("柔和暗色")}
                        </button>
                      </div>
                    </section>
                  </div>
                )}
                {settingsCategory === "md" && (
                  <div className="settings-panel text-type-panel">
                    <section>
                      <h3>{t("默认预览方式")}</h3>
                      <p>{t("之后每次打开 Markdown 文件时，都会自动使用此视图。")}</p>
                      <div className="theme-options view-default-options">
                        {(
                          [
                            ["text", t("纯文本")],
                            ["split", t("对比预览")],
                            ["preview", t("纯预览")],
                          ] as const
                        ).map(([mode, label]) => (
                          <button
                            key={mode}
                            className={
                              textTypeSettings.markdownView === mode
                                ? "selected"
                                : ""
                            }
                            onClick={() =>
                              setTextTypeSettings((value) => ({
                                ...value,
                                markdownView: mode,
                              }))
                            }
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </section>
                  </div>
                )}
                {settingsCategory === "shortcuts" && (
                  <div className="settings-panel">
                    <section>
                      <h3>{t("搜索当前文件")}</h3>
                      <p>{t("在当前正在编辑的文件中搜索。点击快捷键后直接按下组合键。")}</p>
                      <button
                        type="button"
                        className={`shortcut-recorder ${recordingShortcut === "find" ? "is-recording" : ""}`}
                        aria-pressed={recordingShortcut === "find"}
                        onClick={() => setRecordingShortcut("find")}
                      >
                        {recordingShortcut === "find"
                          ? t("请按下快捷键…")
                          : shortcuts.find || t("未设置")}
                      </button>
                    </section>
                    <section>
                      <h3>{t("搜索当前项目")}</h3>
                      <p>{t("仅搜索文件栏中当前已勾选的文件类型。点击后直接录制组合键。")}</p>
                      <button
                        type="button"
                        className={`shortcut-recorder ${recordingShortcut === "projectFind" ? "is-recording" : ""}`}
                        aria-pressed={recordingShortcut === "projectFind"}
                        onClick={() => setRecordingShortcut("projectFind")}
                      >
                        {recordingShortcut === "projectFind"
                          ? t("请按下快捷键…")
                          : shortcuts.projectFind || t("未设置")}
                      </button>
                    </section>
                    <p className="shortcut-recorder-hint">
                      {t("支持 Ctrl / Shift / Alt 组合与功能键。按 Esc 取消；按 Backspace 或 Delete 清空。")}
                    </p>
                  </div>
                )}
          </SettingsDialog>
        )}
        {search && (
          <SearchDialog
            scope={search}
            query={query}
            matches={matches}
            onQueryChange={setQuery}
            onSearch={() => void runSearch()}
            onMatch={focusSearchMatch}
            onClose={() => setSearch(null)}
            t={t}
          />
        )}
        {error && (
          <ErrorDialog message={error} onClose={() => setError(undefined)} t={t} />
        )}
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
