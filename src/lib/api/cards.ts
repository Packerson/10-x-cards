import type {
  CreateCardsCommand,
  CreateCardsResultDTO,
} from "@/types"
import { ApiError, type ApiErrorResponse } from "./api-error"

export async function createCards(
  command: CreateCardsCommand
): Promise<CreateCardsResultDTO> {
  let response: Response

  try {
    response = await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(command),
    })
  } catch {
    throw new ApiError(0, "network_error", "Brak połączenia z siecią")
  }

  if (!response.ok) {
    let errorBody: ApiErrorResponse

    try {
      errorBody = await response.json()
    } catch {
      throw new ApiError(response.status, "server_error", "Nieoczekiwany błąd serwera")
    }

    throw ApiError.fromResponse(response.status, errorBody)
  }

  return response.json()
}
