import React, { useMemo, useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path, Circle } from "react-native-svg";
import api from "../../../api/api";
import { colors } from "../../../theme/theme";

type TxType = "income" | "expense" | "transfer";

interface Transaction {
  id?: number;
  date: string;
  amount: number;
  type: TxType;
  isRecurring?: boolean;
  active?: boolean;
  excludeFromStats?: boolean;
}

interface ManualMonthRow {
  year: number;
  month: number; // 0-11
  income?: number | null;
  expense?: number | null;
  finalBalance?: number | null;
}

interface MonthSummary {
  monthIndex: number;
  monthName: string;
  income: number;
  expense: number;
  saving: number;
  finalAmount: number;
  finished: boolean;
  hasOverride: boolean;
}

interface YearSummary {
  year: number;
  income: number;
  expense: number;
  saving: number;
  finalAmount: number;
  finished: boolean;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function normMoney(n: number) {
  return Number.isFinite(n) ? n : 0;
}

function formatEuro(n: number) {
  const v = normMoney(n);
  return v.toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatMonthShort(y: number, m: number) {
  return new Date(y, m, 1).toLocaleDateString("es-ES", { month: "short", year: "2-digit" });
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function buildLinePath(points: { x: number; y: number }[]) {
  if (!points.length) return "";
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");
}

function filterForStats(list: any[]) {
  return (list || [])
    .filter((tx: any) => tx.type !== "transfer")
    .filter((tx: any) => tx.isRecurring === false)
    .filter((tx: any) => tx.active !== false)
    .filter((tx: any) => tx.excludeFromStats !== true);
}

function Card({
  title,
  right,
  children,
  noPadding,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  noPadding?: boolean;
}) {
  return (
    <View
      style={{
        backgroundColor: "white",
        borderRadius: 22,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        overflow: "hidden",
      }}
    >
      <View
        style={{
          padding: 16,
          paddingBottom: noPadding ? 10 : 12,
          borderBottomWidth: 1,
          borderBottomColor: "#E5E7EB",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: "900", color: "#94A3B8" }}>{title}</Text>
        {!!right && <View>{right}</View>}
      </View>
      <View style={{ padding: noPadding ? 0 : 16 }}>{children}</View>
    </View>
  );
}

function KPI({
  label,
  value,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "success" | "danger" | "info";
  icon: keyof typeof Ionicons.glyphMap;
}) {
  const palette = {
    neutral: { accent: colors.primary, icon: "#0F172A", bg: "rgba(37,99,235,0.08)" },
    success: { accent: "#22C55E", icon: "#16A34A", bg: "rgba(34,197,94,0.10)" },
    danger: { accent: "#EF4444", icon: "#DC2626", bg: "rgba(239,68,68,0.10)" },
    info: { accent: "#3B82F6", icon: "#2563EB", bg: "rgba(59,130,246,0.10)" },
  }[tone];

  return (
    <View
      style={{
        flex: 1,
        minWidth: 220,
        backgroundColor: "white",
        borderRadius: 22,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        overflow: "hidden",
      }}
    >
      <View style={{ height: 6, backgroundColor: palette.accent }} />
      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 11, fontWeight: "900", color: "#94A3B8" }}>{label}</Text>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: palette.bg,
              borderWidth: 1,
              borderColor: "#E5E7EB",
            }}
          >
            <Ionicons name={icon} size={18} color={palette.icon} />
          </View>
        </View>
        <Text style={{ marginTop: 10, fontSize: 18, fontWeight: "900", color: "#0F172A" }} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

export default function RegisterScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [manualData, setManualData] = useState<
    Record<number, Record<number, { income?: number; expense?: number; finalBalance?: number }>>
  >({});

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);

      const [txRes, manualRes] = await Promise.all([api.get("/transactions"), api.get("/manual-month")]);

      const filtered = filterForStats(txRes.data || []).filter(
        (tx: any) => tx.type === "income" || tx.type === "expense"
      );

      setTransactions(filtered);

      const map: Record<number, Record<number, { income?: number; expense?: number; finalBalance?: number }>> = {};
      (manualRes.data || []).forEach((row: ManualMonthRow) => {
        if (!map[row.year]) map[row.year] = {};
        map[row.year][row.month] = {
          income: row.income ?? undefined,
          expense: row.expense ?? undefined,
          finalBalance: row.finalBalance ?? undefined,
        };
      });
      setManualData(map);
    } catch (e) {
      console.log("❌ Error cargando registros:", e);
      setTransactions([]);
      setManualData({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    const unsub = navigation?.addListener?.("focus", () => loadAll());
    return unsub;
  }, [navigation, loadAll]);

  // ====== Computations ======
  const monthNames = useMemo(
    () => ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
    []
  );

  const { yearsSorted, monthsByYear, globalYears, wealthSeries } = useMemo(() => {
    // Aggregate tx by year/month
    const perYearMonth: Record<number, { income: number[]; expense: number[] }> = {};

    for (const tx of transactions) {
      if (tx.type !== "income" && tx.type !== "expense") continue;
      const d = new Date(tx.date);
      const y = d.getFullYear();
      const m = d.getMonth();

      if (!perYearMonth[y]) {
        perYearMonth[y] = { income: new Array(12).fill(0), expense: new Array(12).fill(0) };
      }

      if (tx.type === "income") perYearMonth[y].income[m] += Math.abs(tx.amount);
      if (tx.type === "expense") perYearMonth[y].expense[m] += Math.abs(tx.amount);
    }

    // years bounds (include manual overrides)
    let minYear = currentYear;
    let hasAny = false;

    for (const yStr of Object.keys(perYearMonth)) {
      minYear = Math.min(minYear, Number(yStr));
      hasAny = true;
    }
    for (const yStr of Object.keys(manualData)) {
      minYear = Math.min(minYear, Number(yStr));
      hasAny = true;
    }

    const maxYear = currentYear;
    const yearsSorted: number[] = [];
    if (hasAny) {
      for (let y = minYear; y <= maxYear; y++) yearsSorted.push(y);
    } else {
      yearsSorted.push(currentYear);
    }

    // Build month summaries with running balance (initialBalance = 0)
    let running = 0;
    const monthsByYear: Record<number, MonthSummary[]> = {};
    const globalYears: YearSummary[] = [];

    yearsSorted.forEach((y) => {
      const d = perYearMonth[y] ?? { income: new Array(12).fill(0), expense: new Array(12).fill(0) };

      let yearIncome = 0;
      let yearExpense = 0;
      let lastFinal: number | null = null;

      const months: MonthSummary[] = new Array(12).fill(null).map((_, m) => {
        const isPastYear = y < currentYear;
        const isCurrentYear = y === currentYear;
        const finished = isPastYear || (isCurrentYear && m < currentMonth);

        const override = manualData[y]?.[m];
        const hasOverride = !!override && (override.income !== undefined || override.expense !== undefined || override.finalBalance !== undefined);

        const txIncome = d.income[m] ?? 0;
        const txExpense = d.expense[m] ?? 0;

        // Only show finished months; unfinished months = 0
        const income =
          override?.income !== undefined ? override.income : finished ? txIncome : 0;

        const expense =
          override?.expense !== undefined ? override.expense : finished ? txExpense : 0;

        const saving = income - expense;

        let finalAmount = 0;

        if (finished) {
          yearIncome += income;
          yearExpense += expense;

          if (override?.finalBalance !== undefined && override?.finalBalance !== null) {
            running = override.finalBalance;
          } else {
            running = running + saving;
          }

          finalAmount = running;
          lastFinal = finalAmount;
        }

        return {
          monthIndex: m,
          monthName: monthNames[m],
          income,
          expense,
          saving,
          finalAmount,
          finished,
          hasOverride,
        };
      });

      monthsByYear[y] = months;

      const fullYearFinished = y < currentYear;
      const saving = yearIncome - yearExpense;
      const finalAmount = lastFinal ?? 0;

      globalYears.push({
        year: y,
        income: fullYearFinished ? yearIncome : 0,
        expense: fullYearFinished ? yearExpense : 0,
        saving: fullYearFinished ? saving : 0,
        finalAmount: fullYearFinished ? finalAmount : 0,
        finished: fullYearFinished,
      });
    });

    // Wealth series: finished months only
    const wealthSeries: { year: number; month: number; label: string; finalAmount: number }[] = [];
    const years = Object.keys(monthsByYear).map(Number).sort((a, b) => a - b);

    for (const y of years) {
      const arr = monthsByYear[y] || [];
      for (const m of arr) {
        if (!m.finished) continue;
        wealthSeries.push({
          year: y,
          month: m.monthIndex,
          label: formatMonthShort(y, m.monthIndex),
          finalAmount: m.finalAmount,
        });
      }
    }

    wealthSeries.sort((a, b) => (a.year - b.year) || (a.month - b.month));

    // dedupe
    const seen = new Set<string>();
    const deduped = wealthSeries.filter((r) => {
      const k = `${r.year}-${r.month}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    return { yearsSorted, monthsByYear, globalYears, wealthSeries: deduped };
  }, [transactions, manualData, currentYear, currentMonth, monthNames]);

  // Ensure selectedYear exists in yearsSorted (in case empty data)
  useEffect(() => {
    if (!yearsSorted.includes(selectedYear)) setSelectedYear(yearsSorted[yearsSorted.length - 1] ?? currentYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearsSorted.join("|")]);

  const yearMonths = useMemo(() => monthsByYear[selectedYear] || [], [monthsByYear, selectedYear]);

  const yearFinishedMonths = useMemo(() => yearMonths.filter((m) => m.finished), [yearMonths]);

  const totalYearIncome = useMemo(() => yearFinishedMonths.reduce((s, m) => s + m.income, 0), [yearFinishedMonths]);
  const totalYearExpense = useMemo(() => yearFinishedMonths.reduce((s, m) => s + m.expense, 0), [yearFinishedMonths]);
  const totalYearSaving = useMemo(() => yearFinishedMonths.reduce((s, m) => s + m.saving, 0), [yearFinishedMonths]);
  const totalYearFinal = useMemo(
    () => (yearFinishedMonths.length ? yearFinishedMonths[yearFinishedMonths.length - 1].finalAmount : 0),
    [yearFinishedMonths]
  );

  const finishedYears = useMemo(() => globalYears.filter((y) => y.finished), [globalYears]);
  const totalGlobalIncome = useMemo(() => finishedYears.reduce((s, y) => s + y.income, 0), [finishedYears]);
  const totalGlobalExpense = useMemo(() => finishedYears.reduce((s, y) => s + y.expense, 0), [finishedYears]);
  const totalGlobalSaving = useMemo(() => finishedYears.reduce((s, y) => s + y.saving, 0), [finishedYears]);
  const totalGlobalFinal = useMemo(
    () => (finishedYears.length ? finishedYears[finishedYears.length - 1].finalAmount : 0),
    [finishedYears]
  );

  // Wealth chart mapping (fixed width tuned for desktop; adapts if wrapper smaller)
  const [chartWidth, setChartWidth] = useState(860);

  const wealthChart = useMemo(() => {
    if (!wealthSeries.length || chartWidth <= 0) return null;

    const values = wealthSeries.map((p) => p.finalAmount);
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const span = maxV - minV || 1;

    const H = 160;
    const padX = 12;
    const padY = 14;
    const W = chartWidth;

    const step = wealthSeries.length > 1 ? (W - padX * 2) / (wealthSeries.length - 1) : 0;

    const mapped = wealthSeries.map((p, i) => {
      const x = padX + i * step;
      const t = (p.finalAmount - minV) / span;
      const y = padY + (1 - t) * (H - padY * 2);
      return { ...p, x, y };
    });

    const path = buildLinePath(mapped.map((m) => ({ x: m.x, y: m.y })));
    const first = mapped[0];
    const last = mapped[mapped.length - 1];
    const delta = last.finalAmount - first.finalAmount;

    return { W, H, mapped, path, minV, maxV, delta };
  }, [wealthSeries, chartWidth]);

  // ====== UI constants ======
  const COL_MONTH = 150;
  const COL = 140;
  const COL_FINAL = 160;

  const WIDE = useMemo(() => {
    // “desktop grande”
    return true;
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background ?? "#F8FAFC", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background ?? "#F8FAFC" }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 18, paddingBottom: 90 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <View>
            <Text style={{ fontSize: 18, fontWeight: "900", color: "#0F172A" }}>Resumen histórico de ingresos y gastos </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={loadAll}
              style={{
                height: 40,
                paddingHorizontal: 12,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "#E5E7EB",
                backgroundColor: "white",
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Ionicons name="refresh-outline" size={18} color="#0F172A" />
              <Text style={{ fontSize: 12, fontWeight: "900", color: "#0F172A" }}>Actualizar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => navigation.navigate("EditMonth", { mode: "select" })}
              style={{
                height: 40,
                paddingHorizontal: 12,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "#E5E7EB",
                backgroundColor: "white",
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Ionicons name="add-outline" size={18} color={colors.primary} />
              <Text style={{ fontSize: 12, fontWeight: "900", color: "#0F172A" }}>Añadir mes manual</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* KPI row (selected year) */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
          <KPI label={`Ingresos ${selectedYear}`} value={formatEuro(totalYearIncome)} tone="success" icon="arrow-up-outline" />
          <KPI label={`Gastos ${selectedYear}`} value={formatEuro(totalYearExpense)} tone="danger" icon="arrow-down-outline" />
          <KPI
            label={`Ahorro ${selectedYear}`}
            value={formatEuro(totalYearSaving)}
            tone={totalYearSaving >= 0 ? "info" : "danger"}
            icon="stats-chart-outline"
          />
          <KPI label={`Saldo fin ${selectedYear}`} value={yearFinishedMonths.length ? formatEuro(totalYearFinal) : "—"} tone="neutral" icon="briefcase-outline" />
        </View>

        {/* Layout 2 columns */}
        <View style={{ flexDirection: WIDE ? "row" : "column", gap: 12 }}>
          {/* MAIN */}
          <View style={{ flex: 1, minWidth: 760, gap: 12 }}>
            {/* Year selector + months table */}
            <Card
              title="Resumen por meses"
              right={
                Platform.OS === "web" ? (
                  // @ts-ignore
                  <select
                    value={String(selectedYear)}
                    onChange={(e: any) => setSelectedYear(Number(e?.target?.value))}
                    style={{
                      height: 36,
                      borderRadius: 12,
                      border: "1px solid #E5E7EB",
                      padding: "0 10px",
                      fontSize: 13,
                      background: "white",
                      outline: "none",
                      fontWeight: 800,
                      color: "#0F172A",
                      minWidth: 120,
                    }}
                  >
                    {yearsSorted
                      .slice()
                      .sort((a, b) => b - a)
                      .map((y) => (
                        <option key={y} value={String(y)}>
                          {y}
                        </option>
                      ))}
                  </select>
                ) : (
                  <Text style={{ fontSize: 12, fontWeight: "900", color: "#0F172A" }}>{selectedYear}</Text>
                )
              }
              noPadding
            >
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 14 }}>
                <View>
                  {/* Header */}
                  <View
                    style={{
                      flexDirection: "row",
                      paddingVertical: 10,
                      paddingHorizontal: 10,
                      backgroundColor: "rgba(15,23,42,0.04)",
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                    }}
                  >
                    <Text style={{ width: COL_MONTH, fontSize: 12, fontWeight: "900", color: "#64748B" }}>Mes</Text>
                    <Text style={{ width: COL, textAlign: "center", fontSize: 12, fontWeight: "900", color: "#64748B" }}>
                      Ingresos
                    </Text>
                    <Text style={{ width: COL, textAlign: "center", fontSize: 12, fontWeight: "900", color: "#64748B" }}>
                      Gastos
                    </Text>
                    <Text style={{ width: COL, textAlign: "center", fontSize: 12, fontWeight: "900", color: "#64748B" }}>
                      Ahorro
                    </Text>
                    <Text style={{ width: COL_FINAL, textAlign: "center", fontSize: 12, fontWeight: "900", color: "#64748B" }}>
                      Saldo final
                    </Text>
                  </View>

                  {/* Rows */}
                  {yearMonths.map((m) => {
                    const savingColor = !m.finished ? "#94A3B8" : m.saving >= 0 ? "#16A34A" : "#DC2626";

                    return (
                      <TouchableOpacity
                        key={m.monthIndex}
                        activeOpacity={0.85}
                        onPress={() => {
                          if (!m.finished) return;
                          navigation.navigate("EditMonth", {
                            year: selectedYear,
                            month: m.monthIndex,
                            monthName: m.monthName,
                            currentValues: manualData[selectedYear]?.[m.monthIndex] || {},
                          });
                        }}
                        style={{
                          flexDirection: "row",
                          paddingVertical: 12,
                          paddingHorizontal: 10,
                          borderBottomWidth: 1,
                          borderBottomColor: "#F1F5F9",
                          opacity: m.finished ? 1 : 0.45,
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ width: COL_MONTH, fontSize: 13, fontWeight: "900", color: "#0F172A" }}>
                          {m.monthName}
                        </Text>

                        <Text style={{ width: COL, textAlign: "center", fontSize: 13, fontWeight: "800", color: "#0F172A" }}>
                          {m.finished ? formatEuro(m.income) : "—"}
                        </Text>

                        <Text style={{ width: COL, textAlign: "center", fontSize: 13, fontWeight: "800", color: "#0F172A" }}>
                          {m.finished ? formatEuro(m.expense) : "—"}
                        </Text>

                        <Text style={{ width: COL, textAlign: "center", fontSize: 13, fontWeight: "900", color: savingColor }}>
                          {m.finished ? formatEuro(m.saving) : "—"}
                        </Text>

                        <Text style={{ width: COL_FINAL, textAlign: "center", fontSize: 13, fontWeight: "900", color: "#0F172A" }}>
                          {m.finished ? formatEuro(m.finalAmount) : "—"}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}

                  {/* Totals */}
                  <View
                    style={{
                      flexDirection: "row",
                      paddingVertical: 12,
                      paddingHorizontal: 10,
                      marginTop: 6,
                      backgroundColor: "rgba(15,23,42,0.04)",
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ width: COL_MONTH, fontSize: 13, fontWeight: "900", color: "#0F172A" }}>TOTAL</Text>

                    <Text style={{ width: COL, textAlign: "center", fontSize: 13, fontWeight: "900", color: "#0F172A" }}>
                      {formatEuro(totalYearIncome)}
                    </Text>

                    <Text style={{ width: COL, textAlign: "center", fontSize: 13, fontWeight: "900", color: "#0F172A" }}>
                      {formatEuro(totalYearExpense)}
                    </Text>

                    <Text
                      style={{
                        width: COL,
                        textAlign: "center",
                        fontSize: 13,
                        fontWeight: "900",
                        color: totalYearSaving >= 0 ? "#16A34A" : "#DC2626",
                      }}
                    >
                      {formatEuro(totalYearSaving)}
                    </Text>

                    <Text style={{ width: COL_FINAL, textAlign: "center", fontSize: 13, fontWeight: "900", color: "#0F172A" }}>
                      {yearFinishedMonths.length ? formatEuro(totalYearFinal) : "—"}
                    </Text>
                  </View>
                </View>
              </ScrollView>

            </Card>

            {/* Wealth */}
            <Card
              title="Evolución del patrimonio"
              right={
                <Text style={{ fontSize: 12, fontWeight: "900", color: "#0F172A" }}>
                  {wealthSeries.length ? `${wealthSeries[0].label} → ${wealthSeries[wealthSeries.length - 1].label}` : "—"}
                </Text>
              }
            >
              <View
                style={{
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  backgroundColor: "#F8FAFC",
                  padding: 14,
                }}
                onLayout={(e) => {
                  const w = e?.nativeEvent?.layout?.width;
                  if (w && w > 0) setChartWidth(Math.max(420, Math.floor(w - 28)));
                }}
              >
                {!wealthChart ? (
                  <Text style={{ fontSize: 12, fontWeight: "800", color: "#94A3B8" }}>
                    No hay suficientes datos para dibujar la gráfica.
                  </Text>
                ) : (
                  <>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
                      <View>
                        <Text style={{ fontSize: 11, fontWeight: "800", color: "#94A3B8" }}>Último saldo</Text>
                        <Text style={{ marginTop: 4, fontSize: 22, fontWeight: "900", color: "#0F172A" }}>
                          {formatEuro(wealthChart.mapped[wealthChart.mapped.length - 1].finalAmount)}
                        </Text>
                      </View>

                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={{ fontSize: 11, fontWeight: "800", color: "#94A3B8" }}>Variación total</Text>
                        <Text
                          style={{
                            marginTop: 4,
                            fontSize: 14,
                            fontWeight: "900",
                            color: wealthChart.delta >= 0 ? "#16A34A" : "#DC2626",
                          }}
                        >
                          {formatEuro(wealthChart.delta)}
                        </Text>
                      </View>
                    </View>

                    <View style={{ marginTop: 12, borderRadius: 16, overflow: "hidden" }}>
                      <Svg width="100%" height={wealthChart.H} viewBox={`0 0 ${wealthChart.W} ${wealthChart.H}`}>
                        <Path d={wealthChart.path} stroke={colors.primary} strokeWidth="3" fill="none" />
                        <Circle
                          cx={wealthChart.mapped[wealthChart.mapped.length - 1].x}
                          cy={wealthChart.mapped[wealthChart.mapped.length - 1].y}
                          r="4"
                          fill={colors.primary}
                        />
                      </Svg>

                      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 6, marginTop: 6 }}>
                        <Text style={{ fontSize: 11, fontWeight: "800", color: "#94A3B8" }}>{wealthChart.mapped[0].label}</Text>
                        <Text style={{ fontSize: 11, fontWeight: "800", color: "#94A3B8" }}>
                          Máx: {formatEuro(wealthChart.maxV)}
                        </Text>
                      </View>
                    </View>
                  </>
                )}
              </View>
            </Card>
          </View>

          {/* SIDEBAR */}
          <View style={{ width: 750, gap: 12 }}>
            <Card title="Resumen global (años)" noPadding>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 14 }}>
                <View>
                  {/* Header */}
                  <View
                    style={{
                      flexDirection: "row",
                      paddingVertical: 10,
                      paddingHorizontal: 10,
                      backgroundColor: "rgba(15,23,42,0.04)",
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                    }}
                  >
                    <Text style={{ width: 90, fontSize: 12, fontWeight: "900", color: "#64748B" }}>Año</Text>
                    <Text style={{ width: 140, textAlign: "center", fontSize: 12, fontWeight: "900", color: "#64748B" }}>Ingresos</Text>
                    <Text style={{ width: 140, textAlign: "center", fontSize: 12, fontWeight: "900", color: "#64748B" }}>Gastos</Text>
                    <Text style={{ width: 140, textAlign: "center", fontSize: 12, fontWeight: "900", color: "#64748B" }}>Ahorro</Text>
                    <Text style={{ width: 160, textAlign: "center", fontSize: 12, fontWeight: "900", color: "#64748B" }}>Saldo final</Text>
                  </View>

                  {globalYears
                    .slice()
                    .sort((a, b) => b.year - a.year)
                    .map((y) => {
                      const isSelected = selectedYear === y.year;
                      const savingColor = !y.finished ? "#94A3B8" : y.saving >= 0 ? "#16A34A" : "#DC2626";

                      return (
                        <TouchableOpacity
                          key={y.year}
                          activeOpacity={0.9}
                          onPress={() => setSelectedYear(y.year)}
                          style={{
                            flexDirection: "row",
                            paddingVertical: 12,
                            paddingHorizontal: 10,
                            borderBottomWidth: 1,
                            borderBottomColor: "#F1F5F9",
                            backgroundColor: isSelected ? "rgba(59,130,246,0.07)" : "transparent",
                            borderRadius: 14,
                            marginTop: 6,
                            alignItems: "center",
                          }}
                        >
                          <Text style={{ width: 90, fontSize: 13, fontWeight: "900", color: "#0F172A" }}>{y.year}</Text>

                          <Text style={{ width: 140, textAlign: "center", fontSize: 13, fontWeight: "800", color: "#0F172A" }}>
                            {y.finished ? formatEuro(y.income) : "—"}
                          </Text>

                          <Text style={{ width: 140, textAlign: "center", fontSize: 13, fontWeight: "800", color: "#0F172A" }}>
                            {y.finished ? formatEuro(y.expense) : "—"}
                          </Text>

                          <Text style={{ width: 140, textAlign: "center", fontSize: 13, fontWeight: "900", color: savingColor }}>
                            {y.finished ? formatEuro(y.saving) : "—"}
                          </Text>

                          <Text style={{ width: 160, textAlign: "center", fontSize: 13, fontWeight: "900", color: "#0F172A" }}>
                            {y.finished ? formatEuro(y.finalAmount) : "—"}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}

                  {/* Totals */}
                  <View
                    style={{
                      flexDirection: "row",
                      paddingVertical: 12,
                      paddingHorizontal: 10,
                      marginTop: 8,
                      backgroundColor: "rgba(15,23,42,0.04)",
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ width: 90, fontSize: 13, fontWeight: "900", color: "#0F172A" }}>TOTAL</Text>
                    <Text style={{ width: 140, textAlign: "center", fontSize: 13, fontWeight: "900", color: "#0F172A" }}>
                      {formatEuro(totalGlobalIncome)}
                    </Text>
                    <Text style={{ width: 140, textAlign: "center", fontSize: 13, fontWeight: "900", color: "#0F172A" }}>
                      {formatEuro(totalGlobalExpense)}
                    </Text>
                    <Text
                      style={{
                        width: 140,
                        textAlign: "center",
                        fontSize: 13,
                        fontWeight: "900",
                        color: totalGlobalSaving >= 0 ? "#16A34A" : "#DC2626",
                      }}
                    >
                      {formatEuro(totalGlobalSaving)}
                    </Text>
                    <Text style={{ width: 160, textAlign: "center", fontSize: 13, fontWeight: "900", color: "#0F172A" }}>
                      {finishedYears.length ? formatEuro(totalGlobalFinal) : "—"}
                    </Text>
                  </View>
                </View>
              </ScrollView>

              <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8" }}>
                  Solo se computan años terminados. Click en un año para ver su detalle mensual.
                </Text>
              </View>
            </Card>

            <Card title="Acciones rápidas">
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => navigation.navigate("EditMonth", { mode: "select" })}
                style={{
                  height: 44,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  backgroundColor: "#F8FAFC",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Ionicons name="create-outline" size={18} color={colors.primary} />
                <Text style={{ fontSize: 12, fontWeight: "900", color: "#0F172A" }}>Añadir año / mes manual</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.9}
                onPress={loadAll}
                style={{
                  marginTop: 10,
                  height: 44,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  backgroundColor: "white",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Ionicons name="refresh-outline" size={18} color="#0F172A" />
                <Text style={{ fontSize: 12, fontWeight: "900", color: "#0F172A" }}>Recargar datos</Text>
              </TouchableOpacity>

              <View style={{ marginTop: 10 }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8" }}>
                  Usa “manual” para corregir meses antiguos o añadir historiales que no tienes en transacciones.
                </Text>
              </View>
            </Card>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
