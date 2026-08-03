// src/hooks/useTripContacts.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/api";

export interface TripContact {
  id: number;
  tripId: number;
  name: string;
  phone: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TripContactInput {
  name: string;
  phone: string;
  notes?: string | null;
}

export function useTripContacts(tripId: number) {
  const queryClient = useQueryClient();
  const queryKey = ["tripContacts", tripId];

  const query = useQuery({
    queryKey,
    queryFn: async () => (await api.get(`/trips/${tripId}/contacts`)).data as TripContact[],
    staleTime: 1000 * 60 * 5,
    enabled: !!tripId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: TripContactInput) =>
      (await api.post(`/trips/${tripId}/contacts`, input)).data as TripContact,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (contactId: number) => {
      await api.delete(`/trips/${tripId}/contacts/${contactId}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    contacts: query.data ?? [],
    isLoading: query.isLoading,
    createContact: (input: TripContactInput) => createMutation.mutateAsync(input),
    deleteContact: (contactId: number) => deleteMutation.mutateAsync(contactId),
    isSaving: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
