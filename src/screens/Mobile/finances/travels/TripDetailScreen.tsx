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
  ImageBackground,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useFocusEffect } from "@react-navigation/native";
import { colors } from "../../../../theme/theme";
import api from "../../../../api/api";
import { appAlert } from "../../../../utils/appAlert";
import { avatarColorForId, initialsFromName } from "../../../../utils/avatarColor";
import { TripDetailScreenSkeleton } from "../../../../components/skeletons/TripDetailScreenSkeleton";
import { pickAndUploadTripCover } from "../../../../utils/uploadTripCover";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import { useTripWeather } from "../../../../hooks/useTripWeather";
import { wmoToMeta } from "../../../../utils/tripWeather";

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
  metadata?: { pending?: boolean; expenseCategory?: string | null } | null;
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

interface CountryStayFromApi {
  country: string;
  continent?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

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
  countryStays?: CountryStayFromApi[] | null;
  userId?: number;
  user?: { id: number; name: string } | null;
  members?: { user: { id: number; name: string } }[] | null;
}

type TripTab = "summary" | "expenses" | "planning" | "info";

const TRIP_DETAIL_CACHE = new Map<number, TripFromApi>();

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
      return { label: "Próximo", color: "#16A34A", textColor: "white" };
    case "ongoing":
      return { label: "En curso", color: "#EA580C", textColor: "white" };
    case "past":
    default:
      return { label: "Pasado", color: "rgba(100,116,139,0.75)", textColor: "#F1F5F9" };
  }
};

function CompanionAvatars({ people }: { people: { id: number; name: string }[] }) {
  if (people.length < 2) return null;
  return (
    <View style={{ flexDirection: "row" }}>
      {people.slice(0, 4).map((p, idx) => (
        <View
          key={p.id}
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: avatarColorForId(p.id),
            borderWidth: 1.5,
            borderColor: "white",
            alignItems: "center",
            justifyContent: "center",
            marginLeft: idx === 0 ? 0 : -8,
          }}
        >
          <Text style={{ color: "white", fontSize: 10, fontWeight: "800" }}>{initialsFromName(p.name)}</Text>
        </View>
      ))}
    </View>
  );
}

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

