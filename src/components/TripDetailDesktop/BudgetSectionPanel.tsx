import React, { useMemo, useState } from "react";
import { View, Text, Pressable, Platform, TextInput, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UI, formatEuro } from "./ui";
import type { TripPlanItem } from "../../screens/Desktop/travel/TripDetailDesktopScreen";
import { BudgetCategoryType, PaymentStatus } from "../../types/enums/travel";

/** ✅ 8 categorías */
type Props = {
  trip: any;
  items: TripPlanItem[];
  px: (n: number) => number;
  fs: (n: number) => number;

  onPressItem?: (item: TripPlanItem) => void;
  onAddExpense?: () => void;
onSetPaymentStatus?: (itemId: number, status: PaymentStatus) => Promise<void> | void;

};

function PaymentChip({
  status,
  px,
  fs,
  disabled,
  onToggle,
}: {
  status: PaymentStatus;
  px: (n: number) => number;
  fs: (n: number) => number;
  disabled?: boolean;
  onToggle: () => void;
}) {
  const isPaid = status === PaymentStatus.paid;

  return (
    <Pressable
      onPress={(e: any) => {
        // ✅ evita que el click llegue al Pressable padre (la fila)
        e?.stopPropagation?.();
        e?.preventDefault?.();

        if (disabled) return;
        onToggle();
      }}
      style={({ hovered, pressed }) => [
        {
          marginTop: px(6),
          paddingHorizontal: px(10),
          height: px(22),
          borderRadius: px(999),
          borderWidth: 1,
          borderColor: isPaid ? "rgba(22,163,74,0.35)" : "rgba(220,38,38,0.35)",
          backgroundColor: isPaid ? "rgba(22,163,74,0.10)" : "rgba(220,38,38,0.08)",
          flexDirection: "row",
          alignItems: "center",
          gap: px(6),
          opacity: disabled ? 0.6 : pressed ? 0.92 : 1,
        },
        Platform.OS === "web" && hovered && !disabled
          ? { backgroundColor: isPaid ? "rgba(22,163,74,0.14)" : "rgba(220,38,38,0.12)" }
          : null,
      ]}
    >
      <Ionicons
        name={isPaid ? "checkmark-circle-outline" : "time-outline"}
        size={px(14)}
        color={isPaid ? "#16A34A" : "#DC2626"}
      />
      <Text style={{ fontSize: fs(9), fontWeight: "700", color: isPaid ? "#16A34A" : "#DC2626" }}>
        {isPaid ? "Pagado" : "Pendiente"}
      </Text>

      {!disabled ? <Ionicons name="chevron-down" size={px(14)} color={UI.muted2} /> : null}
    </Pressable>
  );
}


