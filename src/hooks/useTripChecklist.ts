// src/hooks/useTripChecklist.ts
import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import api from "../api/api";

export type ChecklistCategory = "ropa" | "documentos" | "electronica" | "otros";

export interface TripChecklistItem {
  id: number;
  tripId: number;
  category: ChecklistCategory;
  label: string;
  checked: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message[0] ?? fallback;
    if (typeof message === "string" && message.trim()) return message;
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

const BASE_TEMPLATE: { category: ChecklistCategory; label: string }[] = [
  { category: "ropa", label: "Ropa interior" },
  { category: "ropa", label: "Camisetas" },
  { category: "ropa", label: "Pantalones / shorts" },
  { category: "ropa", label: "Calzado cómodo" },
  { category: "ropa", label: "Pijama" },
  { category: "documentos", label: "Tarjeta de embarque" },
  { category: "documentos", label: "Tarjeta sanitaria" },
  { category: "electronica", label: "Cargador y cable" },
  { category: "electronica", label: "Adaptador de enchufe" },
  { category: "electronica", label: "Power bank" },
  { category: "otros", label: "Neceser" },
  { category: "otros", label: "Gafas de sol" },
  { category: "otros", label: "Botella de agua" },
];

export function useTripChecklist(tripId: number) {
  const queryClient = useQueryClient();
  const queryKey = ["tripChecklist", tripId];
  const seedAttempted = useRef(false);

  const query = useQuery({
    queryKey,
    queryFn: async () => (await api.get(`/trips/${tripId}/checklist`)).data as TripChecklistItem[],
    staleTime: 1000 * 60 * 5,
    enabled: !!tripId,
  });

  const seedMutation = useMutation({
    mutationFn: async () =>
      (await api.post(`/trips/${tripId}/checklist/seed`, { items: BASE_TEMPLATE })).data as TripChecklistItem[],
    onSuccess: (data) => queryClient.setQueryData(queryKey, data),
  });

  useEffect(() => {
    if (!query.isSuccess || seedAttempted.current) return;
    if (query.data.length === 0) {
      seedAttempted.current = true;
      seedMutation.mutate();
    }
  }, [query.isSuccess, query.data]);

  const toggleMutation = useMutation({
    mutationFn: async ({ itemId, checked }: { itemId: number; checked: boolean }) =>
      (await api.patch(`/trips/${tripId}/checklist/${itemId}`, { checked })).data as TripChecklistItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const createMutation = useMutation({
    mutationFn: async ({ category, label }: { category: ChecklistCategory; label: string }) =>
      (await api.post(`/trips/${tripId}/checklist`, { category, label })).data as TripChecklistItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (itemId: number) => {
      await api.delete(`/trips/${tripId}/checklist/${itemId}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    items: query.data ?? [],
    isLoading: query.isLoading || seedMutation.isPending,
    toggleItem: (itemId: number, checked: boolean) => toggleMutation.mutateAsync({ itemId, checked }),
    createItem: (category: ChecklistCategory, label: string) => createMutation.mutateAsync({ category, label }),
    deleteItem: (itemId: number) => deleteMutation.mutateAsync(itemId),
    isSaving: createMutation.isPending,
    errorMessage:
      getErrorMessage(query.error, "") ||
      getErrorMessage(seedMutation.error, "") ||
      getErrorMessage(createMutation.error, "") ||
      getErrorMessage(toggleMutation.error, "") ||
      getErrorMessage(deleteMutation.error, ""),
  };
}
