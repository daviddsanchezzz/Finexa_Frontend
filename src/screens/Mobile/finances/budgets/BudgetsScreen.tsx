import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useBudgetData } from "../../../../hooks/useBudgetData";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../../../../components/AppHeader";
import AddButton from "../../../../components/AddButton";
import HeroBalanceCard from "../../../../components/HeroBalanceCard";
import StatsRow from "../../../../components/StatsRow";
import DateFilterModal from "../../../../components/DateFilterModal";
import { colors } from "../../../../theme/theme";
import BudgetGoalCard from "../../../../components/BudgetGoalCard";
import api from "../../../../api/api";
import { formatEuro as formatEuroBase } from "../../../../utils/currency";
import { BudgetsScreenSkeleton } from "../../../../components/skeletons/BudgetsScreenSkeleton";
import { budgetProgressColor, budgetSpentTextColor } from "../../../../utils/budgetProgressColor";

type PeriodType = "daily" | "weekly" | "monthly" | "yearly";

const formatEuro = (n: number) => `${formatEuroBase(n)} €`;

const capitalizeLabel = (label: string) => (label ? label.charAt(0).toUpperCase() + label.slice(1) : label);

const DATE_TYPE_TO_PERIOD: Record<string, PeriodType> = {
  day: "daily",
  week: "weekly",
  month: "monthly",
  year: "yearly",
};

function defaultLabelForPeriod(period: PeriodType, date: Date): string {
  switch (period) {
    case "daily": {
      const raw = date.toLocaleString("es-ES", { day: "2-digit", month: "long", year: "numeric" }).replace("de ", "");
      return capitalizeLabel(raw);
    }
    case "weekly": {
      const day = date.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const start = new Date(date);
      start.setDate(date.getDate() + diffToMonday);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const fmt = (d: Date) => d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
      return `${fmt(start)} - ${fmt(end)}`;
    }
    case "yearly":
      return `${date.getFullYear()}`;
    case "monthly":
    default: {
      const raw = date.toLocaleString("es-ES", { month: "long", year: "numeric" }).replace("de ", "");
      return capitalizeLabel(raw);
    }
  }
}

const PERIOD_NOUN: Record<PeriodType, string> = {
  daily: "día",
  weekly: "semana",
  monthly: "mes",
  yearly: "año",
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function startOfWeekMonday(d: Date) {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  x.setDate(x.getDate() + diff);
  return x;
}
function endOfWeekSunday(d: Date) {
  const s = startOfWeekMonday(d);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  return endOfDay(e);
}
function startOfMonth(d: Date) {
  return startOfDay(new Date(d.getFullYear(), d.getMonth(), 1));
}
function endOfMonth(d: Date) {
  return endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}
function startOfYear(d: Date) {
  return startOfDay(new Date(d.getFullYear(), 0, 1));
}
function endOfYear(d: Date) {
  return endOfDay(new Date(d.getFullYear(), 11, 31));
}

// Mismo cálculo de rango que usa el backend (computeRange en budgets.service.ts),
// replicado aquí para saber cuánto ha transcurrido del periodo sin otra llamada.
function computePeriodRange(period: PeriodType, ref: Date): { from: Date; to: Date } {
  switch (period) {
    case "daily":
      return { from: startOfDay(ref), to: endOfDay(ref) };
    case "weekly":
      return { from: startOfWeekMonday(ref), to: endOfWeekSunday(ref) };
    case "yearly":
      return { from: startOfYear(ref), to: endOfYear(ref) };
    case "monthly":
    default:
      return { from: startOfMonth(ref), to: endOfMonth(ref) };
  }
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function InsightRow({
  icon,
  tint,
  color,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  color: string;
  title: string;
  subtitle: string;
  onPress?: () => void;
}) {
  const Wrapper: any = onPress ? TouchableOpacity : View;
  return (
    <Wrapper onPress={onPress} activeOpacity={0.7} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8, gap: 12 }}>
      <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: tint, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={15} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13.5, fontWeight: "600", color: "#0F172A" }}>{title}</Text>
        <Text style={{ fontSize: 12, color: "#8A8F98", marginTop: 2 }}>{subtitle}</Text>
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={14} color="#D1D5DB" /> : null}
    </Wrapper>
  );
}

