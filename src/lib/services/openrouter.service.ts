import { z } from "zod"
import type {
  ChatCompletionInput,
  OpenRouterCompletionDTO,
  OpenRouterConfig,
  OpenRouterMessage,
  OpenRouterParams,
  OpenRouterRawResponse,
  OpenRouterResponseFormat,
  OpenRouterModel,
  StructuredCompletionInput,
} from "../openrouter.types.ts"
import type { UserLocale } from "../../types.ts"
import { MAX_PROMPT_LENGTH, MIN_PROMPT_LENGTH } from "../validators/generations.ts"

export class OpenRouterConfigError extends Error {
  public readonly code = "config_error"

  constructor(message: string) {
    super(message)
    this.name = "OpenRouterConfigError"
  }
}

export class OpenRouterNetworkError extends Error {
  public readonly code = "network_error"

  constructor(message: string) {
    super(message)
    this.name = "OpenRouterNetworkError"
  }
}

export class OpenRouterRateLimitError extends Error {
  public readonly code = "rate_limit_error"
  public readonly retryAfterMs?: number

  constructor(message: string, retryAfterMs?: number) {
    super(message)
    this.name = "OpenRouterRateLimitError"
    this.retryAfterMs = retryAfterMs
  }
}

export class OpenRouterResponseSchemaError extends Error {
  public readonly code = "response_schema_error"

  constructor(message: string) {
    super(message)
    this.name = "OpenRouterResponseSchemaError"
  }
}

export class OpenRouterRequestError extends Error {
  public readonly code = "request_error"
  public readonly status?: number
  public readonly details?: unknown

  constructor(message: string, status?: number, details?: unknown) {
    super(message)
    this.name = "OpenRouterRequestError"
    this.status = status
    this.details = details
  }
}

export class OpenRouterValidationError extends Error {
  public readonly code = "validation_error"

  constructor(message: string) {
    super(message)
    this.name = "OpenRouterValidationError"
  }
}

const defaultParamsSchema = z.object({
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().min(1).optional(),
  top_p: z.number().min(0).max(1).optional(),
  presence_penalty: z.number().min(-2).max(2).optional(),
})

const responseFormatSchema = z.object({
  type: z.literal("json_schema"),
  json_schema: z.object({
    name: z.string().min(1),
    strict: z.boolean(),
    schema: z.record(z.unknown()),
  }),
})

const DEFAULT_ALLOWED_MODELS: OpenRouterModel[] = ["openai/gpt-4.1-mini"]

const SYSTEM_MESSAGES: Record<UserLocale, string> = {
  pl: "Jesteś asystentem, który generuje propozycje fiszek w języku polskim. Odpowiadaj tylko w JSON zgodnym ze schematem. Wygenerowane fiszki powinny być jasne, przejrzyste i skuteczne. Fiszki powinny być związane z tematyką tekstu. Kada fiszka powinna zawierać front (pytanie/prompt) i back (odpowiedź/wyjaśnienie). Skup się na ważnych faktach, definicjach, pojęciach i relacjach.",
  en: "You are an AI assistant spiecialized in creating high-quality flashcards from provided test in english. generate concise, clear, and effective flashcards that capture key concepts and knowlege. Each flashcards should have a front(question/prompt) and back(answer/explanation. Focus on important facts, definitons, concepts, and relationships. ",
}

export function buildSystemMessage(locale: UserLocale) {
  return SYSTEM_MESSAGES[locale] ?? SYSTEM_MESSAGES.pl
}

export class OpenRouterService {
  public defaultModel: OpenRouterModel
  public defaultParams: OpenRouterParams

  private _apiKey: string
  private _baseUrl: string
  private _timeoutMs: number
  private _headers: Record<string, string>
  private _allowedModels: OpenRouterModel[]

