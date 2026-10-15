// Borrador de reserva leído por IA (POST /trips/:id/extract-booking) -> valores para los formularios del plan.

export type DraftKind = "flight" | "train" | "bus" | "ferry" | "car" | "accommodation" | "activity" | "expense" | "unknown";

export interface BookingDraft {
  kind: DraftKind;
  confidence: number;
  title: string | null;
  flight: {
    airlineName: string | null; flightNumber: string | null; fromIata: string | null; toIata: string | null;
    fromCity: string | null; toCity: string | null; depAt: string | null; arrAt: string | null;
    bookingRef: string | null; seat: string | null; gate: string | null;
  };
  transport: { company: string | null; fromName: string | null; toName: string | null; depAt: string | null; arrAt: string | null; bookingRef: string | null };
  accommodation: {
    name: string | null; address: string | null; city: string | null; country: string | null;
    checkInAt: string | null; checkOutAt: string | null; guests: number | null; rooms: number | null;
    bookingRef: string | null; phone: string | null; website: string | null;
  };
  activity: { title: string | null; location: string | null; startAt: string | null; endAt: string | null };
  cost: number | null;
  currency: string | null;
  notes: string | null;
  warnings: string[];
}

export type MainTabKey = "transport" | "accommodation" | "activity" | "expense" | "visit";
export type TransportSubTabKey = "flight" | "train" | "bus" | "car" | "ferry";

export interface FormPatch {
  mainTab: MainTabKey;
  transportTab?: TransportSubTabKey;
  flight?: { airline: string; number: string; from: string; to: string; dep: Date | null; arr: Date | null; bookingRef: string; seat: string; gate: string };
  transport?: { company: string; from: string; to: string; dep: Date | null; arr: Date | null; bookingRef: string };
  accommodation?: {
    name: string; address: string; city: string; country: string; checkIn: Date | null; checkOut: Date | null;
    guests: string; rooms: string; bookingRef: string; phone: string; website: string;
  };
  activity?: { title: string; location: string; start: Date | null; end: Date | null };
  expense?: { title: string };
  costStr: string;
  currency: string;
  notes: string;
  isReservation: boolean;
  warnings: string[];
}

/** "2026-09-30T23:50" (hora local del documento) -> Date en la zona del dispositivo. */
export function parseLocalDateTime(v: string | null | undefined): Date | null {
  const m = typeof v === "string" ? /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(v) : null;
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
  return Number.isNaN(d.getTime()) ? null : d;
}

const s = (v: string | null | undefined) => v ?? "";
// El formulario usa coma decimal (ver parseCost en TripPlanFormScreen).
const costToStr = (c: number | null) => (c == null ? "" : String(c).replace(".", ","));

export function draftToFormPatch(d: BookingDraft): FormPatch | null {
  if (d.kind === "unknown") return null;
  const common = { costStr: costToStr(d.cost), currency: d.currency || "EUR", notes: s(d.notes), warnings: d.warnings ?? [] };

  if (d.kind === "flight") {
    const f = d.flight;
    return {
      ...common, mainTab: "transport", transportTab: "flight", isReservation: true,
      flight: {
        airline: s(f.airlineName), number: s(f.flightNumber), from: s(f.fromIata), to: s(f.toIata),
        dep: parseLocalDateTime(f.depAt), arr: parseLocalDateTime(f.arrAt), bookingRef: s(f.bookingRef), seat: s(f.seat), gate: s(f.gate),
      },
    };
  }
  if (d.kind === "train" || d.kind === "bus" || d.kind === "ferry" || d.kind === "car") {
    const t = d.transport;
    return {
      ...common, mainTab: "transport", transportTab: d.kind, isReservation: false,
      transport: { company: s(t.company), from: s(t.fromName), to: s(t.toName), dep: parseLocalDateTime(t.depAt), arr: parseLocalDateTime(t.arrAt), bookingRef: s(t.bookingRef) },
    };
  }
  if (d.kind === "accommodation") {
    const a = d.accommodation;
    return {
      ...common, mainTab: "accommodation", isReservation: true,
      accommodation: {
        name: s(a.name || d.title), address: s(a.address), city: s(a.city), country: s(a.country),
        checkIn: parseLocalDateTime(a.checkInAt), checkOut: parseLocalDateTime(a.checkOutAt),
        guests: a.guests != null ? String(a.guests) : "", rooms: a.rooms != null ? String(a.rooms) : "",
        bookingRef: s(a.bookingRef), phone: s(a.phone), website: s(a.website),
      },
    };
  }
  if (d.kind === "expense") {
    return { ...common, mainTab: "expense", isReservation: false, expense: { title: s(d.title) } };
  }
  const a = d.activity;
  return {
    ...common, mainTab: "activity", isReservation: false,
    activity: { title: s(a.title || d.title), location: s(a.location), start: parseLocalDateTime(a.startAt), end: parseLocalDateTime(a.endAt) },
  };
}
