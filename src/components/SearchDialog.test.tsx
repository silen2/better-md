import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SearchDialog } from "./SearchDialog";

const t = (key: string, values?: Record<string, string | number>) =>
  key === "第 {line} 行" ? `第 ${values?.line} 行` : key;

describe("SearchDialog", () => {
  it("submits on Enter and opens selected results", () => {
    const onSearch = vi.fn();
    const onMatch = vi.fn();
    render(
      <SearchDialog
        scope="file"
        query="needle"
        matches={[{ path: "", line: 3, text: "a needle" }]}
        onQueryChange={vi.fn()}
        onSearch={onSearch}
        onMatch={onMatch}
        onClose={vi.fn()}
        t={t}
      />,
    );

    fireEvent.keyDown(screen.getByDisplayValue("needle"), { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: /第 3 行/ }));
    expect(onSearch).toHaveBeenCalledOnce();
    expect(onMatch).toHaveBeenCalledWith({ path: "", line: 3, text: "a needle" });
  });
});
