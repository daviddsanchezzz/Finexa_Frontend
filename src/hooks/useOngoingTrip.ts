import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../api/api";

interface OngoingTripSummary {
  id: number;
  startDate: string | null;
  endDate: string | null;
}

function useOngoingTripId() {
  const { data } = useQuery({
    queryKey: ["homeOngoingTripsList"],
    queryFn: async () => (await api.get("/trips")).data as OngoingTripSummary[],
    staleTime: 1000 * 60,
  });

  return useMemo(() => {
    const now = new Date();
    const trip = (data ?? []).find((t) => {
      if (!t.startDate || !t.endDate) return false;
      return new Date(t.startDate) <= now && now <= new Date(t.endDate);
    });
    return trip?.id ?? null;
  }, [data]);
}

// Full trip detail (with planItems) for whichever trip is happening right
// now, if any — powers the Home "live trip" card.
export function useOngoingTrip() {
  const tripId = useOngoingTripId();

  const detailQuery = useQuery({
    queryKey: ["tripDetail", tripId],
    queryFn: async () => (await api.get(`/trips/${tripId}`)).data,
    enabled: tripId != null,
    staleTime: 1000 * 30,
  });

  return {
    trip: tripId != null ? detailQuery.data ?? null : null,
    isLoading: tripId != null && detailQuery.isLoading,
  };
}
