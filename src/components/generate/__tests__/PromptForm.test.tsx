import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PromptForm } from "../PromptForm";

describe("PromptForm", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders textarea, placeholder and submit button", () => {
    render(
      <PromptForm promptText="" onPromptChange={vi.fn()} onSubmit={vi.fn()} isLoading={false} isDisabled={false} />
    );

    expect(screen.getByLabelText("Tekst źródłowy")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Wklej tekst, na podstawie którego wygeneruję fiszki (1000-10000 znaków)...")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generuj fiszki" })).toBeInTheDocument();
  });

  it("calls onPromptChange when user types", () => {
    const onPromptChange = vi.fn();

    render(
      <PromptForm
        promptText=""
        onPromptChange={onPromptChange}
        onSubmit={vi.fn()}
        isLoading={false}
        isDisabled={false}
      />
    );

    fireEvent.change(screen.getByLabelText("Tekst źródłowy"), {
      target: { value: "abc" },
    });
    expect(onPromptChange).toHaveBeenCalledWith("abc");
  });

  it("submits when enabled and blocks when disabled or loading", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    const { rerender } = render(
      <PromptForm
        promptText="tekst"
        onPromptChange={vi.fn()}
        onSubmit={onSubmit}
        isLoading={false}
        isDisabled={false}
      />
    );

    await user.click(screen.getByRole("button", { name: "Generuj fiszki" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);

    rerender(
      <PromptForm promptText="tekst" onPromptChange={vi.fn()} onSubmit={onSubmit} isLoading={false} isDisabled={true} />
    );
    await user.click(screen.getByRole("button", { name: "Generuj fiszki" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);

    rerender(
      <PromptForm promptText="tekst" onPromptChange={vi.fn()} onSubmit={onSubmit} isLoading={true} isDisabled={false} />
    );
    await user.click(screen.getByRole("button", { name: /Generowanie/ }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("shows counter with min hint for short prompt", () => {
    render(
      <PromptForm promptText="" onPromptChange={vi.fn()} onSubmit={vi.fn()} isLoading={false} isDisabled={false} />
    );

    expect(screen.getByText(/0\s*\/\s*10\s*000/)).toBeInTheDocument();
    expect(screen.getByText(/min\.\s*1\s*000/)).toBeInTheDocument();
  });

  it("shows loading label when generating", () => {
    render(
      <PromptForm promptText="tekst" onPromptChange={vi.fn()} onSubmit={vi.fn()} isLoading={true} isDisabled={false} />
    );

    expect(screen.getByRole("button", { name: /Generowanie/ })).toBeInTheDocument();
  });
});