function Card({
  children,
  px,
  style,
}: {
  children: React.ReactNode;
  px: (n: number) => number;
  style?: any;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: "white",
          borderRadius: px(18),
          borderWidth: 1,
          borderColor: UI.border,
          padding: px(16),
          shadowColor: "#0B1220",
          shadowOpacity: 0.05,
          shadowRadius: px(18),
          shadowOffset: { width: 0, height: px(10) },
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function ProgressBar({
  pct,
  px,
  accent,
}: {
  pct: number;
  px: (n: number) => number;
  accent: string;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <View
      style={{
        height: px(8),
        borderRadius: 999,
        backgroundColor: "rgba(15,23,42,0.08)",
        overflow: "hidden",
      }}
    >
      <View style={{ height: "100%", width: `${clamped}%`, backgroundColor: accent }} />
    </View>
  );
}

function IconBadge({
  icon,
  bg,
  color,
  px,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  bg: string;
  color: string;
  px: (n: number) => number;
}) {
  return (
    <View
      style={{
        width: px(34),
        height: px(34),
        borderRadius: px(12),
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name={icon} size={px(16)} color={color} />
    </View>
  );
}

function norm(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function safeNumber(v: any) {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : 0;
  return Number.isFinite(n) ? n : 0;
}

/**
 * ✅ Devuelve la categoría de presupuesto.
 * - Si item.type === "expense" => usa expenseDetails.category (obligatorio)
 * - Si no => mapea por type
 */
function categoryForItem(item: TripPlanItem): BudgetCategoryType {
  if (item.type === "expense") {
    const c = item.expenseDetails?.category as BudgetCategoryType | undefined;
    return c ?? BudgetCategoryType.other;
  }

  const type = item.type;

  if (type === "accommodation") return BudgetCategoryType.accommodation;

  if (type === "flight" || type === "transport_destination") return BudgetCategoryType.transport_main;

  if (type === "transport_local") return BudgetCategoryType.transport_local;

  if (type === "restaurant" || type === "cafe" || type === "market") return BudgetCategoryType.food;

  if (
    type === "museum" ||
    type === "monument" ||
    type === "viewpoint" ||
    type === "free_tour" ||
    type === "guided_tour" ||
    type === "day_trip" ||
    type === "hike" ||
    type === "beach" ||
    type === "activity"
  ) return BudgetCategoryType.activities;

  if (type === "concert" || type === "sport" || type === "bar_party" || type === "nightlife")
    return BudgetCategoryType.leisure;

  if (type === "shopping") return BudgetCategoryType.shopping;

  return BudgetCategoryType.other;
}

/** ====== ICONOS segun tu BBDD ====== */
type DestMode = "train" | "bus" | "car" | "other";

function iconForDestinationMode(mode?: DestMode | null): keyof typeof Ionicons.glyphMap {
  if (!mode) return "bus-outline";
  if (mode === "train") return "train-outline";
  if (mode === "car") return "car-outline";
  if (mode === "other") return "bus-outline";
  return "bus-outline";
}

function iconForPlanItem(item: TripPlanItem, fallback: keyof typeof Ionicons.glyphMap): keyof typeof Ionicons.glyphMap {
  if (item.type === "flight") return "airplane-outline";

  if (item.type === "transport_destination") {
    const mode = (item as any)?.destinationTransport?.mode as DestMode | undefined;
    return iconForDestinationMode(mode);
  }

  if (item.type === "transport_local") return "bus-outline";

  // ✅ icono específico para expense (opcional, pero queda bien)
  if ((item as any)?.type === "expense") return "receipt-outline";

  return fallback;
}

type BudgetDef = {
  key: BudgetCategoryType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  badgeBg: string;
};

const BUDGET_DEFS: BudgetDef[] = [
  { key: BudgetCategoryType.accommodation, label: "ALOJAMIENTO", icon: "bed-outline", accent: "#22C55E", badgeBg: "rgba(34,197,94,0.12)" },

  { key: BudgetCategoryType.transport_main, label: "TRANSPORTE PRINCIPAL", icon: "airplane-outline", accent: "#2563EB", badgeBg: "rgba(37,99,235,0.12)" },
  { key: BudgetCategoryType.transport_local, label: "TRANSPORTE LOCAL", icon: "bus-outline", accent: "#0EA5E9", badgeBg: "rgba(14,165,233,0.12)" },

  { key: BudgetCategoryType.food, label: "COMIDA", icon: "restaurant-outline", accent: "#F97316", badgeBg: "rgba(249,115,22,0.12)" },

  { key: BudgetCategoryType.activities, label: "ACTIVIDADES / VISITAS", icon: "map-outline", accent: "#A855F7", badgeBg: "rgba(168,85,247,0.12)" },

  { key: BudgetCategoryType.leisure, label: "OCIO", icon: "wine-outline", accent: "#EF4444", badgeBg: "rgba(239,68,68,0.10)" },

  { key: BudgetCategoryType.shopping, label: "COMPRAS", icon: "bag-outline", accent: "#F59E0B", badgeBg: "rgba(245,158,11,0.12)" },

  { key: BudgetCategoryType.other, label: "OTROS / FEES", icon: "pricetag-outline", accent: "#0B1220", badgeBg: "rgba(15,23,42,0.10)" },
];

/** ✅ Row */
function ExpenseRow({
  item,
  px,
  fs,
  onPress,
  onSetPaymentStatus,
}: {
  item: TripPlanItem;
  px: (n: number) => number;
  fs: (n: number) => number;
  onPress?: () => void;
    onSetPaymentStatus?: (itemId: number, status: PaymentStatus) => Promise<void> | void;
}) {
  const cat = categoryForItem(item);
  const def =
    BUDGET_DEFS.find((d) => d.key === cat) ??
    ({ key: "other", label: "OTROS / FEES", icon: "pricetag-outline", accent: "#0B1220", badgeBg: "rgba(15,23,42,0.10)" } as any);

  const rowIcon = iconForPlanItem(item, def.icon);

  const cost = safeNumber((item as any).cost);
  const subtitle = (item as any)?.day
    ? new Date((item as any).day).toLocaleDateString("es-ES", { weekday: "short", day: "2-digit", month: "short" })
    : (item as any)?.date
      ? new Date((item as any).date).toLocaleDateString("es-ES", { weekday: "short", day: "2-digit", month: "short" })
      : "";

  const [hover, setHover] = useState(false);

    const [savingPay, setSavingPay] = useState(false);

  const paymentStatus = (item as any).paymentStatus ?? PaymentStatus.pending;
  const itemId = (item as any).id as number | undefined;

  function askSet(status: PaymentStatus) {
    if (!onSetPaymentStatus || !itemId) return;

    // Móvil: Alert (rápido y consistente)
    if (Platform.OS !== "web") {
      Alert.alert(
        "Estado de pago",
        "¿Qué quieres marcar?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: status === PaymentStatus.paid ? "Marcar como pagado" : "Marcar como pendiente",
            style: "default",
            onPress: async () => {
              try {
                setSavingPay(true);
                await onSetPaymentStatus(itemId, status);
              } finally {
                setSavingPay(false);
              }
            },
          },
        ]
      );
      return;
    }

    // Web: menú simple (Alert también vale, pero esto se siente más “desktop”)
    Alert.alert(
      "Cambiar estado de pago",
      "Selecciona una opción",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Marcar como pendiente",
          onPress: async () => {
            try {
              setSavingPay(true);
              await onSetPaymentStatus(itemId, PaymentStatus.pending);
            } finally {
              setSavingPay(false);
            }
          },
        },
        {
          text: "Marcar como pagado",
          onPress: async () => {
            try {
              setSavingPay(true);
              await onSetPaymentStatus(itemId, PaymentStatus.paid);
            } finally {
              setSavingPay(false);
            }
          },
        },
      ]
    );
  }

const onTogglePayment = async () => {
  if (!onSetPaymentStatus || !itemId) return;
  const next = paymentStatus === PaymentStatus.paid ? PaymentStatus.pending : PaymentStatus.paid;

  try {
    setSavingPay(true);
    await onSetPaymentStatus(itemId, next);
  } finally {
    setSavingPay(false);
  }
};



  return (
    <Pressable
      onPress={onPress}
      onHoverIn={Platform.OS === "web" ? () => setHover(true) : undefined}
      onHoverOut={Platform.OS === "web" ? () => setHover(false) : undefined}
      style={({ pressed }) => [
        {
          paddingVertical: px(12),
          paddingHorizontal: px(10),
          borderRadius: px(14),
          backgroundColor: hover ? "rgba(148,163,184,0.10)" : "transparent",
          opacity: pressed ? 0.92 : 1,
          flexDirection: "row",
          alignItems: "center",
          gap: px(12),
        },
      ]}
    >
      <View
        style={{
          width: px(40),
          height: px(40),
          borderRadius: px(14),
          backgroundColor: def.badgeBg,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: "rgba(148,163,184,0.22)",
        }}
      >
        <Ionicons name={rowIcon} size={px(18)} color={def.accent} />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: fs(14), fontWeight: "700", color: UI.text }} numberOfLines={1}>
          {(item as any).title || ((item as any).type === "expense" ? "Gasto" : "Plan")}
        </Text>
        <Text style={{ marginTop: px(2), fontSize: fs(12), fontWeight: "600", color: UI.muted }} numberOfLines={1}>
          {def.label}
          {subtitle ? ` • ${subtitle}` : ""}
          {(item as any).startAt
            ? ` • ${new Date((item as any).startAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`
            : ""}
        </Text>
      </View>

      <View style={{ alignItems: "flex-end" }}>
        <Text style={{ fontSize: fs(14), fontWeight: "700", color: UI.text }}>{formatEuro(cost)}</Text>
<PaymentChip
  status={paymentStatus}
  px={px}
  fs={fs}
  disabled={!onSetPaymentStatus || savingPay || !itemId}
  onToggle={onTogglePayment}
/>

      </View>
    </Pressable>
  );
}

