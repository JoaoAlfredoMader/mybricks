import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  deleteDocument,
  deletePhoto,
  documentsQueryOptions,
  type Photo,
  photosQueryOptions,
  reorderPhotos,
  updateDocumentCategory,
  uploadDocument,
  uploadPhoto,
} from '../api/files'

export function usePhotoActions(propertyId: string) {
  const queryClient = useQueryClient()
  const key = photosQueryOptions(propertyId).queryKey
  const refetch = () => queryClient.invalidateQueries({ queryKey: key })

  return {
    upload: useMutation({ mutationFn: (file: File) => uploadPhoto(propertyId, file), onSettled: refetch }),
    remove: useMutation({ mutationFn: (id: string) => deletePhoto(propertyId, id), onSettled: refetch }),
    reorder: useMutation({
      mutationFn: (photoIds: string[]) => reorderPhotos(propertyId, photoIds),
      // The new order shows at once; a refusal puts the stored one back.
      onMutate: async (photoIds) => {
        await queryClient.cancelQueries({ queryKey: key })
        const before = queryClient.getQueryData(key)
        queryClient.setQueryData(key, (photos: Photo[] | undefined) =>
          photoIds.map((id, position) => ({ ...photos!.find((p) => p.id === id)!, position })),
        )
        return { before }
      },
      onError: (_error, _ids, context) => queryClient.setQueryData(key, context?.before),
      onSuccess: (photos) => queryClient.setQueryData(key, photos),
    }),
  }
}

export function useDocumentActions(propertyId: string) {
  const queryClient = useQueryClient()
  const refetch = () => queryClient.invalidateQueries({ queryKey: documentsQueryOptions(propertyId).queryKey })

  return {
    upload: useMutation({
      mutationFn: ({ file, category }: { file: File; category: string | null }) => uploadDocument(propertyId, file, category),
      onSettled: refetch,
    }),
    rename: useMutation({
      mutationFn: ({ id, category }: { id: string; category: string | null }) => updateDocumentCategory(propertyId, id, category),
      onSettled: refetch,
    }),
    remove: useMutation({ mutationFn: (id: string) => deleteDocument(propertyId, id), onSettled: refetch }),
  }
}
