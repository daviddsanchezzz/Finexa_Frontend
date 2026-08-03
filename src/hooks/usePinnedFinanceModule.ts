// src/hooks/usePinnedFinanceModule.ts
import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../api/api";
import { DEFAULT_PINNED_MODULE_KEY } from "../screens/Mobile/finances/financeModulesConfig";

const STORAGE_KEY = "finances.pinnedTab.v1";
const QUERY_KEY = ["pinnedFinanceTab"];

/**
 * Cache-first: siempre resuelve rápido con el valor local (AsyncStorage),
 * y si el backend responde algo distinto, actualiza la query en segundo plano.
 */
function useFetchPinnedModule() {
  const queryClient = useQueryClient();

  return useCallback(async () => {
    const cached = (await AsyncStorage.getItem(STORAGE_KEY)) || DEFAULT_PINNED_MODULE_KEY;

    api
      .get("/users/me/pinned-finance-tab")
      .then((res) => {
        const moduleKey = res.data?.moduleKey;
        if (moduleKey && moduleKey !== cached) {
          AsyncStorage.setItem(STORAGE_KEY, moduleKey);
          queryClient.setQueryData(QUERY_KEY, moduleKey);
        }
      })
      .catch(() => {
        // sin backend/offline: nos quedamos con el valor local, sin bloquear ni mostrar error
      });

    return cached;
  }, [queryClient]);
}

export function usePinnedFinanceModule() {
  const queryClient = useQueryClient();
  const fetchPinnedModule = useFetchPinnedModule();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchPinnedModule,
    staleTime: 1000 * 60 * 5,
  });

  const mutation = useMutation({
    mutationFn: async (moduleKey: string) => {
      await AsyncStorage.setItem(STORAGE_KEY, moduleKey);
      try {
        await api.patch("/users/me/pinned-finance-tab", { moduleKey });
      } catch {
        // se reintentará en la próxima carga; el valor local ya quedó guardado
      }
      return moduleKey;
    },
    onMutate: async (moduleKey: string) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      queryClient.setQueryData(QUERY_KEY, moduleKey);
    },
  });

  return {
    pinnedKey: query.data ?? DEFAULT_PINNED_MODULE_KEY,
    isLoading: query.isLoading,
    setPinnedKey: useCallback((key: string) => mutation.mutateAsync(key), [mutation]),
  };
}
