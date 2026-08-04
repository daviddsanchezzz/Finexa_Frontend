import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/api";

export interface TripMemberUser {
  id: number;
  name: string;
  email: string;
}

export interface TripInviteCandidate extends TripMemberUser {
  inviteStatus: "pending" | "accepted" | null;
}

interface TripMembersResponse {
  owner: TripMemberUser;
  members: TripMemberUser[];
}

export function useTripMembers(tripId: number | undefined) {
  const queryClient = useQueryClient();
  const membersKey = ["tripMembers", tripId];
  const candidatesKey = ["tripInviteCandidates", tripId];

  const membersQuery = useQuery({
    queryKey: membersKey,
    queryFn: async () => (await api.get(`/trips/${tripId}/members`)).data as TripMembersResponse,
    enabled: tripId != null,
  });

  const candidatesQuery = useQuery({
    queryKey: candidatesKey,
    queryFn: async () => (await api.get(`/trips/${tripId}/invite-candidates`)).data as TripInviteCandidate[],
    enabled: tripId != null,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: membersKey });
    queryClient.invalidateQueries({ queryKey: candidatesKey });
  };

  const inviteMutation = useMutation({
    mutationFn: async (userId: number) => (await api.post(`/trips/${tripId}/invite`, { userId })).data,
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: async (userId: number) => (await api.delete(`/trips/${tripId}/members/${userId}`)).data,
    onSuccess: invalidate,
  });

  return {
    owner: membersQuery.data?.owner ?? null,
    members: membersQuery.data?.members ?? [],
    candidates: candidatesQuery.data ?? [],
    isLoading: membersQuery.isLoading || candidatesQuery.isLoading,
    invite: (userId: number) => inviteMutation.mutateAsync(userId),
    isInviting: inviteMutation.isPending,
    removeMember: (userId: number) => removeMutation.mutateAsync(userId),
  };
}
