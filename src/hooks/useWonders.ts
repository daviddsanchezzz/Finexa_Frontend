import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import api from "../api/api";

export type WonderEra = "modern" | "ancient" | "natural";
export type PhotoAlign = "top" | "center" | "bottom";

export interface Wonder {
  key: string;
  name: string;
  country: string;
  era: WonderEra;
  visited: boolean;
  visitedAt: string | null;
  photoUrl: string | null;
  photoAlign: PhotoAlign | null;
  tripId: number | null;
}

export interface UpdateWonderVisitInput {
  visited: boolean;
  visitedAt?: string;
  photoUrl?: string;
  photoAlign?: PhotoAlign;
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
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
