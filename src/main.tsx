import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { check } from "@tauri-apps/plugin-updater";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Braces,
  FileText,
  Folder,
  Keyboard,
  Menu,
  Palette,
  Settings,
  SlidersHorizontal,
  Table2,
  Type,
} from "lucide-react";
import appIcon from "./assets/bettermd-icon.png";
import "./styles.css";

type FileKind = "md" | "json" | "text" | "csv";
type Node = {
  name: string;
  path: string;
  is_dir: boolean;
  extension?: FileKind;
  children?: Node[];
};
type Shortcut = { find: string; projectFind: string };
type ViewMode = "text" | "split" | "preview";
type Appearance = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  theme: "ide-dark" | "dim-dark";
};
type TextTypeSettings = { markdownView: ViewMode };
type StartupFile = { path: string; workspace: string };

const allKinds: FileKind[] = ["md", "json", "text", "csv"];
const labels: Record<FileKind, string> = {
  md: "Markdown (.md)",
  json: "JSON (.json)",
  text: "Text (.txt)",
  csv: "CSV (.csv)",
};
const initialShortcuts: Shortcut = {
  find: "Ctrl+F",
  projectFind: "Ctrl+Shift+F",
};
const storageKey = "better-md.shortcuts";
const recentFoldersKey = "better-md.recent-folders";
const appearanceKey = "better-md.appearance";
const defaultAppearance: Appearance = {
  fontFamily: "JetBrains Mono",
  fontSize: 13,
  lineHeight: 1.65,
  theme: "ide-dark",
};
const textTypeSettingsKey = "better-md.text-type-settings";
const defaultTextTypeSettings: TextTypeSettings = { markdownView: "split" };

