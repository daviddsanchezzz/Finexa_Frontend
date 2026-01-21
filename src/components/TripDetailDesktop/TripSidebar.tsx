import React, { useMemo } from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TripPlanItem } from "../../screens/Desktop/travel/TripDetailDesktopScreen";
import { formatEuro, UI } from "./ui";
import { colors } from "../../theme/theme";
import { TripSection } from "./TripDetailTabs";

function byStartAtAsc(a: any, b: any) {
  return String(a?.startAt || a?.day || "").localeCompare(String(b?.startAt || b?.day || ""));
}
function flightStartMs(f: any) {
  const s = f?.startAt || f?.day;
  const t = s ? new Date(s).getTime() : NaN;
  return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY;
}

function fmtFlightDay(iso?: string | null, tz?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-ES", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      timeZone: tz || undefined,
    });
  } catch {
    return new Date(iso).toLocaleDateString("es-ES", { weekday: "short", day: "2-digit", month: "short" });
  }
}


function fmtTime(iso?: string | null, tz?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: tz || undefined,
    });
  } catch {
    return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  }
}

function fmtDurationMinutes(startISO?: string | null, endISO?: string | null) {
  if (!startISO || !endISO) return "";
  const a = new Date(startISO).getTime();
  const b = new Date(endISO).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return "";
  const mins = Math.round((b - a) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function parseRouteFromTitle(title?: string | null): { from?: string; to?: string } {
  const t = String(title || "");
  // soporta "BCN → FCO" o "BCN -> FCO"
  const m = t.match(/\b([A-Z]{3})\b\s*(?:→|->)\s*\b([A-Z]{3})\b/);
  if (!m) return {};
  return { from: m[1], to: m[2] };
}

function pickFlightCode(item: any) {
  const fd = item?.flightDetails;
  return fd?.flightNumberIata || fd?.flightNumberRaw || item?.title || "Vuelo";
}

function pickIataFrom(item: any): { from: string; to: string } {
  const fd = item?.flightDetails;
  const from = fd?.fromIata || parseRouteFromTitle(item?.title).from || "—";
  const to = fd?.toIata || parseRouteFromTitle(item?.title).to || "—";
  return { from, to };
}

function Card({ children, px }: { children: React.ReactNode; px: (n: number) => number }) {
  return (
    <View
      style={{
        backgroundColor: "white",
        borderRadius: px(18),
        borderWidth: 1,
        borderColor: "rgba(226,232,240,0.95)",
        padding: px(16),
        shadowColor: "#0B1220",
        shadowOpacity: 0.05,
        shadowRadius: px(18),
        shadowOffset: { width: 0, height: px(10) },
      }}
    >
      {children}
    </View>
  );
}

function ProgressBar({ value, px }: { value: number; px: (n: number) => number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View style={{ height: px(8), borderRadius: 999, backgroundColor: "rgba(15,23,42,0.08)", overflow: "hidden" }}>
      <View style={{ height: "100%", width: `${pct}%`, backgroundColor: "#0B1220" }} />
    </View>
  );
}

export function TripSidebar({
  trip,
  items,
  px,
  fs,
  section,
}: {
  trip: any;
  items: TripPlanItem[];
  px: (n: number) => number;
  fs: (n: number) => number;
  section?:TripSection;
}) {
  const spent = Number(trip?.cost || 0);
  const hideFlights = section === "transport";
  const hideStays = section === "stays";

  const planned = useMemo(() => {
    const withCost = items.filter((i) => typeof i.cost === "number" && !Number.isNaN(i.cost as number));
    return withCost.reduce((s, it) => s + Number(it.cost || 0), 0);
  }, [items]);

  // si no tienes budget en backend, usa planned como fallback visual
  const budget = trip?.budget != null ? Number(trip.budget) : planned || 0;

  const pct = budget > 0 ? (spent / budget) * 100 : 0;
  const remaining = Math.max(0, budget - spent);

  return (
    <View style={{ gap: px(14) }}>
      {/* Seguimiento de Gastos */}
      <Card px={px}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontSize: fs(14), fontWeight: "700", color: UI.text }}>Seguimiento de Gastos</Text>
          <View style={{ width: px(28), height: px(28), borderRadius: 999, backgroundColor: "rgba(148,163,184,0.20)", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="pie-chart-outline" size={px(16)} color={UI.muted} />
          </View>
        </View>

        <View style={{ marginTop: px(14), flexDirection: "row", justifyContent: "space-between", gap: px(12) }}>
          <View>
            <Text style={{ fontSize: fs(12), fontWeight: "700", color: UI.muted, letterSpacing: 0.6 }}>TOTAL GASTADO</Text>
            <Text style={{ marginTop: px(6), fontSize: fs(28), fontWeight: "900", color: UI.text }}>{formatEuro(spent)}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: fs(12), fontWeight: "700", color: UI.muted, letterSpacing: 0.6 }}>PRESUPUESTO</Text>
            <Text style={{ marginTop: px(8), fontSize: fs(16), fontWeight: "800", color: UI.text }}>
              {budget > 0 ? formatEuro(budget) : "—"}
            </Text>
          </View>
        </View>

        <View style={{ marginTop: px(12) }}>
          <ProgressBar value={pct} px={px} />
          <View style={{ marginTop: px(10), flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: fs(12), fontWeight: "700", color: UI.muted }}>{Math.min(100, pct).toFixed(0)}% consumido</Text>
            <Text style={{ fontSize: fs(12), fontWeight: "700", color: colors.primary }}>
              {budget > 0 ? `${formatEuro(remaining)} restante` : ""}
            </Text>
          </View>
        </View>
      </Card>

      {/* Reservas Importantes */}
      <View>
        <Text style={{ fontSize: fs(15), fontWeight: "700", color: UI.text, marginBottom: px(10) }}>
          Reservas Importantes
        </Text>

        {/** ✅ flights & stays reales */}
        {(() => {
            const flights = (items || [])
                .filter((i) => i.type === "flight")
                .slice()
                .sort((a, b) => flightStartMs(a) - flightStartMs(b));

            const outbound = flights[0] || null;
            const inbound = flights.length > 1 ? flights[flights.length - 1] : null;

            const nowMs = Date.now();
            const nextFlight = flights.find((f) => flightStartMs(f) >= nowMs) || null;

            // ✅ decide qué mostrar según regla
            const showOutbound =
            !!outbound && (!nextFlight ? true : nextFlight.id === outbound.id);

            const showInbound =
            !!inbound && (
                !nextFlight
                ? !!inbound // si todos pasados, muestra vuelta también
                : nextFlight.id === inbound.id // si el próximo es la vuelta, solo vuelta
            );

            // Nota: si hay 1 solo vuelo, outbound===inbound conceptualmente; la lógica lo cubre.

          const stays = (items || []).filter((i) => i.type === "accommodation").slice().sort(byStartAtAsc);

          const stay = stays[0] || null;

          return (
            <View style={{ gap: px(12) }}>
              {/* Flight Outbound */}
              {!hideFlights ?( 
                <>
{showOutbound && outbound ? (
  <View
    style={{
      borderRadius: px(18),
      padding: px(16),
      backgroundColor: "#0B1220",
      borderWidth: 1,
      borderColor: "rgba(15,23,42,0.25)",
    }}
  >
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <Text style={{ fontSize: fs(12), fontWeight: "700", color: "rgba(255,255,255,0.72)" }}>
        VUELO DE IDA
      </Text>

      {/* ✅ Día del vuelo */}
      <View
        style={{
          paddingHorizontal: px(10),
          height: px(24),
          borderRadius: 999,
          backgroundColor: "rgba(255,255,255,0.10)",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.14)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: fs(11), fontWeight: "600", color: "rgba(255,255,255,0.85)" }}>
          {fmtFlightDay(outbound.startAt || outbound.day, outbound.timezone)}
        </Text>
      </View>
    </View>

    <Text style={{ marginTop: px(8), fontSize: fs(20), fontWeight: "800", color: "white" }}>
      {pickFlightCode(outbound)}
    </Text>

    {(() => {
      const { from, to } = pickIataFrom(outbound);
      const dep = fmtTime(outbound.startAt, outbound.timezone);
      const arr = fmtTime(outbound.endAt, outbound.timezone);
      const dur = fmtDurationMinutes(outbound.startAt, outbound.endAt);

      return (
        <View style={{ marginTop: px(14), flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={{ fontSize: fs(22), fontWeight: "900", color: "white" }}>{from}</Text>
            <Text style={{ marginTop: px(6), fontSize: fs(11), fontWeight: "600", color: "rgba(255,255,255,0.65)" }}>
              {dep}
            </Text>
          </View>

          <View style={{ alignItems: "center" }}>
            <Ionicons name="airplane" size={px(16)} color="rgba(255,255,255,0.8)" />
            <Text style={{ marginTop: px(6), fontSize: fs(11), fontWeight: "600", color: "rgba(255,255,255,0.65)" }}>
              {dur || "—"}
            </Text>
          </View>

          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: fs(22), fontWeight: "900", color: "white" }}>{to}</Text>
            <Text style={{ marginTop: px(6), fontSize: fs(11), fontWeight: "600", color: "rgba(255,255,255,0.65)" }}>
              {arr}
            </Text>
          </View>
        </View>
      );
    })()}
  </View>
) : null}

{/* Flight Return */}
{showInbound && inbound ? (
  <View
    style={{
      borderRadius: px(18),
      padding: px(16),
      backgroundColor: "#0B1220",
      borderWidth: 1,
      borderColor: "rgba(15,23,42,0.25)",
    }}
  >
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <Text style={{ fontSize: fs(12), fontWeight: "700", color: "rgba(255,255,255,0.72)" }}>
        VUELO DE VUELTA
      </Text>

      {/* ✅ Día del vuelo */}
      <View
        style={{
          paddingHorizontal: px(10),
          height: px(24),
          borderRadius: 999,
          backgroundColor: "rgba(255,255,255,0.10)",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.14)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: fs(11), fontWeight: "800", color: "rgba(255,255,255,0.85)" }}>
          {fmtFlightDay(inbound.startAt || inbound.day, inbound.timezone)}
        </Text>
      </View>
    </View>

    <Text style={{ marginTop: px(8), fontSize: fs(20), fontWeight: "800", color: "white" }}>
      {pickFlightCode(inbound)}
    </Text>

    {(() => {
      const { from, to } = pickIataFrom(inbound);
      const dep = fmtTime(inbound.startAt, inbound.timezone);
      const arr = fmtTime(inbound.endAt, inbound.timezone);
      const dur = fmtDurationMinutes(inbound.startAt, inbound.endAt);

      return (
        <View style={{ marginTop: px(14), flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={{ fontSize: fs(22), fontWeight: "900", color: "white" }}>{from}</Text>
            <Text style={{ marginTop: px(6), fontSize: fs(11), fontWeight: "600", color: "rgba(255,255,255,0.65)" }}>
              {dep}
            </Text>
          </View>

          <View style={{ alignItems: "center" }}>
            <Ionicons name="airplane" size={px(16)} color="rgba(255,255,255,0.8)" />
            <Text style={{ marginTop: px(6), fontSize: fs(11), fontWeight: "600", color: "rgba(255,255,255,0.65)" }}>
              {dur || "—"}
            </Text>
          </View>

          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: fs(22), fontWeight: "900", color: "white" }}>{to}</Text>
            <Text style={{ marginTop: px(6), fontSize: fs(11), fontWeight: "600", color: "rgba(255,255,255,0.65)" }}>
              {arr}
            </Text>
          </View>
        </View>
      );
    })()}
  </View>
) : null}
</>
                ) : null}
  {!hideStays ? (
    <>

              {/* Hotel real */}
              {stay ? (
                <View
                  style={{
                    borderRadius: px(18),
                    padding: px(14),
                    backgroundColor: "white",
                    borderWidth: 1,
                    borderColor: "rgba(226,232,240,0.95)",
                    flexDirection: "row",
                    gap: px(12),
                    alignItems: "center",
                  }}
                >
                  <View
                    style={{
                      width: px(56),
                      height: px(56),
                      borderRadius: px(14),
                      backgroundColor: "rgba(148,163,184,0.25)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="bed-outline" size={px(22)} color={UI.muted2} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: fs(13), fontWeight: "700", color: UI.text }}>
                      {stay?.accommodationDetails?.name || stay.title || "Alojamiento"}
                    </Text>

                    <Text style={{ marginTop: px(4), fontSize: fs(12), fontWeight: "600", color: UI.muted }} numberOfLines={2}>
                      {stay.location || "—"}
                    </Text>

                    <View style={{ marginTop: px(8), flexDirection: "row", alignItems: "center", gap: px(10) }}>

                      <Text style={{ fontSize: fs(11), fontWeight: "700", color: UI.muted2 }}>
                        {stay.startAt ? `${new Date(stay.startAt).toLocaleDateString("es-ES")} → ` : ""}
                        {stay.endAt ? new Date(stay.endAt).toLocaleDateString("es-ES") : ""}
                      </Text>
                    </View>
                  </View>

                  <Ionicons name="open-outline" size={px(18)} color={UI.muted2} />
                </View>
              ) : null}
                  </>
  ) : null}


              {/* fallback si no hay nada */}
              {!outbound && !stay ? (
                <View style={{ padding: px(14), borderRadius: px(18), backgroundColor: "white", borderWidth: 1, borderColor: UI.border }}>
                  <Text style={{ fontSize: fs(13), fontWeight: "800", color: UI.muted }}>
                    No hay reservas (vuelo / alojamiento) en este viaje todavía.
                  </Text>
                </View>
              ) : null}
            </View>
          );
        })()}
      </View>

      {/* Clima (mock visual) */}
      <View
        style={{
          borderRadius: px(18),
          padding: px(16),
          backgroundColor: "#2563EB",
          borderWidth: 1,
          borderColor: "rgba(37,99,235,0.35)",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontSize: fs(15), fontWeight: "700", color: "white" }}>Clima en {trip?.name || "Destino"}</Text>
          <Text style={{ fontSize: fs(12), fontWeight: "700", color: "rgba(255,255,255,0.8)" }}>Hoy</Text>
        </View>

        <View style={{ marginTop: px(14), flexDirection: "row", alignItems: "center", gap: px(12) }}>
          <Ionicons name="sunny-outline" size={px(26)} color="white" />
          <Text style={{ fontSize: fs(40), fontWeight: "900", color: "white" }}>22°C</Text>
        </View>

        <Text style={{ marginTop: px(6), fontSize: fs(13), fontWeight: "600", color: "rgba(255,255,255,0.9)" }}>Cielo despejado</Text>

        <View style={{ marginTop: px(14), flexDirection: "row", justifyContent: "space-between" }}>
          {["Sáb", "Dom", "Lun", "Mar"].map((d) => (
            <View key={d} style={{ alignItems: "center", gap: px(6), width: "22%" }}>
              <Text style={{ fontSize: fs(12), fontWeight: "700", color: "rgba(255,255,255,0.85)" }}>{d}</Text>
              <Ionicons name="cloud-outline" size={px(16)} color="rgba(255,255,255,0.9)" />
              <Text style={{ fontSize: fs(12), fontWeight: "700", color: "rgba(255,255,255,0.9)" }}>19°</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
