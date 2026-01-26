export type OpenRouterModel = string;

export interface OpenRouterParams {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  presence_penalty?: number;
}

export interface OpenRouterConfig {
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: OpenRouterModel;
  timeoutMs?: number;
  defaultParams?: OpenRouterParams;
  httpReferer?: string;
  appTitle?: string;
}

export interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterResponseFormat {
  type: "json_schema";
  json_schema: {
    name: string;
    strict: boolean;
    schema: Record<string, unknown>;
  };
}

export interface ChatCompletionInput {
  systemMessage: string;
  userMessage: string;
  model?: OpenRouterModel;
  params?: OpenRouterParams;
  responseFormat?: OpenRouterResponseFormat;
}

export interface StructuredCompletionInput extends ChatCompletionInput {
  responseFormat: OpenRouterResponseFormat;
}

export interface OpenRouterUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export interface OpenRouterRawResponse {
  id?: string;
  model?: string;
  usage?: OpenRouterUsage;
  choices?: {
    finish_reason?: string;
    message?: {
      role?: string;
      content?: string;
    };
  }[];
}

export interface OpenRouterCompletionDTO {
  content: string;
  model?: string;
  finishReason?: string;
  usage?: OpenRouterUsage;
  raw?: OpenRouterRawResponse;
}
