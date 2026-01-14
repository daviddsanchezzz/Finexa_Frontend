// src/screens/Desktop/trips/TripsBoardScreen.tsx
import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import api from "../../../api/api";
import { colors } from "../../../theme/theme";
import { textStyles, typography } from "../../../theme/typography";
import { DesktopTripModal, TripFromApi as TripEdit } from "../../../components/DesktopTripModal";

/** ===== Types ===== */
type TripLane = "seen" | "planning" | "wishlist";

/**
 * OJO:
 * - Esto es lo que usa el board (listado). Tu backend /trips aquí suele devolver campos extra (cost/color),
 *   pero el modal de edición necesita TripEdit (con companions/budget).
 */
type TripListFromApi = {
  id: number;
  name: string;
  destination?: string | null;
  emoji?: string | null;
  color?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  cost?: number | null;
};

interface TripUI {
  id: number;
  name: string;
  destination: string;
  emoji?: string;
  color?: string;
  startDate: string | null;
  endDate: string | null;
  cost: number;
  lane: TripLane;
}

/** ===== Utils ===== */
function formatEuro(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function norm(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function isValidISODate(iso?: string | null) {
  if (!iso) return false;
  const d = new Date(iso);
  return !Number.isNaN(d.getTime());
}

function formatDateRange(startISO?: string | null, endISO?: string | null) {
  if (!isValidISODate(startISO) || !isValidISODate(endISO)) return "Sin fecha";
  const s = new Date(startISO!);
  const e = new Date(endISO!);

  const baseOpts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" };
  const sameYear = s.getFullYear() === e.getFullYear();

  const startStr = s.toLocaleDateString("es-ES", baseOpts);
  const endStr = e.toLocaleDateString("es-ES", { ...baseOpts, year: sameYear ? undefined : "numeric" });

  return `${startStr} - ${endStr}`;
}

function getLane(t: { startDate?: string | null; endDate?: string | null }): TripLane {
  const hasDates = isValidISODate(t.startDate) && isValidISODate(t.endDate);
  if (!hasDates) return "wishlist";

  const today = new Date();
  const end = new Date(t.endDate!);

  if (end < today) return "seen";
  return "planning";
}

/** Escalado responsive */
function useUiScale() {
  const { width } = Dimensions.get("window");

  const s = useMemo(() => {
    const raw = width / 1440;
    return Math.max(0.86, Math.min(1.08, raw));
  }, [width]);

  const px = useCallback((n: number) => Math.round(n * s), [s]);
  const fs = useCallback((n: number) => Math.round(n * s), [s]);

  return { s, px, fs, width };
}

/** ===== Dashboard-like UI bits ===== */
function StatCard({
  title,
  value,
  icon,
  tone = "neutral",
  subtitle,
  px,
  fs,
}: {
  title: string;
  value: string;
  subtitle?: React.ReactNode;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: "neutral" | "success" | "danger" | "info";
  px: (n: number) => number;
  fs: (n: number) => number;
}) {
  const palette = {
    neutral: { accent: "#0F172A", iconBg: "#F1F5F9", iconFg: "#0F172A", title: "#94A3B8" },
    info: { accent: "#3B82F6", iconBg: "rgba(59,130,246,0.12)", iconFg: "#2563EB", title: "#94A3B8" },
    success: { accent: "#22C55E", iconBg: "rgba(34,197,94,0.12)", iconFg: "#16A34A", title: "#94A3B8" },
    danger: { accent: "#EF4444", iconBg: "rgba(239,68,68,0.12)", iconFg: "#DC2626", title: "#94A3B8" },
  }[tone];

  return (
    <View
      style={{
        flex: 1,
        minWidth: px(230),
        backgroundColor: "white",
        borderRadius: px(12),
        borderWidth: 1,
        borderColor: "#E5E7EB",
        overflow: "hidden",
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: px(12),
        shadowOffset: { width: 0, height: px(6) },
      }}
    >
      <View style={{ flexDirection: "row", flex: 1 }}>
        <View style={{ width: px(4), backgroundColor: palette.accent }} />
        <View style={{ flex: 1, padding: px(16) }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: px(10),
            }}
          >
            <Text
              style={[textStyles.labelMuted, { fontSize: fs(11), color: palette.title, letterSpacing: 0.6 }]}
              numberOfLines={1}
            >
              {title}
            </Text>

            <View
              style={{
                width: px(34),
                height: px(34),
                borderRadius: px(10),
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: palette.iconBg,
              }}
            >
              <Ionicons name={icon} size={px(18)} color={palette.iconFg} />
            </View>
          </View>

          <Text
            style={[
              textStyles.numberLG,
              { marginTop: px(12), fontSize: fs(22), fontWeight: "900", color: "#0F172A" },
            ]}
            numberOfLines={1}
          >
            {value}
          </Text>

          {!!subtitle && <View style={{ marginTop: px(6) }}>{subtitle}</View>}
        </View>
      </View>
    </View>
  );
}

function TopButton({
  icon,
  label,
  onPress,
  px,
  fs,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label?: string;
  onPress: () => void;
  px: (n: number) => number;
  fs: (n: number) => number;
}) {
  const [hover, setHover] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      style={{
        height: px(38),
        paddingHorizontal: label ? px(12) : 0,
        width: label ? undefined : px(38),
        borderRadius: px(10),
        borderWidth: 1,
        borderColor: "#E5E7EB",
        backgroundColor: hover ? "#F8FAFC" : "white",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: label ? px(8) : 0,
      }}
    >
      <Ionicons name={icon} size={px(18)} color="#64748B" />
      {!!label && (
        <Text style={[textStyles.button, { fontSize: fs(12), fontWeight: "800", color: "#64748B" }]}>{label}</Text>
      )}
    </Pressable>
  );
}

