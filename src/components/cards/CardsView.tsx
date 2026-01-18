import { CardsContent } from "./CardsContent"
import { CardsHeader } from "./CardsHeader"
import { CreateCardModal } from "./CreateCardModal"
import { useCardsView } from "./useCardsView"

export function CardsView() {
  const {
    query,
    isLoading,
    error,
    list,
    actions,
    generationOptions,
    isLoadingGenerations,
    generationsError,
    createModalOpen,
    isCreating,
    createServerError,
    createFrontError,
    deleteState,
  } = useCardsView()

  return (
    <div>
      <CardsHeader
        search={query.search}
        isBusy={isLoading}
        source={query.source}
        generationId={query.generation_id}
        generationOptions={generationOptions}
        isLoadingGenerations={isLoadingGenerations}
        generationsError={generationsError?.message ?? null}
        onSearchChange={actions.setSearch}
        onSourceChange={actions.setSource}
        onGenerationIdChange={actions.setGenerationId}
        onOpenCreateModal={actions.openCreateModal}
      />

      <CreateCardModal
        open={createModalOpen}
        isSubmitting={isCreating}
        serverError={createServerError}
        frontError={createFrontError}
        onClose={actions.closeCreateModal}
        onSubmit={actions.createCard}
      />

      <CardsContent
        list={list}
        isLoading={isLoading}
        error={error}
        onRetry={actions.retry}
        pagination={
          list
            ? {
                page: list.pagination.page,
                limit: list.pagination.limit,
                total_pages: list.pagination.total_pages,
                total_items: list.pagination.total_items,
              }
            : null
        }
        isBusy={isLoading}
        onPageChange={actions.setPage}
        onLimitChange={actions.setLimit}
        deleteState={deleteState}
        onDeleteRequest={actions.requestDelete}
        onDeleteCancel={actions.cancelDelete}
        onDeleteConfirm={actions.confirmDelete}
      />
    </div>
  )
}

