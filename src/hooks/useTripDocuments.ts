// src/hooks/useTripDocuments.ts
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/api";

export type TripDocumentType =
  | "travel_insurance"
  | "car_rental"
  | "accommodation_booking"
  | "activity_booking";

export interface TripDocument {
  id: number;
  tripId: number;
  type: TripDocumentType;
  provider: string | null;
  referenceCode: string | null;
  expiryDate: string | null;
  planItemId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertTripDocumentInput {
  provider?: string | null;
  referenceCode?: string | null;
  expiryDate?: string | null;
  planItemId?: number | null;
}

export function useTripDocuments(tripId: number) {
  const queryClient = useQueryClient();
  const queryKey = ["tripDocuments", tripId];

  const query = useQuery({
    queryKey,
    queryFn: async () => (await api.get(`/trips/${tripId}/documents`)).data as TripDocument[],
    staleTime: 1000 * 60 * 5,
    enabled: !!tripId,
  });

  const upsertMutation = useMutation({
    mutationFn: async ({ type, input }: { type: TripDocumentType; input: UpsertTripDocumentInput }) =>
      (await api.put(`/trips/${tripId}/documents/${type}`, input)).data as TripDocument,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (type: TripDocumentType) => {
      await api.delete(`/trips/${tripId}/documents/${type}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const documentsByType = useMemo(
    () => new Map(query.data?.map((d) => [d.type, d] as const)),
    [query.data]
  );

  return {
    documents: query.data ?? [],
    documentsByType,
    isLoading: query.isLoading,
    upsertDocument: (type: TripDocumentType, input: UpsertTripDocumentInput) =>
      upsertMutation.mutateAsync({ type, input }),
    deleteDocument: (type: TripDocumentType) => deleteMutation.mutateAsync(type),
    isSaving: upsertMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
