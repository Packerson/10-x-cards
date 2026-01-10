import { useCallback, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { CharacterCounter } from "./CharacterCounter"
import { MIN_PROMPT_LENGTH, MAX_PROMPT_LENGTH } from "@/lib/validators/generations"
import type { PromptFormProps } from "./types"

export function PromptForm({
  promptText,
  onPromptChange,
  onSubmit,
  isLoading,
  isDisabled,
}: PromptFormProps) {
  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      if (!isDisabled && !isLoading) {
        onSubmit()
      }
    },
    [isDisabled, isLoading, onSubmit]
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label
          htmlFor="prompt-text"
          className="block text-sm font-medium text-foreground"
        >
          Tekst źródłowy
        </label>
        <textarea
          id="prompt-text"
          value={promptText}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="Wklej tekst, na podstawie którego wygeneruję fiszki (1000-10000 znaków)..."
          className="min-h-[200px] max-h-[400px] w-full resize-y rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isLoading}
          readOnly={isLoading}
          aria-describedby="character-count"
        />
        <div
          id="character-count"
          className="flex items-center justify-between text-sm"
        >
          <CharacterCounter
            current={promptText.length}
            min={MIN_PROMPT_LENGTH}
            max={MAX_PROMPT_LENGTH}
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={isDisabled || isLoading}
        className="w-full sm:w-auto"
        size="lg"
      >
        {isLoading ? (
          <>
            <svg
              className="mr-2 size-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Generowanie...
          </>
        ) : (
          "Generuj fiszki"
        )}
      </Button>
    </form>
  )
}
