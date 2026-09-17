import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import "../utils/budgetsCache";

export function useBudgetData<T>(key: readonly unknown[], fetchData: (signal: AbortSignal) => Promise<T>, enabled = true, options: { staleTime?: number; gcTime?: number; refetchOnFocus?: boolean } = {}) {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["budgets", user?.id, ...key],
    queryFn: ({ signal }) => fetchData(signal),
    enabled: !!user && enabled,
    staleTime: options.staleTime ?? 30_000,
    gcTime: options.gcTime ?? 30 * 60_000,
  });
  const { refetch } = query;
  useFocusEffect(useCallback(() => {
    if (user && enabled && options.refetchOnFocus !== false) void refetch({ cancelRefetch: false });
  }, [user?.id, enabled, options.refetchOnFocus, refetch, JSON.stringify(key)]));
  return query;
}
