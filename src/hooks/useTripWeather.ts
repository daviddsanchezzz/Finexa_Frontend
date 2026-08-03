// src/hooks/useTripWeather.ts
import { useQuery } from "@tanstack/react-query";
import { fetchTripWeather } from "../utils/tripWeather";

export function useTripWeather(countryCode?: string | null, tripName?: string | null) {
  return useQuery({
    queryKey: ["tripWeather", countryCode ?? null, tripName ?? null],
    queryFn: () => fetchTripWeather(countryCode!, tripName ?? undefined),
    enabled: !!countryCode,
    staleTime: 1000 * 60 * 60 * 6, // 6h: el clima no necesita refrescarse más a menudo
    gcTime: 1000 * 60 * 60 * 24,
  });
}