/** Trip card */
function TripCard({
  trip,
  selected,
  onPress,
  onOpenDetail,
  px,
  fs,
}: {
  trip: TripUI;
  selected: boolean;
  onPress: () => void;
  onOpenDetail: () => void;
  px: (n: number) => number;
  fs: (n: number) => number;
}) {
  const accent = trip.color || colors.primary;
  const dateLabel = formatDateRange(trip.startDate, trip.endDate);

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      style={{
        borderRadius: px(12),
        borderWidth: 1,
        borderColor: selected ? "rgba(37,99,235,0.35)" : "#E5E7EB",
        backgroundColor: selected ? "rgba(37,99,235,0.06)" : "white",
        padding: px(12),
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: px(10) }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: px(10), flex: 1 }}>
          <View
            style={{
              width: px(38),
              height: px(38),
              borderRadius: px(12),
              backgroundColor: "rgba(15,23,42,0.06)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: fs(18) }}>{trip.emoji || "✈️"}</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[textStyles.body, { fontSize: fs(13), fontWeight: "900", color: "#0F172A" }]} numberOfLines={1}>
              {trip.name}
            </Text>

            <View style={{ flexDirection: "row", alignItems: "center", marginTop: px(4) }}>
              <Ionicons name="location-outline" size={px(14)} color="#94A3B8" />
              <Text
                style={[textStyles.caption, { marginLeft: px(6), fontSize: fs(11), color: "#64748B", fontWeight: "700" }]}
                numberOfLines={1}
              >
                {trip.destination || "Sin destino"}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ alignItems: "flex-end" }}>
          <Text style={[textStyles.number, { fontSize: fs(13), fontWeight: "900", color: "#0F172A", marginTop: px(2) }]}>
            {formatEuro(trip.cost || 0)}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: px(10) }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="calendar-outline" size={px(14)} color="#94A3B8" />
          <Text style={[textStyles.caption, { marginLeft: px(6), fontSize: fs(11), color: "#64748B", fontWeight: "700" }]}>
            {dateLabel}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onOpenDetail}
          style={{
            width: px(34),
            height: px(34),
            borderRadius: px(10),
            backgroundColor: "rgba(15,23,42,0.06)",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: "#E5E7EB",
          }}
        >
          <Ionicons name="arrow-forward-outline" size={px(16)} color={accent} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