  constructor(config: OpenRouterConfig = {}) {
    const apiKey = config.apiKey ?? import.meta.env.OPENROUTER_API_KEY
    if (!apiKey) {
      throw new OpenRouterConfigError("Brak klucza OPENROUTER_API_KEY w konfiguracji.")
    }

    const defaultModel = config.defaultModel ?? DEFAULT_ALLOWED_MODELS[0]
    if (!DEFAULT_ALLOWED_MODELS.includes(defaultModel)) {
      throw new OpenRouterConfigError("Domyślny model nie jest dozwolony.")
    }

    const baseDefaultParams: OpenRouterParams = {
      temperature: 0.7,
      max_tokens: 800,
      top_p: 0.9,
      presence_penalty: 0,
    }
    const paramsValidation =
      config.defaultParams === undefined
        ? { success: true as const, data: {} }
        : defaultParamsSchema.safeParse(config.defaultParams)
    if (!paramsValidation.success) {
      throw new OpenRouterConfigError("Nieprawidłowe domyślne parametry modelu.")
    }

    this._apiKey = apiKey
    this._baseUrl = config.baseUrl ?? "https://openrouter.ai/api/v1"
    this._timeoutMs = config.timeoutMs ?? 20000
    this._allowedModels = DEFAULT_ALLOWED_MODELS
    this.defaultModel = defaultModel
    this.defaultParams = {
      ...baseDefaultParams,
      ...paramsValidation.data,
    }

    this._headers = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    }

    if (config.httpReferer) {
      this._headers["HTTP-Referer"] = config.httpReferer
    }

