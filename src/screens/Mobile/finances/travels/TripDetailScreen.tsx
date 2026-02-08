// src/screens/finances/travels/TripDetailScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Switch,
  Alert,
  Linking,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "../../../../theme/theme";
import api from "../../../../api/api";

// Secciones
import TripPlanningSection from "./components/TripPlanningSection";
import TripLogisticsSection from "./components/TripLogisticaSection";
import TripExpensesSection from "./components/TripExpensesSection";
import { TripPlanItemType } from "../../../../types/enums/travel";

type TripStatus = "upcoming" | "ongoing" | "past";
type TxType = "income" | "expense" | "transfer";

interface Tx {
  id: number;
  date: string;
  amount: number;
  type: TxType;
  description?: string;
  category?: {
    id: number;
    name: string;
    emoji?: string;
    color?: string;
  };
  subcategory?: {
    id: number;
    name: string;
    emoji?: string;
    color?: string;
  };
  wallet?: {
    id: number;
    name: string;
    emoji?: string;
  };
}

export interface TripPlanItem {
  id: number;
  tripId: number;
  type: TripPlanItemType;
  title: string;
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  notes?: string | null;
  transactionId?: number | null;
  cost?: number | null;
  logistics?: boolean | null;
}

interface TripFromApi {
  id: number;
  name: string;
  destination?: string | null; // ejemplo: "IT"
  startDate: string;
  endDate: string;
  emoji?: string | null;
  color?: string | null;
  companions?: string[]; // (ya no se muestra)
  transactions?: Tx[];
  planItems?: TripPlanItem[];
  cost: number | null;
}

type TripTab = "summary" | "expenses" | "planning" | "info";

const getTripStatus = (trip: { startDate: string; endDate: string }): TripStatus => {
  const today = new Date();
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);

  if (end < today) return "past";
  if (start > today) return "upcoming";
  return "ongoing";
};

const getStatusStyle = (status: TripStatus) => {
  switch (status) {
    case "upcoming":
      return { label: "Próximo", color: "#BBF7D0", bg: "rgba(22,163,74,0.25)" };
    case "ongoing":
      return { label: "En curso", color: "#FED7AA", bg: "rgba(249,115,22,0.25)" };
    case "past":
    default:
      return { label: "Pasado", color: "#E5E7EB", bg: "rgba(107,114,128,0.35)" };
  }
};

const formatDateRange = (start: string, end: string) => {
  const s = new Date(start);
  const e = new Date(end);

  if (isNaN(s.getTime()) || isNaN(e.getTime())) return "-";

  const sameYear = s.getFullYear() === e.getFullYear();

  const baseOpts: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
  };

  const startStr = s.toLocaleDateString("es-ES", baseOpts);
  const endStr = e.toLocaleDateString("es-ES", {
    ...baseOpts,
    year: sameYear ? undefined : "numeric",
  });

  return `${startStr} - ${endStr}`;
};