/** Column (no SectionCard; single clean container) */
function KanbanColumn({
  title,
  icon,
  count,
  accent,
  softBg,
  loading,
  children,
  px,
  fs,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  count: number;
  accent: string;
  softBg: string;
  loading: boolean;
  children: React.ReactNode;
  px: (n: number) => number;
  fs: (n: number) => number;
}) {
  return (
    <View
      style={{
        flex: 1,
        borderRadius: px(14),
        borderWidth: 1,
        borderColor: "#E5E7EB",
        backgroundColor: "white",
        overflow: "hidden",
        shadowColor: "#000",
        shadowOpacity: 0.03,
        shadowRadius: px(10),
        shadowOffset: { width: 0, height: px(6) },
      }}
    >
      {/* Header */}
      <View
        style={{
          paddingHorizontal: px(14),
          paddingVertical: px(12),
          backgroundColor: softBg,
          borderBottomWidth: 1,
          borderBottomColor: "rgba(229,231,235,0.9)",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: px(10),
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: px(10), flex: 1 }}>
          <View
            style={{
              width: px(34),
              height: px(34),
              borderRadius: px(10),
              backgroundColor: "rgba(255,255,255,0.72)",
              borderWidth: 1,
              borderColor: "rgba(0,0,0,0.06)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name={icon} size={px(16)} color={accent} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[textStyles.body, { fontSize: fs(13), fontWeight: "900", color: "#0F172A" }]} numberOfLines={1}>
              {title}
            </Text>
            <Text style={[textStyles.caption, { marginTop: px(2), fontSize: fs(11), color: "#64748B", fontWeight: "700" }]}>
              {loading ? "Cargando…" : `${count} viajes`}
            </Text>
          </View>
        </View>

        <View
          style={{
            paddingHorizontal: px(10),
            paddingVertical: px(4),
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.72)",
            borderWidth: 1,
            borderColor: "rgba(0,0,0,0.06)",
          }}
        >
          <Text style={{ fontSize: fs(11), fontWeight: "900", color: "#0F172A" }}>{count}</Text>
        </View>
      </View>

      {/* Body */}
      <View style={{ padding: px(14) }}>
        {loading ? (
          <View style={{ paddingVertical: px(18), alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

/** ===== Screen ===== */
export default function TripsBoardScreen({ navigation }: any) {
  const { px, fs, width } = useUiScale();
  const WIDE = width >= 1200;

  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<TripUI[]>([]);
  const [q, setQ] = useState("");

  const [tripModalOpen, setTripModalOpen] = useState(false);
  const [editTrip, setEditTrip] = useState<TripEdit | null>(null);

  const fetchTrips = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/trips");
      const data: TripListFromApi[] = res.data || [];

      const mapped: TripUI[] = data.map((t) => ({
        id: t.id,
        name: t.name,
        destination: t.destination || "",
        emoji: t.emoji || undefined,
        color: t.color || undefined,
        startDate: t.startDate ?? null,
        endDate: t.endDate ?? null,
        cost: typeof t.cost === "number" ? t.cost : 0,
        lane: getLane(t),
      }));

      setTrips(mapped);
    } catch (e) {
      console.error("❌ Error al obtener viajes:", e);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchTrips();
    }, [fetchTrips])
  );

  const filteredTrips = useMemo(() => {
    const needle = norm(q);
    if (!needle) return trips;
    return trips.filter((t) => norm(`${t.name} ${t.destination}`).includes(needle));
  }, [trips, q]);

  const lanes = useMemo(() => {
    const seen = filteredTrips.filter((t) => t.lane === "seen");
    const planning = filteredTrips.filter((t) => t.lane === "planning");
    const wishlist = filteredTrips.filter((t) => t.lane === "wishlist");

    const planningSorted = [...planning].sort((a, b) => {
      const A = isValidISODate(a.startDate) ? new Date(a.startDate!).getTime() : Number.POSITIVE_INFINITY;
      const B = isValidISODate(b.startDate) ? new Date(b.startDate!).getTime() : Number.POSITIVE_INFINITY;
      return A - B;
    });

    const seenSorted = [...seen].sort((a, b) => {
      const A = isValidISODate(a.endDate) ? new Date(a.endDate!).getTime() : 0;
      const B = isValidISODate(b.endDate) ? new Date(b.endDate!).getTime() : 0;
      return B - A;
    });

    const wishlistSorted = [...wishlist].sort((a, b) => (a.name || "").localeCompare(b.name || "", "es"));

    return { seen: seenSorted, planning: planningSorted, wishlist: wishlistSorted };
  }, [filteredTrips]);

  const summary = useMemo(() => {
    const totalCost = filteredTrips.reduce((s, t) => s + (t.cost || 0), 0);
    const seenCount = filteredTrips.filter((t) => t.lane === "seen").length;
    const planningCount = filteredTrips.filter((t) => t.lane === "planning").length;
    const wishlistCount = filteredTrips.filter((t) => t.lane === "wishlist").length;

    return { totalCost, seenCount, planningCount, wishlistCount, totalCount: filteredTrips.length };
  }, [filteredTrips]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background ?? "#F8FAFC" }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: px(22),
          paddingTop: px(18),
          paddingBottom: px(90),
        }}
      >
        {/* ===== Header ===== */}
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: px(14) }}>
          <View>
            <Text style={[textStyles.h1, { fontSize: fs(22), fontWeight: "900", color: "#0F172A" }]}>Viajes</Text>
            <Text style={[textStyles.bodyMuted, { marginTop: px(4), fontSize: fs(12), color: "#94A3B8", fontWeight: "700" }]}>
              Vistos · Organizando · Por ver
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: px(10) }}>
            <TopButton icon="refresh-outline" onPress={fetchTrips} px={px} fs={fs} />
            <TopButton
              icon="add-outline"
              label="Nuevo"
              onPress={() => {
                setEditTrip(null);
                setTripModalOpen(true);
              }}
              px={px}
              fs={fs}
            />
          </View>
        </View>

        {/* ===== KPI row ===== */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: px(14) }}>
          <StatCard
            title="TOTAL GASTADO"
            value={loading ? "—" : formatEuro(summary.totalCost)}
            icon="cash-outline"
            tone="info"
            subtitle={
              <Text style={[textStyles.caption, { fontSize: fs(12), color: "#94A3B8", fontWeight: "700" }]} numberOfLines={1}>
                En {summary.totalCount} viajes
              </Text>
            }
            px={px}
            fs={fs}
          />

          <StatCard title="ORGANIZANDO" value={loading ? "—" : `${summary.planningCount}`} icon="calendar-outline" tone="success" px={px} fs={fs} />
          <StatCard title="POR VER" value={loading ? "—" : `${summary.wishlistCount}`} icon="bookmark-outline" tone="neutral" px={px} fs={fs} />
          <StatCard title="VISTOS" value={loading ? "—" : `${summary.seenCount}`} icon="checkmark-done-outline" tone="danger" px={px} fs={fs} />
        </View>

        {/* ===== Search (no SectionCard; no nested box) ===== */}
        <View
          style={{
            marginTop: px(14),
            backgroundColor: "white",
            borderRadius: px(12),
            borderWidth: 1,
            borderColor: "#E5E7EB",
            padding: px(12),
            shadowColor: "#000",
            shadowOpacity: 0.03,
            shadowRadius: px(10),
            shadowOffset: { width: 0, height: px(6) },
          }}
        >
          <Text style={[textStyles.labelMuted2, { fontSize: fs(12) }]}>Buscar</Text>

          {Platform.OS === "web" ? (
            <View
              style={{
                marginTop: px(10),
                height: px(40),
                borderRadius: px(12),
                borderWidth: 1,
                borderColor: "#E5E7EB",
                backgroundColor: "#F8FAFC",
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: px(12),
                gap: px(10),
              }}
            >
              <Ionicons name="search-outline" size={px(16)} color="#64748B" />
              {/* @ts-ignore */}
              <input
                value={q}
                onChange={(e: any) => setQ(e?.target?.value ?? "")}
                placeholder="Buscar por nombre o destino…"
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  fontSize: fs(13),
                  fontFamily: typography.family.base,
                  fontWeight: 700,
                  background: "transparent",
                  color: "#0F172A",
                }}
              />
              {!!q && (
                <TouchableOpacity activeOpacity={0.9} onPress={() => setQ("")}>
                  <Ionicons name="close-circle" size={px(16)} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <Text style={[textStyles.bodyMuted, { fontSize: fs(12), color: "#94A3B8", fontWeight: "700" }]}>
              En desktop/web se muestra un input nativo.
            </Text>
          )}
        </View>

        {/* ===== Board ===== */}
        <View style={{ marginTop: px(14) }}>
          <View style={{ flexDirection: WIDE ? "row" : "column", gap: px(12), alignItems: "flex-start" }}>
            <View style={{ flex: 1, minWidth: WIDE ? px(360) : "100%" }}>
              <KanbanColumn
                title="Organizando"
                icon="calendar-outline"
                count={lanes.planning.length}
                accent="#2563EB"
                softBg="rgba(59,130,246,0.10)"
                loading={loading}
                px={px}
                fs={fs}
              >
                {lanes.planning.length === 0 ? (
                  <View
                    style={{
                      borderRadius: px(12),
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                      backgroundColor: "#F8FAFC",
                      padding: px(12),
                    }}
                  >
                    <Text style={[textStyles.bodyMuted, { fontSize: fs(12), color: "#94A3B8", fontWeight: "800" }]}>No hay viajes aquí.</Text>
                  </View>
                ) : (
                  <View style={{ gap: px(10) }}>
                    {lanes.planning.map((trip) => (
                      <TripCard
                        key={trip.id}
                        trip={trip}
                        selected={false}
                        onPress={() => {}}
                        onOpenDetail={() => navigation.navigate("TripDetail", { tripId: trip.id })}
                        px={px}
                        fs={fs}
                      />
                    ))}
                  </View>
                )}
              </KanbanColumn>
            </View>

            <View style={{ flex: 1, minWidth: WIDE ? px(360) : "100%" }}>
              <KanbanColumn
                title="Por ver"
                icon="bookmark-outline"
                count={lanes.wishlist.length}
                accent="#0F172A"
                softBg="rgba(15,23,42,0.06)"
                loading={loading}
                px={px}
                fs={fs}
              >
                {lanes.wishlist.length === 0 ? (
                  <View
                    style={{
                      borderRadius: px(12),
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                      backgroundColor: "#F8FAFC",
                      padding: px(12),
                    }}
                  >
                    <Text style={[textStyles.bodyMuted, { fontSize: fs(12), color: "#94A3B8", fontWeight: "800" }]}>No hay viajes aquí.</Text>
                  </View>
                ) : (
                  <View style={{ gap: px(10) }}>
                    {lanes.wishlist.map((trip) => (
                      <TripCard
                        key={trip.id}
                        trip={trip}
                        selected={false}
                        onPress={() => {}}
                        onOpenDetail={() => navigation.navigate("TripDetail", { tripId: trip.id })}
                        px={px}
                        fs={fs}
                      />
                    ))}
                  </View>
                )}
              </KanbanColumn>
            </View>

            <View style={{ flex: 1, minWidth: WIDE ? px(360) : "100%" }}>
              <KanbanColumn
                title="Vistos"
                icon="checkmark-done-outline"
                count={lanes.seen.length}
                accent="#6B7280"
                softBg="rgba(107,114,128,0.10)"
                loading={loading}
                px={px}
                fs={fs}
              >
                {lanes.seen.length === 0 ? (
                  <View
                    style={{
                      borderRadius: px(12),
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                      backgroundColor: "#F8FAFC",
                      padding: px(12),
                    }}
                  >
                    <Text style={[textStyles.bodyMuted, { fontSize: fs(12), color: "#94A3B8", fontWeight: "800" }]}>No hay viajes aquí.</Text>
                  </View>
                ) : (
                  <View style={{ gap: px(10) }}>
                    {lanes.seen.map((trip) => (
                      <TripCard
                        key={trip.id}
                        trip={trip}
                        selected={false}
                        onPress={() => {}}
                        onOpenDetail={() => navigation.navigate("TripDetail", { tripId: trip.id })}
                        px={px}
                        fs={fs}
                      />
                    ))}
                  </View>
                )}
              </KanbanColumn>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Modal: mejor aquí (fuera del layout del board) */}
      <DesktopTripModal
        visible={tripModalOpen}
        editTrip={editTrip}
        onClose={() => setTripModalOpen(false)}
        onSaved={() => fetchTrips()}
      />
    </SafeAreaView>
  );
}
