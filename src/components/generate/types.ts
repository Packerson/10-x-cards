import type { CardSource } from "@/types";

// Status propozycji w UI
export type ProposalStatus = "pending" | "accepted" | "rejected" | "editing";

// Akcja na pojedynczej propozycji
export type ProposalAction = "accept" | "edit" | "reject" | "cancel_edit";

// Akcja zbiorcza
export type BulkActionType = "accept_all" | "reject_all";

// Model propozycji z lokalnym stanem UI
export interface ProposalViewModel {
  id: string; // Lokalny UUID dla React keys
  front: string; // Aktualna wartość (może być edytowana)
  back: string; // Aktualna wartość (może być edytowana)
  originalFront: string; // Oryginalna wartość z API (do resetu)
  originalBack: string; // Oryginalna wartość z API (do resetu)
  source: CardSource; // "ai_created" | "ai_edited"
  status: ProposalStatus; // Stan w UI
}

// Typy błędów generowania
export type GenerateErrorType =
  | "validation_error"
  | "duplicate_prompt"
  | "server_error"
  | "network_error"
  | "save_error";

// Stan głównego widoku
export interface GenerateViewState {
  promptText: string;
  isGenerating: boolean;
  isSaving: boolean;
  error: { type: GenerateErrorType; message?: string } | null;
  generationId: number | null;
  proposals: ProposalViewModel[];
}

// Props dla PromptForm
export interface PromptFormProps {
  promptText: string;
  onPromptChange: (text: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  isDisabled: boolean;
}

// Props dla CharacterCounter
export interface CharacterCounterProps {
  current: number;
  min: number;
  max: number;
}

// Props dla LoadingOverlay
export interface LoadingOverlayProps {
  message?: string;
}

// Props dla ErrorMessage
export interface ErrorMessageProps {
  errorType: GenerateErrorType;
  errorMessage?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

// Props dla ProposalSection
export interface ProposalSectionProps {
  proposals: ProposalViewModel[];
  generationId: number;
  onProposalAction: (id: string, action: ProposalAction) => void;
  onProposalEdit: (id: string, front: string, back: string) => void;
  onBulkAction: (action: BulkActionType) => void;
  onSave: () => void;
  isSaving: boolean;
}

// Props dla ProposalStats
export interface ProposalStatsProps {
  total: number;
  accepted: number;
  rejected: number;
  pending: number;
}

// Props dla ProposalList
export interface ProposalListProps {
  proposals: ProposalViewModel[];
  onAction: (id: string, action: ProposalAction) => void;
  onEdit: (id: string, front: string, back: string) => void;
}

// Props dla ProposalCard
export interface ProposalCardProps {
  proposal: ProposalViewModel;
  onAction: (action: ProposalAction) => void;
  onEdit: (front: string, back: string) => void;
}

// Props dla CardContent
export interface CardContentProps {
  front: string;
  back: string;
}

// Props dla CardEditForm
export interface CardEditFormProps {
  initialFront: string;
  initialBack: string;
  onSave: (front: string, back: string) => void;
  onCancel: () => void;
}

// Props dla CardActions
export interface CardActionsProps {
  status: ProposalStatus;
  onAccept: () => void;
  onEdit: () => void;
  onReject: () => void;
}

// Props dla BulkActions
export interface BulkActionsProps {
  acceptedCount: number;
  onBulkAction: (action: BulkActionType) => void;
  onSave: () => void;
  isSaving: boolean;
}