// ===== helpers país (IT -> 🇮🇹 + Italia) =====
function cca2ToFlagEmoji(code?: string | null) {
  const c = (code || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return "🏳️";
  const A = 0x1f1e6;
  const chars = [...c].map((ch) => String.fromCodePoint(A + (ch.charCodeAt(0) - 65)));
  return chars.join("");
}

function countryNameEs(code?: string | null) {
  const c = (code || "").trim().toUpperCase();
  if (!c) return "";
  try {
    // Intl.DisplayNames suele funcionar en RN moderno; si no, fallback al propio código
    const dn = new Intl.DisplayNames(["es-ES"], { type: "region" });
    return dn.of(c) || c;
  } catch {
    return c;
  }
}

export default function TripDetailScreen({ route, navigation }: any) {
  const { tripId } = route.params || {};

  const [trip, setTrip] = useState<TripFromApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TripTab>("summary");

  // Exportar PDF
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [includeExpenses, setIncludeExpenses] = useState(true);
  const [exporting, setExporting] = useState(false);

  const formatEuro = (n: number) =>
    n.toLocaleString("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const fetchTrip = async () => {
    if (!tripId) return;
    try {
      setLoading(true);
      const res = await api.get(`/trips/${tripId}`);
      setTrip(res.data);
    } catch (err) {
      console.error("❌ Error al obtener viaje:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrip();
  }, [tripId]);

  // =========================
  // DERIVADOS
  // =========================

  const status: TripStatus = useMemo(() => {
    if (!trip) return "upcoming";
    return getTripStatus(trip);
  }, [trip]);

  const statusStyle = useMemo(() => getStatusStyle(status), [status]);

  const days = useMemo(() => {
    if (!trip) return 0;
    const s = new Date(trip.startDate);
    const e = new Date(trip.endDate);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
    const diffMs = e.getTime() - s.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 0;
  }, [trip]);

  const planItems: TripPlanItem[] = trip?.planItems || [];

  const countryCode = (trip?.destination || "").trim().toUpperCase() || null;
  const countryLabel = countryCode ? countryNameEs(countryCode) : "Sin destino";
  const countryFlag = cca2ToFlagEmoji(countryCode);

  // =========================
  // EXPORTAR PDF
  // =========================

  const handleExportPdf = async () => {
    if (!trip) return;

    try {
      setExporting(true);

      const res = await api.post(`/trips/${trip.id}/export`, {
        includeExpenses,
      });

      const { pdfUrl, base64, fileName } = res.data || {};

      if (pdfUrl) {
        await Linking.openURL(pdfUrl);
      } else if (base64) {
        const safeFileName =
          fileName && fileName.trim().length > 0
            ? fileName.replace(/[^a-zA-Z0-9_\-\.]/g, "_")
            : `viaje-${trip.id}.pdf`;

        if (Platform.OS === "web") {
          try {
            if (typeof window !== "undefined") {
              const byteCharacters = atob(base64);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: "application/pdf" });
              const url = URL.createObjectURL(blob);

              window.open(url, "_blank");
              setTimeout(() => URL.revokeObjectURL(url), 60_000);
            } else {
              throw new Error("Entorno web no disponible para abrir PDF");
            }
          } catch (e) {
            console.error("❌ Error al abrir PDF en web:", e);
            Alert.alert("Error al abrir PDF", "No se ha podido abrir el archivo en el navegador.");
          }
        } else {
          try {
            const dataUrl = `data:application/pdf;base64,${base64}`;
            const supported = await Linking.canOpenURL(dataUrl);

            if (supported) {
              await Linking.openURL(dataUrl);
            } else {
              Alert.alert(
                "PDF generado",
                "El archivo se ha generado correctamente, pero no se ha podido abrir automáticamente."
              );
            }
          } catch (e) {
            console.error("❌ Error al abrir PDF en nativo:", e);
            Alert.alert("Error al abrir PDF", "No se ha podido abrir el archivo en el dispositivo.");
          }
        }
      } else {
        Alert.alert(
          "No se ha podido generar el PDF",
          "No se ha recibido ningún archivo desde el servidor."
        );
      }
    } catch (error) {
      console.error("❌ Error al exportar viaje", error);
      Alert.alert(
        "Error al exportar",
        "Ha ocurrido un error al generar el PDF. Inténtalo de nuevo más tarde."
      );
    } finally {
      setExporting(false);
      setExportModalVisible(false);
    }
  };

  // =========================
  // LOADERS / ERRORES
  // =========================

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="px-5 pt-3 pb-2 flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 12, paddingVertical: 4 }}>
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900">Detalle de viaje</Text>
        </View>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!trip) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="px-5 pt-3 pb-2 flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 12, paddingVertical: 4 }}>
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900">Detalle de viaje</Text>
        </View>

        <View className="flex-1 justify-center items-center px-5">
          <Text className="text-gray-400 text-center">No se ha encontrado la información del viaje.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // =========================
  // RENDER PRINCIPAL
  // =========================

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* HEADER */}
      <View className="px-5 pt-3 pb-2 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 10, paddingVertical: 4 }}>
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </TouchableOpacity>

          <Text className="text-lg font-semibold text-gray-900">Detalle de viaje</Text>
        </View>

        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => navigation.navigate("TripForm", { editTrip: trip })}
            style={{ paddingHorizontal: 8, paddingVertical: 4 }}
          >
            <Text className="text-[14px] font-semibold" style={{ color: colors.primary }}>
              Editar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setExportModalVisible(true)}
            style={{ paddingHorizontal: 8, paddingVertical: 4 }}
          >
            <Text className="text-[14px] font-semibold" style={{ color: colors.primary }}>
              Exportar
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* CONTENIDO PRINCIPAL */}
      <View className="flex-1 px-5">
        {/* HERO CARD */}
        <View
          style={{
            borderRadius: 24,
            padding: 18,
            marginBottom: 16,
            backgroundColor: colors.primary,
            shadowColor: "#000",
            shadowOpacity: 0.12,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 4,
          }}
        >
          {/* TOP ROW: flag + country + name | status */}
          <View className="flex-row justify-between items-start mb-10">
            <View className="flex-row items-center flex-1 pr-3">
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(255,255,255,0.16)",
                }}
              >
                <Text style={{ fontSize: 26 }}>{countryFlag}</Text>
              </View>

              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text
                  style={{ fontSize: 12, color: "rgba(255,255,255,0.75)" }}
                  numberOfLines={1}
                >
                  {countryLabel}
                </Text>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: "white",
                    marginTop: 2,
                  }}
                  numberOfLines={2}
                >
                  {trip.name}
                </Text>
              </View>
            </View>

            <View className="items-end">
              <View
                style={{
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  backgroundColor: statusStyle.bg,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: "600", color: statusStyle.color }}>
                  {statusStyle.label}
                </Text>
              </View>
            </View>
          </View>

          {/* FECHAS + TOTAL (total arriba derecha debajo del status) */}
          <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.75)",
                  marginBottom: 3,
                }}
              >
                Fechas del viaje
              </Text>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "white" }}>
                {formatDateRange(trip.startDate, trip.endDate)}{" "}
                {days > 0 && (
                  <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", fontWeight: "400" }}>
                    · {days} día{days === 1 ? "" : "s"}
                  </Text>
                )}
              </Text>
            </View>

            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.80)" }}>
                Total gastado
              </Text>
              <Text style={{ fontSize: 16, fontWeight: "800", color: "white", marginTop: 2 }}>
                {formatEuro(trip.cost || 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* SELECTOR TABS */}
        <View className="mb-3">
          <View className="flex-row rounded-2xl bg-slate-50 p-1">
            {[
              { key: "summary" as TripTab, label: "Resumen" },
              { key: "expenses" as TripTab, label: "Gastos" },
              { key: "planning" as TripTab, label: "Planificación" },
              { key: "info" as TripTab, label: "Logística" },
            ].map((opt) => {
              const active = tab === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => setTab(opt.key)}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 14,
                    backgroundColor: active ? "white" : "transparent",
                    borderWidth: active ? 1 : 0,
                    borderColor: active ? colors.primary : "transparent",
                  }}
                  activeOpacity={0.9}
                >
                  <Text
                    style={{
                      textAlign: "center",
                      fontSize: 12,
                      fontWeight: "600",
                      color: active ? colors.primary : "#6B7280",
                    }}
                    numberOfLines={1}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* CONTENIDO POR TAB */}
        <View style={{ flex: 1 }}>
          {tab === "summary" && (
            <View style={{ flex: 1, backgroundColor: "transparent" }}>
              {/* Resumen (placeholder limpio, sin inventar datos) */}
              <View
                style={{
                  backgroundColor: "white",
                  borderRadius: 18,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: "rgba(148,163,184,0.22)",
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#0B1220" }}>
                  Resumen del viaje
                </Text>

                <View style={{ marginTop: 10, gap: 8 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ color: "#64748B", fontWeight: "600" }}>Destino</Text>
                    <Text style={{ color: "#0B1220", fontWeight: "700" }}>{countryLabel}</Text>
                  </View>

                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ color: "#64748B", fontWeight: "600" }}>Días</Text>
                    <Text style={{ color: "#0B1220", fontWeight: "700" }}>{days}</Text>
                  </View>

                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ color: "#64748B", fontWeight: "600" }}>Total gastado</Text>
                    <Text style={{ color: "#0B1220", fontWeight: "800" }}>{formatEuro(trip.cost || 0)}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {tab === "expenses" && (
            <TripExpensesSection tripId={trip.id} planItems={planItems} budget={null} />
          )}

          {tab === "planning" && (
            <TripPlanningSection tripId={trip.id} planItems={planItems} onRefresh={fetchTrip} />
          )}

          {tab === "info" && (
            <TripLogisticsSection tripId={trip.id} planItems={planItems} onRefresh={fetchTrip} />
          )}
        </View>
      </View>

      {/* MODAL EXPORTAR PDF */}
      <Modal
        visible={exportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !exporting && setExportModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center px-6" style={{ backgroundColor: "rgba(0,0,0,0.35)" }}>
          <View className="w-full rounded-2xl bg-white p-5">
            <Text className="text-base font-semibold text-gray-900 mb-1">Exportar viaje</Text>
            <Text className="text-xs text-gray-500 mb-4">
              Se generará un PDF con toda la información del viaje. Puedes decidir si incluir también el detalle de los
              gastos.
            </Text>

            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-sm text-gray-800">Incluir gastos</Text>
              <Switch value={includeExpenses} onValueChange={setIncludeExpenses} />
            </View>

            <View className="flex-row justify-end">
              <TouchableOpacity
                onPress={() => !exporting && setExportModalVisible(false)}
                style={{ paddingHorizontal: 10, paddingVertical: 8, marginRight: 8 }}
                disabled={exporting}
              >
                <Text className="text-sm text-gray-500">Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleExportPdf}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: exporting ? "#9CA3AF" : colors.primary,
                  opacity: exporting ? 0.8 : 1,
                }}
                disabled={exporting}
              >
                <Text className="text-sm font-semibold text-white">{exporting ? "Generando..." : "Exportar PDF"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
