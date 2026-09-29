import type { FileNode } from "../domain/types";

type FileTreeProps = {
  nodes: FileNode[];
  expanded: Set<string>;
  onToggle(path: string): void;
  onOpen(node: FileNode): void;
  activePath?: string;
};

export function FileTree({ nodes, expanded, onToggle, onOpen, activePath }: FileTreeProps) {
  return (
    <ul className="tree">
      {nodes.map((node) => (
        <li key={node.path}>
          {node.is_dir ? (
            <>
              <button className="tree-row folder" onClick={() => onToggle(node.path)}>
                <span>{expanded.has(node.path) ? "▾" : "▸"}</span> 📁 {node.name}
              </button>
              {expanded.has(node.path) && (
                <FileTree
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
