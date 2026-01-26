import type {
  CreateGenerationCommand,
  GenerationCreatedDTO,
  GenerationsListQuery,
  GenerationsListResponseDTO,
} from "@/types";
import { ApiError, type ApiErrorResponse } from "./api-error";

function toQueryString(query: Record<string, unknown>): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    params.set(key, String(value));
  }

  const qs = params.toString();
  return qs.length > 0 ? `?${qs}` : "";
}

export async function createGeneration(command: CreateGenerationCommand): Promise<GenerationCreatedDTO> {
  let response: Response;

  try {
    response = await fetch("/api/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(command),
    });
  } catch {
    throw new ApiError(0, "network_error", "Brak połączenia z siecią");
  }

  if (!response.ok) {
    let errorBody: ApiErrorResponse;

    try {
      errorBody = await response.json();
    } catch {
      throw new ApiError(response.status, "server_error", "Nieoczekiwany błąd serwera");
    }

    throw ApiError.fromResponse(response.status, errorBody);
  }

  return response.json();
}

export async function listGenerations(query: GenerationsListQuery): Promise<GenerationsListResponseDTO> {
  let response: Response;

  try {
    response = await fetch(`/api/generations${toQueryString(query)}`, {
      method: "GET",
    });
  } catch {
    throw new ApiError(0, "network_error", "Brak połączenia z siecią");
  }

  if (!response.ok) {
    let errorBody: ApiErrorResponse;

    try {
      errorBody = await response.json();
    } catch {
      throw new ApiError(response.status, "server_error", "Nieoczekiwany błąd serwera");
    }

    throw ApiError.fromResponse(response.status, errorBody);
  }

  return response.json();
}
