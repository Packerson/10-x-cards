import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import type { GenerateViewState, ProposalViewModel, ProposalAction, GenerateErrorType, BulkActionType } from "./types";
import type { CardProposalDTO } from "@/types";
import { createGeneration } from "@/lib/api/generations";
import { createCards } from "@/lib/api/cards";
import { ApiError } from "@/lib/api/api-error";
import { MIN_PROMPT_LENGTH, MAX_PROMPT_LENGTH } from "@/lib/validators/generations";

const initialState: GenerateViewState = {
  promptText: "",
  isGenerating: false,
  isSaving: false,
  error: null,
  generationId: null,
  proposals: [],
};

function generateLocalId(): string {
  return crypto.randomUUID();
}

function mapProposalToViewModel(proposal: CardProposalDTO): ProposalViewModel {
  return {
    id: generateLocalId(),
    front: proposal.front,
    back: proposal.back,
    originalFront: proposal.front,
    originalBack: proposal.back,
    source: proposal.source,
    status: "pending",
  };
}

function mapApiErrorToType(error: ApiError): GenerateErrorType {
  if (error.isNetworkError()) return "network_error";
  if (error.isValidationError()) return "validation_error";
  if (error.isDuplicatePrompt()) return "duplicate_prompt";
  return "server_error";
}

export interface UseGenerateFlashcardsReturn {
  state: GenerateViewState;
  isPromptValid: boolean;
  acceptedCount: number;
  rejectedCount: number;
  pendingCount: number;
  setPromptText: (text: string) => void;
  generateProposals: () => Promise<void>;
  handleProposalAction: (id: string, action: ProposalAction) => void;
  handleProposalEdit: (id: string, front: string, back: string) => void;
  handleBulkAction: (action: BulkActionType) => void;
  saveAcceptedCards: () => Promise<void>;
  saveAllProposals: () => Promise<void>;
  clearAllProposals: () => void;
  dismissError: () => void;
  retryLastAction: () => void;
}

