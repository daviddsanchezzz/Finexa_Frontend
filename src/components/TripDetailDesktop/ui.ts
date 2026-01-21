import React, { useCallback, useMemo } from "react";
import { Dimensions } from "react-native";

export const UI = {
  bg: "#F8FAFC",
  surface: "#FFFFFF",
  border: "#E2E8F0",
  text: "#0B1220",
  muted: "#64748B",
  muted2: "#94A3B8",
  hover: "rgba(15,23,42,0.04)",
  activeBg: "rgba(15,23,42,0.06)",
  radius: 18,
};

export function useUiScale() {
  const { width } = Dimensions.get("window");
  const s = useMemo(() => {
    const raw = width / 1440;
    return Math.max(0.9, Math.min(1.1, raw));
  }, [width]);
  const px = useCallback((n: number) => Math.round(n * s), [s]);
  const fs = useCallback((n: number) => Math.round(n * s), [s]);
  return { width, s, px, fs };
}

export const formatEuro = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export function cca2ToFlagEmoji(cca2?: string | null) {
  const cc = String(cca2 || "").toUpperCase();
  if (cc.length !== 2) return "";
  const A = 0x1f1e6;
  const base = "A".charCodeAt(0);
  const first = cc.charCodeAt(0) - base + A;
  const second = cc.charCodeAt(1) - base + A;
  return String.fromCodePoint(first, second);
}

export function safeDate(d?: string | null) {
  if (!d) return null;
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? null : x;
}

export function formatDateRange(start?: string | null, end?: string | null) {
  const s = safeDate(start);
  const e = safeDate(end);
  if (!s || !e) return "Sin fechas";
  const sameYear = s.getFullYear() === e.getFullYear();
  const base: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" };
  const a = s.toLocaleDateString("es-ES", base);
  const b = e.toLocaleDateString("es-ES", { ...base, year: sameYear ? undefined : "numeric" });
  return `${a} - ${b}`;
}

export function daysBetween(start?: string | null, end?: string | null) {
  const s = safeDate(start);
  const e = safeDate(end);
  if (!s || !e) return 0;
  const diff = e.getTime() - s.getTime();
  const d = Math.round(diff / (1000 * 60 * 60 * 24)) + 1;
  return d > 0 ? d : 0;
}

export function nightsBetween(start?: string | null, end?: string | null) {
  const d = daysBetween(start, end);
  return d > 0 ? Math.max(0, d - 1) : 0;
}

export function fmtHeaderDateLine(start?: string | null, end?: string | null) {
  if (!start && !end) return "—";

  const s = start ? new Date(start) : null;
  const e = end ? new Date(end) : null;

  if (s && !e) {
    return s.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  if (s && e) {
    const sameYear = s.getFullYear() === e.getFullYear();

    const startFmt = s.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
    });

    const endFmt = e.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    return sameYear
      ? `${startFmt} – ${endFmt}`
      : `${startFmt} ${s.getFullYear()} – ${endFmt}`;
  }

  return "—";
}

export function fmtContinent(c?: string | null) {
  if (!c) return null;
  const key = String(c).toLowerCase();

  const map: Record<string, string> = {
    europe: "Europa",
    asia: "Asia",
    africa: "África",
    "north america": "América del Norte",
    "south america": "América del Sur",
    oceania: "Oceanía",
    antarctica: "Antártida",
  };

  return map[key] ?? (key.charAt(0).toUpperCase() + key.slice(1));
}
