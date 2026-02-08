// src/screens/Trips/components/TripExpensesSection.tsx
import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../../../../theme/theme";
import { useNavigation } from "@react-navigation/native";

// ✅ Si ya existen en tu proyecto, elimina estos enums y usa tus imports reales
export enum BudgetCategoryType {
  accommodation = "accommodation",
  transport_main = "transport_main",
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

  paymentStatus?: PaymentStatus | null;
  expenseDetails?: { category?: BudgetCategoryType | null } | null;
  destinationTransport?: { mode?: "train" | "bus" | "car" | "other" | null } | null;
}

interface Props {
  tripId: number;
  planItems: TripPlanItem[];
  budget: number | null;

  onPressItem?: (item: TripPlanItem) => void;
  onSetPaymentStatus?: (itemId: number, status: PaymentStatus) => Promise<void> | void;
}

const UI = {
  text: "#0B1220",
  muted: "#64748B",
  muted2: "#94A3B8",
  border: "rgba(148,163,184,0.28)",
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
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  badgeBg: string;
};

const BUDGET_DEFS: BudgetDef[] = [
  { key: BudgetCategoryType.accommodation, label: "Alojamiento", icon: "bed-outline", accent: "#22C55E", badgeBg: "rgba(34,197,94,0.12)" },
  { key: BudgetCategoryType.transport_main, label: "Transporte principal", icon: "airplane-outline", accent: "#2563EB", badgeBg: "rgba(37,99,235,0.12)" },
  { key: BudgetCategoryType.transport_local, label: "Transporte local", icon: "bus-outline", accent: "#0EA5E9", badgeBg: "rgba(14,165,233,0.12)" },
  { key: BudgetCategoryType.food, label: "Comida", icon: "restaurant-outline", accent: "#F97316", badgeBg: "rgba(249,115,22,0.12)" },
  { key: BudgetCategoryType.activities, label: "Actividades / visitas", icon: "map-outline", accent: "#A855F7", badgeBg: "rgba(168,85,247,0.12)" },
  { key: BudgetCategoryType.leisure, label: "Ocio", icon: "wine-outline", accent: "#EF4444", badgeBg: "rgba(239,68,68,0.10)" },
  { key: BudgetCategoryType.shopping, label: "Compras", icon: "bag-outline", accent: "#F59E0B", badgeBg: "rgba(245,158,11,0.12)" },
  { key: BudgetCategoryType.other, label: "Otros / fees", icon: "pricetag-outline", accent: "#0B1220", badgeBg: "rgba(15,23,42,0.10)" },
];

/** ====== Mapping como desktop ====== */
function categoryForItem(item: TripPlanItem): BudgetCategoryType {
  if (item.type === "expense") {
    const c = item.expenseDetails?.category as BudgetCategoryType | undefined | null;
    return c ?? BudgetCategoryType.other;
  }

  const t = item.type;

  if (t === "accommodation") return BudgetCategoryType.accommodation;
  if (t === "flight" || t === "transport_destination") return BudgetCategoryType.transport_main;

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

type DestMode = "train" | "bus" | "car" | "other";
function iconForDestinationMode(mode?: DestMode | null): keyof typeof Ionicons.glyphMap {
  if (!mode) return "bus-outline";
  if (mode === "train") return "train-outline";
  if (mode === "car") return "car-outline";
  return "bus-outline";
}

function iconForPlanItem(item: TripPlanItem, fallback: keyof typeof Ionicons.glyphMap): keyof typeof Ionicons.glyphMap {
  if (item.type === "flight") return "airplane-outline";
  if (item.type === "transport_destination") return iconForDestinationMode(item.destinationTransport?.mode as DestMode | undefined);
  if (item.type === "transport_local" || item.type === "transport") return "bus-outline";
  if (item.type === "taxi") return "car-outline";
  if (item.type === "expense") return "receipt-outline";
  return fallback;
}

function ProgressBar({ pct, accent }: { pct: number; accent: string }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <View style={{ height: 6, borderRadius: 999, backgroundColor: "rgba(15,23,42,0.08)", overflow: "hidden" }}>
      <View style={{ height: "100%", width: `${clamped}%`, backgroundColor: accent }} />
    </View>
  );
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
        marginTop: 6,
        paddingHorizontal: 10,
        height: 22,
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
      <Ionicons name={isPaid ? "checkmark-circle-outline" : "time-outline"} size={14} color={isPaid ? "#16A34A" : "#DC2626"} />
      <Text style={{ fontSize: 10, fontWeight: "900", color: isPaid ? "#16A34A" : "#DC2626" }}>
        {isPaid ? "Pagado" : "Pendiente"}
      </Text>
    </Pressable>
  );
}

