import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/api";

export interface TripInviteDetail {
  id: number;
  trip: {
    id: number;
    name: string;
    destination: string | null;
    coverImageUrl: string | null;
    startDate: string | null;
    endDate: string | null;
    countryStays: { country: string }[];
  };
  inviter: { id: number; name: string } | null;
}

export function useTripInviteDetail(memberId: number | null) {
  return useQuery({
    queryKey: ["tripInviteDetail", memberId],
    queryFn: async () => (await api.get(`/trips/invites/${memberId}`)).data as TripInviteDetail,
    enabled: memberId != null,
  });
}

export function useTripInviteActions() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["trips"] });
    queryClient.invalidateQueries({ queryKey: ["tripMembers"] });
  };

  const acceptMutation = useMutation({
    mutationFn: async (memberId: number) => (await api.patch(`/trips/invites/${memberId}/accept`)).data,
    onSuccess: invalidate,
  });

  const rejectMutation = useMutation({
    mutationFn: async (memberId: number) => (await api.patch(`/trips/invites/${memberId}/reject`)).data,
    onSuccess: invalidate,
  });

  return {
    accept: (memberId: number) => acceptMutation.mutateAsync(memberId),
    reject: (memberId: number) => rejectMutation.mutateAsync(memberId),
    isLoading: acceptMutation.isPending || rejectMutation.isPending,
  };
}