    if (config.appTitle) {
      this._headers["X-Title"] = config.appTitle
    }
  }

  public setDefaultModel(modelName: OpenRouterModel) {
    if (!this._allowedModels.includes(modelName)) {
      throw new OpenRouterValidationError("Model nie jest dozwolony.")
    }
    this.defaultModel = modelName
  }

  public setDefaultParams(params: OpenRouterParams) {
    const validation = defaultParamsSchema.safeParse(params)
    if (!validation.success) {
      throw new OpenRouterValidationError("Nieprawidłowe parametry modelu.")
    }
    this.defaultParams = validation.data
  }

  public async createChatCompletion(
    input: ChatCompletionInput,
  ): Promise<OpenRouterCompletionDTO> {
    this._validateInputMessages(input.systemMessage, input.userMessage)

    const payload = this._buildPayload(input)
    const raw = await this._request(payload)
    return this._normalizeResponse(raw)
  }

  public async createStructuredCompletion<T = unknown>(
    input: StructuredCompletionInput,
  ): Promise<T> {
    if (!input.responseFormat) {
      throw new OpenRouterValidationError("responseFormat jest wymagany.")
    }

    const raw = await this._request(this._buildPayload(input))
    return this._parseStructuredOutput<T>(raw, input.responseFormat)
  }

  private _buildMessages(systemMessage: string, userMessage: string): OpenRouterMessage[] {
    return [
      { role: "system", content: systemMessage.trim() },
      { role: "user", content: userMessage.trim() },
    ]
  }

  private _buildPayload(input: ChatCompletionInput) {
    const model = input.model ?? this.defaultModel
    if (!this._allowedModels.includes(model)) {
      throw new OpenRouterValidationError("Model nie jest dozwolony.")
    }

    const params = {
      ...this.defaultParams,
      ...input.params,
    }

    const messages = this._buildMessages(input.systemMessage, input.userMessage)
    const payload: Record<string, unknown> = {
      model,
      messages,
      ...params,
    }

    if (input.responseFormat) {
      const parsedResponseFormat = responseFormatSchema.safeParse(input.responseFormat)
      if (!parsedResponseFormat.success) {
        throw new OpenRouterValidationError("responseFormat ma nieprawidłową strukturę.")
      }
      payload.response_format = parsedResponseFormat.data
    }

    return payload
  }

  private async _request(payload: Record<string, unknown>): Promise<OpenRouterRawResponse> {
    const url = `${this._baseUrl}/chat/completions`
    const maxRetries = 2
    let attempt = 0

    while (attempt <= maxRetries) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), this._timeoutMs)

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: this._headers,
          body: JSON.stringify(payload),
          signal: controller.signal,
        })

        if (response.ok) {
          return (await response.json()) as OpenRouterRawResponse
        }

        const retryAfter = this._readRetryAfter(response.headers.get("retry-after"))
        const details = await this._safeReadJson(response)

        if (response.status === 429) {
          if (attempt < maxRetries) {
            await this._delay(retryAfter ?? this._backoffMs(attempt))
            attempt += 1
            continue
          }
          throw new OpenRouterRateLimitError("Przekroczono limit zapytań.", retryAfter)
        }

        if (response.status >= 500 && response.status < 600 && attempt < maxRetries) {
          await this._delay(this._backoffMs(attempt))
          attempt += 1
          continue
        }

        throw new OpenRouterRequestError(
          "OpenRouter zwrócił błąd odpowiedzi.",
          response.status,
          details,
        )
      } catch (error) {
        if (error instanceof OpenRouterRequestError || error instanceof OpenRouterRateLimitError) {
          throw error
        }

        if (attempt >= maxRetries) {
          throw new OpenRouterNetworkError("Błąd sieci lub timeout podczas wywołania OpenRouter.")
        }

        await this._delay(this._backoffMs(attempt))
        attempt += 1
      } finally {
        clearTimeout(timeout)
      }
    }

    throw new OpenRouterNetworkError("Nie udało się wykonać żądania do OpenRouter.")
  }

  private _normalizeResponse(raw: OpenRouterRawResponse): OpenRouterCompletionDTO {
    const choice = raw.choices?.[0]
    const content = choice?.message?.content

    if (!content) {
      throw new OpenRouterResponseSchemaError("Brak treści odpowiedzi z OpenRouter.")
    }

    return {
      content,
      model: raw.model,
      finishReason: choice?.finish_reason,
      usage: raw.usage,
      raw,
    }
  }

  private _parseStructuredOutput<T>(
    raw: OpenRouterRawResponse,
    responseFormat: OpenRouterResponseFormat,
  ): T {
    const normalized = this._normalizeResponse(raw)
    const parsed = this._safeParseJson(normalized.content)
    this._validateStructuredOutput(parsed, responseFormat.json_schema.schema)
    return parsed as T
  }

  private _validateStructuredOutput(data: unknown, schema: Record<string, unknown>) {
    if (!schema || typeof schema !== "object") {
      return
    }

    const schemaType = (schema as { type?: string }).type
    if (schemaType === "object" && (!data || typeof data !== "object" || Array.isArray(data))) {
      throw new OpenRouterResponseSchemaError("Odpowiedź nie jest obiektem JSON.")
    }

    if (schemaType === "array" && !Array.isArray(data)) {
      throw new OpenRouterResponseSchemaError("Odpowiedź nie jest tablicą JSON.")
    }

    const required = (schema as { required?: string[] }).required
    if (required && typeof data === "object" && data) {
      for (const key of required) {
        if (!(key in data)) {
          throw new OpenRouterResponseSchemaError(`Brak pola wymagaganego: ${key}.`)
        }
      }
    }

    const additionalProperties = (schema as { additionalProperties?: boolean }).additionalProperties
    const properties = (schema as { properties?: Record<string, unknown> }).properties
    if (
      additionalProperties === false &&
      properties &&
      typeof data === "object" &&
      data &&
      !Array.isArray(data)
    ) {
      const allowedKeys = new Set(Object.keys(properties))
      for (const key of Object.keys(data)) {
        if (!allowedKeys.has(key)) {
          throw new OpenRouterResponseSchemaError(`Niedozwolone pole w odpowiedzi: ${key}.`)
        }
      }
    }
  }

  private _validateInputMessages(systemMessage: string, userMessage: string) {
    if (!systemMessage.trim() || !userMessage.trim()) {
      throw new OpenRouterValidationError("Wiadomości systemowa i użytkownika są wymagane.")
    }

    if (userMessage.length < MIN_PROMPT_LENGTH) {
      throw new OpenRouterValidationError("Wiadomość użytkownika jest zbyt krótka.")
    }

    if (userMessage.length > MAX_PROMPT_LENGTH) {
      throw new OpenRouterValidationError("Przekroczono limit długości wiadomości.")
    }
  }

  private _backoffMs(attempt: number) {
    return 500 * Math.pow(2, attempt)
  }

  private async _delay(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms))
  }

  private _readRetryAfter(value: string | null): number | undefined {
    if (!value) return undefined
    const seconds = Number(value)
    if (!Number.isNaN(seconds)) {
      return seconds * 1000
    }
    const date = Date.parse(value)
    if (!Number.isNaN(date)) {
      return Math.max(0, date - Date.now())
    }
    return undefined
  }

  private async _safeReadJson(response: Response): Promise<unknown> {
    try {
      return await response.json()
    } catch {
      return undefined
    }
  }

  private _safeParseJson(value: string) {
    try {
      return JSON.parse(value) as unknown
    } catch {
      throw new OpenRouterResponseSchemaError("Nie udało się sparsować JSON z odpowiedzi.")
    }
  }
}
