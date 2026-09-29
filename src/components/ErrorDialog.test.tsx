import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ErrorDialog } from "./ErrorDialog";

describe("ErrorDialog", () => {
  it("announces the error and dismisses it", () => {
    const onClose = vi.fn();
    render(<ErrorDialog message="Cannot read file" onClose={onClose} t={(key) => key} />);

    expect(screen.getByRole("alertdialog")).toHaveTextContent("Cannot read file");
    fireEvent.click(screen.getByRole("button", { name: "知道了" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
