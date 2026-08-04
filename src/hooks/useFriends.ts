import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import api from "../api/api";

export interface FriendUser {
  id: number;
  name: string;
  email: string;
}

export interface FriendRequest {
  id: number;
  createdAt: string;
  user: FriendUser;
}

interface FriendRequestsResponse {
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
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

export function useFriends() {
  const queryClient = useQueryClient();
  const friendsKey = ["friends"];
  const requestsKey = ["friendRequests"];

  const friendsQuery = useQuery({
    queryKey: friendsKey,
    queryFn: async () => (await api.get("/friends")).data as FriendUser[],
    staleTime: 1000 * 30,
  });

  const requestsQuery = useQuery({
    queryKey: requestsKey,
    queryFn: async () => (await api.get("/friends/requests")).data as FriendRequestsResponse,
    staleTime: 1000 * 15,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: friendsKey });
    queryClient.invalidateQueries({ queryKey: requestsKey });
  };

  const sendRequestMutation = useMutation({
    mutationFn: async (email: string) => (await api.post("/friends/requests", { email })).data,
    onSuccess: invalidateAll,
  });

  const acceptMutation = useMutation({
    mutationFn: async (id: number) => (await api.patch(`/friends/requests/${id}/accept`)).data,
    onSuccess: invalidateAll,
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: number) => (await api.patch(`/friends/requests/${id}/reject`)).data,
    onSuccess: invalidateAll,
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/friends/requests/${id}`)).data,
    onSuccess: invalidateAll,
  });

  const removeFriendMutation = useMutation({
    mutationFn: async (userId: number) => (await api.delete(`/friends/${userId}`)).data,
    onSuccess: invalidateAll,
  });

  return {
    friends: friendsQuery.data ?? [],
    incomingRequests: requestsQuery.data?.incoming ?? [],
    outgoingRequests: requestsQuery.data?.outgoing ?? [],
    isLoading: friendsQuery.isLoading || requestsQuery.isLoading,
    refetch: () => {
      friendsQuery.refetch();
      requestsQuery.refetch();
    },
    sendRequest: (email: string) => sendRequestMutation.mutateAsync(email),
    isSendingRequest: sendRequestMutation.isPending,
    acceptRequest: (id: number) => acceptMutation.mutateAsync(id),
    rejectRequest: (id: number) => rejectMutation.mutateAsync(id),
    cancelRequest: (id: number) => cancelMutation.mutateAsync(id),
    removeFriend: (userId: number) => removeFriendMutation.mutateAsync(userId),
    getErrorMessage,
  };
}
