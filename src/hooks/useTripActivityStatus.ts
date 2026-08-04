import { useEffect, useMemo, useState } from "react";

export type ActivityStatus = "done" | "current" | "upcoming";

export interface TripActivityItem {
  id: number;
  type?: string;
  startAt?: string | null;
  endAt?: string | null;
  day?: string | null;
  [key: string]: any;
}

// Ticks every minute so "en 45 min" / done-vs-current state stay fresh while
// the screen is open, without re-fetching anything.
function useNow(tickMs = 60000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), tickMs);
    return () => clearInterval(id);
  }, [tickMs]);
  return now;
}

export function useTripActivityStatus<T extends TripActivityItem>(planItems: T[] | undefined) {
  const now = useNow();

  return useMemo(() => {
    const timed = (planItems ?? [])
      .filter((it) => it.type !== "expense" && (it.startAt || it.day))
      .map((it) => ({ item: it, start: new Date((it.startAt ?? it.day) as string) }))
      .filter((x) => !isNaN(x.start.getTime()))
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    const statusById = new Map<number, ActivityStatus>();
    let currentItem: T | null = null;
    let nextItem: T | null = null;

    for (let i = 0; i < timed.length; i++) {
      const { item, start } = timed[i];
      const explicitEnd = item.endAt ? new Date(item.endAt) : null;
      const nextStart = timed[i + 1]?.start ?? null;
      const fallbackEnd = new Date(start.getTime() + 3 * 60 * 60 * 1000);
      const end = explicitEnd ?? nextStart ?? fallbackEnd;

      let status: ActivityStatus;
      if (now.getTime() >= end.getTime()) {
        status = "done";
      } else if (start.getTime() <= now.getTime()) {
        status = "current";
        currentItem = item;
      } else {
        status = "upcoming";
        if (!nextItem) nextItem = item;
      }
      statusById.set(item.id, status);
    }

    return { now, currentItem, nextItem, statusById };
  }, [planItems, now]);
}

export function minutesUntil(iso: string, now: Date) {
  return Math.round((new Date(iso).getTime() - now.getTime()) / 60000);
}

export function formatCountdown(mins: number) {
  if (mins < 1) return "ahora";
  if (mins < 60) return `en ${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `en ${h}h${m ? ` ${m}min` : ""}`;
}
