import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CardEditForm } from "../CardEditForm";

describe("CardEditForm", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders fields with initial values", () => {
    render(<CardEditForm initialFront="Front" initialBack="Back" onSave={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByLabelText("Przód")).toHaveValue("Front");
    expect(screen.getByLabelText("Tył")).toHaveValue("Back");
  });

  it("disables save when fields are invalid and enables when valid", async () => {
    const user = userEvent.setup();

    render(<CardEditForm initialFront="Front" initialBack="Back" onSave={vi.fn()} onCancel={vi.fn()} />);

    const saveButton = screen.getByRole("button", { name: "Zapisz" });
    expect(saveButton).toBeEnabled();

    await user.clear(screen.getByLabelText("Przód"));
    expect(saveButton).toBeDisabled();

    await user.type(screen.getByLabelText("Przód"), "A");
    expect(saveButton).toBeEnabled();
  });

  it("trims values before calling onSave", () => {
    const onSave = vi.fn();

    render(<CardEditForm initialFront=" Front " initialBack=" Back " onSave={onSave} onCancel={vi.fn()} />);

    fireEvent.submit(screen.getByRole("button", { name: "Zapisz" }));
    expect(onSave).toHaveBeenCalledWith("Front", "Back");
  });

  it("calls onCancel on Escape (field and global)", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();

    render(<CardEditForm initialFront="Front" initialBack="Back" onSave={vi.fn()} onCancel={onCancel} />);

    await user.click(screen.getByLabelText("Przód"));
    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledTimes(1);

    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it("saves when clicking outside the form", async () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    const user = userEvent.setup();

    render(
      <div>
        <CardEditForm initialFront="Front" initialBack="Back" onSave={onSave} onCancel={onCancel} />
        <button type="button">Outside</button>
      </div>
    );

    await user.click(screen.getByText("Outside"));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith("Front", "Back");
    expect(onCancel).not.toHaveBeenCalled();
  });
});
