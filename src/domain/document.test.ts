import { describe, expect, it } from "vitest";
import {
  expandedPathsForFile,
  findNodeByPath,
  lineRange,
  resolveWorkspaceLink,
  supportedFileKind,
} from "./document";

describe("document domain", () => {
  it("recognises only supported document types", () => {
    expect(supportedFileKind("README.MD")).toBe("md");
    expect(supportedFileKind("notes.txt")).toBe("text");
    expect(supportedFileKind("image.png")).toBeUndefined();
  });

  it("resolves relative markdown links within the workspace", () => {
    expect(resolveWorkspaceLink("D:\\docs\\guide\\readme.md", "../api.json"))
      .toBe("D:\\docs\\api.json");
    expect(resolveWorkspaceLink("D:\\docs\\guide\\readme.md", "./notes.txt"))
      .toBe("D:\\docs\\guide\\notes.txt");
  });

  it("finds nested nodes and computes a line range", () => {
    const nodes = [{ name: "docs", path: "D:\\docs", is_dir: true, children: [
      { name: "readme.md", path: "D:\\docs\\readme.md", is_dir: false, extension: "md" as const },
    ] }];
    expect(findNodeByPath(nodes, "D:\\docs\\readme.md")?.name).toBe("readme.md");
    expect(lineRange("first\nsecond\nthird", 2)).toEqual({ start: 6, end: 12 });
    expect([...expandedPathsForFile("D:\\docs\\guide\\readme.md")])
      .toEqual(["D:", "D:\\docs", "D:\\docs\\guide"]);
  });
});