/** ====== KPI card (horizontal, con barra) ====== */
function CategoryKpiCard({
  def,
  spent,
  totalSpent,
  active,
  onPress,
}: {
  def: BudgetDef;
  spent: number;
  totalSpent: number;
  active: boolean;
  onPress: () => void;
}) {
  const pct = totalSpent > 0 ? (spent / totalSpent) * 100 : 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 170,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 18,
        backgroundColor: UI.card,
        borderWidth: active ? 1.4 : 1,
        borderColor: active ? colors.primary : UI.border,
        shadowColor: "#0B1220",
        shadowOpacity: 0.06,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
        opacity: pressed ? 0.95 : 1,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 14,
            backgroundColor: def.badgeBg,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: "rgba(148,163,184,0.22)",
          }}
        >
          <Ionicons name={def.icon} size={16} color={def.accent} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 12, fontWeight: "900", color: UI.text }} numberOfLines={1}>
            {def.label}
          </Text>
          <Text style={{ marginTop: 2, fontSize: 11, fontWeight: "800", color: UI.muted2 }} numberOfLines={1}>
            {totalSpent > 0 ? `${pct.toFixed(0)}% del total` : "—"}
          </Text>
        </View>
      </View>

      <Text style={{ marginTop: 10, fontSize: 14, fontWeight: "900", color: UI.text }} numberOfLines={1}>
        {formatEuro(spent)}
      </Text>

      <View style={{ marginTop: 8 }}>
        <ProgressBar pct={pct} accent={def.accent} />
      </View>
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

  const rowIcon = iconForPlanItem(item, def.icon);
  const cost = safeNumber(item.cost);

  const dateBase = item.startAt || item.day || item.date || item.startTime || null;
  const dateLabel = dateBase ? formatDateShort(dateBase) : "";
  const timeLabel = item.startAt ? formatTimeShort(item.startAt) : item.startTime ? formatTimeShort(item.startTime) : "";

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
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 16,
        backgroundColor: pressed ? "rgba(148,163,184,0.10)" : "transparent",
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      })}
    >
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 14,
          backgroundColor: def.badgeBg,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: "rgba(148,163,184,0.22)",
        }}
      >
        <Ionicons name={rowIcon} size={18} color={def.accent} />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 14, fontWeight: "900", color: UI.text }} numberOfLines={1}>
          {item.title || "Gasto"}
        </Text>

        <Text style={{ marginTop: 2, fontSize: 12, fontWeight: "800", color: UI.muted }} numberOfLines={1}>
          {def.label}
          {dateLabel ? ` • ${dateLabel}` : ""}
          {timeLabel ? ` • ${timeLabel}` : ""}
        </Text>
      </View>

      <View style={{ alignItems: "flex-end" }}>
        <Text style={{ fontSize: 14, fontWeight: "900", color: UI.text }}>{formatEuro(cost)}</Text>
        {onSetPaymentStatus ? (
          <PaymentChip status={itemStatus} disabled={!canToggle || savingPay} onToggle={togglePayment} />
        ) : null}
      </View>
    </Pressable>
  );
}

export default function TripExpensesSection({
  tripId,
  planItems,
  budget, // no se usa en esta versión (lo dejamos por compatibilidad)
  onPressItem,
  onSetPaymentStatus,
}: Props) {
  const navigation = useNavigation<any>();

  const [cat, setCat] = useState<BudgetCategoryType | null>(null);

  const entries = useMemo(() => {
    const withCost = (planItems || []).filter((i) => safeNumber(i.cost) > 0);
    // más reciente primero
    return [...withCost].sort((a, b) => {
      const da = (a.startAt || a.day || a.date || a.startTime || "") as any;
      const db = (b.startAt || b.day || b.date || b.startTime || "") as any;
      return String(db).localeCompare(String(da));
    });
  }, [planItems]);

  const totalsByCategory = useMemo(() => {
    const t: Record<BudgetCategoryType, number> = {
      accommodation: 0,
      transport_main: 0,
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
    return t;
  }, [entries]);

  const totalSpent = useMemo(() => entries.reduce((s, it) => s + safeNumber(it.cost), 0), [entries]);

  const visibleKpis = useMemo(
    () => BUDGET_DEFS.filter((d) => (totalsByCategory[d.key] || 0) > 0),
    [totalsByCategory]
  );

  const filtered = useMemo(() => {
    if (!cat) return entries;
    return entries.filter((it) => categoryForItem(it) === cat);
  }, [entries, cat]);

  if (entries.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Ionicons name="receipt-outline" size={24} color="#94A3B8" />
        <Text className="text-center text-gray-400 mt-3 text-sm">
          Aún no hay costes asignados en el planning de este viaje.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24, paddingTop: 12 }}
      >
        {/* KPI horizontal (solo cards con barra) */}
        {visibleKpis.length > 0 ? (
          <View style={{ marginBottom: 12 }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 14, gap: 12, paddingVertical: 6 }}
            >
              {visibleKpis.map((def) => (
                <CategoryKpiCard
                  key={def.key}
                  def={def}
                  spent={totalsByCategory[def.key] || 0}
                  totalSpent={totalSpent}
                  active={cat === def.key}
                  onPress={() => setCat((prev) => (prev === def.key ? null : def.key))}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Lista */}
        <View
          style={{
            marginHorizontal: 14,
            backgroundColor: UI.card,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: UI.border,
            paddingVertical: 8,
          }}
        >
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
                <View style={{ height: 1, backgroundColor: "rgba(226,232,240,0.75)", marginLeft: 62 }} />
              ) : null}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
