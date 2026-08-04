import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/api";

export interface FeedNotification {
  id: number;
  title: string;
  message: string;
  type: string | null;
  data: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
}

export function useNotificationsFeed() {
  const queryClient = useQueryClient();
  const queryKey = ["notificationsFeed"];

  const query = useQuery({
    queryKey,
    queryFn: async () => (await api.get("/notifications")).data as FeedNotification[],
    staleTime: 1000 * 15,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: number) => (await api.patch(`/notifications/${id}/read`)).data,
    onSuccess: (_data, id) => {
      queryClient.setQueryData<FeedNotification[]>(queryKey, (old) =>
        old ? old.map((n) => (n.id === id ? { ...n, read: true } : n)) : old
      );
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => (await api.patch("/notifications/read-all")).data,
    onSuccess: () => {
      queryClient.setQueryData<FeedNotification[]>(queryKey, (old) =>
        old ? old.map((n) => ({ ...n, read: true })) : old
      );
    },
  });

  const notifications = query.data ?? [];

  return {
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
    isLoading: query.isLoading,
    refetch: query.refetch,
    markRead: (id: number) => markReadMutation.mutateAsync(id),
    markAllRead: () => markAllReadMutation.mutateAsync(),
  };
}
