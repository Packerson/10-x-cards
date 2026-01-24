import type {
  Enums,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "./db/database.types"

/**
 * Aliasowanie encji bazodanowych pomaga utrzymać jedno źródło prawdy
 * oraz jasno wskazać, które DTO są oparte na jakich tabelach.
 */
export type CardEntity = Tables<"cards">
export type GenerationEntity = Tables<"generations">
export type GenerationErrorEntity = Tables<"generation_errors">
export type ProfileEntity = Tables<"profiles">

export type CardSource = Enums<"card_source_enum">
export type UserLocale = Enums<"locale_enum">

export type GenerationLifecycleStatus = Enums<"generation_status_enum">

export type SortOrder = "asc" | "desc"

export interface PaginationQuery {
  page?: number
  limit?: number
  sort?: string
  order?: string
}

export interface PaginationMetadata {
  page: number
  limit: number
  total_pages: number
  total_items: number
  sort?: string
  order?: string
}

export interface ListResponse<TItem> {
  data: TItem[]
  pagination: PaginationMetadata
}

/**
 * --- Auth ---
 */
export interface AuthLoginDTO {
  email: string
  password: string
}

export interface AuthRegisterDTO {
  email: string
  password: string
  passwordConfirm: string
}

export interface AuthForgotPasswordDTO {
  email: string
}

export interface AuthResetPasswordDTO {
  newPassword: string
  newPasswordConfirm: string
  accessToken?: string
  refreshToken?: string
  code?: string
}

export interface AuthUserDTO {
  id: string
  email: string | null
}

/**
 * --- Generations ---
 */
export type CardProposalDTO = Pick<CardEntity, "front" | "back" | "source">

export type CreateGenerationCommand = Pick<
  TablesInsert<"generations">,
  "prompt_text"
>

export type GenerationCreatedDTO = Pick<
  GenerationEntity,
  "id" | "prompt_text" | "total_generated" | "status"
> & {
  card_proposals: CardProposalDTO[]
}

export type GenerationSortField = "created_at" | "updated_at"

export interface GenerationsListQuery extends PaginationQuery {
  sort?: GenerationSortField
  order?: SortOrder
}

export type GenerationListItemDTO = Pick<
  GenerationEntity,
  | "id"
  | "prompt_text"
  | "total_generated"
  | "total_accepted"
  | "total_rejected"
  | "created_at"
  | "updated_at"
  | "model"
  | "status"
>

export type GenerationsListResponseDTO =
  ListResponse<GenerationListItemDTO>

export type GenerationDetailDTO = GenerationEntity

export interface GenerationErrorsListQuery extends PaginationQuery {
  sort?: "created_at"
  order?: SortOrder
  error_code?: GenerationErrorEntity["error_code"]
}

export type GenerationErrorDTO = GenerationErrorEntity

export type GenerationErrorsListResponseDTO =
  ListResponse<GenerationErrorDTO>

/**
 * --- Cards ---
 */
export type CardCreatePayload = Pick<
  TablesInsert<"cards">,
  "front" | "back" | "source" | "generation_id"
>

export interface CreateCardsCommand {
  cards: CardCreatePayload[]
}

export interface CreateCardsResultDTO {
  inserted: number
}

export type DeleteCardResultDTO = Pick<CardEntity, "id">

export type CardSortField = "created_at" | "updated_at" | "front"

export interface CardsListQuery extends PaginationQuery {
  sort?: CardSortField
  order?: SortOrder
  source?: CardSource
  generation_id?: CardEntity["generation_id"]
  search?: string
}

export type CardDTO = CardEntity

export type CardsListResponseDTO = ListResponse<CardDTO>

export type CardDetailDTO = Pick<
  CardEntity,
  "id" | "front" | "back" | "source" | "created_at" | "updated_at"
>

export type UpdateCardCommand = Pick<
  TablesUpdate<"cards">,
  "front" | "back"
>

/**
 * --- Profile ---
 */
export type ProfileDTO = ProfileEntity

export type GetProfileDTO = Pick<ProfileEntity, "id" | "locale" | "created_at">

export type UpdateProfileCommand = Pick<TablesUpdate<"profiles">, "locale">

