// src/screens/Finances/RecurringTransactionsScreen.tsx
import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../../../theme/theme";
import AppHeader from "../../../../components/AppHeader";
import SegmentedTabs from "../../../../components/SegmentedTabs";
import SkeletonBox from "../../../../components/SkeletonBox";
import { EditingActionRow } from "../../../../components/creation";
import { formatEuro } from "../../../../utils/currency";
import { markTransactionsDirty } from "../../../../utils/transactionsInvalidation";
import { getRecurringStatus, RecurringStatus, RECURRING_STATUS_LABEL } from "../../../../utils/recurringStatus";
import { invalidateRecurringTransactions, useRecurringTransactionsQuery } from "../../../../hooks/useRecurringTransactionsQuery";
import RecurringDetailModal from "./RecurringDetailModal";

interface Category {
  id: number;
  name: string;
  emoji?: string | null;
  color?: string | null;
}

interface Subcategory {
  id: number;
  name: string;
}

interface RecurringTransaction {
  id: number;
  type: "income" | "expense" | "transfer";
  amount: number;
  description?: string | null;
  date: string;
  createdAt?: string | null;
  isRecurring: boolean;
  recurrence: "daily" | "weekly" | "monthly" | "yearly" | string | null;
  active: boolean;
  paused?: boolean | null;
  endDate?: string | null;
  category?: Category | null;
  subcategory?: Subcategory | null;
  wallet?: { name?: string; emoji?: string } | null;
  fromWallet?: { name?: string; emoji?: string } | null;
  toWallet?: { name?: string; emoji?: string } | null;
}

// Returns the days of the current month that the recurring transaction hits
function getDaysForTransaction(tx: RecurringTransaction, year: number, month: number): number[] {
  const nextDate = new Date(tx.date);
  if (isNaN(nextDate.getTime())) return [];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: number[] = [];

  switch (tx.recurrence) {
    case "daily":
      for (let d = 1; d <= daysInMonth; d++) days.push(d);
      break;
    case "weekly": {
      const dow = nextDate.getDay();
      for (let d = 1; d <= daysInMonth; d++) {
        if (new Date(year, month, d).getDay() === dow) days.push(d);
      }
      break;
    }
    case "monthly": {
      const dom = nextDate.getDate();
      if (dom <= daysInMonth) days.push(dom);
      break;
    }
    case "yearly": {
      if (nextDate.getFullYear() >= year && nextDate.getMonth() === month) {
        days.push(nextDate.getDate());
      }
      break;
    }
    default: {
      // single next occurrence in this month
      if (nextDate.getFullYear() === year && nextDate.getMonth() === month) {
        days.push(nextDate.getDate());
      }
      break;
    }
  }
  return days;
}

function buildCalendarMap(
  transactions: RecurringTransaction[],
  year: number,
  month: number
): Map<number, RecurringTransaction[]> {
  const map = new Map<number, RecurringTransaction[]>();
  for (const tx of transactions) {
    const days = getDaysForTransaction(tx, year, month);
    for (const d of days) {
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(tx);
    }
  }
  return map;
}

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

