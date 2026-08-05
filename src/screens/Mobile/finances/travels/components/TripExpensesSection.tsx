// src/screens/Trips/components/TripExpensesSection.tsx
import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, Alert, Linking, TouchableOpacity, Modal, ActivityIndicator, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../../../../theme/theme";
import { useNavigation } from "@react-navigation/native";
import api from "../../../../../api/api";
import { appAlert } from "../../../../../utils/appAlert";

// ✅ Si ya existen en tu proyecto, elimina estos enums y usa tus imports reales
export enum BudgetCategoryType {
  accommodation = "accommodation",
  transport_local = "transport_local",
  food = "food",
  activities = "activities",
  leisure = "leisure",
  shopping = "shopping",
  other = "other",
}
export enum PaymentStatus {
  paid = "paid",
  pending = "pending",
}

type TripPlanItemType =
  | "flight"
  | "accommodation"
  | "transport_destination"
  | "transport_local"
  | "transport"
  | "taxi"
  | "museum"
  | "monument"
  | "viewpoint"
  | "free_tour"
  | "guided_tour"
  | "day_trip"
  | "hike"
  | "beach"
  | "restaurant"
  | "cafe"
  | "market"
  | "concert"
  | "sport"
  | "bar_party"
  | "nightlife"
  | "shopping"
  | "other"
  | "activity"
  | "expense";

export interface TripPlanItem {
  id: number;
  type: TripPlanItemType;
  title: string;

  date?: string | null;
  day?: string | null;
  startAt?: string | null;
  startTime?: string | null;

  location?: string | null;
  notes?: string | null;

  cost?: number | null;
  currency?: string | null;

  paymentStatus?: PaymentStatus | null;
  expenseDetails?: { category?: BudgetCategoryType | null } | null;
  transactionId?: number | null;
  metadata?: { expenseCategory?: BudgetCategoryType | null; pending?: boolean } | null;
  destinationTransport?: { mode?: "train" | "bus" | "car" | "other" | null } | null;
}

export interface TripTx {
  id: number;
  date: string;
  amount: number;
  type: string;
  description?: string | null;
  walletId?: number | null;
  categoryId?: number | null;
  subcategoryId?: number | null;
  category?: { id: number; name: string; emoji?: string | null } | null;
  subcategory?: { id: number; name: string; emoji?: string | null } | null;
  wallet?: { id: number; name: string; emoji?: string | null } | null;
}

interface Props {
  tripId: number;
  planItems: TripPlanItem[];
  budget: number | null;
  transactions?: TripTx[];

  onPressItem?: (item: TripPlanItem) => void;
  onPressTransaction?: (tx: TripTx) => void;
  onSetPaymentStatus?: (itemId: number, status: PaymentStatus) => Promise<void> | void;
  onRefresh?: () => void;
}

const UI = {
  text: "#0B1220",
  muted: "#64748B",
  muted2: "#94A3B8",
  border: "rgba(148,163,184,0.26)",
  card: "#FFFFFF",
};

