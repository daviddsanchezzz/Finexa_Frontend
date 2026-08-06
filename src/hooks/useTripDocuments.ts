// src/hooks/useTripDocuments.ts
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/api";

export type TripDocumentType =
  | "travel_insurance"
  | "car_rental"
  | "accommodation_booking"
  | "activity_booking"
  | "visa"
  | "vaccine"
  | "ehic"
  | "private_health_insurance"
  | "driving_license"
  | "driving_license_international";

export interface TripDocument {
  id: number;
  tripId: number;
  type: TripDocumentType;
  provider: string | null;
  referenceCode: string | null;
  expiryDate: string | null;
  country: string | null;
  metadata: Record<string, any> | null;
  fileUrl: string | null;
  fileName: string | null;
  fileMimeType: string | null;
  planItemId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTripDocumentInput {
  type: TripDocumentType;
  provider?: string | null;
  referenceCode?: string | null;
  expiryDate?: string | null;
  country?: string | null;
  metadata?: Record<string, any> | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileMimeType?: string | null;
  planItemId?: number | null;
}

export type UpdateTripDocumentInput = Omit<CreateTripDocumentInput, "type">;

export function useTripDocuments(tripId: number) {
  const queryClient = useQueryClient();
  const queryKey = ["tripDocuments", tripId];

  const query = useQuery({
    queryKey,
    queryFn: async () => (await api.get(`/trips/${tripId}/documents`)).data as TripDocument[],
    staleTime: 1000 * 60 * 5,
    enabled: !!tripId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateTripDocumentInput) =>
      (await api.post(`/trips/${tripId}/documents`, input)).data as TripDocument,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, input }: { id: number; input: UpdateTripDocumentInput }) =>
      (await api.patch(`/trips/${tripId}/documents/${id}`, input)).data as TripDocument,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/trips/${tripId}/documents/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const documentsByType = useMemo(() => {
    const map = new Map<TripDocumentType, TripDocument[]>();
    for (const doc of query.data ?? []) {
      const arr = map.get(doc.type);
      if (arr) arr.push(doc);
      else map.set(doc.type, [doc]);
    }
    return map;
  }, [query.data]);

  return {
    documents: query.data ?? [],
    documentsByType,
    isLoading: query.isLoading,
    createDocument: (input: CreateTripDocumentInput) => createMutation.mutateAsync(input),
    updateDocument: (id: number, input: UpdateTripDocumentInput) => updateMutation.mutateAsync({ id, input }),
    deleteDocument: (id: number) => deleteMutation.mutateAsync(id),
    isSaving: createMutation.isPending || updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