export function useGenerateFlashcards(): UseGenerateFlashcardsReturn {
  const [state, setState] = useState<GenerateViewState>(initialState);
  const [lastAction, setLastAction] = useState<"generate" | "save_selected" | "save_all" | null>(null);

  const isPromptValid = useMemo(() => {
    const len = state.promptText.length;
    return len >= MIN_PROMPT_LENGTH && len <= MAX_PROMPT_LENGTH;
  }, [state.promptText]);

  const acceptedCount = useMemo(() => state.proposals.filter((p) => p.status === "accepted").length, [state.proposals]);

  const rejectedCount = useMemo(() => state.proposals.filter((p) => p.status === "rejected").length, [state.proposals]);

  const pendingCount = useMemo(() => state.proposals.filter((p) => p.status === "pending").length, [state.proposals]);

  const setPromptText = useCallback((text: string) => {
    setState((prev) => ({ ...prev, promptText: text, error: null }));
  }, []);

  const generateProposals = useCallback(async () => {
    setState((prev) => ({ ...prev, isGenerating: true, error: null }));
    setLastAction("generate");

    try {
      const result = await createGeneration({ prompt_text: state.promptText });

      const proposals = result.card_proposals.map(mapProposalToViewModel);

      setState((prev) => ({
        ...prev,
        isGenerating: false,
        generationId: result.id,
        proposals,
      }));
    } catch (err) {
      const apiError = err instanceof ApiError ? err : new ApiError(0, "server_error");
      setState((prev) => ({
        ...prev,
        isGenerating: false,
        error: {
          type: mapApiErrorToType(apiError),
          message: apiError.details as string | undefined,
        },
      }));
    }
  }, [state.promptText]);

  const handleProposalAction = useCallback((id: string, action: ProposalAction) => {
    setState((prev) => ({
      ...prev,
      proposals: prev.proposals.map((p) => {
        if (p.id !== id) return p;

        switch (action) {
          case "accept":
            return { ...p, status: "accepted" as const };
          case "reject":
            return { ...p, status: "rejected" as const };
          case "edit":
            return { ...p, status: "editing" as const };
          case "cancel_edit":
            return {
              ...p,
              front: p.originalFront,
              back: p.originalBack,
              status: "pending" as const,
            };
          default:
            return p;
        }
      }),
    }));
  }, []);

  const handleProposalEdit = useCallback((id: string, front: string, back: string) => {
    setState((prev) => ({
      ...prev,
      proposals: prev.proposals.map((p) => {
        if (p.id !== id) return p;

        const wasEdited = front !== p.originalFront || back !== p.originalBack;

        return {
          ...p,
          front,
          back,
          source: wasEdited ? "ai_edited" : p.source,
          status: "accepted" as const,
        };
      }),
    }));
  }, []);

  const handleBulkAction = useCallback((action: BulkActionType) => {
    setState((prev) => ({
      ...prev,
      proposals: prev.proposals.map((p) => {
        if (p.status === "editing") return p;
        if (action === "accept_all") return { ...p, status: "accepted" as const };
        if (action === "reject_all") return { ...p, status: "rejected" as const };
        return p;
      }),
    }));
  }, []);

  const saveAcceptedCards = useCallback(async () => {
    const generationId = state.generationId;
    if (!generationId) return;

    const acceptedProposals = state.proposals.filter((p) => p.status === "accepted");
    if (acceptedProposals.length === 0) return;

    setState((prev) => ({ ...prev, isSaving: true, error: null }));
    setLastAction("save_selected");

    try {
      const result = await createCards({
        cards: acceptedProposals.map((p) => ({
          front: p.front,
          back: p.back,
          source: p.source,
          generation_id: generationId,
        })),
      });

      // Po zapisie czyścimy propozycje i prompt
      setState((prev) => ({
        ...prev,
        isSaving: false,
        promptText: "",
        generationId: null,
        proposals: [],
      }));

      toast.success(`Zapisano ${result.inserted} ${result.inserted === 1 ? "fiszkę" : "fiszek"}`, {
        description: "Fiszki zostały dodane do Twojej kolekcji.",
      });
    } catch (err) {
      const apiError = err instanceof ApiError ? err : new ApiError(0, "server_error");
      setState((prev) => ({
        ...prev,
        isSaving: false,
        error: {
          type: "save_error",
          message: apiError.details as string | undefined,
        },
      }));
    }
  }, [state.generationId, state.proposals]);

  const saveAllProposals = useCallback(async () => {
    const generationId = state.generationId;
    if (!generationId) return;
    if (state.proposals.length === 0) return;

    const hasEditing = state.proposals.some((p) => p.status === "editing");
    if (hasEditing) {
      setState((prev) => ({
        ...prev,
        error: {
          type: "save_error",
          message: "Zakończ edycję wszystkich fiszek przed zapisem.",
        },
      }));
      return;
    }

    setState((prev) => ({ ...prev, isSaving: true, error: null }));
    setLastAction("save_all");

    try {
      const result = await createCards({
        cards: state.proposals.map((p) => ({
          front: p.front,
          back: p.back,
          source: p.source,
          generation_id: generationId,
        })),
      });

      setState((prev) => ({
        ...prev,
        isSaving: false,
        promptText: "",
        generationId: null,
        proposals: [],
      }));

      toast.success(`Zapisano ${result.inserted} ${result.inserted === 1 ? "fiszkę" : "fiszek"}`, {
        description: "Fiszki zostały dodane do Twojej kolekcji.",
      });
    } catch (err) {
      const apiError = err instanceof ApiError ? err : new ApiError(0, "server_error");
      setState((prev) => ({
        ...prev,
        isSaving: false,
        error: {
          type: "save_error",
          message: apiError.details as string | undefined,
        },
      }));
    }
  }, [state.generationId, state.proposals]);

  const clearAllProposals = useCallback(() => {
    setState((prev) => ({
      ...prev,
      proposals: [],
      generationId: null,
      error: null,
    }));
    setLastAction(null);
  }, []);

  const dismissError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const retryLastAction = useCallback(() => {
    if (lastAction === "generate") {
      generateProposals();
    } else if (lastAction === "save_selected") {
      saveAcceptedCards();
    } else if (lastAction === "save_all") {
      saveAllProposals();
    }
  }, [lastAction, generateProposals, saveAcceptedCards, saveAllProposals]);

  return {
    state,
    isPromptValid,
    acceptedCount,
    rejectedCount,
    pendingCount,
    setPromptText,
    generateProposals,
    handleProposalAction,
    handleProposalEdit,
    handleBulkAction,
    saveAcceptedCards,
    saveAllProposals,
    clearAllProposals,
    dismissError,
    retryLastAction,
  };
}