/** ✅ KPI */
function KpiMiniCard({
  def,
  spent,
  totalSpent,
  active,
  px,
  fs,
  onPress,
}: {
  def: BudgetDef;
  spent: number;
  totalSpent: number;
  active: boolean;
  px: (n: number) => number;
  fs: (n: number) => number;
  onPress: () => void;
}) {
  const pct = totalSpent > 0 ? (spent / totalSpent) * 100 : 0;
  const [hover, setHover] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={Platform.OS === "web" ? () => setHover(true) : undefined}
      onHoverOut={Platform.OS === "web" ? () => setHover(false) : undefined}
      style={({ pressed }) => [
        {
          flex: 1,
          minWidth: px(180),
          borderRadius: px(18),
          borderWidth: 1,
          borderColor: active ? "rgba(37,99,235,0.35)" : UI.border,
          backgroundColor: "white",
          padding: px(14),
          shadowColor: "#0B1220",
          shadowOpacity: 0.05,
          shadowRadius: px(18),
          shadowOffset: { width: 0, height: px(10) },
          transform: pressed ? [{ scale: 0.995 }] : undefined,
        },
        hover && !active ? { backgroundColor: "rgba(148,163,184,0.06)" } : null,
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <IconBadge icon={def.icon} bg={def.badgeBg} color={def.accent} px={px} />
        <Text style={{ fontSize: fs(12), fontWeight: "700", color: UI.muted, letterSpacing: 0.6 }} numberOfLines={1}>
          {def.label}
        </Text>
      </View>

      <Text style={{ marginTop: px(10), fontSize: fs(18), fontWeight: "800", color: UI.text }}>{formatEuro(spent)}</Text>

      <View style={{ marginTop: px(10) }}>
        <ProgressBar pct={pct} px={px} accent={def.accent} />
        <Text style={{ marginTop: px(8), fontSize: fs(11), fontWeight: "700", color: UI.muted2 }}>
          {totalSpent > 0 ? `${pct.toFixed(0)}% del total gastado` : "Aún sin gastos"}
        </Text>
      </View>
    </Pressable>
  );
}

function catLabel(cat: "all" | BudgetCategoryType): string {
  if (cat === "all") return "Todos";
  return BUDGET_DEFS.find((d) => d.key === cat)?.label ?? (cat === "other" ? "OTROS / FEES" : String(cat).toUpperCase());
}

export function BudgetSectionPanel({ trip, items, px, fs, onPressItem, onAddExpense , onSetPaymentStatus}: Props) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<"all" | BudgetCategoryType>("all");
  const [focus, setFocus] = useState(false);

  const entries = useMemo(() => {
    const withCost = (items || []).filter((i) => safeNumber((i as any).cost) > 0);
    const sorted = [...withCost].sort((a, b) => {
      const da = (a as any).startAt || (a as any).day || (a as any).date || "";
      const db = (b as any).startAt || (b as any).day || (b as any).date || "";
      return String(db).localeCompare(String(da));
    });
    return sorted;
  }, [items]);

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
      t[k] += safeNumber((it as any).cost);
    }
    return t;
  }, [entries]);

  const totalSpent = useMemo(() => {
    return entries.reduce((s, it) => s + safeNumber((it as any).cost), 0);
  }, [entries]);

  /** ✅ Icono KPI: Transporte principal (si hay vuelo -> avión; si no, según modo; default bus) */
  const transportMainKpiIcon = useMemo((): keyof typeof Ionicons.glyphMap => {
    const mainItems = entries.filter((i) => categoryForItem(i) === "transport_main");
    const hasFlight = mainItems.some((i) => i.type === "flight");
    if (hasFlight) return "airplane-outline";

    const dest = mainItems.find((i) => i.type === "transport_destination");
    if (dest) {
      const mode = (dest as any)?.destinationTransport?.mode as DestMode | undefined;
      return iconForDestinationMode(mode);
    }

    return "bus-outline";
  }, [entries]);

  /** ✅ Icono KPI: Transporte local (bus default) */
  const transportLocalKpiIcon = useMemo((): keyof typeof Ionicons.glyphMap => {
    const localItems = entries.filter((i) => categoryForItem(i) === "transport_local");
    return localItems.length ? "bus-outline" : "bus-outline";
  }, [entries]);

  /** ✅ Solo KPIs con gasto asociado */
  const visibleKpis = useMemo(() => {
    return BUDGET_DEFS.filter((d) => (totalsByCategory[d.key] || 0) > 0);
  }, [totalsByCategory]);

  const filtered = useMemo(() => {
    const q = norm(query);
    return entries.filter((it) => {
      const k = categoryForItem(it);
      if (cat !== "all" && k !== cat) return false;
      if (!q) return true;
      const hay = norm(`${(it as any).title || ""} ${(it as any).location || ""} ${(it as any).notes || ""}`);
      return hay.includes(q);
    });
  }, [entries, query, cat]);

  return (
    <View style={{ gap: px(14) }}>
      {/* KPI row (solo las que tengan gasto) */}
      {visibleKpis.length > 0 ? (
        <View style={{ flexDirection: "row", gap: px(12), flexWrap: "wrap" }}>
          {visibleKpis.map((def) => {
            const effectiveDef =
              def.key === "transport_main"
                ? { ...def, icon: transportMainKpiIcon }
                : def.key === "transport_local"
                  ? { ...def, icon: transportLocalKpiIcon }
                  : def;

            return (
              <KpiMiniCard
                key={def.key}
                def={effectiveDef}
                spent={totalsByCategory[def.key] || 0}
                totalSpent={totalSpent}
                active={cat === def.key}
                px={px}
                fs={fs}
                onPress={() => setCat((prev) => (prev === def.key ? "all" : def.key))}
              />
            );
          })}
        </View>
      ) : null}

      {/* Listado de Gastos */}
      <Card px={px} style={{ padding: px(16) }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: px(12) }}>
          <Text style={{ fontSize: fs(18), fontWeight: "700", color: UI.text }}>
            Listado de Gastos
            {cat !== "all" ? (
              <Text style={{ fontSize: fs(13), fontWeight: "700", color: UI.muted }}>
                {"  "}·{"  "}
                {catLabel(cat)}
              </Text>
            ) : null}
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center", gap: px(10) }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: px(8),
                paddingHorizontal: px(12),
                height: px(40),
                borderRadius: px(12),
                backgroundColor: "white",
                borderWidth: 1,
                borderColor: focus ? "rgba(37,99,235,0.35)" : "rgba(148,163,184,0.35)",
                minWidth: px(240),
              }}
            >
              <Ionicons name="search-outline" size={px(16)} color={UI.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar gasto…"
                placeholderTextColor={UI.muted2}
                onFocus={() => setFocus(true)}
                onBlur={() => setFocus(false)}
                style={{
                  flex: 1,
                  fontSize: fs(13),
                  fontWeight: "600",
                  color: UI.text,
                  outlineStyle: "none" as any,
                }}
              />
              {!!query && (
                <Pressable
                  onPress={() => setQuery("")}
                  style={({ hovered, pressed }) => [
                    {
                      width: px(28),
                      height: px(28),
                      borderRadius: px(10),
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: hovered ? "rgba(148,163,184,0.14)" : "transparent",
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <Ionicons name="close" size={px(16)} color={UI.muted} />
                </Pressable>
              )}
            </View>
          </View>
        </View>

        <View style={{ marginTop: px(12), height: 1, backgroundColor: "rgba(226,232,240,0.9)" }} />

        <View style={{ marginTop: px(6) }}>
          {filtered.length === 0 ? (
            <View style={{ paddingVertical: px(18), alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="receipt-outline" size={px(22)} color={UI.muted2} />
              <Text style={{ marginTop: px(8), fontSize: fs(13), fontWeight: "600", color: UI.muted }}>
                No hay gastos que coincidan.
              </Text>
            </View>
          ) : (
            filtered.map((it, idx) => (
              <View key={(it as any).id ?? `${idx}`}>
                <ExpenseRow item={it} px={px} fs={fs} onPress={onPressItem ? () => onPressItem(it) : undefined} onSetPaymentStatus={onSetPaymentStatus} />
                {idx < filtered.length - 1 && (
                  <View style={{ height: 1, backgroundColor: "rgba(226,232,240,0.75)", marginLeft: px(52) }} />
                )}
              </View>
            ))
          )}
        </View>
      </Card>
    </View>
  );
}
