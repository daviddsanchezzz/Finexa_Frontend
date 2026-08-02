// src/screens/finances/travels/TripDetailScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
  Switch,
  Alert,
  Linking,
  Platform,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useFocusEffect } from "@react-navigation/native";
import { colors } from "../../../../theme/theme";
import api from "../../../../api/api";

// Secciones
import TripPlanningSection from "./components/TripPlanningSection";
import TripLogisticsSection from "./components/TripLogisticaSection";
import TripExpensesSection from "./components/TripExpensesSection";
import TripExpenseSummarySection from "./components/TripExpenseSummarySection";
import { TripPlanItemType } from "../../../../types/enums/travel";

type TripStatus = "upcoming" | "ongoing" | "past";
type TxType = "income" | "expense" | "transfer";

interface Tx {
  id: number;
  date: string;
  amount: number;
  type: TxType;
  description?: string;
  walletId?: number | null;
  categoryId?: number | null;
  subcategoryId?: number | null;
  category?: { id: number; name: string; emoji?: string; color?: string } | null;
  subcategory?: { id: number; name: string; emoji?: string; color?: string } | null;
  wallet?: { id: number; name: string; emoji?: string } | null;
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

export type TaskStatus = "to_do" | "done";

export type TaskPriority = "low" | "medium" | "high";

export type TripTask = {
  id: number;
  tripId: number;
  title: string;
  status: TaskStatus;
  priority?: TaskPriority | null;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TripNote = {
  id: number;
  tripId: number;
  title?: string | null;
  body: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
};

interface TripFromApi {
  id: number;
  name: string;
  destination?: string | null;
  startDate: string;
  endDate: string;
  emoji?: string | null;
  color?: string | null;
  companions?: string[];
  transactions?: Tx[];
  planItems?: TripPlanItem[];
  tasks?: TripTask[];
  notes?: TripNote[];
  cost: number | null;
  budget?: number | null;
  coverImageUrl?: string | null;
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

// ===== WMO weather code → emoji + label =====
function wmoToMeta(code: number): { emoji: string; label: string } {
  if (code === 0) return { emoji: "☀️", label: "Despejado" };
  if (code <= 3) return { emoji: "⛅", label: "Nuboso" };
  if (code <= 48) return { emoji: "🌫️", label: "Niebla" };
  if (code <= 55) return { emoji: "🌦️", label: "Llovizna" };
  if (code <= 65) return { emoji: "🌧️", label: "Lluvia" };
  if (code <= 77) return { emoji: "❄️", label: "Nieve" };
  if (code <= 82) return { emoji: "🌦️", label: "Chubascos" };
  if (code <= 99) return { emoji: "⛈️", label: "Tormenta" };
  return { emoji: "🌡️", label: "Variable" };
}

interface WeatherDay {
  date: string;
  code: number;
  max: number;
  min: number;
}

function WeatherWidget({ countryCode, tripName }: { countryCode: string; tripName?: string }) {
  const [days, setDays] = useState<WeatherDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        let lat: number | undefined;
        let lon: number | undefined;
        let resolvedCity = "";

        // 1. Try geocoding the trip name directly (e.g. "Sicilia", "París")
        if (tripName) {
          const geoRes = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(tripName)}&count=1&language=es&format=json`
          );
          const geoData = await geoRes.json();
          if (geoData?.results?.length > 0) {
            const r = geoData.results[0];
            lat = r.latitude;
            lon = r.longitude;
            resolvedCity = r.name || tripName;
          }
        }

        // 2. Fallback: country capital from restcountries
        if (!lat || !lon) {
          const rc = await fetch(
            `https://restcountries.com/v3.1/alpha/${countryCode}?fields=capital,capitalInfo`
          );
          const rcData = await rc.json();
          resolvedCity = rcData?.capital?.[0] || "";
          lat = rcData?.capitalInfo?.latlng?.[0];
          lon = rcData?.capitalInfo?.latlng?.[1];
        }

        if (!lat || !lon || cancelled) return;
        if (!cancelled) setCity(resolvedCity);

        // 3. Weather from open-meteo (free, no key)
        const wRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
          `&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5`
        );
        const wData = await wRes.json();
        if (cancelled) return;
        const { time, weathercode, temperature_2m_max, temperature_2m_min } = wData.daily || {};
        if (!time) return;
        const result: WeatherDay[] = (time as string[]).map((d: string, i: number) => ({
          date: d,
          code: weathercode[i],
          max: Math.round(temperature_2m_max[i]),
          min: Math.round(temperature_2m_min[i]),
        }));
        if (!cancelled) setDays(result);
      } catch {
        // silently skip if API unavailable
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [countryCode, tripName]);

  if (loading) {
    return (
      <View style={{ backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", padding: 12, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 8 }}>
        <ActivityIndicator size="small" color="#94A3B8" />
        <Text style={{ fontSize: 12, color: "#94A3B8" }}>Cargando clima…</Text>
      </View>
    );
  }
  if (!days.length) return null;

  const today = days[0];
  const rest = days.slice(1);
  const todayMeta = wmoToMeta(today.code);

  return (
    <View style={{ backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", padding: 12, marginBottom: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="partly-sunny-outline" size={13} color="#94A3B8" />
          <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8" }}>
            CLIMA · {city.toUpperCase()}
          </Text>
        </View>
        <Text style={{ fontSize: 11, color: "#94A3B8" }}>Próximos 5 días</Text>
      </View>

      {/* Today */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
        <Text style={{ fontSize: 28 }}>{todayMeta.emoji}</Text>
        <View style={{ marginLeft: 10 }}>
          <Text style={{ fontSize: 20, fontWeight: "800", color: "#0B1220" }}>
            {today.max}° <Text style={{ fontSize: 14, fontWeight: "500", color: "#94A3B8" }}>/ {today.min}°</Text>
          </Text>
          <Text style={{ fontSize: 12, color: "#64748B" }}>{todayMeta.label} · Hoy</Text>
        </View>
      </View>

      {/* Rest of week */}
      <View style={{ flexDirection: "row", gap: 6 }}>
        {rest.map((d) => {
          const meta = wmoToMeta(d.code);
          const dayLabel = new Date(d.date + "T12:00").toLocaleDateString("es-ES", { weekday: "short" });
          return (
            <View key={d.date} style={{ flex: 1, alignItems: "center", backgroundColor: "#F8FAFC", borderRadius: 10, paddingVertical: 6 }}>
              <Text style={{ fontSize: 9, fontWeight: "700", color: "#94A3B8", textTransform: "uppercase" }}>{dayLabel}</Text>
              <Text style={{ fontSize: 16, marginVertical: 2 }}>{meta.emoji}</Text>
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#0B1220" }}>{d.max}°</Text>
              <Text style={{ fontSize: 10, color: "#94A3B8" }}>{d.min}°</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
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

  const fetchTrip = async (silent = false) => {
    if (!tripId) return;
    try {
      if (!silent) setLoading(true);
      const res = await api.get(`/trips/${tripId}`);
      setTrip(res.data);
    } catch (err) {
      console.error("❌ Error al obtener viaje:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrip();
  }, [tripId]);

  useFocusEffect(
    useCallback(() => {
      fetchTrip(true);
    }, [tripId])
  );

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
  const tripTransactions = (trip?.transactions || []).filter((tx) => tx.type === "expense");
  const tasks: TripTask[] = trip?.tasks || [];
  const notes: TripNote[] = trip?.notes || [];

  // Compute total from live data (planItems + linked transactions) to avoid stale trip.cost
  const totalGastado =
    planItems.reduce((sum, it) => sum + (it.cost ? Number(it.cost) : 0), 0) +
    tripTransactions.reduce((sum, tx) => sum + tx.amount, 0);

  const countryCode = (trip?.destination || "").trim().toUpperCase() || null;
  const countryLabel = countryCode ? countryNameEs(countryCode) : "Sin destino";
  const countryFlag = cca2ToFlagEmoji(countryCode);

  // =========================
  // TASKS CALLBACKS
  // =========================

  const createTripTask = async (title: string, priority?: TaskPriority | null, dueDate?: string | null) => {
    if (!tripId) return;
    const tempId = -Math.floor(Math.random() * 1_000_000);
    const optimistic: TripTask = {
      id: tempId,
      tripId,
      title,
      status: "to_do",
      priority: priority ?? null,
      dueDate: dueDate ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setTrip((prev) => {
      if (!prev) return prev;
      return { ...prev, tasks: [optimistic, ...(prev.tasks || [])] };
    });

    try {
      const res = await api.post(`/trips/${tripId}/tasks`, { title, priority: priority ?? undefined, dueDate: dueDate ?? undefined });
      setTrip((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          tasks: (prev.tasks || []).map((t) => (t.id === tempId ? res.data : t)),
        };
      });
    } catch (e) {
      console.error("❌ Error creando tarea:", e);
      setTrip((prev) => {
        if (!prev) return prev;
        return { ...prev, tasks: (prev.tasks || []).filter((t) => t.id !== tempId) };
      });
    }
  };

  const updateTripTask = async (taskId: number, patch: { title?: string; priority?: TaskPriority | null; dueDate?: string | null }) => {
    if (!tripId) return;
    setTrip((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tasks: (prev.tasks || []).map((t) =>
          t.id === taskId ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t
        ),
      };
    });
    try {
      await api.patch(`/trips/${tripId}/tasks/${taskId}`, patch);
    } catch (e) {
      console.error("❌ Error actualizando tarea:", e);
      fetchTrip();
    }
  };

  const toggleTripTask = async (taskId: number, nextStatus: TaskStatus) => {
    if (!tripId) return;

    setTrip((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tasks: (prev.tasks || []).map((t) =>
          t.id === taskId ? { ...t, status: nextStatus, updatedAt: new Date().toISOString() } : t
        ),
      };
    });

    try {
      await api.patch(`/trips/${tripId}/tasks/${taskId}/toggle`);
    } catch (e) {
      console.error("❌ Error toggling tarea:", e);
      fetchTrip();
    }
  };

  const deleteTripTask = async (taskId: number) => {
    if (!tripId) return;

    setTrip((prev) => {
      if (!prev) return prev;
      return { ...prev, tasks: (prev.tasks || []).filter((t) => t.id !== taskId) };
    });

    try {
      await api.delete(`/trips/${tripId}/tasks/${taskId}`);
    } catch (e) {
      console.error("❌ Error eliminando tarea:", e);
      fetchTrip();
    }
  };

  // =========================
  // NOTES CALLBACKS
  // =========================

  const createTripNote = async (note: { title?: string | null; body: string; pinned?: boolean }) => {
    if (!tripId) return;
    const tempId = -Math.floor(Math.random() * 1_000_000);
    const optimistic: TripNote = {
      id: tempId,
      tripId,
      title: note.title || null,
      body: note.body,
      pinned: note.pinned || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setTrip((prev) => {
      if (!prev) return prev;
      return { ...prev, notes: [optimistic, ...(prev.notes || [])] };
    });

    try {
      const res = await api.post(`/trips/${tripId}/notes`, note);
      setTrip((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          notes: (prev.notes || []).map((n) => (n.id === tempId ? res.data : n)),
        };
      });
      return res.data;
    } catch (e) {
      console.error("❌ Error creando nota:", e);
      setTrip((prev) => {
        if (!prev) return prev;
        return { ...prev, notes: (prev.notes || []).filter((n) => n.id !== tempId) };
      });
    }
  };

  const updateTripNote = async (
    noteId: number,
    patch: Partial<Pick<TripNote, "title" | "body" | "pinned">>
  ) => {
    if (!tripId) return;

    setTrip((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        notes: (prev.notes || []).map((n) =>
          n.id === noteId ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n
        ),
      };
    });

    try {
      await api.patch(`/trips/${tripId}/notes/${noteId}`, patch);
    } catch (e) {
      console.error("❌ Error actualizando nota:", e);
      fetchTrip();
    }
  };

  const deleteTripNote = async (noteId: number) => {
    if (!tripId) return;

    setTrip((prev) => {
      if (!prev) return prev;
      return { ...prev, notes: (prev.notes || []).filter((n) => n.id !== noteId) };
    });

    try {
      await api.delete(`/trips/${tripId}/notes/${noteId}`);
    } catch (e) {
      console.error("❌ Error eliminando nota:", e);
      fetchTrip();
    }
  };

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

  const budgetPct   = trip.budget && trip.budget > 0 ? Math.min(totalGastado / trip.budget, 1) : null;
  const budgetOver  = budgetPct != null && totalGastado > (trip.budget ?? 0);
  const budgetColor = budgetOver ? "#F87171" : (budgetPct ?? 0) > 0.8 ? "#FBBF24" : "#4ADE80";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F6F8FC" }}>

      {/* ── HEADER ── */}
      <View style={{
        paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10,
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>

        <Text style={{ fontSize: 17, fontWeight: "800", color: "#0F172A", flex: 1, textAlign: "center", marginHorizontal: 8 }} numberOfLines={1}>
          {trip.name}
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          {/* Status badge */}
          <View style={{
            paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
            backgroundColor: statusStyle.bg, marginRight: 4,
          }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: statusStyle.color }}>
              {statusStyle.label}
            </Text>
          </View>
          {/* Menu */}
          <TouchableOpacity
            onPress={() => navigation.navigate("TripForm", { editTrip: trip })}
            style={{ padding: 4 }}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* ── FOTO DE PORTADA ── */}
        <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
          <View style={{
            height: 190, borderRadius: 22, overflow: "hidden",
            backgroundColor: "#C7D2FE",
          }}>
            {trip.coverImageUrl ? (
              <Image
                source={{ uri: trip.coverImageUrl }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            ) : (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#EEF2FF" }}>
                <Text style={{ fontSize: 64 }}>{countryFlag}</Text>
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#6366F1", marginTop: 8 }}>{countryLabel}</Text>
              </View>
            )}
            {/* Overlay gradient bottom */}
            <View style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              height: 80, justifyContent: "flex-end", padding: 14,
            }}>
              <TouchableOpacity
                onPress={() => navigation.navigate("TripForm", { editTrip: trip })}
                activeOpacity={0.8}
                style={{
                  alignSelf: "flex-end",
                  flexDirection: "row", alignItems: "center", gap: 4,
                  backgroundColor: "rgba(0,0,0,0.35)", borderRadius: 10,
                  paddingHorizontal: 10, paddingVertical: 5,
                }}
              >
                <Ionicons name="camera-outline" size={13} color="white" />
                <Text style={{ fontSize: 11, fontWeight: "700", color: "white" }}>Cambiar foto</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── STATS ROW ── */}
        <View style={{ flexDirection: "row", gap: 10, marginHorizontal: 16, marginBottom: 14 }}>
          <View style={{
            flex: 1, backgroundColor: "white", borderRadius: 16, padding: 12,
            borderWidth: 1, borderColor: "#EEF2F7",
          }}>
            <Text style={{ fontSize: 10, fontWeight: "700", color: "#94A3B8", marginBottom: 3 }}>FECHAS</Text>
            <Text style={{ fontSize: 13, fontWeight: "800", color: "#0F172A" }} numberOfLines={1}>
              {formatDateRange(trip.startDate, trip.endDate)}
            </Text>
            {days > 0 && (
              <Text style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>{days} días</Text>
            )}
          </View>
          <View style={{
            flex: 1, backgroundColor: "white", borderRadius: 16, padding: 12,
            borderWidth: 1, borderColor: "#EEF2F7",
          }}>
            <Text style={{ fontSize: 10, fontWeight: "700", color: "#94A3B8", marginBottom: 3 }}>TOTAL GASTADO</Text>
            <Text style={{ fontSize: 13, fontWeight: "800", color: "#0F172A" }} numberOfLines={1}>
              {formatEuro(totalGastado)}
            </Text>
            {trip.budget && trip.budget > 0 ? (
              <Text style={{ fontSize: 11, color: budgetOver ? "#EF4444" : "#64748B", marginTop: 2 }}>
                de {formatEuro(trip.budget)}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Budget bar (si hay presupuesto) */}
        {budgetPct != null && (
          <View style={{ marginHorizontal: 16, marginBottom: 14 }}>
            <View style={{ height: 6, borderRadius: 99, backgroundColor: "#EEF2FF" }}>
              <View style={{
                height: 6, borderRadius: 99,
                backgroundColor: budgetColor,
                width: `${Math.round(budgetPct * 100)}%`,
              }} />
            </View>
            <Text style={{ fontSize: 10, color: "#94A3B8", fontWeight: "600", marginTop: 4 }}>
              {budgetOver ? "⚠️ Presupuesto superado" : `${Math.round(budgetPct * 100)}% del presupuesto`}
            </Text>
          </View>
        )}

        {/* ── TABS ── */}
        <View style={{ marginHorizontal: 16, marginBottom: 14 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {([
              { key: "summary"  as TripTab, label: "Resumen" },
              { key: "planning" as TripTab, label: "Planificación" },
              { key: "expenses" as TripTab, label: "Gastos" },
              { key: "info"     as TripTab, label: "Logística" },
            ]).map(opt => {
              const active = tab === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => setTab(opt.key)}
                  activeOpacity={0.8}
                  style={{
                    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 12,
                    backgroundColor: active ? colors.primary : "white",
                    borderWidth: 1,
                    borderColor: active ? colors.primary : "#E5E7EB",
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "700", color: active ? "white" : "#6B7280" }}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── CONTENIDO POR TAB ── */}
        <View style={{ paddingHorizontal: 16 }}>
          {tab === "summary" && (
            <View style={{ gap: 12 }}>
              {(status === "upcoming" || status === "ongoing") && !!countryCode && (
                <WeatherWidget countryCode={countryCode} tripName={trip?.name} />
              )}
              <TripExpenseSummarySection
                px={(n) => n}
                fs={(n) => n}
                tasks={tasks}
                notes={notes}
                onCreateTask={createTripTask}
                onToggleTask={toggleTripTask}
                onDeleteTask={deleteTripTask}
                onUpdateTask={updateTripTask}
                onCreateNote={createTripNote}
                onUpdateNote={updateTripNote}
                onDeleteNote={deleteTripNote}
              />
            </View>
          )}

          {tab === "expenses" && (
            <TripExpensesSection
              tripId={trip.id}
              planItems={planItems as any}
              budget={trip.budget ?? null}
              transactions={tripTransactions}
              onRefresh={fetchTrip}
              onPressTransaction={(tx) =>
                navigation.navigate("Add", {
                  editData: {
                    id: tx.id, type: tx.type, amount: tx.amount,
                    description: tx.description, date: tx.date,
                    walletId: tx.walletId ?? tx.wallet?.id,
                    categoryId: tx.categoryId ?? tx.category?.id,
                    subcategoryId: tx.subcategoryId ?? tx.subcategory?.id,
                    tripId: trip.id,
                  },
                })
              }
            />
          )}

          {tab === "planning" && (
            <TripPlanningSection
              tripId={trip.id}
              planItems={planItems as any}
              onRefresh={fetchTrip}
            />
          )}

          {tab === "info" && (
            <TripLogisticsSection tripId={trip.id} planItems={planItems as any} onRefresh={fetchTrip} />
          )}
        </View>
      </ScrollView>

      {/* Botón flotante Añadir actividad */}
      <View style={{
        position: "absolute", bottom: 24, right: 20,
        flexDirection: "row", gap: 10, alignItems: "center",
      }}>
        <TouchableOpacity
          onPress={() => navigation.navigate("TripPlanForm", { tripId, presetDay: "" })}
          activeOpacity={0.9}
          style={{
            flexDirection: "row", alignItems: "center", gap: 8,
            backgroundColor: colors.primary,
            borderRadius: 16, paddingVertical: 12, paddingHorizontal: 18,
            shadowColor: colors.primary, shadowOpacity: 0.35,
            shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
            elevation: 6,
          }}
        >
          <Ionicons name="add" size={18} color="white" />
          <Text style={{ fontSize: 13, fontWeight: "800", color: "white" }}>Añadir</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setExportModalVisible(true)}
          activeOpacity={0.85}
          style={{
            width: 44, height: 44, borderRadius: 14,
            backgroundColor: "white",
            borderWidth: 1, borderColor: "#E5E7EB",
            alignItems: "center", justifyContent: "center",
            shadowColor: "#000", shadowOpacity: 0.06,
            shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
          }}
        >
          <Ionicons name="share-outline" size={18} color="#64748B" />
        </TouchableOpacity>
      </View>

      {/* MODAL EXPORTAR PDF */}
      <Modal
        visible={exportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !exporting && setExportModalVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24, backgroundColor: "rgba(0,0,0,0.35)" }}>
          <View style={{ width: "100%", borderRadius: 20, backgroundColor: "white", padding: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: "#0F172A", marginBottom: 6 }}>Exportar viaje</Text>
            <Text style={{ fontSize: 13, color: "#64748B", marginBottom: 16, lineHeight: 18 }}>
              Se generará un PDF con toda la información del viaje.
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <Text style={{ fontSize: 14, color: "#0F172A", fontWeight: "600" }}>Incluir gastos</Text>
              <Switch value={includeExpenses} onValueChange={setIncludeExpenses} />
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={() => !exporting && setExportModalVisible(false)}
                disabled={exporting}
                style={{ flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#64748B" }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleExportPdf}
                disabled={exporting}
                style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: exporting ? "#9CA3AF" : colors.primary, alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{ fontSize: 14, fontWeight: "700", color: "white" }}>{exporting ? "Generando..." : "Exportar PDF"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
