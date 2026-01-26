import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { CardSource, CardsListQuery, GenerationsListQuery } from "@/types";
import { createCards, deleteCard, listCards } from "@/lib/api/cards";
import { listGenerations } from "@/lib/api/generations";
import { ApiError } from "@/lib/api/api-error";
import { useDebouncedValue } from "@/components/hooks/useDebouncedValue";
import type {
  CardVM,
  CardsListVM,
  CardsQueryState,
  CardsViewActions,
  CardsViewError,
  CreateCardDraftVM,
  InlineDeleteState,
  GenerationOptionVM,
} from "./types";

const DEFAULT_QUERY: CardsQueryState = {
  page: 1,
  limit: 10,
  sort: "created_at",
  order: "desc",
  search: "",
};

function safeInt(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isInteger(n)) return null;
  return n;
}

function safePositiveInt(value: string | null): number | null {
  const n = safeInt(value);
  if (n === null || n <= 0) return null;
  return n;
}

function safeOneOf<T extends string>(value: string | null, allowed: readonly T[]): T | null {
  if (!value) return null;
  return (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

function queryFromUrl(): CardsQueryState {
  if (typeof window === "undefined") return DEFAULT_QUERY;

  const params = new URLSearchParams(window.location.search);

  const page = safePositiveInt(params.get("page")) ?? DEFAULT_QUERY.page;
  const limitRaw = safePositiveInt(params.get("limit")) ?? DEFAULT_QUERY.limit;
  const limit = Math.min(100, Math.max(1, limitRaw));

  const sort = safeOneOf(params.get("sort"), ["created_at", "updated_at", "front"] as const) ?? DEFAULT_QUERY.sort;
  const order = safeOneOf(params.get("order"), ["asc", "desc"] as const) ?? DEFAULT_QUERY.order;

  const source = safeOneOf(params.get("source"), ["manual", "ai_created", "ai_edited"] as const) ?? undefined;

  const generation_id = safePositiveInt(params.get("generation_id")) ?? undefined;

  const search = params.get("search") ?? DEFAULT_QUERY.search;

  return { page, limit, sort, order, source: source as CardSource | undefined, generation_id, search };
}

function writeQueryToUrl(query: CardsQueryState) {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams();
  params.set("page", String(query.page));
  params.set("limit", String(query.limit));
  params.set("sort", query.sort);
  params.set("order", query.order);

  if (query.source) params.set("source", query.source);
  if (query.generation_id) params.set("generation_id", String(query.generation_id));

  const searchTrimmed = query.search.trim();
  if (searchTrimmed.length >= 1) params.set("search", searchTrimmed);

  const nextUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState(null, "", nextUrl);
}

function mapApiError(err: unknown): CardsViewError {
  if (err instanceof ApiError) {
    if (err.isNetworkError()) {
      return { kind: "network", message: "Brak połączenia z siecią" };
    }

    if (err.status === 401) {
      // Auth będzie wdrożony w przyszłości; na razie pokazujemy błąd bez redirectu.
      return { kind: "unauthorized", message: "Brak uprawnień (401)" };
    }

    if (err.isValidationError()) {
      return { kind: "validation", message: "Nieprawidłowe dane wejściowe", details: err.details };
    }

    if (err.isServerError()) {
      return { kind: "server", message: "Błąd serwera", details: err.details };
    }

    return { kind: "unknown", message: "Nieoczekiwany błąd", details: err.details };
  }

  return { kind: "unknown", message: "Nieoczekiwany błąd", details: err };
}

function toCardVM(card: { back: string } & Record<string, unknown>): CardVM {
  const back = String(card.back ?? "");
  const MAX = 120;
  const isBackTruncated = back.length > MAX;
  const backPreview = isBackTruncated ? `${back.slice(0, MAX)}…` : back;
  return { ...(card as CardVM), backPreview, isBackTruncated };
}

function buildUpdatePatch(initial: { front: string; back: string }, draft: { front: string; back: string }) {
  const patch: { front?: string; back?: string } = {};

  const nextFront = draft.front.trim();
  const nextBack = draft.back.trim();
  const initialFront = initial.front.trim();
  const initialBack = initial.back.trim();

  if (nextFront !== initialFront) patch.front = nextFront;
  if (nextBack !== initialBack) patch.back = nextBack;

  if (!patch.front && !patch.back) return null;
  return patch;
}

export function useCardsView() {
  const [query, setQuery] = useState<CardsQueryState>(() => queryFromUrl());
  const debouncedSearch = useDebouncedValue(query.search, 300);

  const [list, setList] = useState<CardsListVM | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<CardsViewError | null>(null);

  const [generationOptions, setGenerationOptions] = useState<GenerationOptionVM[]>([]);
  const [isLoadingGenerations, setIsLoadingGenerations] = useState(false);
  const [generationsError, setGenerationsError] = useState<CardsViewError | null>(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createServerError, setCreateServerError] = useState<string | null>(null);
  const [createFrontError, setCreateFrontError] = useState<string | null>(null);

  const [deleteState, setDeleteState] = useState<InlineDeleteState | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  const apiQuery: CardsListQuery = useMemo(() => {
    const q: CardsListQuery = {
      page: query.page,
      limit: query.limit,
      sort: query.sort,
      order: query.order,
    };

    if (query.source) q.source = query.source;
    if (query.generation_id) q.generation_id = query.generation_id;

    const searchTrimmed = debouncedSearch.trim();
    if (searchTrimmed.length >= 1) q.search = searchTrimmed;

    return q;
  }, [query.page, query.limit, query.sort, query.order, query.source, query.generation_id, debouncedSearch]);

  useEffect(() => {
    writeQueryToUrl({ ...query, search: debouncedSearch });
  }, [query, debouncedSearch]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    (async () => {
      try {
        // Uwaga: nasz klient API nie przyjmuje signal — zostawiamy kontroler na przyszłość.
        const res = await listCards(apiQuery);
        if (!isMounted) return;
        setList({ cards: res.data.map((c) => toCardVM(c)), pagination: res.pagination });
      } catch (e) {
        if (!isMounted) return;
        setList(null);
        setError(mapApiError(e));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [apiQuery, retryToken]);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingGenerations(true);
    setGenerationsError(null);

    const q: GenerationsListQuery = {
      page: 1,
      limit: 100,
      sort: "created_at",
      order: "desc",
    };

    (async () => {
      try {
        const res = await listGenerations(q);
        if (!isMounted) return;
        const opts = res.data.map((g) => {
          const created = g.created_at ? new Date(g.created_at).toLocaleDateString("pl-PL") : "—";
          const preview = (g.prompt_text ?? "").trim().slice(0, 40);
          const label = `#${g.id} · ${created}${preview ? ` · ${preview}` : ""}`;
          return { id: g.id, label };
        });
        setGenerationOptions(opts);
      } catch (e) {
        if (!isMounted) return;
        setGenerationOptions([]);
        setGenerationsError(mapApiError(e));
      } finally {
        if (isMounted) {
          setIsLoadingGenerations(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const actions: CardsViewActions = useMemo(
    () => ({
      setSearch: (value) => setQuery((q) => ({ ...q, search: value, page: 1 })),
      setSource: (value) => setQuery((q) => ({ ...q, source: value, page: 1 })),
      setGenerationId: (value) => setQuery((q) => ({ ...q, generation_id: value, page: 1 })),
      setPage: (page) => setQuery((q) => ({ ...q, page: Math.max(1, Math.floor(page)) })),
      setLimit: (limit) =>
        setQuery((q) => ({
          ...q,
          limit: Math.min(100, Math.max(1, Math.floor(limit))),
          page: 1,
        })),
      retry: () => setRetryToken((t) => t + 1),
      openCreateModal: () => {
        setCreateServerError(null);
        setCreateFrontError(null);
        setCreateModalOpen(true);
      },
      closeCreateModal: () => {
        setCreateServerError(null);
        setCreateFrontError(null);
        setCreateModalOpen(false);
      },
      createCard: async (draft: CreateCardDraftVM) => {
        setIsCreating(true);
        setCreateServerError(null);
        setCreateFrontError(null);

        try {
          const front = draft.front.trim();
          const back = draft.back.trim();

          const res = await createCards({
            cards: [
              {
                front,
                back,
                source: "manual",
              },
            ],
          });

          toast.success(`Dodano ${res.inserted} ${res.inserted === 1 ? "fiszkę" : "fiszek"}`, {
            description: "Fiszka została dodana do Twojej kolekcji.",
          });

          setCreateModalOpen(false);
          setRetryToken((t) => t + 1);
        } catch (e) {
          const mapped = mapApiError(e);

          if (e instanceof ApiError && e.errorCode === "duplicate_front") {
            setCreateFrontError("Masz już fiszkę o takim przodzie.");
            return;
          }

          if (mapped.kind === "validation") {
            setCreateServerError("Nieprawidłowe dane. Sprawdź pola formularza.");
            return;
          }

          setCreateServerError(mapped.message);
        } finally {
          setIsCreating(false);
        }
      },
      requestDelete: (cardId: number) => {
        setDeleteState({
          cardId,
          isSubmitting: false,
          error: null,
        });
      },
      cancelDelete: () => setDeleteState(null),
      confirmDelete: async () => {
        if (!deleteState) return;

        setDeleteState((s) => (s ? { ...s, isSubmitting: true, error: null } : s));

        try {
          await deleteCard(deleteState.cardId);
          toast.success("Usunięto fiszkę");
          setDeleteState(null);
          setRetryToken((t) => t + 1);
        } catch (e) {
          // 404: pokaz toast + odśwież (karta już usunięta)
          if (e instanceof ApiError && e.errorCode === "not_found") {
            toast.error("Fiszka nie istnieje lub została już usunięta.");
            setDeleteState(null);
            setRetryToken((t) => t + 1);
            return;
          }

          const mapped = mapApiError(e);
          setDeleteState((s) =>
            s
              ? {
                  ...s,
                  isSubmitting: false,
                  error: mapped.kind === "network" ? "Brak połączenia. Spróbuj ponownie." : mapped.message,
                }
              : s
          );
        }
      },
      buildUpdatePatch,
    }),

    [deleteState]
  );

  const canShowEmpty = !isLoading && !error && list?.cards?.length === 0;

  return {
    query,
    debouncedSearch,
    list,
    isLoading,
    error,
    generationOptions,
    isLoadingGenerations,
    generationsError,
    canShowEmpty,
    createModalOpen,
    isCreating,
    createServerError,
    createFrontError,
    deleteState,
    actions,
  };
}
