// src/hooks/useQuickAddToken.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/api";

const QUERY_KEY = ["quickAddToken"];

export function useQuickAddToken() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => (await api.get("/users/me/quick-add-token")).data as { token: string },
    staleTime: Infinity,
  });

  const regenerateMutation = useMutation({
    mutationFn: async () => (await api.post("/users/me/quick-add-token/regenerate")).data as { token: string },
    onSuccess: (data) => queryClient.setQueryData(QUERY_KEY, data),
  });

  return {
    token: query.data?.token ?? null,
    isLoading: query.isLoading,
    regenerate: () => regenerateMutation.mutateAsync(),
    isRegenerating: regenerateMutation.isPending,
  };
}