function formatEuro(n: number) {
  return n.toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function safeNumber(v: any) {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : 0;
  return Number.isFinite(n) ? n : 0;
}

function formatDateShort(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

function formatTimeShort(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

/** ====== Budget defs (8 categorías) ====== */
type BudgetDef = {
  key: BudgetCategoryType;
  label: string;
  emoji: string;
  accent: string;
  badgeBg: string;
};

// Solo para agrupar/visualizar en esta pantalla: el picker de categorías al
// crear un gasto tiene un único "Transporte" (BudgetCategoryType.transport_local),
// pero aquí sí distinguimos transporte local (coche, taxi...) de transporte al
// destino (vuelos, trenes/traslados de llegada-salida) cuando el item viene del
// itinerario, porque ese dato ya existe en item.type sin pedírselo al usuario.
type DisplayCategoryKey = BudgetCategoryType | "transport_destination";

type BudgetDefDisplay = Omit<BudgetDef, "key"> & { key: DisplayCategoryKey };

const BUDGET_DEFS: BudgetDefDisplay[] = [
  { key: BudgetCategoryType.accommodation,   label: "Alojamiento",          emoji: "🏨",  accent: "#22C55E", badgeBg: "rgba(34,197,94,0.12)" },
  { key: "transport_destination",            label: "Transporte al destino",emoji: "✈️",  accent: "#2563EB", badgeBg: "rgba(37,99,235,0.12)" },
  { key: BudgetCategoryType.transport_local, label: "Transporte local",     emoji: "🚗",  accent: "#0EA5E9", badgeBg: "rgba(14,165,233,0.12)" },
  { key: BudgetCategoryType.food,            label: "Comida",               emoji: "🍽️", accent: "#F97316", badgeBg: "rgba(249,115,22,0.12)" },
  { key: BudgetCategoryType.activities,      label: "Actividades / visitas",emoji: "🗺️", accent: "#A855F7", badgeBg: "rgba(168,85,247,0.12)" },
  { key: BudgetCategoryType.leisure,         label: "Ocio",                 emoji: "🍷",  accent: "#EF4444", badgeBg: "rgba(239,68,68,0.10)" },
  { key: BudgetCategoryType.shopping,        label: "Compras",              emoji: "🛍️", accent: "#F59E0B", badgeBg: "rgba(245,158,11,0.12)" },
  { key: BudgetCategoryType.other,           label: "Otros / fees",         emoji: "📌",  accent: "#0B1220", badgeBg: "rgba(15,23,42,0.10)" },
];

/** ====== Mapping como desktop ====== */
function categoryForItem(item: TripPlanItem): DisplayCategoryKey {
  if (item.type === "expense") {
    // backend stores in metadata.expenseCategory; fallback to legacy expenseDetails.category
    const c = (item.metadata?.expenseCategory ?? item.expenseDetails?.category) as BudgetCategoryType | undefined | null;
    return c ?? BudgetCategoryType.other;
  }

  const t = item.type;

  if (t === "accommodation") return BudgetCategoryType.accommodation;

  if (t === "flight" || t === "transport_destination") return "transport_destination";

  if (t === "transport_local" || t === "transport" || t === "taxi") return BudgetCategoryType.transport_local;

  if (t === "restaurant" || t === "cafe" || t === "market") return BudgetCategoryType.food;

  if (
    t === "museum" ||
    t === "monument" ||
    t === "viewpoint" ||
    t === "free_tour" ||
    t === "guided_tour" ||
    t === "day_trip" ||
    t === "hike" ||
    t === "beach" ||
    t === "activity"
  ) return BudgetCategoryType.activities;

  if (t === "concert" || t === "sport" || t === "bar_party" || t === "nightlife")
    return BudgetCategoryType.leisure;

  if (t === "shopping") return BudgetCategoryType.shopping;

  return BudgetCategoryType.other;
}

function emojiForPlanItem(item: TripPlanItem, fallback: string): string {
  if (item.type === "flight") return "✈️";
  if (item.type === "taxi") return "🚕";
  if (item.type === "transport_destination" || item.type === "transport_local" || item.type === "transport") {
    const mode = item.destinationTransport?.mode;
    if (mode === "train") return "🚂";
    if (mode === "car") return "🚗";
    if (mode === "ferry") return "⛴️";
    return "🚌";
  }
  return fallback;
}


function PaymentChip({
  status,
  disabled,
  onToggle,
}: {
  status: PaymentStatus;
  disabled?: boolean;
  onToggle: () => void;
}) {
  const isPaid = status === PaymentStatus.paid;
  return (
    <Pressable
      onPress={(e: any) => {
        e?.stopPropagation?.();
        e?.preventDefault?.();
        if (disabled) return;
        onToggle();
      }}
      style={({ pressed }) => ({
        marginTop: 5,
        paddingHorizontal: 9,
        height: 20,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: isPaid ? "rgba(22,163,74,0.35)" : "rgba(220,38,38,0.35)",
        backgroundColor: isPaid ? "rgba(22,163,74,0.10)" : "rgba(220,38,38,0.08)",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        opacity: disabled ? 0.6 : pressed ? 0.92 : 1,
      })}
    >
      <Ionicons name={isPaid ? "checkmark-circle-outline" : "time-outline"} size={13} color={isPaid ? "#16A34A" : "#DC2626"} />
      <Text style={{ fontSize: 9, fontWeight: "900", color: isPaid ? "#16A34A" : "#DC2626" }}>
        {isPaid ? "Pagado" : "Pendiente"}
      </Text>
    </Pressable>
  );
}


function ExpenseRow({
  item,
  onPress,
  onSetPaymentStatus,
}: {
  item: TripPlanItem;
  onPress: () => void;
  onSetPaymentStatus?: (itemId: number, status: PaymentStatus) => Promise<void> | void;
}) {
  const cat = categoryForItem(item);
  const def = BUDGET_DEFS.find((d) => d.key === cat) ?? BUDGET_DEFS[BUDGET_DEFS.length - 1];

  const rowAccent = def.accent;
  const cost = safeNumber(item.cost);

  const dateBase = item.startAt || item.day || item.date || item.startTime || null;
  const dateLabel = dateBase ? formatDateShort(dateBase) : "";
  const timeLabel = item.startAt ? formatTimeShort(item.startAt) : item.startTime ? formatTimeShort(item.startTime) : "";

  const meta = [dateLabel, timeLabel].filter(Boolean).join(" · ");

  const itemStatus = item.paymentStatus ?? PaymentStatus.pending;
  const [savingPay, setSavingPay] = useState(false);
  const canToggle = !!onSetPaymentStatus && !!item.id;

  const togglePayment = async () => {
    if (!onSetPaymentStatus || !item.id) return;
    const next = itemStatus === PaymentStatus.paid ? PaymentStatus.pending : PaymentStatus.paid;

    Alert.alert(
      "Estado de pago",
      next === PaymentStatus.paid ? "¿Marcar como pagado?" : "¿Marcar como pendiente?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            try {
              setSavingPay(true);
              await onSetPaymentStatus(item.id, next);
            } finally {
              setSavingPay(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderRadius: 14,
        backgroundColor: pressed ? "rgba(148,163,184,0.10)" : "transparent",
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
      })}
    >
      <View style={{ width: 12, height: 12, borderRadius: 999, backgroundColor: rowAccent }} />

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 13, fontWeight: "900", color: UI.text }} numberOfLines={1}>
          {item.title || "Gasto"}
        </Text>
        {!!meta && (
          <Text style={{ marginTop: 2, fontSize: 11, fontWeight: "700", color: UI.muted2 }} numberOfLines={1}>
            {meta}
          </Text>
        )}
      </View>

      <View style={{ alignItems: "flex-end" }}>
        <Text style={{ fontSize: 14, fontWeight: "900", color: UI.text }}>{formatEuro(cost)}</Text>
        {!!item.currency && item.currency !== "EUR" && !!item.cost && (
          <Text style={{ fontSize: 10, fontWeight: "600", color: UI.muted2, marginTop: 1 }}>
            {Number(item.cost).toFixed(2)} {item.currency}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

export default function TripExpensesSection({
  tripId,
  planItems,
  budget,
  transactions = [],
  onPressItem,
  onPressTransaction,
  onSetPaymentStatus,
  onRefresh,
}: Props) {
  const navigation = useNavigation<any>();
  const [cat, setCat] = useState<DisplayCategoryKey | null>(null);
  const [subTab, setSubTab] = useState<"all" | "pending">("all");
  const [linkingItem, setLinkingItem] = useState<TripPlanItem | null>(null);
  const [linkSaving, setLinkSaving] = useState(false);
  const [linkSearch, setLinkSearch] = useState("");

  const pendingItems = useMemo(
    () => (planItems || []).filter((i) => i.metadata?.pending === true),
    [planItems]
  );

  const nonPendingPlanItems = useMemo(
    () => (planItems || []).filter((i) => !i.metadata?.pending),
    [planItems]
  );

  // Plan items elegibles para vincular (no pending, con ID válido)
  const linkableItems = useMemo(
    () => nonPendingPlanItems.filter((i) => i.id > 0),
    [nonPendingPlanItems]
  );

  const filteredLinkableItems = useMemo(() => {
    const q = linkSearch.trim().toLowerCase();
    if (!q) return linkableItems;
    return linkableItems.filter(
      (i) => (i.title || "").toLowerCase().includes(q) || (i.location || "").toLowerCase().includes(q)
    );
  }, [linkableItems, linkSearch]);

  const handlePendingItemMenu = (pendingItem: TripPlanItem) => {
    appAlert(pendingItem.title || "Nuevo gasto", "¿Qué quieres hacer con este gasto?", [
      { text: "Vincular a un item del plan", onPress: () => setLinkingItem(pendingItem) },
      {
        text: "Crear gasto / item de itinerario",
        onPress: () => navigation.navigate("TripPlanForm", { tripId, planItem: pendingItem }),
      },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const closeLinkModal = () => {
    setLinkingItem(null);
    setLinkSearch("");
  };

  const handleLinkToPlan = async (planItemId: number) => {
    if (!linkingItem || linkSaving) return;
    const target = linkableItems.find((i) => i.id === planItemId);
    if (!target) return;
    try {
      setLinkSaving(true);
      // El DTO exige type/title aunque no cambien: reenviamos los del item
      // destino tal cual (a diferencia de "crear gasto", aquí el item ya
      // tiene su propio nombre). La nota de la transacción (guardada como
      // title del gasto pendiente) pasa a ser la nota del item, no su título.
      const linkedNote = (linkingItem.title || "").trim();
      const notes = linkedNote
        ? (target.notes ? `${target.notes}\n${linkedNote}` : linkedNote)
        : target.notes;
      const t = target as any;
      // El PATCH del backend reemplaza el item entero (no es un update parcial:
      // cualquier campo ausente se guarda como null) — hay que reenviar la
      // fecha/hora/ubicación tal cual las tenía o se perderían al vincular.
      await api.patch(`/trips/${tripId}/plan-items/${planItemId}`, {
        type: target.type,
        title: target.title,
        date: t.date ?? undefined,
        startTime: t.startTime ?? undefined,
        endTime: t.endTime ?? undefined,
        day: t.day ?? undefined,
        startAt: t.startAt ?? undefined,
        endAt: t.endAt ?? undefined,
        timezone: t.timezone ?? undefined,
        location: target.location ?? undefined,
        currency: target.currency ?? undefined,
        cost: safeNumber(linkingItem.cost),
        transactionId: linkingItem.transactionId,
        notes: notes ?? undefined,
      });
      await api.delete(`/trips/${tripId}/plan-items/${linkingItem.id}`);
      closeLinkModal();
      onRefresh?.();
    } catch {
      setLinkSaving(false);
    }
  };

const entries = useMemo(() => {
  const withCost = (nonPendingPlanItems || []).filter((i) => safeNumber(i.cost) > 0);

  const toTs = (it: TripPlanItem) => {
    // 1) Si hay fecha-hora real (startAt/startTime), úsala
    const dt = it.startAt || it.startTime || null;
    if (dt) {
      const d = new Date(dt);
      const t = d.getTime();
      if (!Number.isNaN(t)) return t;
    }

    // 2) Si hay día (day/date), normaliza a medianoche local
    const day = it.day || it.date || null;
    if (day) {
      // soporta YYYY-MM-DD o ISO
      const iso = /^\d{4}-\d{2}-\d{2}$/.test(day) ? `${day}T00:00:00` : day;
      const d = new Date(iso);
      const t = d.getTime();
      if (!Number.isNaN(t)) return t;
    }

    // 3) si no hay nada, al final
    return 0;
  };

  return [...withCost].sort((a, b) => {
    const ta = toTs(a);
    const tb = toTs(b);

    // DESC: más reciente primero
    if (tb !== ta) return ta - tb;

    // desempate: título
    return (a.title || "").localeCompare(b.title || "");
  });
}, [planItems]);

  const txTotal = useMemo(() => transactions.reduce((s, tx) => s + safeNumber(tx.amount), 0), [transactions]);

  const totalsByCategory = useMemo(() => {
    const t: Record<DisplayCategoryKey, number> = {
      accommodation: 0,
      transport_destination: 0,
      transport_local: 0,
      food: 0,
      activities: 0,
      leisure: 0,
      shopping: 0,
      other: 0,
    };
    for (const it of entries) {
      const k = categoryForItem(it);
      t[k] += safeNumber(it.cost);
    }
    t.other += txTotal;
    return t;
  }, [entries, txTotal]);

  const totalSpent = useMemo(() => entries.reduce((s, it) => s + safeNumber(it.cost), 0) + txTotal, [entries, txTotal]);

  const visibleKpis = useMemo(
    () => BUDGET_DEFS.filter((d) => (totalsByCategory[d.key] || 0) > 0),
    [totalsByCategory]
  );

  const filtered = useMemo(() => {
    if (!cat) return entries;
    return entries.filter((it) => categoryForItem(it) === cat);
  }, [entries, cat]);

  const visibleTxs = useMemo(
    () => (!cat || cat === BudgetCategoryType.other) ? transactions : [],
    [transactions, cat]
  );

  if (entries.length === 0 && transactions.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Ionicons name="receipt-outline" size={22} color="#94A3B8" />
        <Text className="text-center text-gray-400 mt-3 text-sm">
          Aún no hay costes asignados en el planning de este viaje.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }}>
        {/* TOTAL GASTADO — inline sin fondo */}
        {visibleKpis.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: UI.muted }}>Total gastado</Text>
              <Text style={{ fontSize: 26, fontWeight: "900", color: UI.text, letterSpacing: -0.5 }}>{formatEuro(totalSpent)}</Text>
            </View>
            {!!budget && budget > 0 && (() => {
              const pct = Math.min(totalSpent / budget, 1);
              const over = totalSpent > budget;
              const barColor = over ? "#EF4444" : pct > 0.8 ? "#F59E0B" : "#22C55E";
              return (
                <View style={{ marginTop: 8 }}>
                  <View style={{ height: 5, borderRadius: 99, backgroundColor: "rgba(148,163,184,0.18)" }}>
                    <View style={{ height: 5, borderRadius: 99, backgroundColor: barColor, width: `${Math.round(pct * 100)}%` }} />
                  </View>
                  <Text style={{ marginTop: 4, fontSize: 11, color: over ? "#EF4444" : UI.muted2, fontWeight: "700" }}>
                    {over
                      ? `${formatEuro(totalSpent - budget)} por encima · presupuesto ${formatEuro(budget)}`
                      : `Queda ${formatEuro(budget - totalSpent)} de ${formatEuro(budget)}`}
                  </Text>
                </View>
              );
            })()}
          </View>
        )}

        {/* CATEGORÍAS — clicables para filtrar */}
        {visibleKpis.length > 0 && (
          <View style={{ marginBottom: 18 }}>
            <Text style={{ fontSize: 13, fontWeight: "900", color: UI.text, marginBottom: 8 }}>Gastos por categoría</Text>

            <View style={{ backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: UI.border, overflow: "hidden" }}>
              {[...visibleKpis]
                .sort((a, b) => (totalsByCategory[b.key] || 0) - (totalsByCategory[a.key] || 0))
                .map((def, idx, arr) => {
                  const amount = totalsByCategory[def.key] || 0;
                  const pct = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;
                  const isActive = cat === def.key;
                  const isLast = idx === arr.length - 1;
                  return (
                    <Pressable
                      key={def.key}
                      onPress={() => setCat((prev) => prev === def.key ? null : def.key)}
                      style={({ pressed }) => ({
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        borderBottomWidth: isLast ? 0 : 1,
                        borderBottomColor: UI.border,
                        backgroundColor: isActive ? def.badgeBg : pressed ? "rgba(15,23,42,0.02)" : "white",
                      })}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 7 }}>
                        <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: isActive ? def.accent + "25" : def.badgeBg, alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                          <Text style={{ fontSize: 16, lineHeight: 19 }}>{def.emoji}</Text>
                        </View>
                        <Text style={{ flex: 1, fontSize: 13, fontWeight: isActive ? "900" : "800", color: UI.text }}>{def.label}</Text>
                        <Text style={{ fontSize: 13, fontWeight: "900", color: UI.text }}>{formatEuro(amount)}</Text>
                        <Text style={{ fontSize: 11, fontWeight: "700", color: UI.muted, marginLeft: 8, minWidth: 32, textAlign: "right" }}>{Math.round(pct)}%</Text>
                      </View>
                      <View style={{ height: 4, borderRadius: 99, backgroundColor: "rgba(148,163,184,0.18)" }}>
                        <View style={{ height: 4, borderRadius: 99, backgroundColor: def.accent, width: `${Math.round(pct)}%` }} />
                      </View>
                    </Pressable>
                  );
                })}
            </View>
          </View>
        )}

        {/* SUB-TABS: Todos los gastos / Nuevos gastos */}
        <View style={{ flexDirection: "row", backgroundColor: "rgba(148,163,184,0.12)", borderRadius: 12, padding: 3, marginBottom: 14 }}>
          <Pressable
            onPress={() => setSubTab("all")}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 9,
              alignItems: "center",
              backgroundColor: subTab === "all" ? "white" : "transparent",
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: "800", color: subTab === "all" ? UI.text : UI.muted }}>
              Todos los gastos
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setSubTab("pending")}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 9,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 6,
              backgroundColor: subTab === "pending" ? "white" : "transparent",
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: "800", color: subTab === "pending" ? UI.text : UI.muted }}>
              Nuevos gastos
            </Text>
            {pendingItems.length > 0 && (
              <View style={{ minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: "#F59E0B", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 10, fontWeight: "900", color: "white" }}>{pendingItems.length}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* ITEMS filtrados */}
        {subTab === "all" && filtered.length > 0 && (
          <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: "900", color: UI.text }}>
                {cat ? (BUDGET_DEFS.find(d => d.key === cat)?.label ?? "Gastos") : "Todos los gastos"}
              </Text>
              {cat && (
                <Pressable onPress={() => setCat(null)}
                  style={({ pressed }) => ({ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, backgroundColor: "rgba(148,163,184,0.14)", opacity: pressed ? 0.8 : 1 })}>
                  <Text style={{ fontSize: 12, fontWeight: "800", color: UI.muted }}>Ver todos</Text>
                </Pressable>
              )}
            </View>
            <View style={{ backgroundColor: UI.card, borderRadius: 18, borderWidth: 1, borderColor: UI.border, paddingVertical: 6 }}>
              {filtered.map((it, idx) => (
                <View key={it.id ?? idx}>
                  <ExpenseRow
                    item={it}
                    onSetPaymentStatus={onSetPaymentStatus}
                    onPress={() => {
                      onPressItem?.(it);
                      navigation.navigate("TripPlanForm", { tripId, planItem: it });
                    }}
                  />
                  {idx < filtered.length - 1 ? (
                    <View style={{ height: 1, backgroundColor: "rgba(226,232,240,0.75)", marginLeft: 56 }} />
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        )}

        {subTab === "all" && filtered.length === 0 && visibleTxs.length === 0 && (
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <Ionicons name="receipt-outline" size={22} color="#94A3B8" />
            <Text style={{ marginTop: 8, fontSize: 13, color: UI.muted, textAlign: "center" }}>
              No hay gastos en esta categoría
            </Text>
          </View>
        )}

        {/* TRANSACCIONES registradas */}
        {subTab === "all" && visibleTxs.length > 0 && (
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 11, fontWeight: "800", color: UI.muted, letterSpacing: 0.5, marginBottom: 6, marginLeft: 2 }}>
              REGISTRADAS
            </Text>
            <View style={{ backgroundColor: UI.card, borderRadius: 18, borderWidth: 1, borderColor: UI.border, paddingVertical: 6 }}>
              {visibleTxs.map((tx, idx) => (
                <View key={tx.id}>
                  <Pressable
                    onPress={() => onPressTransaction?.(tx)}
                    style={({ pressed }) => ({
                      paddingVertical: 10,
                      paddingHorizontal: 10,
                      borderRadius: 14,
                      backgroundColor: pressed ? "rgba(148,163,184,0.10)" : "transparent",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    })}
                  >
                    <View style={{ width: 12, height: 12, borderRadius: 999, backgroundColor: tx.category?.color || "#94A3B8" }} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontSize: 13, fontWeight: "900", color: UI.text }} numberOfLines={1}>
                        {tx.description || tx.subcategory?.name || "Gasto"}
                      </Text>
                      <Text style={{ marginTop: 2, fontSize: 11, fontWeight: "700", color: UI.muted2 }} numberOfLines={1}>
                        {tx.category?.name ?? ""}
                        {tx.subcategory?.name ? ` · ${tx.subcategory.name}` : ""}
                        {tx.date ? ` · ${formatDateShort(tx.date)}` : ""}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: "900", color: UI.text }}>
                      {formatEuro(safeNumber(tx.amount))}
                    </Text>
                  </Pressable>
                  {idx < visibleTxs.length - 1 ? (
                    <View style={{ height: 1, backgroundColor: "rgba(226,232,240,0.75)", marginLeft: 56 }} />
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ===== NUEVOS GASTOS ===== */}
        {subTab === "pending" && pendingItems.length === 0 && (
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <Ionicons name="checkmark-circle-outline" size={22} color="#94A3B8" />
            <Text style={{ marginTop: 8, fontSize: 13, color: UI.muted, textAlign: "center" }}>
              No tienes gastos nuevos por clasificar
            </Text>
          </View>
        )}
        {subTab === "pending" && pendingItems.length > 0 && (
          <View style={{ marginHorizontal: 0, marginTop: 0 }}>
            {/* Header con badge */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8, marginLeft: 2 }}>
              <View style={{ width: 20, height: 20, borderRadius: 999, backgroundColor: "#F59E0B", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 11, fontWeight: "900", color: "white" }}>{pendingItems.length}</Text>
              </View>
              <Text style={{ fontSize: 12, fontWeight: "900", color: "#92400E", letterSpacing: 0.4 }}>
                NUEVOS GASTOS
              </Text>
              <Text style={{ fontSize: 11, fontWeight: "600", color: UI.muted2 }}>· sin asignar al viaje</Text>
            </View>

            <View style={{ backgroundColor: "rgba(245,158,11,0.06)", borderRadius: 18, borderWidth: 1, borderColor: "rgba(245,158,11,0.30)", paddingVertical: 4 }}>
              {pendingItems.map((item, idx) => (
                <View key={item.id}>
                  <Pressable
                    onPress={() => handlePendingItemMenu(item)}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 9,
                      backgroundColor: pressed ? "rgba(245,158,11,0.08)" : "transparent",
                    })}
                  >
                    <View style={{ width: 26, height: 26, borderRadius: 9, backgroundColor: "rgba(245,158,11,0.15)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(245,158,11,0.25)" }}>
                      <Ionicons name="receipt-outline" size={12} color="#D97706" />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontSize: 13, fontWeight: "900", color: UI.text }} numberOfLines={1}>
                        {item.title || "Nuevo gasto"}
                      </Text>
                      {item.location ? (
                        <Text style={{ fontSize: 10, fontWeight: "600", color: UI.muted2, marginTop: 1 }} numberOfLines={1}>
                          {item.location}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: "900", color: "#D97706" }}>
                      {formatEuro(safeNumber(item.cost))}
                    </Text>
                    <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="ellipsis-vertical" size={15} color={UI.muted} />
                    </View>
                  </Pressable>
                  {idx < pendingItems.length - 1 ? (
                    <View style={{ height: 1, backgroundColor: "rgba(245,158,11,0.20)", marginLeft: 12 }} />
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Modal: vincular a plan item existente */}
      <Modal visible={!!linkingItem} transparent animationType="slide" onRequestClose={closeLinkModal}>
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}
          onPress={() => { if (!linkSaving) closeLinkModal(); }}
        >
          <Pressable
            style={{ backgroundColor: "white", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32 }}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 8 }}>
              <View style={{ width: 40, height: 4, borderRadius: 999, backgroundColor: "rgba(148,163,184,0.35)" }} />
            </View>

            {/* Header */}
            <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: UI.border }}>
              <Text style={{ flex: 1, fontSize: 16, fontWeight: "900", color: UI.text }}>Vincular al plan</Text>
              {!linkSaving && (
                <TouchableOpacity onPress={closeLinkModal}>
                  <Ionicons name="close" size={22} color={UI.muted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Gasto origen */}
            {linkingItem && (
              <View style={{ marginHorizontal: 20, marginTop: 14, backgroundColor: "rgba(245,158,11,0.08)", borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Ionicons name="receipt-outline" size={16} color="#D97706" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: "800", color: UI.text }} numberOfLines={1}>{linkingItem.title}</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: "900", color: "#D97706" }}>{formatEuro(safeNumber(linkingItem.cost))}</Text>
              </View>
            )}

            {/* Buscador */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 20, marginTop: 14, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, backgroundColor: "rgba(148,163,184,0.10)" }}>
              <Ionicons name="search-outline" size={16} color={UI.muted} />
              <TextInput
                value={linkSearch}
                onChangeText={setLinkSearch}
                placeholder="Buscar en el plan..."
                placeholderTextColor={UI.muted2}
                style={{ flex: 1, fontSize: 13, fontWeight: "600", color: UI.text, padding: 0 }}
              />
              {!!linkSearch && (
                <TouchableOpacity onPress={() => setLinkSearch("")}>
                  <Ionicons name="close-circle" size={16} color={UI.muted2} />
                </TouchableOpacity>
              )}
            </View>

            <Text style={{ fontSize: 11, fontWeight: "700", color: UI.muted, marginHorizontal: 20, marginTop: 14, marginBottom: 8 }}>
              Selecciona el plan al que vincular este gasto:
            </Text>

            {/* Lista plan items */}
            <ScrollView style={{ maxHeight: 300 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}>
              {filteredLinkableItems.length === 0 ? (
                <Text style={{ fontSize: 13, color: UI.muted2, textAlign: "center", paddingVertical: 20 }}>
                  {linkableItems.length === 0 ? "No hay ítems en el plan disponibles" : "Sin resultados"}
                </Text>
              ) : (
                filteredLinkableItems.map((pi, idx) => {
                  const piCat = categoryForItem(pi);
                  const piDef = BUDGET_DEFS.find((d) => d.key === piCat) ?? BUDGET_DEFS[BUDGET_DEFS.length - 1];
                  const piEmoji = emojiForPlanItem(pi, piDef.emoji);
                  return (
                  <TouchableOpacity
                    key={pi.id}
                    onPress={() => handleLinkToPlan(pi.id)}
                    disabled={linkSaving}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      paddingVertical: 11,
                      borderBottomWidth: idx < filteredLinkableItems.length - 1 ? 1 : 0,
                      borderBottomColor: UI.border,
                      opacity: linkSaving ? 0.5 : 1,
                    }}
                  >
                    <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: piDef.badgeBg, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 15, lineHeight: 18 }}>{piEmoji}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontSize: 13, fontWeight: "800", color: UI.text }} numberOfLines={1}>{pi.title}</Text>
                      {pi.location ? (
                        <Text style={{ fontSize: 11, fontWeight: "600", color: UI.muted2, marginTop: 1 }} numberOfLines={1}>{pi.location}</Text>
                      ) : null}
                    </View>
                    {safeNumber(pi.cost) > 0 && (
                      <Text style={{ fontSize: 12, fontWeight: "700", color: UI.muted }}>{formatEuro(safeNumber(pi.cost))}</Text>
                    )}
                    {linkSaving ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Ionicons name="chevron-forward" size={16} color={UI.muted2} />
                    )}
                  </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
