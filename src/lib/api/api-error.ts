export interface ApiErrorResponse {
  error: string
  details?: unknown
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly errorCode: string,
    public readonly details?: unknown
  ) {
    super(`API Error: ${errorCode}`)
    this.name = "ApiError"
  }

  static fromResponse(status: number, body: ApiErrorResponse): ApiError {
    return new ApiError(status, body.error, body.details)
  }

  isNetworkError(): boolean {
    return this.errorCode === "network_error"
  }

  isValidationError(): boolean {
    return this.errorCode === "validation_error"
  }

  isDuplicatePrompt(): boolean {
    return this.errorCode === "duplicate_prompt"
  }

  isServerError(): boolean {
    return this.errorCode === "server_error"
  }
}
