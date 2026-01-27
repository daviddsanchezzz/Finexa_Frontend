import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, ScrollView, ActivityIndicator, Dimensions, Modal, Pressable, Text } from "react-native";
import { useRoute } from "@react-navigation/native";

import api from "../../../api/api";
import { colors } from "../../../theme/theme";
import { UI, useUiScale } from "../../../components/TripDetailDesktop/ui";
import { TripDetailTabs, TripSection } from "../../../components/TripDetailDesktop/TripDetailTabs";
import { TripDetailHeader } from "../../../components/TripDetailDesktop/TripDetailHeader";
import { DailyPlanTimeline } from "../../../components/TripDetailDesktop/DailyPlanTimeline";
import { TripSidebar } from "../../../components/TripDetailDesktop/TripSidebar";
import { AddPlanItemModal } from "../../../components/TripDetailDesktop/AddPlanItemModal";
import { TransportSectionPanel } from "../../../components/TripDetailDesktop/TransportSectionPanel";
import { AccommodationSectionPanel } from "../../../components/TripDetailDesktop/AccommodationSectionPanel";
import { BudgetSectionPanel } from "../../../components/TripDetailDesktop/BudgetSectionPanel";
import { BudgetCategoryType, FlightProvider, PaymentStatus, TripPlanItemType } from "../../../types/enums/travel";
import { SummarySectionPanel } from "../../../components/TripDetailDesktop/SummarySectionPanel";
import { Ionicons } from "@expo/vector-icons";
import { PlanItemEditorModal } from "../../../components/TripDetailDesktop/PlanItemEditorModal";


type FlightDetails = {
  planItemId: number;
  provider?: FlightProvider;
  status?: string | null;
  airlineName?: string | null;
  flightNumberRaw?: string | null;
  flightNumberIata?: string | null;
  fromIata?: string | null;
  toIata?: string | null;
  depTerminal?: string | null;
  arrTerminal?: string | null;
};

type DestinationTransportDetails = {
  planItemId: number;
  mode: "flight" | "train" | "bus" | "car" | "other";
  company?: string | null;
  bookingRef?: string | null;
  fromName?: string | null;
  toName?: string | null;
  depAt?: string | null;
  arrAt?: string | null;
};

type ExpenseDetails = {
    planItemId: number;
    category: BudgetCategoryType;
}

type AccommodationDetails = {
  planItemId: number;
  name?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  guests?: number | null;
  rooms?: number | null;
  bookingRef?: string | null;
  phone?: string | null;
  website?: string | null;
};


export interface TripPlanItem {
  id: number;
  tripId: number;
  type: TripPlanItemType;
  title: string;

  // nuevos
  day?: string | null;     // ISO
  startAt?: string | null; // ISO
  endAt?: string | null;
  timezone?: string | null;

  // legacy (por si vienen)
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;

  location?: string | null;
  notes?: string | null;
  transactionId?: number | null;

  cost?: number | string | null; // 👈 importante (Decimal)
  currency?: string | null;
  logistics?: boolean | null;
  paymentStatus: PaymentStatus

  accommodationDetails?: AccommodationDetails | null;
  flightDetails?: FlightDetails | null;
  destinationTransport?: DestinationTransportDetails | null;
  expenseDetails?: ExpenseDetails | null;
}




