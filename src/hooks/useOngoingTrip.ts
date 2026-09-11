import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../api/api";
import { isTripOngoing } from "../utils/tripDates";

interface OngoingTripSummary {
  id: number;
  status: string;
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
    // Solo cuenta como "viaje activo" si sigue en organización (estado
    // "planning"): un viaje ya visitado o aún en wishlist no debe disparar
    // la tarjeta aunque sus fechas coincidan con hoy.
    const trip = (data ?? []).find(
      (t) => t.status === "planning" && isTripOngoing(t.startDate, t.endDate, now)
    );
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
