import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { GenerateView } from "../GenerateView"

/*
  Wyjaśnienie importów dla testów frontendowych:
  - render: renderuje komponent React do wirtualnego DOM (jsdom), aby można było go testować.
  - screen: zestaw funkcji do wyszukiwania elementów w wyrenderowanym DOM (np. po tekście/roli).
  - cleanup: usuwa wyrenderowane drzewo po teście, żeby testy nie wpływały na siebie.
  - describe/it: grupowanie i definiowanie przypadków testowych.
  - expect: asercje, czyli sprawdzanie oczekiwanych wyników.
  - beforeEach/afterEach: konfiguracja uruchamiana przed/po każdym teście (np. czyszczenie mocków).
  - vi: narzędzia Vitest do mocków i szpiegów (np. vi.fn(), vi.mock()).
  - GenerateView: testowany komponent, którego zachowanie weryfikujemy.
*/

/*
  Typy pomocnicze:
  - Porządkują kształt danych zwracanych przez hook i przekazywanych do komponentów.
  - Ułatwiają czytelność testów i zapobiegają literówkom w nazwach pól.
*/
type GenerateState = {
  promptText: string
  isGenerating: boolean
  isSaving: boolean
  error: null | { type: string; message: string }
  generationId: string | null
  proposals: unknown[]
}

type GenerateHookReturn = {
  state: GenerateState
  isPromptValid: boolean
  setPromptText: (value: string) => void
  generateProposals: () => void
  handleProposalAction: (...args: unknown[]) => void
  handleProposalEdit: (...args: unknown[]) => void
  handleBulkAction: (...args: unknown[]) => void
  saveAcceptedCards: () => void
  dismissError: () => void
  retryLastAction: () => void
}

/*
  Override to wstrzyknięcia tylko tych pól, które zmieniamy w danym teście.
  Dzięki temu reszta danych ma bezpieczne wartości domyślne.
*/
type GenerateHookOverrides = Omit<Partial<GenerateHookReturn>, "state"> & {
  state?: Partial<GenerateState>
}

/*
  Minimalne kontrakty propsów używane w mockach dzieci.
  Testujemy przekazywane dane, nie implementację tych komponentów.
*/
type PromptFormProps = {
  promptText: string
  onPromptChange: (value: string) => void
  onSubmit: () => void
  isLoading: boolean
  isDisabled: boolean
}

type ErrorMessageProps = {
  errorType: string
  errorMessage: string
  onRetry: () => void
  onDismiss: () => void
}

/*
  Mocki komponentów i hooka:
  - W testach jednostkowych izolujemy GenerateView od zależności.
  - Komponenty potomne zwracają proste elementy z data-testid.
*/
type ProposalSectionProps = {
  proposals: unknown[]
  generationId: string
  onProposalAction: (...args: unknown[]) => void
  onProposalEdit: (...args: unknown[]) => void
  onBulkAction: (...args: unknown[]) => void
  onSave: () => void
  isSaving: boolean
}

/*
  vi.hoisted zapewnia, że mocki są tworzone przed importami modułów.
  To ważne przy vi.mock(), bo fabryka uruchamia się przed importami.
*/
const useGenerateFlashcardsMock = vi.hoisted(() => vi.fn())
const promptFormMock = vi.hoisted(
  () => vi.fn((_props: PromptFormProps) => <div data-testid="prompt-form" />)
)
const loadingOverlayMock = vi.hoisted(
  () => vi.fn(() => <div data-testid="loading-overlay" />)
)
const errorMessageMock = vi.hoisted(
  () => vi.fn((_props: ErrorMessageProps) => <div data-testid="error-message" />)
)
const proposalSectionMock = vi.hoisted(
  () => vi.fn((_props: ProposalSectionProps) => <div data-testid="proposal-section" />)
)

/*
  Podmieniamy prawdziwe moduły na mocki:
  - hook: kontrolujemy stan i funkcje zwracane do GenerateView
  - komponenty: sprawdzamy tylko czy i z jakimi propsami są renderowane
*/
vi.mock("../useGenerateFlashcards", () => ({
  useGenerateFlashcards: useGenerateFlashcardsMock
}))
vi.mock("../PromptForm", () => ({ PromptForm: promptFormMock }))
vi.mock("../LoadingOverlay", () => ({ LoadingOverlay: loadingOverlayMock }))
vi.mock("../ErrorMessage", () => ({ ErrorMessage: errorMessageMock }))
vi.mock("../ProposalSection", () => ({ ProposalSection: proposalSectionMock }))

/*
  Domyślny stan hooka.
  Używany jako baza, aby każdy test startował z bezpiecznych wartości.
*/
const baseState: GenerateState = {
  promptText: "",
  isGenerating: false,
  isSaving: false,
  error: null,
  generationId: null,
  proposals: []
}

/*
  Buduje pełny obiekt zwracany przez hook:
  - scala domyślny stan z nadpisaniami
  - wstrzykuje domyślne funkcje (vi.fn), które możemy asercjować
*/
const createHookReturn = (
  overrides: GenerateHookOverrides = {}
): GenerateHookReturn => {
  const { state: overrideState, ...restOverrides } = overrides
  const state = { ...baseState, ...overrideState }

  return {
    state,
    isPromptValid: true,
    setPromptText: vi.fn(),
    generateProposals: vi.fn(),
    handleProposalAction: vi.fn(),
    handleProposalEdit: vi.fn(),
    handleBulkAction: vi.fn(),
    saveAcceptedCards: vi.fn(),
    dismissError: vi.fn(),
    retryLastAction: vi.fn(),
    ...restOverrides
  }
}