function CalendarView({
  transactions,
  year,
  month,
  selectedDay,
  onSelectDay,
}: {
  transactions: RecurringTransaction[];
  year: number;
  month: number;
  selectedDay: number | null;
  onSelectDay: (day: number | null) => void;
}) {
  const calendarMap = useMemo(
    () => buildCalendarMap(transactions, year, month),
    [transactions, year, month]
  );

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // Monday=0

  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <View>
      {/* Weekday headers */}
      <View style={{ flexDirection: "row", marginBottom: 8 }}>
        {WEEKDAYS.map((d) => (
          <View key={d} style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ fontSize: 12, color: "#9CA3AF", fontWeight: "700", letterSpacing: 0.3 }}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Grid */}
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {cells.map((day, i) => {
          if (day === null)
            return <View key={`e-${i}`} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />;

          const txs = calendarMap.get(day) || [];
          const hasIncome = txs.some((t) => t.type === "income");
          const hasExpense = txs.some((t) => t.type === "expense");
          const isSelected = selectedDay === day;
          const today = new Date();
          const isToday =
            today.getFullYear() === year &&
            today.getMonth() === month &&
            today.getDate() === day;

          return (
            <TouchableOpacity
              key={day}
              onPress={() => onSelectDay(isSelected ? null : day)}
              style={{
                width: `${100 / 7}%`,
                aspectRatio: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
              activeOpacity={0.7}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isSelected ? colors.primary : isToday ? `${colors.primary}16` : "transparent",
                  borderWidth: isToday && !isSelected ? 1.5 : 0,
                  borderColor: colors.primary,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: isToday || isSelected ? "700" : "500",
                    color: isSelected ? "white" : isToday ? colors.primary : "#374151",
                  }}
                >
                  {day}
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 3, marginTop: 4, height: 5 }}>
                {hasExpense && (
                  <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#DC2626" }} />
                )}
                {hasIncome && (
                  <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#16A34A" }} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// Card independiente con las transacciones del día seleccionado — se pinta
// fuera (debajo) de la card del calendario, no anidada dentro de ella.
function SelectedDayPanel({
  day,
  transactions,
  onClose,
  onPressItem,
}: {
  day: number;
  transactions: RecurringTransaction[];
  onClose: () => void;
  onPressItem: (tx: RecurringTransaction) => void;
}) {
  const label = transactions.length === 1 ? "transacción" : "transacciones";
  return (
    <View
      style={{
        marginTop: 12,
        backgroundColor: "white",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        overflow: "hidden",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 14,
          paddingVertical: 11,
          backgroundColor: "#F9FAFB",
          borderBottomWidth: 1,
          borderBottomColor: "#F3F4F6",
        }}
      >
        <Text style={{ flex: 1, fontSize: 13, fontWeight: "700", color: "#374151" }}>
          Día {day} · {transactions.length} {label}
        </Text>
        <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
          <Ionicons name="close" size={16} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
      {transactions.length === 0 ? (
        <View style={{ padding: 14 }}>
          <Text style={{ fontSize: 13, color: "#9CA3AF", textAlign: "center" }}>Sin transacciones</Text>
        </View>
      ) : (
        transactions.map((tx) => {
          const emoji = tx.type === "transfer" ? "🔄" : tx.category?.emoji || "💸";
          const name =
            tx.description?.trim() ||
            tx.subcategory?.name ||
            tx.category?.name ||
            "Transacción";
          const amtColor = tx.type === "income" ? "#16A34A" : tx.type === "expense" ? "#DC2626" : "#374151";
          const sign = tx.type === "income" ? "+" : tx.type === "expense" ? "-" : "";
          return (
            <TouchableOpacity
              key={tx.id}
              activeOpacity={0.7}
              onPress={() => onPressItem(tx)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: "#F9FAFB",
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                  backgroundColor: tx.type === "transfer" ? "#DBEAFE" : tx.category?.color || "#F3F4F6",
                }}
              >
                <Text style={{ fontSize: 16 }}>{emoji}</Text>
              </View>
              <Text style={{ flex: 1, fontSize: 13, color: "#374151" }} numberOfLines={1}>{name}</Text>
              <Text style={{ fontSize: 13, fontWeight: "700", color: amtColor }}>
                {sign}{formatEuro(tx.amount)} €
              </Text>
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );
}

export default function RecurringTransactionsScreen({ navigation, isPinnedModuleTab = false }: any) {
  const query = useRecurringTransactionsQuery();
  const transactions: RecurringTransaction[] = query.data ?? [];
  const loading = query.isPending;
  const refreshing = query.isFetching && !query.isPending;
  const [view, setView] = useState<"list" | "calendar">("list");
  const [statusFilter, setStatusFilter] = useState<RecurringStatus | "all">("active");
  const [selectedTx, setSelectedTx] = useState<RecurringTransaction | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const openDetail = (tx: RecurringTransaction) => { setSelectedTx(tx); setDetailVisible(true); };

  // Mantiene el detalle abierto en sincronía cuando la caché se refresca
  // (tras pausar/reanudar/eliminar), sin depender de que el modal reciba de
  // vuelta cada campo cambiado.
  useEffect(() => {
    if (!selectedTx) return;
    const fresh = transactions.find((t) => t.id === selectedTx.id);
    if (fresh && fresh !== selectedTx) setSelectedTx(fresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions]);

  const now = new Date();
  const [calYear] = useState(now.getFullYear());
  const [calMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const rawMonthLabel = new Date(calYear, calMonth, 1).toLocaleString("es-ES", {
    month: "long",
    year: "numeric",
  });
  // Solo la primera letra en mayúscula: "Septiembre de 2026", no "Septiembre De 2026".
  const monthLabel = rawMonthLabel.charAt(0).toUpperCase() + rawMonthLabel.slice(1);

  const calendarMap = useMemo(
    () => buildCalendarMap(transactions, calYear, calMonth),
    [transactions, calYear, calMonth]
  );

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Fecha corta para filas y resumen: sin año salvo que caiga fuera del año
  // en curso (p.ej. una anual con próxima ejecución el año que viene).
  const formatDateShort = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "Sin fecha";
    const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
    if (d.getFullYear() !== currentYear) options.year = "numeric";
    return d.toLocaleDateString("es-ES", options);
  };

  const formatRecurrence = (recurrence: RecurringTransaction["recurrence"]) => {
    switch (recurrence) {
      case "daily": return "Diaria";
      case "weekly": return "Semanal";
      case "monthly": return "Mensual";
      case "yearly": return "Anual";
      default: return "Recurrente";
    }
  };

  const getTypeColor = (type: RecurringTransaction["type"]) => {
    if (type === "income") return "#16A34A";
    if (type === "expense") return "#DC2626";
    return colors.text;
  };

  const getPrimaryText = (tx: RecurringTransaction) => {
    if (tx.type === "transfer") {
      return `${tx.fromWallet?.name || "Origen"}  →  ${tx.toWallet?.name || "Destino"}`;
    }
    if (tx.description?.trim()) return tx.description.trim();
    if (tx.subcategory?.name) return tx.subcategory.name;
    if (tx.category?.name) return tx.category.name;
    return "Transacción recurrente";
  };

  // En la lista agrupada por fecha (Activas), la fecha del próximo pago ya
  // se explica sola por la propia agrupación temporal. En las vistas planas
  // (Pausadas/Finalizadas/Todas) esa fecha suele estar obsoleta, así que en
  // su lugar se describe la duración de la serie.
  const getSecondaryText = (tx: RecurringTransaction, flat: boolean) => {
    if (!flat) return `${formatRecurrence(tx.recurrence)} · ${formatDateShort(tx.date)}`;
    const status = getRecurringStatus(tx, now);
    if (status !== "active") return `${formatRecurrence(tx.recurrence)} · ${RECURRING_STATUS_LABEL[status]}`;
    if (tx.endDate) return `${formatRecurrence(tx.recurrence)} · hasta ${formatDateShort(tx.endDate)}`;
    return `${formatRecurrence(tx.recurrence)} · indefinido`;
  };

  // Pausadas y finalizadas no van a ocurrir: no cuentan en el resumen ni en
  // el agrupado temporal, solo las activas.
  const activeTransactions = transactions.filter((tx) => getRecurringStatus(tx, now) === "active");
  const visibleTransactions =
    statusFilter === "all" ? transactions : transactions.filter((tx) => getRecurringStatus(tx, now) === statusFilter);

  // Agrupa por cercanía temporal: mes actual → "PRÓXIMOS", meses siguientes
  // del mismo año → su nombre, cualquier otro año → "MÁS ADELANTE". Como
  // `transactions` ya viene ordenado por fecha ascendente, basta con ir
  // añadiendo a cada grupo en el orden de aparición para que el resultado
  // quede cronológico.
  const groupKeyFor = (tx: RecurringTransaction) => {
    const d = new Date(tx.date);
    if (isNaN(d.getTime()) || d.getFullYear() !== currentYear) return "MÁS ADELANTE";
    if (d.getMonth() === currentMonth) return "PRÓXIMOS";
    return d.toLocaleDateString("es-ES", { month: "long" }).toUpperCase();
  };

  const groupedTransactions: [string, RecurringTransaction[]][] = [];
  for (const tx of activeTransactions) {
    const key = groupKeyFor(tx);
    const group = groupedTransactions.find(([label]) => label === key);
    if (group) group[1].push(tx);
    else groupedTransactions.push([key, [tx]]);
  }

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const monthTransactions = activeTransactions.filter((tx) => {
    const d = new Date(tx.date);
    return !isNaN(d.getTime()) && d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });
  const pagosPrevistos = monthTransactions
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + tx.amount, 0);
  const ingresosPrevistos = monthTransactions
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + tx.amount, 0);
  // Mismo criterio que recurringHubSummary (financeModuleSummaries.ts), para
  // que este número coincida con el que se ve en el hub de Finanzas.
  const nextPayment = activeTransactions.find(
    (tx) => tx.type === "expense" && new Date(tx.date).getTime() >= startOfToday.getTime()
  );

  const onRefresh = () => { void query.refetch(); };

  const renderIcon = (tx: RecurringTransaction) => {
    if (tx.type === "transfer") {
      return (
        <View className="w-10 h-10 bg-blue-100 rounded-lg items-center justify-center">
          <Ionicons name="swap-horizontal-outline" size={20} color="#2563eb" />
        </View>
      );
    }
    return (
      <View
        className="w-10 h-10 rounded-lg items-center justify-center"
        style={{ backgroundColor: tx.category?.color || "#f3f4f6" }}
      >
        <Text className="text-[18px]">{tx.category?.emoji || "💸"}</Text>
      </View>
    );
  };

  const renderAmount = (tx: RecurringTransaction) => {
    const color = getTypeColor(tx.type);
    const sign = tx.type === "income" ? "+" : tx.type === "expense" ? "-" : "";
    return (
      <Text className="text-[14px] font-semibold" style={{ color }}>
        {sign}{formatEuro(tx.amount)} €
      </Text>
    );
  };

  const RecurringRow = ({ tx, flat = false }: { tx: RecurringTransaction; flat?: boolean }) => (
    <View style={{ marginBottom: 6 }}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => openDetail(tx)}
        className="flex-row justify-between items-center py-1.5 px-1.5 bg-background rounded-xl"
      >
        <View className="flex-row items-center flex-1 pr-3">
          {renderIcon(tx)}
          <View className="ml-3 flex-1">
            <Text className="text-[14px] font-semibold text-text" numberOfLines={1}>
              {getPrimaryText(tx)}
            </Text>
            <Text className="text-gray-400 text-[10px]" numberOfLines={2}>
              {getSecondaryText(tx, flat)}
            </Text>
          </View>
        </View>
        {renderAmount(tx)}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: "#F3F4F6", paddingHorizontal: 20 }}>
      <View className="pb-2">
        <AppHeader
          title="Transacciones recurrentes"
          showProfile={false}
          showDatePicker={false}
          showBack={!isPinnedModuleTab}
        />
      </View>

      {/* View toggle */}
      <View style={{ marginBottom: view === "list" ? 8 : 12 }}>
        <SegmentedTabs<"list" | "calendar">
          dense
          options={[{ key: "list", label: "Lista" }, { key: "calendar", label: "Calendario" }]}
          value={view}
          onChange={setView}
        />
      </View>

      {view === "list" && (
        <View style={{ marginHorizontal: -20, marginBottom: 12 }}>
          <SegmentedTabs<RecurringStatus | "all">
            variant="underline"
            options={[
              { key: "active", label: "Activas" },
              { key: "paused", label: "Pausadas" },
              { key: "finished", label: "Finalizadas" },
              { key: "all", label: "Todas" },
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        </View>
      )}

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40, paddingTop: 4 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={{ marginTop: 4 }}>
            {[...Array(6)].map((_, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", marginBottom: 10, paddingHorizontal: 6 }}>
                <SkeletonBox width={40} height={40} borderRadius={10} style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <SkeletonBox height={13} width="58%" borderRadius={6} style={{ marginBottom: 6 }} />
                  <SkeletonBox height={10} width="38%" borderRadius={6} />
                </View>
                <SkeletonBox width={56} height={13} borderRadius={6} />
              </View>
            ))}
          </View>
        ) : query.isError ? (
          <View style={{ padding: 20 }}>
            <Text className="text-gray-400 text-[15px] text-center px-8">
              No se pudieron cargar las transacciones recurrentes.
            </Text>
            <EditingActionRow label="Reintentar" onPress={() => { void query.refetch(); }} />
          </View>
        ) : transactions.length === 0 ? (
          <View className="items-center mt-10">
            <Text className="text-gray-400 text-[15px] text-center px-8">
              No hay transacciones recurrentes todavía
            </Text>
          </View>
        ) : view === "list" && statusFilter === "active" ? (
          <View className="mt-3">
            <View
              style={{
                backgroundColor: "white",
                borderRadius: 18,
                borderWidth: 1,
                borderColor: "#E5E7EB",
                padding: 14,
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#9CA3AF", letterSpacing: 0.6, marginBottom: 10 }}>
                ESTE MES
              </Text>
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 13, color: "#6B7280" }}>Pagos previstos</Text>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: "#DC2626" }}>
                    {formatEuro(pagosPrevistos)} €
                  </Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 13, color: "#6B7280" }}>Ingresos previstos</Text>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: "#16A34A" }}>
                    {formatEuro(ingresosPrevistos)} €
                  </Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 13, color: "#6B7280" }}>Próximo pago</Text>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: "#111827" }}>
                    {nextPayment ? `${formatEuro(nextPayment.amount)} €` : "—"}
                  </Text>
                </View>
              </View>
            </View>

            {groupedTransactions.map(([label, txs], i) => (
              <View key={label}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: "#9CA3AF",
                    letterSpacing: 0.6,
                    marginTop: i === 0 ? 0 : 14,
                    marginBottom: 6,
                  }}
                >
                  {label}
                </Text>
                {txs.map((tx) => (
                  <RecurringRow key={tx.id} tx={tx} />
                ))}
              </View>
            ))}
          </View>
        ) : view === "list" ? (
          <View className="mt-3">
            {visibleTransactions.length === 0 ? (
              <Text className="text-center text-gray-400 mt-10 text-sm">
                No hay recurrentes {statusFilter === "paused" ? "pausadas" : statusFilter === "finished" ? "finalizadas" : "todavía"}.
              </Text>
            ) : (
              visibleTransactions.map((tx) => <RecurringRow key={tx.id} tx={tx} flat />)
            )}
          </View>
        ) : (
          <View style={{ marginTop: 4 }}>
            <View
              style={{
                backgroundColor: "white",
                borderRadius: 18,
                borderWidth: 1,
                borderColor: "#E5E7EB",
                padding: 16,
                shadowColor: "#000",
                shadowOpacity: 0.04,
                shadowRadius: 6,
                elevation: 1,
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "700",
                  color: "#111827",
                  marginBottom: 14,
                  textAlign: "center",
                }}
              >
                {monthLabel}
              </Text>
              <CalendarView
                transactions={transactions}
                year={calYear}
                month={calMonth}
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
              />
            </View>
            {selectedDay !== null && (
              <SelectedDayPanel
                day={selectedDay}
                transactions={calendarMap.get(selectedDay) || []}
                onClose={() => setSelectedDay(null)}
                onPressItem={openDetail}
              />
            )}
          </View>
        )}
      </ScrollView>

      <RecurringDetailModal
        visible={detailVisible}
        transaction={selectedTx}
        navigation={navigation}
        onClose={() => setDetailVisible(false)}
        // Pausar/reanudar no cambia saldos: solo invalida la caché de
        // recurrentes. Eliminar sí revierte saldos de las ocurrencias ya
        // generadas, así que usa el mismo aviso global que Añadir/Editar/
        // Eliminar en el resto de la app (markTransactionsDirty), que a su
        // vez ya invalida esta caché por la suscripción del hook.
        onChanged={() => invalidateRecurringTransactions()}
        onDeleted={() => {
          setDetailVisible(false);
          markTransactionsDirty();
        }}
      />
    </SafeAreaView>
  );
}