function runningInTauri() {
  return Boolean(
    (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__,
  );
}

function normaliseKey(event: KeyboardEvent) {
  const parts: string[] = [];
  if (event.ctrlKey || event.metaKey) parts.push("Ctrl");
  if (event.shiftKey) parts.push("Shift");
  if (event.altKey) parts.push("Alt");
  const key = event.key.length === 1 ? event.key.toUpperCase() : event.key;
  if (!["Control", "Shift", "Alt", "Meta"].includes(key)) parts.push(key);
  return parts.join("+");
}

function supportedFileKind(path: string): FileKind | undefined {
  const extension = path.split(".").pop()?.toLowerCase();
  return extension === "md"
    ? "md"
    : extension === "json"
      ? "json"
      : extension === "txt"
        ? "text"
        : extension === "csv"
          ? "csv"
          : undefined;
}

function resolveWorkspaceLink(currentPath: string, href: string) {
  const rawPath = decodeURIComponent(href.split("#")[0]);
  if (/^file:\/\//i.test(rawPath))
    return rawPath
      .replace(/^file:\/\//i, "")
      .replace(/^\/([A-Za-z]:)/, "$1")
      .replaceAll("/", "\\");
  if (/^[A-Za-z]:[\\/]/.test(rawPath)) return rawPath.replaceAll("/", "\\");
  const parts = currentPath.split(/[\\/]+/).slice(0, -1);
  rawPath.split(/[\\/]+/).forEach((part) => {
    if (part === "..") parts.pop();
    else if (part && part !== ".") parts.push(part);
  });
  return parts.join("\\");
}

function Tree({
  nodes,
  expanded,
  onToggle,
  onOpen,
  activePath,
}: {
  nodes: Node[];
  expanded: Set<string>;
  onToggle(path: string): void;
  onOpen(node: Node): void;
  activePath?: string;
}) {
  return (
    <ul className="tree">
      {nodes.map((node) => (
        <li key={node.path}>
          {node.is_dir ? (
            <>
              <button
                className="tree-row folder"
                onClick={() => onToggle(node.path)}
              >
                <span>{expanded.has(node.path) ? "▾" : "▸"}</span> 📁{" "}
                {node.name}
              </button>
              {expanded.has(node.path) && (
                <Tree
                  nodes={node.children ?? []}
                  expanded={expanded}
                  onToggle={onToggle}
                  onOpen={onOpen}
                  activePath={activePath}
                />
              )}
            </>
          ) : (
            <button
              className={`tree-row file ${activePath === node.path ? "active" : ""}`}
              onClick={() => onOpen(node)}
            >
              📄 {node.name}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

function JsonValue({ value, depth = 0 }: { value: unknown; depth?: number }) {
  const color = `var(--json-pair-${depth % 6})`;
  if (Array.isArray(value)) {
    return (
      <details className="json-node" open>
        <summary>
          <span className="json-bracket" style={{ color }}>
            [
          </span>
          <span className="json-hint">{value.length} 项</span>
        </summary>
        <div className="json-children">
          {value.map((child, index) => (
            <div className="json-row" key={index}>
              <JsonValue value={child} depth={depth + 1} />
              {index < value.length - 1 && (
                <span className="json-comma">,</span>
              )}
            </div>
          ))}
        </div>
        <span className="json-bracket json-closing" style={{ color }}>
          ]
        </span>
      </details>
    );
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    return (
      <details className="json-node" open>
        <summary>
          <span className="json-bracket" style={{ color }}>
            {"{"}
          </span>
          <span className="json-hint">{entries.length} 项</span>
        </summary>
        <div className="json-children">
          {entries.map(([key, child], index) => (
            <div className="json-row" key={key}>
              <span className="json-key">{JSON.stringify(key)}: </span>
              <JsonValue value={child} depth={depth + 1} />
              {index < entries.length - 1 && (
                <span className="json-comma">,</span>
              )}
            </div>
          ))}
        </div>
        <span className="json-bracket json-closing" style={{ color }}>
          {"}"}
        </span>
      </details>
    );
  }
  return (
    <span className={`json-value ${value === null ? "null" : typeof value}`}>
      {JSON.stringify(value)}
    </span>
  );
}

function WindowChrome({
  menuOpen,
  onMenu,
  onSettings,
}: {
  menuOpen: boolean;
  onMenu(): void;
  onSettings(): void;
}) {
  const control = async (action: "minimize" | "maximize" | "close") => {
    if (!runningInTauri()) return;
    const appWindow = getCurrentWindow();
    if (action === "minimize") await appWindow.minimize();
    if (action === "maximize") await appWindow.toggleMaximize();
    if (action === "close") await appWindow.close();
  };
  return (
    <div className="window-chrome">
      <div className="chrome-brand">
        <img src={appIcon} alt="BetterMD" />
      </div>
      <button
        className={`chrome-menu ${menuOpen ? "active" : ""}`}
        title="主菜单"
        aria-label="主菜单"
        aria-expanded={menuOpen}
        onClick={onMenu}
      >
        <Menu size={20} strokeWidth={2} />
      </button>
      <div
        className="window-drag"
        data-tauri-drag-region
        onMouseDown={(event) => {
          if (event.button === 0 && runningInTauri())
            void getCurrentWindow().startDragging();
        }}
      >
        <span className="chrome-project">BetterMD</span>
        <span className="chrome-chevron">⌄</span>
      </div>
      <div className="window-controls">
        <button
          className="chrome-settings"
          title="设置"
          aria-label="设置"
          onClick={onSettings}
        >
          <Settings size={15} strokeWidth={1.8} />
        </button>
        <button
          title="最小化"
          aria-label="最小化"
          onClick={() => void control("minimize")}
        >
          −
        </button>
        <button
          title="最大化或还原"
          aria-label="最大化或还原"
          onClick={() => void control("maximize")}
        >
          □
        </button>
        <button
          className="close-window"
          title="关闭窗口"
          aria-label="关闭窗口"
          onClick={() => void control("close")}
        >
          ×
        </button>
      </div>
    </div>
  );
}

function App() {
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
    ...initialShortcuts,
    ...JSON.parse(localStorage.getItem(storageKey) || "{}"),
  }));
  const [settings, setSettings] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [recentMenuOpen, setRecentMenuOpen] = useState(false);
  const [settingsCategory, setSettingsCategory] = useState<
    "general" | "appearance" | "editor" | "shortcuts" | FileKind
  >("general");
  const [textTypesOpen, setTextTypesOpen] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [recentFolders, setRecentFolders] = useState<string[]>(() => {
    try {
      return JSON.parse(
        localStorage.getItem(recentFoldersKey) || "[]",
      ) as string[];
    } catch {
      return [];
    }
  });
  const [appearance, setAppearance] = useState<Appearance>(() => {
    try {
      return {
        ...defaultAppearance,
        ...JSON.parse(localStorage.getItem(appearanceKey) || "{}"),
      };
    } catch {
      return defaultAppearance;
    }
  });
  const [textTypeSettings, setTextTypeSettings] = useState<TextTypeSettings>(
    () => {
      try {
        return {
          ...defaultTextTypeSettings,
          ...JSON.parse(localStorage.getItem(textTypeSettingsKey) || "{}"),
        };
      } catch {
        return defaultTextTypeSettings;
      }
    },
  );
  const [search, setSearch] = useState<"file" | "project" | null>(null);
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<
    { path: string; line: number; text: string }[]
  >([]);
  const [error, setError] = useState<string>();
  const pendingUpdate = useRef<Awaited<ReturnType<typeof check>>>(null);
  const [updateStatus, setUpdateStatus] = useState<
    "idle" | "checking" | "available" | "current" | "installing" | "error"
  >("idle");
  const [updateVersion, setUpdateVersion] = useState<string>();

  const rescan = useCallback(
    async (folder = root, selected = kinds) => {
      if (!folder) return;
      const result = await invoke<Node[]>("scan_workspace", {
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
    if (root || !runningInTauri() || didHandleAssociatedFile.current) return;
    didHandleAssociatedFile.current = true;
    void invoke<StartupFile | null>("startup_file").then((file) => {
      if (file) void openWorkspace(file.workspace, file.path);
    });
  }, [root]);
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(shortcuts));
  }, [shortcuts]);
  useEffect(() => {
    localStorage.setItem(recentFoldersKey, JSON.stringify(recentFolders));
  }, [recentFolders]);
  useEffect(() => {
    localStorage.setItem(appearanceKey, JSON.stringify(appearance));
  }, [appearance]);
  useEffect(() => {
    localStorage.setItem(textTypeSettingsKey, JSON.stringify(textTypeSettings));
  }, [textTypeSettings]);
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
      const key = normaliseKey(event);
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
  }, [shortcuts, current, history, historyIndex]);
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
    if (!runningInTauri()) {
      setError(
        "“打开文件夹”需要在 Tauri 桌面应用中运行。请关闭浏览器页面，并在项目目录执行 npm run tauri dev。",
      );
      return;
    }
    try {
      const name =
        folder
          .split(/[\\/]+/)
          .filter(Boolean)
          .slice(-1)[0] || "工作区";
      const editor = new WebviewWindow(`editor-${Date.now()}`, {
        url: `/?workspace=${encodeURIComponent(folder)}${fileToOpen ? `&file=${encodeURIComponent(fileToOpen)}` : ""}`,
        title: `${name} — BetterMD`,
        width: 1280,
        height: 860,
        minWidth: 900,
        minHeight: 600,
        decorations: false,
        shadow: false,
      });
      editor.once("tauri://created", () => {
        void getCurrentWindow().close();
      });
      editor.once("tauri://error", (event) =>
        setError(`无法创建编辑器窗口：${String(event.payload)}`),
      );
    } catch (reason) {
      setError(`无法打开编辑器窗口：${String(reason)}`);
    }
  };
  const chooseFolder = async () => {
    if (!runningInTauri()) {
      setError(
        "“打开文件夹”需要在 Tauri 桌面应用中运行。请关闭浏览器页面，并在项目目录执行 npm run tauri dev。",
      );
      return;
    }
    try {
      const picked = await open({
        directory: true,
        multiple: false,
        title: "选择工作区文件夹",
      });
      if (typeof picked === "string") void openWorkspace(picked);
    } catch (reason) {
      setError(`无法打开文件夹选择器：${String(reason)}`);
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
      const fileContent = await invoke<string>("read_text_file", {
        path: node.path,
      });
      setCurrent(node);
      setContent(fileContent);
      setHistory([fileContent]);
      setHistoryIndex(0);
      setViewMode(
        node.extension === "md" ? textTypeSettings.markdownView : "text",
      );
      if (recordFileHistory) {
        const baseFileHistory = fileHistory.slice(0, fileHistoryIndex + 1);
        if (baseFileHistory[baseFileHistory.length - 1]?.path !== node.path) {
          const nextFileHistory = [...baseFileHistory, node].slice(-100);
          setFileHistory(nextFileHistory);
          setFileHistoryIndex(nextFileHistory.length - 1);
        }
      }
    } catch (reason) {
      setError(`无法打开链接文件：${String(reason)}`);
    }
  };
  const updateContent = (nextContent: string) => {
    setContent(nextContent);
    const baseHistory = history.slice(0, historyIndex + 1);
    if (baseHistory[baseHistory.length - 1] === nextContent) return;
    const nextHistory = [...baseHistory, nextContent].slice(-200);
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
  };
  const undo = () => {
    if (historyIndex > 0) {
      setContent(history[historyIndex - 1]);
      setHistoryIndex(historyIndex - 1);
    }
  };
  const redo = () => {
    if (historyIndex < history.length - 1) {
      setContent(history[historyIndex + 1]);
      setHistoryIndex(historyIndex + 1);
    }
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
    const parts = current.path.split(/[\\/]+/);
    const next = new Set<string>();
    let path = "";
    parts.slice(0, -1).forEach((part) => {
      path = path ? `${path}\\${part}` : part;
      next.add(path);
    });
    setExpanded(next);
  };
  const runSearch = async () => {
    if (!query.trim()) return setMatches([]);
    if (search === "file") {
      setMatches(
        content
          .split(/\r?\n/)
          .flatMap((text, index) =>
            text.toLowerCase().includes(query.toLowerCase())
              ? [{ path: current?.path ?? "", line: index + 1, text }]
              : [],
          ),
      );
    } else if (root)
      setMatches(
        await invoke("search_workspace", {
          root,
          extensions: [...kinds],
          query,
        }),
      );
  };
  const shownKinds = useMemo(() => [...kinds], [kinds]);

  const isMarkdown = current?.extension === "md";
  const isJson = current?.extension === "json";
  const parsedJson = useMemo(() => {
    if (!isJson) return undefined;
    try {
      return { value: JSON.parse(content) as unknown };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "JSON 格式无效",
      };
    }
  }, [content, isJson]);
  const modeLabels: Record<ViewMode, string> = {
    text: "纯文本",
    split: "对比预览",
    preview: "纯预览",
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
    if (!runningInTauri()) {
      setUpdateStatus("error");
      setError("检查更新仅在已安装的 BetterMD 桌面应用中可用。");
      return;
    }
    setUpdateStatus("checking");
    try {
      const update = await check();
      pendingUpdate.current = update;
      setUpdateVersion(update?.version);
      setUpdateStatus(update ? "available" : "current");
    } catch (reason) {
      setUpdateStatus("error");
      setError(`检查更新失败：${String(reason)}`);
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
      setError(`下载更新失败：${String(reason)}`);
    }
  };

  return (
    <div
      className="app-shell"
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
      />
      {menuOpen && (
        <div className="main-menu">
          <button disabled title="新建功能即将支持">
            <span>新建(N)</span>
            <i>›</i>
          </button>
          <button
            onClick={() => {
              closeMenu();
              void chooseFolder();
            }}
          >
            <span>▱&nbsp; 打开(O)…</span>
          </button>
          <button onClick={() => setRecentMenuOpen((open) => !open)}>
            <span>最近的项目(R)</span>
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
                <span>没有最近项目</span>
              )}
            </div>
          )}
          <button
            disabled={!root}
            onClick={() => void getCurrentWindow().close()}
          >
            <span>关闭项目(J)</span>
          </button>
          <hr />
          <button onClick={showSettings}>
            <span>⚙&nbsp; 设置(I)…</span>
            <kbd>Ctrl+Alt+S</kbd>
          </button>
        </div>
      )}
      <main className={!root ? "navigator-window" : ""}>
        {root && (
          <aside className={sidebarCollapsed ? "collapsed" : ""}>
            <header>
              <strong>
                项目 <span className="header-chevron">⌄</span>
              </strong>
              <span className="spacer" />
              <span className="sidebar-tools">
                <button
                  className="icon-button history-button"
                  title="后退到上一个打开的文件"
                  aria-label="后退到上一个打开的文件"
                  disabled={fileHistoryIndex <= 0}
                  onClick={() => navigateFileHistory(-1)}
                >
                  ←
                </button>
                <button
                  className="icon-button history-button"
                  title="前进到下一个打开的文件"
                  aria-label="前进到下一个打开的文件"
                  disabled={fileHistoryIndex >= fileHistory.length - 1}
                  onClick={() => navigateFileHistory(1)}
                >
                  →
                </button>
                <button
                  className="icon-button"
                  title="筛选显示的文件类型"
                  aria-label="筛选显示的文件类型"
                  aria-expanded={filtersOpen}
                  onClick={() => setFiltersOpen((open) => !open)}
                >
                  ☷
                </button>
                <button
                  className="icon-button"
                  title="定位当前编辑的文件"
                  aria-label="定位当前编辑的文件"
                  disabled={!current}
                  onClick={locateCurrent}
                >
                  ◎
                </button>
              </span>
            </header>
            {filtersOpen && (
              <div className="filters-popover">
                {allKinds.map((kind) => (
                  <label key={kind}>
                    <input
                      type="checkbox"
                      checked={kinds.has(kind)}
                      onChange={() => toggleKind(kind)}
                    />
                    {labels[kind]}
                  </label>
                ))}
                <div className="filter-summary" title={shownKinds.join(", ")}>
                  已选 {shownKinds.length}/4
                </div>
              </div>
            )}
            {root ? (
              <Tree
                nodes={tree}
                expanded={expanded}
                onToggle={(path) =>
                  setExpanded((old) => {
                    const next = new Set(old);
                    next.has(path) ? next.delete(path) : next.add(path);
                    return next;
                  })
                }
                onOpen={openFile}
                activePath={current?.path}
              />
            ) : (
              <p className="empty">选择一个文件夹以开始阅读。</p>
            )}
            <button
              className="collapse-handle"
              title={sidebarCollapsed ? "展开文件栏" : "收纳文件栏"}
              aria-label={sidebarCollapsed ? "展开文件栏" : "收纳文件栏"}
              onClick={() => setSidebarCollapsed((value) => !value)}
            >
              {sidebarCollapsed ? "›" : "‹"}
            </button>
          </aside>
        )}
        <section className="editor">
          {!root ? (
            <div className="welcome-page">
              <div className="welcome-card">
                <div className="app-mark">
                  <img src={appIcon} alt="BetterMD" />
                </div>
                <p className="eyebrow">BETTERMD</p>
                <h1>从一个文件夹开始</h1>
                <p className="welcome-copy">
                  阅读、编辑并对照预览本地的 Markdown、JSON、文本与 CSV 文件。
                </p>
                <div className="welcome-actions">
                  <button className="primary-action" onClick={chooseFolder}>
                    ⌘ 打开文件夹
                  </button>
                  <button
                    onClick={() => {
                      setSettingsCategory("general");
                      setSettings(true);
                    }}
                  >
                    ⚙ 偏好设置
                  </button>
                </div>
              </div>
              <div className="recent-folders">
                <div className="recent-heading">
                  <h2>最近打开</h2>
                  {recentFolders.length > 0 && (
                    <button
                      className="text-button"
                      onClick={() => setRecentFolders([])}
                    >
                      清除记录
                    </button>
                  )}
                </div>
                {recentFolders.length ? (
                  <div className="recent-list">
                    {recentFolders.map((folder) => (
                      <button
                        key={folder}
                        className="recent-item"
                        onClick={() => void openWorkspace(folder)}
                      >
                        <span className="recent-icon">
                          <Folder size={15} strokeWidth={1.8} />
                        </span>
                        <span>
                          <b>
                            {folder
                              .split(/[\\/]+/)
                              .filter(Boolean)
                              .at(-1)}
                          </b>
                          <small>{folder}</small>
                        </span>
                        <i>›</i>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="no-recent">
                    尚未打开过文件夹。你的历史记录只保存在本机。
                  </p>
                )}
              </div>
            </div>
          ) : (
            <>
              <header>
                <span>{current?.path ?? "未打开文件"}</span>
                <span className="spacer" />
                {isMarkdown && (
                  <div className="view-modes" aria-label="Markdown 视图模式">
                    {(["text", "split", "preview"] as ViewMode[]).map(
                      (mode) => (
                        <button
                          key={mode}
                          className={viewMode === mode ? "selected" : ""}
                          onClick={() => setViewMode(mode)}
                        >
                          {modeLabels[mode]}
                        </button>
                      ),
                    )}
                  </div>
                )}
                <button
                  onClick={() => {
                    setSettingsCategory("general");
                    setSettings(true);
                  }}
                >
                  ⚙ 设置
                </button>
              </header>
              <div
                className={`document-view ${isMarkdown ? `markdown-${viewMode}` : isJson ? "json-split" : "plain-text"}`}
              >
                {(!isMarkdown || viewMode !== "preview") && (
                  <textarea
                    aria-label="文件编辑器"
                    value={content}
                    onChange={(e) => updateContent(e.target.value)}
                    placeholder="从左侧打开文件"
                    disabled={!current}
                  />
                )}
                {isMarkdown && viewMode !== "text" && (
                  <article className="markdown-preview">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {content}
                    </ReactMarkdown>
                  </article>
                )}
                {isJson && (
                  <aside className="json-preview">
                    {parsedJson?.error ? (
                      <p className="json-error">{parsedJson.error}</p>
                    ) : (
                      <JsonValue value={parsedJson?.value} />
                    )}
                  </aside>
                )}
              </div>
            </>
          )}
        </section>
        {settings && (
          <div className="modal">
            <div className="settings-dialog">
              <nav>
                <div className="settings-brand">
                  <img src={appIcon} alt="" /> BetterMD
                </div>
                {(
                  [
                    { id: "general", label: "通用", icon: SlidersHorizontal },
                    { id: "appearance", label: "外观", icon: Palette },
                    { id: "editor", label: "编辑器", icon: FileText },
                    { id: "shortcuts", label: "快捷键", icon: Keyboard },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    className={settingsCategory === item.id ? "active" : ""}
                    onClick={() => setSettingsCategory(item.id)}
                  >
                    <span>
                      <item.icon size={14} strokeWidth={1.8} />
                    </span>
                    {item.label}
                  </button>
                ))}
                <button
                  className={`text-types-toggle ${["md", "json", "text", "csv"].includes(settingsCategory) ? "active" : ""}`}
                  onClick={() => setTextTypesOpen((open) => !open)}
                >
                  <span>
                    <Type size={14} strokeWidth={1.8} />
                  </span>
                  文本类型 <i>{textTypesOpen ? "⌄" : "›"}</i>
                </button>
                {textTypesOpen && (
                  <div className="text-type-submenu">
                    {allKinds.map((kind) => (
                      <button
                        key={kind}
                        className={settingsCategory === kind ? "active" : ""}
                        onClick={() => setSettingsCategory(kind)}
                      >
                        {kind === "md" ? (
                          <>
                            <FileText size={13} />
                            Markdown
                          </>
                        ) : kind === "json" ? (
                          <>
                            <Braces size={13} />
                            JSON
                          </>
                        ) : kind === "csv" ? (
                          <>
                            <Table2 size={13} />
                            CSV
                          </>
                        ) : (
                          <>
                            <Type size={13} />
                            Text
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </nav>
              <div className="settings-content">
                <header>
                  <div>
                    <p className="eyebrow">偏好设置</p>
                    <h2>
                      {settingsCategory === "general"
                        ? "通用"
                        : settingsCategory === "appearance"
                          ? "外观"
                          : settingsCategory === "editor"
                            ? "编辑器"
                            : settingsCategory === "shortcuts"
                              ? "快捷键"
                              : settingsCategory === "md"
                                ? "Markdown"
                                : labels[settingsCategory]}
                    </h2>
                  </div>
                  <button
                    className="close-button"
                    title="关闭设置"
                    onClick={() => setSettings(false)}
                  >
                    ×
                  </button>
                </header>
                {settingsCategory === "general" && (
                  <div className="settings-panel">
                    <section>
                      <h3>应用更新</h3>
                      <p>
                        {updateStatus === "available"
                          ? `发现 BetterMD ${updateVersion}，可下载并安装。`
                          : updateStatus === "current"
                            ? "当前已是最新版本。"
                            : updateStatus === "checking"
                              ? "正在检查更新…"
                              : updateStatus === "installing"
                                ? "正在下载并安装更新…"
                                : "从 BetterMD 的正式发布版本检查更新。"}
                      </p>
                      {updateStatus === "available" ? (
                        <button onClick={() => void installUpdate()}>
                          下载并安装 {updateVersion}
                        </button>
                      ) : (
                        <button
                          onClick={() => void checkForUpdates()}
                          disabled={
                            updateStatus === "checking" ||
                            updateStatus === "installing"
                          }
                        >
                          检查更新
                        </button>
                      )}
                    </section>
                    <section>
                      <h3>最近打开</h3>
                      <p>
                        最近文件夹仅保存在当前设备，可从启动页快速重新打开。
                      </p>
                      <button
                        onClick={() => setRecentFolders([])}
                        disabled={!recentFolders.length}
                      >
                        清除最近记录
                      </button>
                    </section>
                  </div>
                )}
                {settingsCategory === "appearance" && (
                  <div className="settings-panel">
                    <section>
                      <h3>编辑器字体</h3>
                      <p>仅影响源文本编辑区，不影响 Markdown 预览排版。</p>
                      <label>
                        字体
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
                        字号
                        <input
                          type="number"
                          min="11"
                          max="24"
                          value={appearance.fontSize}
                          onChange={(e) =>
                            setAppearance((value) => ({
                              ...value,
                              fontSize: Math.max(
                                11,
                                Math.min(24, Number(e.target.value) || 13),
                              ),
                            }))
                          }
                        />
                      </label>
                      <label>
                        行间距
                        <input
                          type="number"
                          min="1.2"
                          max="2.4"
                          step="0.05"
                          value={appearance.lineHeight}
                          onChange={(e) =>
                            setAppearance((value) => ({
                              ...value,
                              lineHeight: Math.max(
                                1.2,
                                Math.min(2.4, Number(e.target.value) || 1.65),
                              ),
                            }))
                          }
                        />
                      </label>
                    </section>
                    <section>
                      <h3>皮肤</h3>
                      <p>
                        选择更贴近 JetBrains IDE
                        的基础深色，或层次更柔和的暗色皮肤。
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
                          IDE 深色
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
                          柔和暗色
                        </button>
                      </div>
                    </section>
                  </div>
                )}
                {settingsCategory === "editor" && (
                  <div className="settings-panel">
                    <section>
                      <h3>Markdown 默认视图</h3>
                      <p>
                        新打开的 Markdown
                        文件默认进入对比预览模式，以便同时查看源内容和渲染结果。
                      </p>
                      <span className="setting-value">对比预览</span>
                    </section>
                    <section>
                      <h3>后续设置</h3>
                      <p>
                        这里将承载自动换行、缩进、保存策略和语言高亮等编辑器偏好。
                      </p>
                    </section>
                  </div>
                )}
                {settingsCategory === "md" && (
                  <div className="settings-panel text-type-panel">
                    <section>
                      <h3>默认预览方式</h3>
                      <p>之后每次打开 Markdown 文件时，都会自动使用此视图。</p>
                      <div className="theme-options view-default-options">
                        {(
                          [
                            ["text", "纯文本"],
                            ["split", "对比预览"],
                            ["preview", "纯预览"],
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
                {settingsCategory === "json" && (
                  <div className="settings-panel text-type-panel">
                    <section>
                      <h3>JSON</h3>
                      <p>JSON 的树形预览、格式化和校验选项将在这里提供。</p>
                    </section>
                  </div>
                )}
                {settingsCategory === "text" && (
                  <div className="settings-panel text-type-panel">
                    <section>
                      <h3>文本</h3>
                      <p>纯文本的换行、编码和阅读宽度选项将在这里提供。</p>
                    </section>
                  </div>
                )}
                {settingsCategory === "csv" && (
                  <div className="settings-panel text-type-panel">
                    <section>
                      <h3>CSV</h3>
                      <p>CSV 的分隔符、首行表头和表格视图选项将在这里提供。</p>
                    </section>
                  </div>
                )}
                {settingsCategory === "shortcuts" && (
                  <div className="settings-panel">
                    <section>
                      <h3>搜索当前文件</h3>
                      <p>在当前正在编辑的文件中搜索。</p>
                      <input
                        value={shortcuts.find}
                        onChange={(e) =>
                          setShortcuts((x) => ({ ...x, find: e.target.value }))
                        }
                      />
                    </section>
                    <section>
                      <h3>搜索当前项目</h3>
                      <p>仅搜索文件栏中当前已勾选的文件类型。</p>
                      <input
                        value={shortcuts.projectFind}
                        onChange={(e) =>
                          setShortcuts((x) => ({
                            ...x,
                            projectFind: e.target.value,
                          }))
                        }
                      />
                    </section>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {search && (
          <div className="modal">
            <div className="dialog">
              <h2>{search === "file" ? "搜索当前文件" : "搜索当前项目"}</h2>
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void runSearch()}
                placeholder="输入关键词，按 Enter 搜索"
              />
              {matches.map((match) => (
                <button
                  className="result"
                  key={`${match.path}:${match.line}`}
                  onClick={() => setSearch(null)}
                >
                  <b>
                    {match.path
                      ? `${match.path}:${match.line}`
                      : `第 ${match.line} 行`}
                  </b>
                  <span>{match.text}</span>
                </button>
              ))}
              <button onClick={() => setSearch(null)}>关闭</button>
            </div>
          </div>
        )}
        {error && (
          <div className="modal">
            <div className="dialog">
              <h2>无法执行此操作</h2>
              <p>{error}</p>
              <button onClick={() => setError(undefined)}>知道了</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
