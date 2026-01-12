// src/components/DesktopMonthlyPerformanceTable.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ActivityIndicator, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/api";
import { colors } from "../theme/theme";
import { textStyles } from "../theme/typography";

type Row = {
  period: string; // "YYYY-MM"
  startValue: number;
  endValue: number;
  netCashFlow: number;
  returnAmount: number;
  returnPct: number | null;
};

type ApiResponse = {
  months: Row[];
  compoundedReturn: number | null;
};

type Props = {
  px: (n: number) => number;
  fs: (n: number) => number;
  currency?: string;
  // opcional: si quieres controlar el rango desde fuera
  defaultRange?: "6M" | "12M" | "ALL";
};

function formatMoney(n: number, currency = "EUR") {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString("es-ES", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPct(p: number | null) {
  if (typeof p !== "number" || !Number.isFinite(p)) return "—";
  return `${(p * 100).toFixed(2).replace(".", ",")}%`;
}

function monthKey(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function addMonthsUTC(d: Date, months: number) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  x.setUTCMonth(x.getUTCMonth() + months);
  return x;
}

function toneForReturn(x: number) {
  if (x > 0) return "success";
  if (x < 0) return "danger";
  return "neutral";
}

function toneColor(tone: "success" | "danger" | "neutral") {
  if (tone === "success") return "#16A34A";
  if (tone === "danger") return "#DC2626";
  return "#64748B";
}

/** Card simple (para no depender del SectionCard interno de la pantalla) */
function Card({
  title,
  right,
  children,
  px,
  fs,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  px: (n: number) => number;
  fs: (n: number) => number;
}) {
  return (
    <View
      style={{
        backgroundColor: "white",
        borderRadius: px(12),
        borderWidth: 1,
        borderColor: "#E5E7EB",
        padding: px(16),
        overflow: "hidden",
        shadowColor: "#000",
        shadowOpacity: 0.03,
        shadowRadius: px(10),
        shadowOffset: { width: 0, height: px(6) },
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: px(10),
        }}
      >
        <Text style={[textStyles.labelMuted, { fontSize: fs(12) }]}>{title}</Text>
        {!!right && <View>{right}</View>}
      </View>
      {children}
    </View>
  );
}

function Th({
  label,
  align = "left",
  flex = 1,
  px,
  fs,
}: {
  label: string;
  align?: "left" | "right" | "center";
  flex?: number;
  px: (n: number) => number;
  fs: (n: number) => number;
}) {
  return (
    <View style={{ flex, justifyContent: "center", paddingVertical: px(10), paddingHorizontal: px(12) }}>
      <Text style={[textStyles.labelMuted, { fontSize: fs(11), textAlign: align }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function Td({
  children,
  align = "left",
  flex = 1,
  px,
}: {
  children: React.ReactNode;
  align?: "left" | "right" | "center";
  flex?: number;
  px: (n: number) => number;
}) {
  return (
    <View style={{ flex, justifyContent: "center", paddingVertical: px(12), paddingHorizontal: px(12) }}>
      <View style={{ alignItems: align === "right" ? "flex-end" : align === "center" ? "center" : "flex-start" }}>{children}</View>
    </View>
  );
}

export default function DesktopMonthlyPerformanceTable({
  px,
  fs,
  currency = "EUR",
  defaultRange = "12M",
}: Props) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [compounded, setCompounded] = useState<number | null>(null);
  const [range, setRange] = useState<"6M" | "12M" | "ALL">(defaultRange);

  const computedRange = useMemo(() => {
    // usamos UTC para ser coherentes con endOfMonthUTC del backend
    const now = new Date();
    const to = monthKey(now);

    if (range === "ALL") {
      // backend debería aceptar un from muy antiguo; si prefieres, puedes pedirlo al backend.
      return { from: "2000-01", to };
    }

    const monthsBack = range === "6M" ? 5 : 11; // incluye el mes actual
    const fromDate = addMonthsUTC(now, -monthsBack);
    const from = monthKey(fromDate);
    return { from, to };
  }, [range]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // AJUSTA AQUÍ EL ENDPOINT SI TU RUTA ES DISTINTA
        const res = await api.get(
        `/investments/portfolio/performance?from=${computedRange.from}&to=${computedRange.to}`
        );


      const data: ApiResponse = res.data;
      setRows(Array.isArray(data?.months) ? data.months : []);
      setCompounded(typeof data?.compoundedReturn === "number" ? data.compoundedReturn : null);
    } catch (e) {
      console.error("❌ Error cargando performance mensual:", e);
      setRows([]);
      setCompounded(null);
    } finally {
      setLoading(false);
    }
  }, [computedRange.from, computedRange.to]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const GRID = useMemo(
    () => ({
      period: 1.0,
      start: 1.4,
      end: 1.4,
      cf: 1.2,
      ra: 1.2,
      rp: 1.0,
    }),
    []
  );

  const headerRight = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: px(8) }}>
      {/* Range chips */}
      {(["6M", "12M", "ALL"] as const).map((k) => {
        const active = range === k;
        return (
          <Pressable
            key={k}
            onPress={() => setRange(k)}
            style={({ pressed }: any) => ({
              height: px(34),
              paddingHorizontal: px(10),
              borderRadius: px(12),
              borderWidth: 1,
              borderColor: active ? "rgba(15,23,42,0.18)" : "#E5E7EB",
              backgroundColor: active ? "rgba(15,23,42,0.06)" : "white",
              opacity: pressed ? 0.85 : 1,
              alignItems: "center",
              justifyContent: "center",
            })}
          >
            <Text style={[textStyles.button, { fontSize: fs(12), fontWeight: "900", color: "#0F172A" }]}>{k}</Text>
          </Pressable>
        );
      })}

      <Pressable
        onPress={fetchData}
        style={({ pressed }: any) => ({
          height: px(34),
          width: px(34),
          borderRadius: px(12),
          borderWidth: 1,
          borderColor: "#E5E7EB",
          backgroundColor: "white",
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Ionicons name="refresh-outline" size={px(16)} color="#64748B" />
      </Pressable>
    </View>
  );

  return (
    <Card
      title="Rentabilidad mensual"
      right={headerRight}
      px={px}
      fs={fs}
    >
      {/* Subheader */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: px(10) }}>
        <Text style={[textStyles.bodyMuted, { fontSize: fs(12), color: "#94A3B8", fontWeight: "700" }]}>
          Periodo: {computedRange.from} → {computedRange.to}
        </Text>

        <Text style={[textStyles.bodyMuted, { fontSize: fs(12), color: "#94A3B8", fontWeight: "700" }]}>
          Comp. {formatPct(compounded)}
        </Text>
      </View>

      {loading ? (
        <View style={{ paddingVertical: px(18), alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : rows.length === 0 ? (
        <Text style={[textStyles.bodyMuted, { fontSize: fs(12), fontWeight: "800", color: "#94A3B8" }]}>
          Sin datos de rentabilidad para este rango.
        </Text>
      ) : (
        <View style={{ borderWidth: 1, borderColor: "#E5E7EB", borderRadius: px(12), overflow: "hidden" }}>
          {/* Header */}
          <View style={{ flexDirection: "row", backgroundColor: "#F8FAFC", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" }}>
            <Th label="MES" flex={GRID.period} align="left" px={px} fs={fs} />
            <Th label="INICIO" flex={GRID.start} align="right" px={px} fs={fs} />
            <Th label="FIN" flex={GRID.end} align="right" px={px} fs={fs} />
            <Th label="CASH FLOW" flex={GRID.cf} align="right" px={px} fs={fs} />
            <Th label="RENTAB." flex={GRID.ra} align="right" px={px} fs={fs} />
            <Th label="% RENTAB." flex={GRID.rp} align="right" px={px} fs={fs} />
          </View>

          {/* Rows */}
          {rows.map((r, idx) => {
            const tone = toneForReturn(Number(r.returnAmount || 0));
            const c = toneColor(tone);

            return (
              <View
                key={`${r.period}-${idx}`}
                style={{
                  flexDirection: "row",
                  backgroundColor: idx % 2 === 0 ? "white" : "#FCFCFD",
                  borderBottomWidth: idx === rows.length - 1 ? 0 : 1,
                  borderBottomColor: "#E5E7EB",
                }}
              >
                <Td flex={GRID.period} align="left" px={px}>
                  <Text style={[textStyles.body, { fontSize: fs(12), fontWeight: "900", color: "#0F172A" }]} numberOfLines={1}>
                    {r.period}
                  </Text>
                </Td>

                <Td flex={GRID.start} align="right" px={px}>
                  <Text style={[textStyles.number, { fontSize: fs(12), fontWeight: "800", color: "#0F172A" }]}>
                    {formatMoney(r.startValue || 0, currency)}
                  </Text>
                </Td>

                <Td flex={GRID.end} align="right" px={px}>
                  <Text style={[textStyles.number, { fontSize: fs(12), fontWeight: "800", color: "#0F172A" }]}>
                    {formatMoney(r.endValue || 0, currency)}
                  </Text>
                </Td>

                <Td flex={GRID.cf} align="right" px={px}>
                  <Text style={[textStyles.number, { fontSize: fs(12), fontWeight: "800", color: "#0F172A" }]}>
                    {formatMoney(r.netCashFlow || 0, currency)}
                  </Text>
                </Td>

                <Td flex={GRID.ra} align="right" px={px}>
                  <Text style={[textStyles.number, { fontSize: fs(12), fontWeight: "900", color: c }]}>
                    {formatMoney(r.returnAmount || 0, currency)}
                  </Text>
                </Td>

                <Td flex={GRID.rp} align="right" px={px}>
                  <Text style={[textStyles.number, { fontSize: fs(12), fontWeight: "900", color: c }]}>
                    {formatPct(r.returnPct)}
                  </Text>
                </Td>
              </View>
            );
          })}
        </View>
      )}

      {Platform.OS === "web" ? (
        <Text style={{ marginTop: px(10), fontSize: fs(11), fontWeight: "700", color: "#94A3B8" }}>
          Nota: la rentabilidad usa snapshots de fin de mes y cash flow neto del mes.
        </Text>
      ) : null}
    </Card>
  );
}
