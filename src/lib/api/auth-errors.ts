export interface AuthErrorPayload {
  error?: string
  details?: {
    fieldErrors?: Record<string, string[] | undefined>
  }
}

export async function parseAuthErrorResponse(
  response: Response,
): Promise<{ errorCode: string; fieldErrors: Record<string, string[] | undefined> | null }> {
  let errorCode = "server_error"
  let fieldErrors: Record<string, string[] | undefined> | null = null

  try {
    const payload = (await response.json()) as AuthErrorPayload
    if (payload?.error) errorCode = payload.error
    if (payload?.details?.fieldErrors) fieldErrors = payload.details.fieldErrors
  } catch {
    // ignore parse errors
  }

  return { errorCode, fieldErrors }
}
