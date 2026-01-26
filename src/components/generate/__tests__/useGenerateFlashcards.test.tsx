import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { useGenerateFlashcards } from "../useGenerateFlashcards";
import { ApiError } from "../../../lib/api/api-error";
import type { CardProposalDTO } from "@/types";

/*
  Dlaczego renderHook:
  - pozwala testowac logike hooka bez budowania sztucznego komponentu opakowujacego,
  - ulatwia weryfikacje przejsc stanu i efektow ubocznych w izolacji od UI,
  - skraca testy i ogranicza ryzyko, ze testujemy render zamiast logiki.
*/

const createGenerationMock = vi.hoisted(() => vi.fn());
const createCardsMock = vi.hoisted(() => vi.fn());
const toastSuccessMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/generations", () => ({
  createGeneration: createGenerationMock,
}));
vi.mock("@/lib/api/cards", () => ({
  createCards: createCardsMock,
}));
vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessMock,
  },
}));

const makePrompt = (length: number) => "a".repeat(length);

const makeProposals = (count: number): CardProposalDTO[] =>
  Array.from({ length: count }, (_, index) => ({
    front: `Front ${index + 1}`,
    back: `Back ${index + 1}`,
    source: "ai_created",
  }));

describe("useGenerateFlashcards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("crypto", { randomUUID: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("validates prompt length and clears error on text change", async () => {
    const { result } = renderHook(() => useGenerateFlashcards());

    act(() => result.current.setPromptText(makePrompt(999)));
    expect(result.current.isPromptValid).toBe(false);

    act(() => result.current.setPromptText(makePrompt(1000)));
    expect(result.current.isPromptValid).toBe(true);

    act(() => result.current.setPromptText(makePrompt(10001)));
    expect(result.current.isPromptValid).toBe(false);

    createGenerationMock.mockRejectedValueOnce(new ApiError(400, "validation_error", "prompt_text_too_short"));

    act(() => result.current.setPromptText(makePrompt(1000)));
    await act(async () => {
      await result.current.generateProposals();
    });

    expect(result.current.state.error?.type).toBe("validation_error");

    act(() => result.current.setPromptText(makePrompt(1000)));
    expect(result.current.state.error).toBeNull();
  });

  it("maps generated proposals into view model and sets generation id", async () => {
    const proposals = makeProposals(2);
    const randomUUID = vi.mocked(crypto.randomUUID);
    randomUUID
      .mockReturnValueOnce("00000000-0000-0000-0000-000000000001")
      .mockReturnValueOnce("00000000-0000-0000-0000-000000000002");

    createGenerationMock.mockResolvedValueOnce({
      id: 12,
      card_proposals: proposals,
    });

    const { result } = renderHook(() => useGenerateFlashcards());

    act(() => result.current.setPromptText(makePrompt(1000)));
    await act(async () => {
      await result.current.generateProposals();
    });

    await waitFor(() => {
      expect(result.current.state.isGenerating).toBe(false);
    });

    expect(result.current.state.generationId).toBe(12);
    expect(result.current.state.proposals).toHaveLength(2);
    expect(result.current.state.proposals[0]).toMatchObject({
      id: "00000000-0000-0000-0000-000000000001",
      front: "Front 1",
      back: "Back 1",
      originalFront: "Front 1",
      originalBack: "Back 1",
      source: "ai_created",
      status: "pending",
    });
  });

  it.each([
    {
      error: new ApiError(0, "network_error"),
      expected: "network_error",
    },
    {
      error: new ApiError(400, "validation_error", "prompt_text_too_short"),
      expected: "validation_error",
    },
    {
      error: new ApiError(409, "duplicate_prompt"),
      expected: "duplicate_prompt",
    },
    {
      error: new ApiError(500, "server_error"),
      expected: "server_error",
    },
  ])("maps ApiError to $expected", async ({ error, expected }) => {
    createGenerationMock.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useGenerateFlashcards());
    act(() => result.current.setPromptText(makePrompt(1000)));

    await act(async () => {
      await result.current.generateProposals();
    });

    expect(result.current.state.error?.type).toBe(expected);
  });

  it("updates proposal status for single actions and cancel edit resets content", async () => {
    const randomUUID = vi.mocked(crypto.randomUUID);
    const proposalId = "00000000-0000-0000-0000-000000000001";
    randomUUID.mockReturnValueOnce(proposalId);

    createGenerationMock.mockResolvedValueOnce({
      id: 7,
      card_proposals: makeProposals(1),
    });

    const { result } = renderHook(() => useGenerateFlashcards());

    act(() => result.current.setPromptText(makePrompt(1000)));
    await act(async () => {
      await result.current.generateProposals();
    });

    act(() => result.current.handleProposalAction(proposalId, "edit"));
    expect(result.current.state.proposals[0].status).toBe("editing");

    act(() => result.current.handleProposalEdit(proposalId, "Nowy front", "Nowy back"));
    expect(result.current.state.proposals[0]).toMatchObject({
      status: "accepted",
      source: "ai_edited",
      front: "Nowy front",
      back: "Nowy back",
    });

    act(() => result.current.handleProposalAction(proposalId, "cancel_edit"));
    expect(result.current.state.proposals[0]).toMatchObject({
      status: "pending",
      front: "Front 1",
      back: "Back 1",
    });

    act(() => result.current.handleProposalAction(proposalId, "accept"));
    expect(result.current.state.proposals[0].status).toBe("accepted");
  });

  it("does not override editing proposal on bulk action", async () => {
    const randomUUID = vi.mocked(crypto.randomUUID);
    randomUUID
      .mockReturnValueOnce("00000000-0000-0000-0000-000000000001")
      .mockReturnValueOnce("00000000-0000-0000-0000-000000000002");

    createGenerationMock.mockResolvedValueOnce({
      id: 9,
      card_proposals: makeProposals(2),
    });

    const { result } = renderHook(() => useGenerateFlashcards());

    act(() => result.current.setPromptText(makePrompt(1000)));
    await act(async () => {
      await result.current.generateProposals();
    });

    act(() => result.current.handleProposalAction("00000000-0000-0000-0000-000000000001", "edit"));
    act(() => result.current.handleBulkAction("accept_all"));

    const [first, second] = result.current.state.proposals;
    expect(first.status).toBe("editing");
    expect(second.status).toBe("accepted");
  });

  it("does not call save when missing generation id or accepted cards", async () => {
    const { result } = renderHook(() => useGenerateFlashcards());

    await act(async () => {
      await result.current.saveAcceptedCards();
    });

    expect(createCardsMock).not.toHaveBeenCalled();
  });

  it("saves accepted cards and resets state", async () => {
    const randomUUID = vi.mocked(crypto.randomUUID);
    randomUUID
      .mockReturnValueOnce("00000000-0000-0000-0000-000000000001")
      .mockReturnValueOnce("00000000-0000-0000-0000-000000000002");

    createGenerationMock.mockResolvedValueOnce({
      id: 21,
      card_proposals: makeProposals(2),
    });
    createCardsMock.mockResolvedValueOnce({ inserted: 2 });

    const { result } = renderHook(() => useGenerateFlashcards());

    act(() => result.current.setPromptText(makePrompt(1000)));
    await act(async () => {
      await result.current.generateProposals();
    });

    act(() => result.current.handleProposalAction("00000000-0000-0000-0000-000000000001", "accept"));
    await act(async () => {
      await result.current.saveAcceptedCards();
    });

    expect(createCardsMock).toHaveBeenCalledWith({
      cards: [
        {
          front: "Front 1",
          back: "Back 1",
          source: "ai_created",
          generation_id: 21,
        },
      ],
    });
    expect(result.current.state.proposals).toHaveLength(0);
    expect(result.current.state.generationId).toBeNull();
    expect(result.current.state.promptText).toBe("");
    expect(toastSuccessMock).toHaveBeenCalled();
  });

  it("sets save_error when saveAcceptedCards fails", async () => {
    const randomUUID = vi.mocked(crypto.randomUUID);
    randomUUID.mockReturnValueOnce("00000000-0000-0000-0000-000000000001");

    createGenerationMock.mockResolvedValueOnce({
      id: 31,
      card_proposals: makeProposals(1),
    });
    createCardsMock.mockRejectedValueOnce(new ApiError(500, "server_error", "db_error"));

    const { result } = renderHook(() => useGenerateFlashcards());

    act(() => result.current.setPromptText(makePrompt(1000)));
    await act(async () => {
      await result.current.generateProposals();
    });

    act(() => result.current.handleProposalAction("00000000-0000-0000-0000-000000000001", "accept"));
    await act(async () => {
      await result.current.saveAcceptedCards();
    });

    expect(result.current.state.error?.type).toBe("save_error");
  });

  it("blocks saveAllProposals when any proposal is editing", async () => {
    const randomUUID = vi.mocked(crypto.randomUUID);
    randomUUID.mockReturnValueOnce("00000000-0000-0000-0000-000000000001");

    createGenerationMock.mockResolvedValueOnce({
      id: 42,
      card_proposals: makeProposals(1),
    });

    const { result } = renderHook(() => useGenerateFlashcards());

    act(() => result.current.setPromptText(makePrompt(1000)));
    await act(async () => {
      await result.current.generateProposals();
    });

    act(() => result.current.handleProposalAction("00000000-0000-0000-0000-000000000001", "edit"));
    await act(async () => {
      await result.current.saveAllProposals();
    });

    expect(createCardsMock).not.toHaveBeenCalled();
    expect(result.current.state.error?.message).toBe("Zakończ edycję wszystkich fiszek przed zapisem.");
  });

  it("saves all proposals and resets state", async () => {
    const randomUUID = vi.mocked(crypto.randomUUID);
    randomUUID
      .mockReturnValueOnce("00000000-0000-0000-0000-000000000001")
      .mockReturnValueOnce("00000000-0000-0000-0000-000000000002");

    createGenerationMock.mockResolvedValueOnce({
      id: 55,
      card_proposals: makeProposals(2),
    });
    createCardsMock.mockResolvedValueOnce({ inserted: 2 });

    const { result } = renderHook(() => useGenerateFlashcards());

    act(() => result.current.setPromptText(makePrompt(1000)));
    await act(async () => {
      await result.current.generateProposals();
    });

    await act(async () => {
      await result.current.saveAllProposals();
    });

    expect(createCardsMock).toHaveBeenCalledWith({
      cards: [
        {
          front: "Front 1",
          back: "Back 1",
          source: "ai_created",
          generation_id: 55,
        },
        {
          front: "Front 2",
          back: "Back 2",
          source: "ai_created",
          generation_id: 55,
        },
      ],
    });
    expect(result.current.state.proposals).toHaveLength(0);
    expect(result.current.state.generationId).toBeNull();
  });

  it("retries last action for generate and save after failure", async () => {
    const randomUUID = vi.mocked(crypto.randomUUID);
    const proposalId = "00000000-0000-0000-0000-000000000001";
    randomUUID.mockReturnValueOnce(proposalId).mockReturnValueOnce(proposalId);

    createGenerationMock.mockResolvedValue({
      id: 77,
      card_proposals: makeProposals(1),
    });

    const { result } = renderHook(() => useGenerateFlashcards());

    act(() => result.current.setPromptText(makePrompt(1000)));
    await act(async () => {
      await result.current.generateProposals();
    });
    await act(async () => {
      await result.current.retryLastAction();
    });

    expect(createGenerationMock).toHaveBeenCalledTimes(2);

    createCardsMock.mockRejectedValueOnce(new ApiError(500, "server_error"));
    act(() => result.current.handleProposalAction(proposalId, "accept"));
    await act(async () => {
      await result.current.saveAcceptedCards();
    });

    expect(result.current.state.error?.type).toBe("save_error");

    createCardsMock.mockResolvedValueOnce({ inserted: 1 });
    await act(async () => {
      await result.current.retryLastAction();
    });

    expect(createCardsMock).toHaveBeenCalledTimes(2);
  });
});
