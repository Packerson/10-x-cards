import { useGenerateFlashcards } from "./useGenerateFlashcards"
import { PromptForm } from "./PromptForm"
import { LoadingOverlay } from "./LoadingOverlay"
import { ErrorMessage } from "./ErrorMessage"
import { ProposalSection } from "./ProposalSection"

export function GenerateView() {
  const {
    state,
    isPromptValid,
    setPromptText,
    generateProposals,
    handleProposalAction,
    handleProposalEdit,
    handleBulkAction,
    saveAcceptedCards,
    dismissError,
    retryLastAction,
  } = useGenerateFlashcards()

  const { promptText, isGenerating, isSaving, error, generationId, proposals } = state
  const hasProposals = proposals.length > 0

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Generuj fiszki
        </h1>
        <p className="mt-2 text-muted-foreground">
          Wklej tekst źródłowy, a AI wygeneruje propozycje fiszek do nauki.
        </p>
      </header>

      {isGenerating && <LoadingOverlay />}

      <div className="space-y-8">
        <section aria-labelledby="prompt-section">
          <h2 id="prompt-section" className="sr-only">
            Formularz generowania
          </h2>
          <PromptForm
            promptText={promptText}
            onPromptChange={setPromptText}
            onSubmit={generateProposals}
            isLoading={isGenerating}
            isDisabled={!isPromptValid || isGenerating}
          />
        </section>

        {error && (
          <ErrorMessage
            errorType={error.type}
            errorMessage={error.message}
            onRetry={retryLastAction}
            onDismiss={dismissError}
          />
        )}

        {hasProposals && generationId && (
          <ProposalSection
            proposals={proposals}
            generationId={generationId}
            onProposalAction={handleProposalAction}
            onProposalEdit={handleProposalEdit}
            onBulkAction={handleBulkAction}
            onSave={saveAcceptedCards}
            isSaving={isSaving}
          />
        )}

        {!hasProposals && !isGenerating && !error && (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 size-16 rounded-full bg-muted/50 p-4">
              <svg
                className="size-full text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-foreground">Brak propozycji</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Wklej tekst powyżej i kliknij "Generuj fiszki", aby rozpocząć.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