export default function TripDetailDesktopScreen({ navigation }: any) {
  const route = useRoute<any>();
  const tripId: number | undefined = route?.params?.tripId;

  const { width } = Dimensions.get("window");
  const WIDE = width >= 1120;

  const { px, fs } = useUiScale();

  const [trip, setTrip] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<TripSection>("summary");

  const [addOpen, setAddOpen] = useState(false);
  const [addPresetDate, setAddPresetDate] = useState<string | null>(null);

const [editorOpen, setEditorOpen] = useState(false);
const [editingItem, setEditingItem] = useState<TripPlanItem | null>(null);
const [editorPresetDate, setEditorPresetDate] = useState<string | null>(null);

const openCreateModal = useCallback((presetDate?: string | null) => {
  setEditingItem(null);
  setEditorPresetDate(presetDate ?? null);
  setEditorOpen(true);
}, []);

const openEditModal = useCallback((item: TripPlanItem) => {
  setEditorPresetDate(null);
  setEditingItem(item);
  setEditorOpen(true);
}, []);


  const [transportMenuOpen, setTransportMenuOpen] = useState(false);
const [selectedTransportItem, setSelectedTransportItem] = useState<any | null>(null);

// =======================
// NOTES
// =======================
const createTripNote = useCallback(
  async (input: { title?: string | null; body: string; pinned?: boolean }) => {
    if (!tripId) return;

    // optimistic: crea temporal
    const tempId = -Math.floor(Math.random() * 1_000_000);
    const nowIso = new Date().toISOString();

    const optimistic = {
      id: tempId,
      tripId,
      title: input.title ?? null,
      body: input.body ?? "",
      pinned: !!input.pinned,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const prevTrip = trip;

    setTrip((prev: any) => {
      if (!prev) return prev;
      return { ...prev, notes: [optimistic, ...(prev.notes ?? [])] };
    });

    try {
      const res = await api.post(`/trips/${tripId}/notes`, {
        title: input.title ?? null,
        body: input.body,
        pinned: !!input.pinned,
      });

      // reemplaza temp por real
      setTrip((prev: any) => {
        if (!prev) return prev;
        const notes = (prev.notes ?? []).map((n: any) => (n.id === tempId ? res.data : n));
        return { ...prev, notes };
      });

      return res.data;
    } catch (e) {
      console.error("❌ Error creando nota:", e);
      setTrip(prevTrip);
    }
  },
  [tripId, trip]
);

const updateTripNote = useCallback(
  async (noteId: number, patch: { title?: string | null; body?: string; pinned?: boolean }) => {
    if (!tripId) return;

    const prevTrip = trip;

    // optimistic update
    setTrip((prev: any) => {
      if (!prev) return prev;
      const notes = (prev.notes ?? []).map((n: any) =>
        n.id === noteId ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n
      );
      return { ...prev, notes };
    });

    try {
      await api.patch(`/trips/${tripId}/notes/${noteId}`, patch);
      // opcional: podrías refetch o dejarlo así (si backend devuelve updatedAt real)
    } catch (e) {
      console.error("❌ Error actualizando nota:", e);
      setTrip(prevTrip);
    }
  },
  [tripId, trip]
);

const setTripNotePinned = useCallback(
  async (noteId: number, pinned: boolean) => {
    if (!tripId) return;

    const prevTrip = trip;

    // optimistic
    setTrip((prev: any) => {
      if (!prev) return prev;
      const notes = (prev.notes ?? []).map((n: any) =>
        n.id === noteId ? { ...n, pinned, updatedAt: new Date().toISOString() } : n
      );
      return { ...prev, notes };
    });

    try {
      await api.patch(`/trips/${tripId}/notes/${noteId}/pin`, { pinned });
    } catch (e) {
      console.error("❌ Error pineando nota:", e);
      setTrip(prevTrip);
    }
  },
  [tripId, trip]
);

const deleteTripNote = useCallback(
  async (noteId: number) => {
    if (!tripId) return;

    const prevTrip = trip;

    // optimistic remove
    setTrip((prev: any) => {
      if (!prev) return prev;
      const notes = (prev.notes ?? []).filter((n: any) => n.id !== noteId);
      return { ...prev, notes };
    });

    try {
      await api.delete(`/trips/${tripId}/notes/${noteId}`);
    } catch (e) {
      console.error("❌ Error borrando nota:", e);
      setTrip(prevTrip);
    }
  },
  [tripId, trip]
);


// =======================
// TASKS
// =======================
const createTripTask = useCallback(
  async (title: string) => {
    if (!tripId) return;

    const t = title.trim();
    if (!t) return;

    const tempId = -Math.floor(Math.random() * 1_000_000);
    const nowIso = new Date().toISOString();

    const optimistic = {
      id: tempId,
      tripId,
      title: t,
      status: "to_do",
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const prevTrip = trip;

    setTrip((prev: any) => {
      if (!prev) return prev;
      return { ...prev, tasks: [optimistic, ...(prev.tasks ?? [])] };
    });

    try {
      const res = await api.post(`/trips/${tripId}/tasks`, { title: t });
      setTrip((prev: any) => {
        if (!prev) return prev;
        const tasks = (prev.tasks ?? []).map((x: any) => (x.id === tempId ? res.data : x));
        return { ...prev, tasks };
      });
      return res.data;
    } catch (e) {
      console.error("❌ Error creando tarea:", e);
      setTrip(prevTrip);
    }
  },
  [tripId, trip]
);

const updateTripTask = useCallback(
  async (taskId: number, patch: { title?: string; status?: "to_do" | "done" }) => {
    if (!tripId) return;

    const prevTrip = trip;

    setTrip((prev: any) => {
      if (!prev) return prev;
      const tasks = (prev.tasks ?? []).map((t: any) =>
        t.id === taskId ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t
      );
      return { ...prev, tasks };
    });

    try {
      await api.patch(`/trips/${tripId}/tasks/${taskId}`, patch);
    } catch (e) {
      console.error("❌ Error actualizando tarea:", e);
      setTrip(prevTrip);
    }
  },
  [tripId, trip]
);

const toggleTripTask = useCallback(
  async (taskId: number) => {
    if (!tripId) return;

    const prevTrip = trip;

    // optimistic toggle local
    setTrip((prev: any) => {
      if (!prev) return prev;
      const tasks = (prev.tasks ?? []).map((t: any) => {
        if (t.id !== taskId) return t;
        const next = t.status === "done" ? "to_do" : "done";
        return { ...t, status: next, updatedAt: new Date().toISOString() };
      });
      return { ...prev, tasks };
    });

    try {
      await api.patch(`/trips/${tripId}/tasks/${taskId}/toggle`, {});
    } catch (e) {
      console.error("❌ Error toggle tarea:", e);
      setTrip(prevTrip);
    }
  },
  [tripId, trip]
);

const deleteTripTask = useCallback(
  async (taskId: number) => {
    if (!tripId) return;

    const prevTrip = trip;

    setTrip((prev: any) => {
      if (!prev) return prev;
      const tasks = (prev.tasks ?? []).filter((t: any) => t.id !== taskId);
      return { ...prev, tasks };
    });

    try {
      await api.delete(`/trips/${tripId}/tasks/${taskId}`);
    } catch (e) {
      console.error("❌ Error borrando tarea:", e);
      setTrip(prevTrip);
    }
  },
  [tripId, trip]
);


const setItemPaymentStatus = useCallback(
  async (planItemId: number, status: PaymentStatus) => {
    if (!tripId) return;

    // snapshot para rollback
    const prevTrip = trip;

    // optimistic update
    setTrip((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        planItems: (prev.planItems || []).map((it: any) =>
          it.id === planItemId ? { ...it, paymentStatus: status } : it
        ),
      };
    });

    try {
await api.patch(`/trips/${tripId}/plan-items/${planItemId}/payment-status`, {
  paymentStatus: status,
});
    } catch (e) {
      console.error("❌ Error actualizando paymentStatus:", e);
      setTrip(prevTrip); // rollback
    }
  },
  [tripId, trip]
);


const openCreate = useCallback(
  (presetType?: string, presetDate?: string | null) => {
    navigation.navigate?.("TripPlanForm", { tripId, presetType, presetDate });
  },
  [navigation, tripId]
);

  const fetchTrip = useCallback(async () => {
    if (!tripId) return;
    try {
      setLoading(true);
      const res = await api.get(`/trips/${tripId}`);
      setTrip(res.data);
    } catch (e) {
      console.error("❌ Error al obtener viaje:", e);
      setTrip(null);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    fetchTrip();
  }, [fetchTrip]);



  const openItem = useCallback(
  (item: any) => navigation.navigate?.("TripPlanForm", { tripId, planItem: item }),
  [navigation, tripId]
);



  const planItems = useMemo(() => trip?.planItems ?? [], [trip]);

  if (!tripId) {
    return (
      <View style={{ flex: 1, backgroundColor: UI.bg, alignItems: "center", justifyContent: "center" }}>
        <View style={{ padding: px(16), borderRadius: px(14), backgroundColor: "white", borderWidth: 1, borderColor: UI.border }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }

return (
  <View style={{ flex: 1, backgroundColor: UI.bg }}>
    {/* ===== Fixed header + tabs (NO SCROLL) ===== */}
    <View
      style={{
        paddingHorizontal: px(22),
        paddingTop: px(18),
        maxWidth: px(1480),
        width: "100%",
        alignSelf: "center",
      }}
    >
      <TripDetailHeader
        loading={loading}
        trip={trip}
        px={px}
        fs={fs}
        onBack={() => navigation.goBack?.()}
        onShare={() => console.log("share")}
        onAddActivity={() => {
          setAddPresetDate(null);
          setAddOpen(true);
        }}
      />

      <View style={{ marginTop: px(14), paddingBottom: px(14) }}>
        <TripDetailTabs value={section} onChange={setSection} px={px} fs={fs} />
      </View>
    </View>

    {/* ===== Scroll starts here ===== */}
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: px(22),
        paddingBottom: px(80),
        maxWidth: px(1480),
        width: "100%",
        alignSelf: "center",
      }}
    >
      <View
        style={{
          flexDirection: WIDE ? "row" : "column",
          gap: px(16),
          alignItems: "flex-start",
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          {loading ? (
            <View
              style={{
                height: px(260),
                backgroundColor: "white",
                borderRadius: px(18),
                borderWidth: 1,
                borderColor: UI.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : !trip ? (
            <View
              style={{
                padding: px(18),
                backgroundColor: "white",
                borderRadius: px(18),
                borderWidth: 1,
                borderColor: UI.border,
              }}
            />
          ) : section === "daily" ? (
            <DailyPlanTimeline
              trip={trip}
              items={planItems}
              px={px}
              fs={fs}
              onPressItem={(item) => navigation.navigate?.("TripPlanForm", { tripId, planItem: item })}
              onAddForDate={(dateISO) => {
                setAddPresetDate(dateISO);
                setAddOpen(true);
              }}
            />
) : section === "transport" ? (
  <TransportSectionPanel
    trip={trip}
    items={planItems}
    px={px}
    fs={fs}
    onPressItem={openItem}
  />
) : section === "stays" ? (
            <AccommodationSectionPanel
              trip={trip}
              items={planItems}
              px={px}
              fs={fs}
              onPressItem={openItem}
              onAddAccommodation={() => openCreate("accommodation", null)}
            />
          ) : section === "budget" ? (
            <BudgetSectionPanel
              trip={trip}
              items={planItems}
              px={px}
              fs={fs}
              onPressItem={openItem}
              onAddExpense={() => {
                setAddPresetDate(null);
                setAddOpen(true);
              }}
                onSetPaymentStatus={setItemPaymentStatus}

            />
            ): section === "summary" ? (
<SummarySectionPanel
  trip={trip}
  px={px}
  fs={fs}
  plannedActivitiesCount={planItems.length}
  onCreateTask={createTripTask}
  onToggleTask={async (taskId, next) => {
    await toggleTripTask(taskId);
  }}
  onDeleteTask={deleteTripTask}
  onEditTaskTitle={async (taskId, title) => {
    await updateTripTask(taskId, { title });
  }}
  onCreateNote={createTripNote}
  onUpdateNote={updateTripNote}
  onDeleteNote={deleteTripNote}
/>

          ) : null}
        </View>

        <View style={{ width: WIDE ? px(380) : "100%" }}>
          <TripSidebar trip={trip} items={planItems} px={px} fs={fs} section={section} />
        </View>
      </View>
    </ScrollView>

    <AddPlanItemModal
      tripId={tripId}
      visible={addOpen}
      presetDate={addPresetDate}
      onClose={() => setAddOpen(false)}
      onCreated={() => fetchTrip()}
      onContinue={(presetType, presetDate) => {
        setAddOpen(false);
        navigation.navigate("TripPlanForm", { tripId, presetType, presetDate });
      }}
      px={px}
      fs={fs}
    />

<PlanItemEditorModal
  tripId={tripId}
  visible={editorOpen}
  editingItem={editingItem}
  presetDate={editorPresetDate}
  onClose={() => setEditorOpen(false)}
  onCreatedOrUpdated={() => fetchTrip()}
  onDeleted={() => fetchTrip()}
  px={px}
  fs={fs}
/>


  </View>
);
}