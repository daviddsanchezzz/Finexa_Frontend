// src/hooks/useTripGallery.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/api";

export interface TripGalleryPhoto {
  id: number;
  tripId: number;
  url: string;
  fileName: string | null;
  mimeType: string | null;
  dayDate: string | null; // null = "general del viaje"
  createdAt: string;
}

export interface CreateTripGalleryPhotoInput {
  url: string;
  fileName?: string | null;
  mimeType?: string | null;
  dayDate?: string | null;
}

export function useTripGallery(tripId: number) {
  const queryClient = useQueryClient();
  const queryKey = ["tripGallery", tripId];

  const query = useQuery({
    queryKey,
    queryFn: async () => (await api.get(`/trips/${tripId}/gallery`)).data as TripGalleryPhoto[],
    staleTime: 1000 * 60 * 5,
    enabled: !!tripId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateTripGalleryPhotoInput) =>
      (await api.post(`/trips/${tripId}/gallery`, input)).data as TripGalleryPhoto,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/trips/${tripId}/gallery/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    photos: query.data ?? [],
    isLoading: query.isLoading,
    createPhoto: (input: CreateTripGalleryPhotoInput) => createMutation.mutateAsync(input),
    createPhotos: (inputs: CreateTripGalleryPhotoInput[]) =>
      Promise.all(inputs.map((input) => createMutation.mutateAsync(input))),
    deletePhoto: (id: number) => deleteMutation.mutateAsync(id),
    isSaving: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