// Días restantes + ritmo de gasto recomendado, y qué porcentaje del periodo ya
// ha transcurrido — mismo estilo de fila que los "insights" de Estadísticas.
function PacingInsights({ from, to, period, remaining, spendProgress }: { from: Date; to: Date; period: PeriodType; remaining: number; spendProgress: number }) {
  const now = new Date();

  const totalMs = Math.max(to.getTime() - from.getTime(), MS_PER_DAY);
  const elapsedMs = Math.min(Math.max(now.getTime() - from.getTime(), 0), totalMs);
  const elapsedFraction = elapsedMs / totalMs;

  const daysRemaining = Math.max(1, Math.ceil((to.getTime() - now.getTime()) / MS_PER_DAY));
  const perDay = remaining / daysRemaining;

  const paceDelta = spendProgress - elapsedFraction;
  const paceColor = paceDelta > 0.15 ? colors.error : paceDelta > 0.05 ? colors.accent : colors.success;
  const paceSubtitle =
    paceDelta > 0.15
      ? "Gastas más rápido de lo previsto para este periodo."
      : paceDelta > 0.05
      ? "Vas ligeramente por delante del ritmo del periodo."
      : "Vas dentro de lo previsto para este periodo.";

  return (
    <View style={{ marginTop: 4, marginBottom: 8 }}>
      <InsightRow
        icon="calendar-outline"
        tint="#EFF3FF"
        color={colors.primary}
        title={`${daysRemaining} ${daysRemaining === 1 ? "día restante" : "días restantes"}`}
        subtitle={`${formatEuro(perDay)}/día disponibles para no pasarte.`}
      />
      <InsightRow
        icon="time-outline"
        tint={`${paceColor}1F`}
        color={paceColor}
        title={`${(elapsedFraction * 100).toFixed(1)}% del ${PERIOD_NOUN[period]} transcurrido`}
        subtitle={paceSubtitle}
      />
    </View>
  );
}

interface CategoryLimitItem {
  categoryId: number;
  category: { id: number; name: string; emoji?: string | null; color?: string | null } | null;
  limit: number;
  spent: number;
  remaining: number;
  progress: number;
}

interface BudgetFromApi {
  id: number;
  name: string | null;
  period: PeriodType;
  startDate: string;

  walletIds: number[];
  wallets: { id: number; name: string; emoji: string; currency: string }[];

  totalLimit: number | null;
  carryOverAmount: number;
  effectiveTotalLimit: number | null;
  globalSpent: number | null;
  globalRemaining: number | null;
  globalProgress: number | null;
  otherSpent: number | null;
  categoryLimits: CategoryLimitItem[];

  range?: { from: string; to: string };
}

interface OverviewResponse {
  period: PeriodType | null;
  date?: string;
  from?: string;
  to?: string;
  summary: {
    totalLimit: number;
    totalSpent: number;
    remaining: number;
    count: number;
  };
  budgets: BudgetFromApi[];
}

const getPeriodLabel = (period: PeriodType) => {
  switch (period) {
    case "daily":
      return "diario";
    case "weekly":
      return "semanal";
    case "monthly":
      return "mensual";
    case "yearly":
      return "anual";
    default:
      return "";
  }
};

