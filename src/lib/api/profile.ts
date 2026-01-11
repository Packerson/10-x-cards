import type { GetProfileDTO } from "@/types"
import { ApiError, type ApiErrorResponse } from "./api-error"

export async function getProfile(): Promise<GetProfileDTO> {
  let response: Response

  try {
    response = await fetch("/api/profile", { method: "GET" })
  } catch {
    throw new ApiError(0, "network_error", "Brak połączenia z siecią")
  }

  if (!response.ok) {
    let errorBody: ApiErrorResponse

    try {
      errorBody = await response.json()
    } catch {
      throw new ApiError(
        response.status,
        "server_error",
        "Nieoczekiwany błąd serwera"
      )
    }

    throw ApiError.fromResponse(response.status, errorBody)
  }

  return response.json()
}

