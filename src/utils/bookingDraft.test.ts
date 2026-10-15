import { describe, it, expect } from "vitest";
import { BookingDraft, draftToFormPatch, parseLocalDateTime } from "./bookingDraft";

const empty = (): BookingDraft => ({
  kind: "unknown", confidence: 1, title: null,
  flight: { airlineName: null, flightNumber: null, fromIata: null, toIata: null, fromCity: null, toCity: null, depAt: null, arrAt: null, bookingRef: null, seat: null, gate: null },
  transport: { company: null, fromName: null, toName: null, depAt: null, arrAt: null, bookingRef: null },
  accommodation: { name: null, address: null, city: null, country: null, checkInAt: null, checkOutAt: null, guests: null, rooms: null, bookingRef: null, phone: null, website: null },
  activity: { title: null, location: null, startAt: null, endAt: null },
  cost: null, currency: null, notes: null, warnings: [],
});

describe("parseLocalDateTime", () => {
  it("interpreta la hora tal cual aparece, en la zona del dispositivo", () => {
    const d = parseLocalDateTime("2026-09-30T23:50")!;
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([2026, 8, 30, 23, 50]);
  });
  it("devuelve null con basura", () => {
    expect(parseLocalDateTime(null)).toBeNull();
    expect(parseLocalDateTime("mañana")).toBeNull();
  });
});

describe("draftToFormPatch", () => {
  it("vuelo: rellena el formulario de vuelo y lo marca como reserva", () => {
    const d = empty();
    d.kind = "flight";
    d.flight = { ...d.flight, airlineName: "Vueling", flightNumber: "VY1291", fromIata: "LCG", toIata: "BCN", depAt: "2026-09-30T23:50", arrAt: "2026-10-01T01:30", bookingRef: "HMD3JD" };
    const p = draftToFormPatch(d)!;
    expect(p.mainTab).toBe("transport");
    expect(p.transportTab).toBe("flight");
    expect(p.isReservation).toBe(true);
    expect(p.flight).toMatchObject({ airline: "Vueling", number: "VY1291", from: "LCG", to: "BCN", bookingRef: "HMD3JD", seat: "" });
    expect(p.flight!.arr!.getDate()).toBe(1);
  });

  it("tren: usa el subtipo y el importe con coma decimal", () => {
    const d = empty();
    d.kind = "train"; d.cost = 45.5; d.currency = "EUR";
    d.transport = { ...d.transport, company: "Renfe", fromName: "Madrid", toName: "Valencia", depAt: "2026-11-02T09:00" };
    const p = draftToFormPatch(d)!;
    expect(p.transportTab).toBe("train");
    expect(p.costStr).toBe("45,5");
    expect(p.transport).toMatchObject({ company: "Renfe", from: "Madrid", to: "Valencia" });
    expect(p.isReservation).toBe(false);
  });

  it("alojamiento: huéspedes y habitaciones como texto; usa el título si falta el nombre", () => {
    const d = empty();
    d.kind = "accommodation"; d.title = "Hotel Sol";
    d.accommodation = { ...d.accommodation, guests: 2, rooms: 1, checkInAt: "2026-11-02T15:00" };
    const p = draftToFormPatch(d)!;
    expect(p.mainTab).toBe("accommodation");
    expect(p.accommodation).toMatchObject({ name: "Hotel Sol", guests: "2", rooms: "1" });
    expect(p.isReservation).toBe(true);
  });

  it("actividad y gasto", () => {
    const a = empty(); a.kind = "activity"; a.activity = { title: "Sagrada Família", location: "Barcelona", startAt: "2026-12-02T10:00", endAt: null };
    expect(draftToFormPatch(a)!.activity).toMatchObject({ title: "Sagrada Família", location: "Barcelona" });
    const e = empty(); e.kind = "expense"; e.title = "Cena"; e.cost = 30; e.currency = "USD";
    const pe = draftToFormPatch(e)!;
    expect(pe.mainTab).toBe("expense");
    expect(pe.currency).toBe("USD");
  });

  it("si no es una reserva legible devuelve null", () => {
    expect(draftToFormPatch(empty())).toBeNull();
  });

  it("moneda por defecto EUR y avisos conservados", () => {
    const d = empty(); d.kind = "activity"; d.warnings = ["La fecha cae fuera de las fechas del viaje."];
    const p = draftToFormPatch(d)!;
    expect(p.currency).toBe("EUR");
    expect(p.warnings).toHaveLength(1);
  });
});