export default function BudgetsHomeScreen({ navigation, isPinnedModuleTab = false }: any) {
  const [periodType, setPeriodType] = useState<PeriodType>("monthly");
  const [refDate, setRefDate] = useState<Date>(() => new Date());
  const [dateLabel, setDateLabel] = useState<string>(() => defaultLabelForPeriod("monthly", new Date()));
  const [dateModalVisible, setDateModalVisible] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  // periodStart solo identifica la caché (mismo mes = misma query); el valor
  // real que se envía al backend es refDate, NUNCA la medianoche exacta del
  // periodo: convertida a UTC puede caer en el día/mes anterior según el huso
  // horario del usuario, y el backend calculará el rango equivocado (p.ej.
  // agosto en vez de septiembre), mostrando 0 gastado. La pantalla de detalle
  // ya usa refDate y por eso nunca tiene este problema.
  const periodStart = computePeriodRange(periodType, refDate).from.toISOString();
  const overview = useBudgetData<OverviewResponse>(["overview", periodType, periodStart], async (signal) => {
    const res = await api.get<OverviewResponse>("/budgets/overview", { params: { period: periodType, date: refDate.toISOString() }, signal });
    return res.data;
  });
  const loading = overview.isPending;
  const budgets = overview.data?.budgets ?? [];
  const summary = overview.data?.summary ?? { totalLimit: 0, totalSpent: 0, remaining: 0, count: 0 };

  const handleSelectDate = useCallback((range: { from: string; to: string; label: string; type: string }) => {
    const mappedPeriod = DATE_TYPE_TO_PERIOD[range.type];
    if (mappedPeriod) setPeriodType(mappedPeriod);
    setRefDate(new Date(range.from));
    setDateLabel(capitalizeLabel(range.label));
  }, []);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await overview.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [overview.refetch]);

  const periodLabel = getPeriodLabel(periodType);

  const overallProgress = summary.totalLimit > 0
    ? Math.min(100, Math.max(0, (summary.totalSpent / summary.totalLimit) * 100))
    : 0;

  // Si tu backend devolviera budgets “mixed periods” (no debería si filtras por period),
  // filtramos por seguridad:
  const filteredBudgets = useMemo(
    () => budgets.filter((b) => b.period === periodType),
    [budgets, periodType]
  );

  const periodRange = useMemo(() => computePeriodRange(periodType, refDate), [periodType, refDate]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* HEADER */}
      <View className="px-5" style={{ marginBottom: -8 }}>
        <AppHeader
          title="Presupuestos"
          titleFontSize={18}
          showProfile={false}
          showBack={!isPinnedModuleTab}
          onOpenDateModal={() => setDateModalVisible(true)}
          dateLabel={dateLabel}
        />
      </View>

      {/* CONTENIDO */}
      {loading ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <BudgetsScreenSkeleton />
        </ScrollView>
      ) : (
        <View className="flex-1">
          <View style={{ flexDirection: "row", justifyContent: "flex-end", marginBottom: 6, paddingHorizontal: 20 }}>
            <AddButton label="Añadir" onPress={() => navigation.navigate("BudgetCreate", { periodType })} />
          </View>

          <View style={{ marginBottom: 16, paddingHorizontal: 20 }}>
            <HeroBalanceCard
              label="Disponible"
              value={formatEuro(summary.remaining)}
              style={{ marginBottom: 8 }}
              footer={
                <View style={{ width: "100%", marginTop: 8, alignItems: "center" }}>
                  <View
                    style={{
                      width: "100%",
                      height: 6,
                      borderRadius: 999,
                      backgroundColor: "rgba(255,255,255,0.25)",
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={{
                        height: "100%",
                        width: `${overallProgress}%`,
                        borderRadius: 999,
                        backgroundColor: "white",
                      }}
                    />
                  </View>
                  <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: "600", marginTop: 6, textAlign: "center" }} numberOfLines={1}>
                    {overallProgress.toFixed(0)}% gastado del presupuesto {periodLabel}
                  </Text>
                </View>
              }
            />

            <StatsRow
              items={[
                { key: "presupuesto", label: "PRESUPUESTO", value: formatEuro(summary.totalLimit) },
                { key: "gastado", label: "GASTADO", value: formatEuro(summary.totalSpent), color: budgetSpentTextColor(overallProgress / 100) },
              ]}
            />
          </View>

          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 20 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
          {filteredBudgets.length === 0 ? (
            <Text className="text-center text-gray-400 mt-16 text-sm">
              No tienes presupuestos para este periodo.
            </Text>
          ) : (
            filteredBudgets.flatMap((b) => {
              // Un mismo Budget puede aportar varias tarjetas a la lista: su
              // límite global (si existe) y uno por cada sublímite de categoría.
              // Todas apuntan al mismo budgetId, así que "editar" desde
              // cualquiera de ellas lleva siempre a la misma pantalla de edición.
              const title = b.name || "Presupuesto";

              const goToDetail = (categoryId?: number) =>
                navigation.navigate("BudgetTransactions", {
                  budgetId: b.id,
                  budgetName: title,
                  periodType,
                  date: refDate.toISOString(),
                  categoryId,
                });

              const rows: React.ReactNode[] = [];

              // El total global ya se ve arriba en el Hero, así que en la lista
              // solo mostramos una tarjeta aparte para él cuando no hay categorías
              // (si no, sería el único punto de entrada para editar ese budget).
              if (b.effectiveTotalLimit != null && b.categoryLimits.length === 0) {
                rows.push(
                  <View key={`${b.id}-global`}>
                    <BudgetGoalCard
                      title={title}
                      icon="💰"
                      total={b.effectiveTotalLimit}
                      current={b.globalSpent || 0}
                      color={colors.primary}
                      progressColor={budgetProgressColor(b.globalProgress || 0)}
                      onPress={() => goToDetail()}
                      compact
                      showOverflow
                      progressLabel="gastado"
                    />
                  </View>
                );
              }

              // Menos porcentaje restante (más gastado) primero: lo más urgente arriba.
              const sortedCategoryLimits = [...b.categoryLimits].sort((x, y) => y.progress - x.progress);

              for (const cl of sortedCategoryLimits) {
                rows.push(
                  <View key={`${b.id}-cat-${cl.categoryId}`}>
                    <BudgetGoalCard
                      title={cl.category?.name || "Categoría"}
                      icon={cl.category?.emoji || "💸"}
                      total={cl.limit}
                      current={cl.spent}
                      color={cl.category?.color || colors.primary}
                      progressColor={budgetProgressColor(cl.progress)}
                      onPress={() => goToDetail(cl.categoryId)}
                      compact
                      showOverflow
                      progressLabel="gastado"
                    />
                  </View>
                );
              }

              // Info discreta de cuánto del límite global está asignado a
              // categorías — NO es "disponible" (eso es lo que aún puedes
              // gastar); es la parte del global sin un sublímite específico.
              // Solo tiene sentido si hay límite global Y categorías.
              if (b.effectiveTotalLimit != null && b.categoryLimits.length > 0) {
                const assigned = b.categoryLimits.reduce((s, cl) => s + cl.limit, 0);
                const unassigned = Math.max(b.effectiveTotalLimit - assigned, 0);
                rows.push(
                  <Text key={`${b.id}-unassigned`} style={{ fontSize: 11.5, fontWeight: "600", color: "#94A3B8", paddingHorizontal: 4, marginTop: -4, marginBottom: 8 }}>
                    {formatEuro(assigned)} asignados a categorías · {formatEuro(unassigned)} sin asignar
                  </Text>
                );
              }

              return rows;
            })
          )}

          {summary.totalLimit > 0 ? (
            <PacingInsights
              from={periodRange.from}
              to={periodRange.to}
              period={periodType}
              remaining={summary.remaining}
              spendProgress={overallProgress / 100}
            />
          ) : null}
          </ScrollView>
        </View>
      )}

      <DateFilterModal
        visible={dateModalVisible}
        showCustomRange={false}
        showTotalRange={false}
        showDayRange
        onClose={() => setDateModalVisible(false)}
        onSelect={handleSelectDate}
      />
    </SafeAreaView>
  );
}
