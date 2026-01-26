import type { CardDTO, CardsListResponseDTO, CardSource, UpdateCardCommand } from "@/types";

export interface CardsQueryState {
  page: number;
  limit: number;
  sort: "created_at" | "updated_at" | "front";
  order: "asc" | "desc";
  source?: CardSource;
  generation_id?: number;
  search: string; // kontrolowane pole UI (puste = brak parametru w API)
}

export type CardsViewError =
  | { kind: "network"; message: string }
  | { kind: "unauthorized"; message: string }
  | { kind: "validation"; message: string; details?: unknown }
  | { kind: "server"; message: string; details?: unknown }
  | { kind: "unknown"; message: string; details?: unknown };

export interface GenerationOptionVM {
  id: number;
  label: string;
}

export type CardVM = CardDTO & {
  backPreview: string;
  isBackTruncated: boolean;
};

export interface CardsListVM {
  cards: CardVM[];
  pagination: CardsListResponseDTO["pagination"];
}

export interface EditDraftVM {
  cardId: number;
  front: string;
  back: string;
  isSubmitting: boolean;
  error: string | null;
}

export interface InlineDeleteState {
  cardId: number;
  isSubmitting: boolean;
  error: string | null;
}

export interface CreateCardDraftVM {
  front: string;
  back: string;
}

export type MapApiErrorFn = (err: unknown) => CardsViewError;

export interface CardsViewActions {
  setSearch: (value: string) => void;
  setSource: (value?: CardSource) => void;
  setGenerationId: (value?: number) => void;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  retry: () => void;
  openCreateModal: () => void;
  closeCreateModal: () => void;
  createCard: (draft: CreateCardDraftVM) => Promise<void>;
  requestDelete: (cardId: number) => void;
  cancelDelete: () => void;
  confirmDelete: () => Promise<void>;
  buildUpdatePatch: (
    initial: { front: string; back: string },
    draft: { front: string; back: string }
  ) => UpdateCardCommand | null;
}
