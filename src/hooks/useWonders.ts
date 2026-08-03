import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import api from "../api/api";

export type WonderEra = "modern" | "ancient" | "natural";

export interface Wonder {
  key: string;
  name: string;
  country: string;
  era: WonderEra;
  visited: boolean;
  visitedAt: string | null;
  photoUrl: string | null;
  /** Vertical crop focal point, 0 (top) .. 1 (bottom); null = 0.5 (center). */
  photoOffset: number | null;
  tripId: number | null;
}

export interface UpdateWonderVisitInput {
  visited: boolean;
  visitedAt?: string;
  photoUrl?: string;
  photoOffset?: number;
  tripId?: number;
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

export function useWonders() {
  const queryClient = useQueryClient();
  const queryKey = ["worldWonders"];

  const query = useQuery({
    queryKey,
    queryFn: async () => (await api.get("/world/wonders")).data as Wonder[],
    staleTime: 1000 * 30,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ key, input }: { key: string; input: UpdateWonderVisitInput }) =>
      (await api.patch(`/world/wonders/${key}`, input)).data as Wonder,
    onSuccess: (updatedWonder) => {
      // Write the mutation's own response straight into the cache instead of
      // only invalidating — avoids a window where a screen reads stale data
      // (missing the just-saved photo) while waiting on a refetch round-trip.
      queryClient.setQueryData<Wonder[]>(queryKey, (old) =>
        old ? old.map((w) => (w.key === updatedWonder.key ? updatedWonder : w)) : old
      );
      queryClient.invalidateQueries({ queryKey: ["worldOverview"] });
    },
  });

  return {
    wonders: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    updateWonder: (key: string, input: UpdateWonderVisitInput) =>
      updateMutation.mutateAsync({ key, input }),
    isSaving: updateMutation.isPending,
    errorMessage: getErrorMessage(query.error, "") || getErrorMessage(updateMutation.error, ""),
  };
}