function WeatherWidget({ countryCode, tripName }: { countryCode: string; tripName?: string }) {
  const weatherQuery = useTripWeather(countryCode, tripName);

  const loading = weatherQuery.isLoading;
  const city = weatherQuery.data?.city ?? "";
  const days = weatherQuery.data?.days ?? [];

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
  const cachedTrip = typeof tripId === "number" ? TRIP_DETAIL_CACHE.get(tripId) ?? null : null;

  const [trip, setTrip] = useState<TripFromApi | null>(cachedTrip);
  const [loading, setLoading] = useState(!cachedTrip);
  const [tab, setTab] = useState<TripTab>("summary");
  const [planViewMode, setPlanViewMode] = useState<"day" | "summary">("day");

  // Exportar PDF
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [includeExpenses, setIncludeExpenses] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const formatEuro = (n: number) =>
    n.toLocaleString("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const handleDeleteTrip = () => {
    if (!trip) return;
    appAlert("Eliminar viaje", "¿Seguro? Esta acción no se puede deshacer.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/trips/${trip.id}`);
            navigation.goBack();
          } catch {
            appAlert("Error", "No se pudo eliminar el viaje.");
          }
        },
      },
    ]);
  };

  const handleTripMenu = () => {
    if (!trip) return;
    appAlert(trip.name, undefined, [
      { text: "Editar viaje", onPress: () => navigation.navigate("TripForm", { editTrip: trip }) },
      { text: "Compañeros de viaje", onPress: () => navigation.navigate("TripCompanions", { tripId: trip.id, tripName: trip.name }) },
      { text: "Compartir viaje", onPress: () => setExportModalVisible(true) },
      { text: "Eliminar viaje", style: "destructive", onPress: handleDeleteTrip },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const fetchTrip = async (silent = false) => {
    if (!tripId) return;
    try {
      if (!silent) setLoading(true);
      const res = await api.get(`/trips/${tripId}`);
      setTrip(res.data);
      TRIP_DETAIL_CACHE.set(tripId, res.data);
    } catch (err) {
      console.error("❌ Error al obtener viaje:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (cachedTrip) {
      fetchTrip(true);
      return;
    }
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
  const pendingExpensesCount = planItems.filter((it) => it.metadata?.pending === true).length;
  const tripTransactions = (trip?.transactions || []).filter((tx) => tx.type === "expense");
  const tasks: TripTask[] = trip?.tasks || [];
  const notes: TripNote[] = trip?.notes || [];

  // Compute total from live data (planItems + linked transactions) to avoid stale trip.cost
  const totalGastado =
    planItems.reduce((sum, it) => sum + (it.cost ? Number(it.cost) : 0), 0) +
    tripTransactions.reduce((sum, tx) => sum + tx.amount, 0);

  // A trip can span several countries (each with its own date range) — show
  // every one of them wherever the trip's destination is displayed, not just
  // the "primary" country kept in trip.destination for back-compat.
  const countryCodes = useMemo(() => {
    const codes = (trip?.countryStays ?? [])
      .map((s) => (s.country || "").trim().toUpperCase())
      .filter(Boolean);
    if (codes.length > 0) return Array.from(new Set(codes));
    const dest = (trip?.destination || "").trim().toUpperCase();
    return dest ? [dest] : [];
  }, [trip?.countryStays, trip?.destination]);

  const countryCode = countryCodes[0] ?? null;
  const countryLabel = countryCodes.length > 0 ? countryCodes.map((c) => countryNameEs(c)).join(", ") : "Sin destino";
  const countryFlag = countryCodes.map((c) => cca2ToFlagEmoji(c)).join("");
  const countryStaysForHero = useMemo(
    () =>
      (trip?.countryStays ?? [])
        .map((stay) => ({
          country: (stay.country || "").trim().toUpperCase(),
          startDate: stay.startDate || null,
          endDate: stay.endDate || null,
        }))
        .filter((stay) => stay.country),
    [trip?.countryStays]
  );

  const heroUsesSingleRange = useMemo(() => {
    if (countryStaysForHero.length === 0) return true;
    const firstStart = countryStaysForHero[0]?.startDate ?? null;
    const firstEnd = countryStaysForHero[0]?.endDate ?? null;
    return countryStaysForHero.every(
      (stay) => stay.startDate === firstStart && stay.endDate === firstEnd,
    );
  }, [countryStaysForHero]);

  const heroHeaderLine = useMemo(() => {
    const heroCountries = countryStaysForHero.length > 0
      ? countryStaysForHero.map((stay) => stay.country)
      : countryCodes;

    if (heroCountries.length === 0) return "";
    if (heroCountries.length === 1) {
      const code = heroCountries[0];
      return `${cca2ToFlagEmoji(code)} ${countryNameEs(code)}`;
    }

    return heroCountries.map((code) => cca2ToFlagEmoji(code)).join(" ");
  }, [countryStaysForHero, countryCodes]);

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

      if (base64) {
        navigation.navigate("ReportsPdfViewer", {
          title: trip.name || "Viaje",
          base64,
          fileName,
        });
        return;
      }

      if (pdfUrl) {
        navigation.navigate("ReportsPdfViewer", {
          title: trip.name || "Viaje",
          path: pdfUrl,
          fileName,
        });
        return;
      }

      appAlert(
        "No se ha podido generar el PDF",
        "No se ha recibido ningún archivo desde el servidor."
      );
    } catch (error) {
      console.error("❌ Error al exportar viaje", error);
      appAlert(
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
    return <TripDetailScreenSkeleton />;
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


  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F6F8FC" }}>

        {/* ── HERO (solo en Resumen) / COMPACT HEADER ── */}
        {tab === "summary" ? (() => {
          const addCoverButton = (
            <TouchableOpacity
              onPress={async () => {
                if (uploadingCover || !trip) return;
                setUploadingCover(true);
                try {
                  const url = await pickAndUploadTripCover();
                  if (url) {
                    await api.patch(`/trips/${trip.id}`, { coverImageUrl: url });
                    setTrip(t => t ? { ...t, coverImageUrl: url } : t);
                  }
                } finally { setUploadingCover(false); }
              }}
              activeOpacity={0.8}
              style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.35)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }}
            >
              {uploadingCover
                ? <ActivityIndicator size="small" color="white" />
                : <><Ionicons name="camera-outline" size={13} color="white" /><Text style={{ fontSize: 11, fontWeight: "700", color: "white" }}>Añadir foto</Text></>
              }
            </TouchableOpacity>
          );

          const topBar = (
            <View style={{ position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 10 }}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(0,0,0,0.28)", alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name="chevron-back" size={20} color="white" />
              </TouchableOpacity>
              <View style={{ flex: 1 }} />
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <CompanionAvatars
                  people={[
                    ...(trip.user ? [trip.user] : []),
                    ...((trip.members ?? []).map((m) => m.user)),
                  ]}
                />
                <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: statusStyle.color }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: statusStyle.textColor }}>{statusStyle.label}</Text>
                </View>
                <TouchableOpacity
                  onPress={handleTripMenu}
                  style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(0,0,0,0.28)", alignItems: "center", justifyContent: "center" }}
                >
                  <Ionicons name="ellipsis-horizontal" size={18} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          );

          const budgetBar = budgetPct != null ? (
            <View style={{ marginTop: 8 }}>
              <View style={{ height: 4, borderRadius: 99, backgroundColor: "rgba(255,255,255,0.20)" }}>
                <View style={{ height: 4, borderRadius: 99, backgroundColor: budgetOver ? "#FCA5A5" : "#4ADE80", width: `${Math.round(budgetPct * 100)}%` }} />
              </View>
              <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", fontWeight: "600", marginTop: 3 }}>
                {budgetOver ? "⚠️ Presupuesto superado" : `${Math.round(budgetPct * 100)}% del presupuesto`}
              </Text>
            </View>
          ) : null;

          const summaryLine = `${formatDateRange(trip.startDate, trip.endDate)} · ${days > 0 ? `${days} días` : "—"} · ${formatEuro(totalGastado)}`;
          const dateLine = formatDateRange(trip.startDate, trip.endDate);
          const daysLine = `${days > 0 ? `${days} días` : "—"}`;
          const amountLine = formatEuro(totalGastado);

          const metaBlock = (
            <View style={{ marginTop: 6, gap: 4 }}>
              {heroHeaderLine ? (
                <Text
                  style={{ fontSize: 13, color: "rgba(255,255,255,0.72)", fontWeight: "700" }}
                  numberOfLines={2}
                >
                  {heroHeaderLine}
                </Text>
              ) : null}
              <Text style={{ fontSize: 24, fontWeight: "900", color: "white" }} numberOfLines={1}>
                {trip.name}
              </Text>
              <Text
                style={{ fontSize: 13, color: "rgba(255,255,255,0.72)", fontWeight: "700" }}
                numberOfLines={1}
              >
                {summaryLine}
              </Text>
            </View>
          );

          const photoMetaBlock = (
            <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
              <View style={{ flex: 1, justifyContent: "flex-end" }}>
                {heroHeaderLine ? (
                  <Text
                    style={{ fontSize: 12, color: "rgba(255,255,255,0.76)", fontWeight: "700", marginBottom: 4 }}
                    numberOfLines={2}
                  >
                    {heroHeaderLine}
                  </Text>
                ) : null}
                <Text style={{ fontSize: 26, fontWeight: "900", color: "white", lineHeight: 28 }} numberOfLines={1}>
                  {trip.name}
                </Text>
              </View>

              <View style={{ minWidth: 108, alignItems: "flex-end", paddingBottom: 2 }}>
                <Text style={{ fontSize: 11, fontWeight: "800", color: "white" }} numberOfLines={1}>
                  {dateLine}
                </Text>
                <Text style={{ fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.64)", marginTop: 2 }}>
                  {daysLine}
                </Text>
                <Text style={{ fontSize: 18, fontWeight: "900", color: "white", marginTop: 5 }} numberOfLines={1}>
                  {amountLine}
                </Text>
              </View>
            </View>
          );

          const heroInnerWithPhoto = (
            <>
              <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.35)" }} />
              {topBar}
              <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 16 }}>
                {photoMetaBlock}
              </View>
            </>
          );

          const heroInnerNoPhoto = (
            <>
              <Svg
                pointerEvents="none"
                style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
                viewBox="0 0 400 220"
                preserveAspectRatio="none"
              >
                <Path d="M-20,55 C80,15 160,95 260,55 S420,15 460,55" stroke="rgba(255,255,255,0.14)" strokeWidth={1.5} fill="none" />
                <Path d="M-20,115 C100,75 180,155 280,115 S440,75 480,115" stroke="rgba(255,255,255,0.10)" strokeWidth={1.5} fill="none" />
                <Path d="M-20,168 C100,138 200,198 300,168 S440,138 480,168" stroke="rgba(255,255,255,0.08)" strokeWidth={1.5} fill="none" />
              </Svg>

              {topBar}

              <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, gap: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    {metaBlock}
                  </View>
                  {addCoverButton}
                </View>
                {budgetBar}
              </View>
            </>
          );

          return trip.coverImageUrl ? (
            Platform.OS === "web" ? (
              React.createElement(
                "div",
                {
                  style: {
                    height: 300,
                    overflow: "hidden",
                    backgroundImage: `url(${trip.coverImageUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    position: "relative",
                  },
                },
                heroInnerWithPhoto
              )
            ) : (
              <ImageBackground
                source={{ uri: trip.coverImageUrl }}
                resizeMode="cover"
                style={{ height: 300 }}
              >
                {heroInnerWithPhoto}
              </ImageBackground>
            )
          ) : (
            <LinearGradient
              colors={["#001B5E", "#003cc5", "#1A6AF5"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ height: 220 }}
            >
              {heroInnerNoPhoto}
            </LinearGradient>
          );
        })() : (
          <View style={{ backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 12, paddingBottom: 14 }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="chevron-back" size={22} color="white" />
            </TouchableOpacity>
            <Text style={{ flex: 1, textAlign: "center", fontSize: 16, fontWeight: "800", color: "white" }} numberOfLines={1}>
              {countryFlag ? `${countryFlag} ` : ""}{trip.name}
            </Text>
            {tab === "planning" ? (
              <View style={{ flexDirection: "row", gap: 2 }}>
                {(["day", "summary"] as const).map((mode) => {
                  const active = planViewMode === mode;
                  return (
                    <TouchableOpacity
                      key={mode}
                      onPress={() => setPlanViewMode(mode)}
                      style={{
                        width: 34, height: 34, borderRadius: 17,
                        alignItems: "center", justifyContent: "center",
                        backgroundColor: active ? "rgba(255,255,255,0.22)" : "transparent",
                      }}
                    >
                      <Ionicons
                        name={mode === "day" ? "calendar-outline" : "list-outline"}
                        size={18}
                        color={active ? "white" : "rgba(255,255,255,0.5)"}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleTripMenu}
                style={{ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name="ellipsis-horizontal" size={18} color="white" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── TABS ── */}
        <View style={{ flexDirection: "row", marginHorizontal: 16, marginTop: tab === "summary" ? 18 : 12, marginBottom: 14, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" }}>
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
                  flex: 1, alignItems: "center",
                  paddingVertical: 10,
                  borderBottomWidth: 2,
                  borderBottomColor: active ? colors.primary : "transparent",
                  marginBottom: -1,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <Text style={{ fontSize: 12, fontWeight: active ? "800" : "600", color: active ? colors.primary : "#94A3B8" }}>
                    {opt.label}
                  </Text>
                  {opt.key === "expenses" && pendingExpensesCount > 0 && (
                    <View style={{ minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 3, backgroundColor: "#F59E0B", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 9, fontWeight: "900", color: "white" }}>{pendingExpensesCount}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── CONTENIDO POR TAB ── */}
        <View style={{ flex: 1, paddingHorizontal: 16 }}>
          {tab === "summary" && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 100 }}>
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
            </ScrollView>
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
              viewMode={planViewMode}
              onChangeViewMode={setPlanViewMode}
            />
          )}

          {tab === "info" && (
            <TripLogisticsSection tripId={trip.id} trip={trip as any} planItems={planItems as any} onRefresh={fetchTrip} />
          )}
        </View>

      {/* Botón flotante */}
      <View style={{
        position: "absolute", bottom: 24, right: 20,
        flexDirection: "row", gap: 10, alignItems: "center",
      }}>
        <TouchableOpacity
          onPress={() => navigation.navigate("TripPlanForm", { tripId, presetDay: "" })}
          activeOpacity={0.9}
          style={{
            width: 52, height: 52,
            backgroundColor: colors.primary,
            borderRadius: 26,
            alignItems: "center", justifyContent: "center",
            shadowColor: colors.primary, shadowOpacity: 0.35,
            shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
            elevation: 6,
          }}
        >
          <Ionicons name="add" size={26} color="white" />
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
