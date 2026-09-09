const TRIP_TIME_ZONE = "Europe/Madrid";

const tripDateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TRIP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Comparable YYYYMMDD value for the calendar day used by trips. */
export function tripDateKey(value?: string | Date | null): number | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = tripDateFormatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  if (!year || !month || !day) return null;
  return year * 10000 + month * 100 + day;
}

export function isTripOngoing(
  startDate?: string | Date | null,
  endDate?: string | Date | null,
  now: Date = new Date()
): boolean {
  const start = tripDateKey(startDate);
  const end = tripDateKey(endDate);
  const today = tripDateKey(now);
  return start != null && end != null && today != null && start <= today && today <= end;
}
