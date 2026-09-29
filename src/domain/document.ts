import type { FileKind, FileNode } from "./types";

export const allFileKinds: FileKind[] = ["md", "json", "text", "csv"];

export function supportedFileKind(path: string): FileKind | undefined {
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

export function resolveWorkspaceLink(currentPath: string, href: string) {
  const rawPath = decodeURIComponent(href.split("#")[0]);
  if (/^file:\/\//i.test(rawPath))
    return rawPath
      .replace(/^file:\/\//i, "")
      .replace(/^\/([A-Za-z]:)/, "$1")
      .replaceAll("/", "\\");
  if (/^[A-Za-z]:[\\/]/.test(rawPath)) return rawPath.replaceAll("/", "\\");
  const parts = currentPath.split(/[\\/]+/).slice(0, -1);
  rawPath.split(/[\\/]+/).forEach((part) => {
    if (!part || part === ".") return;
    if (part === "..") parts.pop();
    else parts.push(part);
  });
  return parts.join("\\");
}

export function findNodeByPath(nodes: FileNode[], path: string): FileNode | undefined {
  for (const node of nodes) {
    if (node.path === path) return node;
    const child = node.children && findNodeByPath(node.children, path);
    if (child) return child;
  }
  return undefined;
}

export function lineRange(text: string, line: number) {
  let start = 0;
  for (let index = 1; index < line; index += 1) {
    const nextBreak = text.indexOf("\n", start);
    if (nextBreak < 0) return { start: text.length, end: text.length };
    start = nextBreak + 1;
  }
  const nextBreak = text.indexOf("\n", start);
  return { start, end: nextBreak < 0 ? text.length : nextBreak };
}

export function expandedPathsForFile(path: string) {
  const parts = path.split(/[\\/]+/);
  const paths = new Set<string>();
  let current = "";
  parts.slice(0, -1).forEach((part) => {
    current = current ? `${current}\\${part}` : part;
    paths.add(current);
  });
  return paths;
}