/*
  Ustawia zwracany stan hooka dla danego testu.
  To centralne miejsce do kontroli scenariusza renderu.
*/
const setHookReturn = (overrides: GenerateHookOverrides = {}) => {
  useGenerateFlashcardsMock.mockReturnValue(createHookReturn(overrides))
}

describe("GenerateView", () => {
  beforeEach(() => {
    // Czyścimy wywołania mocków, aby testy były niezależne.
    vi.clearAllMocks()
  })
  afterEach(() => {
    // Usuwamy DOM po każdym teście.
    cleanup()
  })

  it("renders header and description", () => {
    // Stan domyślny: brak generowania, błędów i propozycji.
    setHookReturn()

    render(<GenerateView />)

    // Sprawdzamy stałe treści nagłówka i opisu.
    expect(
      screen.getByRole("heading", { name: "Generuj fiszki" })
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        "Wklej tekst źródłowy, a AI wygeneruje propozycje fiszek do nauki."
      )
    ).toBeInTheDocument()
  })

  it("renders LoadingOverlay when generating", () => {
    // W trybie generowania powinien pojawić się overlay ładowania.
    setHookReturn({ state: { isGenerating: true } })

    render(<GenerateView />)

    expect(screen.getByTestId("loading-overlay")).toBeInTheDocument()
  })

  it("passes expected props to PromptForm", () => {
    // Sprawdzamy, czy GenerateView przekazuje poprawne propsy do PromptForm.
    const setPromptText = vi.fn()
    const generateProposals = vi.fn()

    setHookReturn({
      isPromptValid: false,
      setPromptText,
      generateProposals,
      state: { promptText: "Tekst wejściowy", isGenerating: false }
    })

    render(<GenerateView />)

    const [props] = promptFormMock.mock.calls[0] as [PromptFormProps]
    // isDisabled powinno wynikać z niepoprawnego promptu.
    expect(props).toMatchObject({
      promptText: "Tekst wejściowy",
      onPromptChange: setPromptText,
      onSubmit: generateProposals,
      isLoading: false,
      isDisabled: true
    })
  })

  it("disables PromptForm when generating", () => {
    // Gdy trwa generowanie, formularz powinien być zablokowany.
    setHookReturn({
      isPromptValid: true,
      state: { isGenerating: true }
    })

    render(<GenerateView />)

    const [props] = promptFormMock.mock.calls[0] as [PromptFormProps]
    expect(props.isDisabled).toBe(true)
    expect(props.isLoading).toBe(true)
  })

  it("renders ErrorMessage when error exists", () => {
    // Jeśli hook zwraca błąd, wyświetlamy ErrorMessage z odpowiednimi handlerami.
    const dismissError = vi.fn()
    const retryLastAction = vi.fn()

    setHookReturn({
      dismissError,
      retryLastAction,
      state: {
        error: { type: "network", message: "Nieudane żądanie" }
      }
    })

    render(<GenerateView />)

    const [props] = errorMessageMock.mock.calls[0] as [ErrorMessageProps]
    // Weryfikujemy mapowanie pola error -> propsy komponentu.
    expect(props).toMatchObject({
      errorType: "network",
      errorMessage: "Nieudane żądanie",
      onRetry: retryLastAction,
      onDismiss: dismissError
    })
  })

  it("renders ProposalSection when proposals and generationId exist", () => {
    // Sekcja propozycji ma się pojawić tylko gdy są propozycje i generationId.
    const proposals = [{ id: "p1" }]
    const handleProposalAction = vi.fn()
    const handleProposalEdit = vi.fn()
    const handleBulkAction = vi.fn()
    const saveAcceptedCards = vi.fn()

    setHookReturn({
      handleProposalAction,
      handleProposalEdit,
      handleBulkAction,
      saveAcceptedCards,
      state: {
        proposals,
        generationId: "gen-1",
        isSaving: true
      }
    })

    render(<GenerateView />)

    const [props] = proposalSectionMock.mock.calls[0] as [ProposalSectionProps]
    // Weryfikujemy komplet przekazanych propsów i stan zapisu.
    expect(props).toMatchObject({
      proposals,
      generationId: "gen-1",
      onProposalAction: handleProposalAction,
      onProposalEdit: handleProposalEdit,
      onBulkAction: handleBulkAction,
      onSave: saveAcceptedCards,
      isSaving: true
    })
  })

  it("does not render ProposalSection without generationId", () => {
    // Brak generationId powinien ukrywać sekcję propozycji.
    setHookReturn({
      state: { proposals: [{ id: "p1" }], generationId: null }
    })

    render(<GenerateView />)

    expect(screen.queryByTestId("proposal-section")).not.toBeInTheDocument()
  })

  it("renders empty state when no proposals, no error, not generating", () => {
    // Stan pusty jest widoczny, gdy nic nie generujemy i nie ma błędu.
    setHookReturn({
      state: { proposals: [], isGenerating: false, error: null }
    })

    render(<GenerateView />)

    expect(screen.getByText("Brak propozycji")).toBeInTheDocument()
    expect(
      screen.getByText(
        'Wklej tekst powyżej i kliknij "Generuj fiszki", aby rozpocząć.'
      )
    ).toBeInTheDocument()
  })

  it("does not render empty state when generating", () => {
    // W trakcie generowania nie pokazujemy stanu pustego.
    setHookReturn({
      state: { proposals: [], isGenerating: true, error: null }
    })

    render(<GenerateView />)

    expect(screen.queryByText("Brak propozycji")).not.toBeInTheDocument()
  })

  it("does not render empty state when error exists", () => {
    // Gdy jest błąd, priorytet ma komunikat błędu, nie stan pusty.
    setHookReturn({
      state: { proposals: [], isGenerating: false, error: { type: "x", message: "y" } }
    })

    render(<GenerateView />)

    expect(screen.queryByText("Brak propozycji")).not.toBeInTheDocument()
  })
})
