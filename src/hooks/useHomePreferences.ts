import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";

export function useHomePreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["homePreferences", user?.id];
  const storageKey = `home.showInvestmentReturn.v1:${user?.id}`;
  const query = useQuery({
    queryKey,
    enabled: !!user,
    queryFn: async () => (await AsyncStorage.getItem(storageKey)) !== "false",
    staleTime: Infinity,
  });
  const mutation = useMutation({
    mutationFn: async (show: boolean) => {
      if (!user) throw new Error("No hay sesión activa");
      await AsyncStorage.setItem(storageKey, String(show));
      queryClient.setQueryData(queryKey, show);
    },
  });

  return {
    showInvestmentReturn: query.data ?? true,
    isLoading: !!user && query.isPending,
    isSaving: mutation.isPending,
    error: query.error || mutation.error,
    setShowInvestmentReturn: mutation.mutate,
  };
}
