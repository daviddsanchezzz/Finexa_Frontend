// src/components/AdvancedStats.tsx
import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { colors } from "../theme/theme";
import api from "../api/api";
import {
  computeWealthSeries,
  filterTransactionsForStats,
  mapManualMonthRows,
  mapInvestmentSnapshotRows,
  buildLinePath,
  type MonthSummary,
  type YearSummary,
  type WealthTransaction,
} from "../utils/wealthSeries";

interface AdvancedStatsProps {
  initialBalance?: number;
}

const parseISO = (d: string) => new Date(d).getTime();

export default function AdvancedStats({ navigation, initialBalance = 0 }: any) {
  const [transactions, setTransactions] = useState<WealthTransaction[]>([]);
  const [manualData, setManualData] = useState<
    Record<number, Record<number, { income?: number; expense?: number; finalBalance?: number }>>
  >({});
  const [loading, setLoading] = useState(true);
  // key: "YYYY-M" (M = 0–11 UTC), value: profit en € del PortfolioSnapshot
  const [snapshots, setSnapshots] = useState<Record<string, number>>({});

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0–11

  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [hasInitializedYear, setHasInitializedYear] = useState(false);

  // Para la gráfica de patrimonio
  const [chartWidth, setChartWidth] = useState(0);

  const formatEuro = (n: number) =>
    n.toLocaleString("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // -----------------------------------------------------
  // CARGA TRANSACCIONES + OVERRIDES
  // -----------------------------------------------------
  const loadAll = useCallback(async () => {
    try {
      setLoading(true);

      const [txRes, manualRes, snapRes] = await Promise.all([
        api.get("/transactions"),
        api.get("/manual-month"),
        api.get("/investments/snapshots"),
      ]);

      const filtered = filterTransactionsForStats(txRes.data || [])
        .filter((tx: any) => tx.type === "income" || tx.type === "expense");

      setTransactions(filtered);
      setManualData(mapManualMonthRows(manualRes.data || []));
      setSnapshots(mapInvestmentSnapshotRows(snapRes.data || []));
    } catch (error) {
      console.log("❌ Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Reload al volver desde EditMonthScreen
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadAll();
    });
    return unsubscribe;
  }, [navigation, loadAll]);

  // -----------------------------------------------------
  // CÁLCULOS CON OVERRIDES (TIMELINE GLOBAL) — lógica compartida con el
  // card de patrimonio de Home, ver src/utils/wealthSeries.ts
  // -----------------------------------------------------
  const { monthsByYear, globalSummaryList, wealthSeries } = useMemo(
    () => computeWealthSeries({ transactions, manualData, snapshots, initialBalance, currentYear, currentMonth }),
    [transactions, manualData, snapshots, initialBalance, currentYear, currentMonth]
  );

  useEffect(() => {
    if (!hasInitializedYear && globalSummaryList.length > 0) {
      setSelectedYear(currentYear);
      setHasInitializedYear(true);
    }
  }, [globalSummaryList, hasInitializedYear, currentYear]);

  const yearSummaryList: MonthSummary[] =
    selectedYear !== null ? monthsByYear[selectedYear] || [] : [];

  // -----------------------------------------------------
  // TOTALES PARA TABLAS
  // -----------------------------------------------------
  const isPastSelectedYear = (selectedYear ?? currentYear) < currentYear;
  const isCurrentSelectedYear = (selectedYear ?? currentYear) === currentYear;

  const finishedMonths = yearSummaryList.filter((_, i) =>
    isPastSelectedYear || (isCurrentSelectedYear && i < currentMonth)
  );

  const totalYearIncome = finishedMonths.reduce((s, m) => s + m.income, 0);
  const totalYearExpense = finishedMonths.reduce((s, m) => s + m.expense, 0);
  const totalYearSaving = finishedMonths.reduce((s, m) => s + m.saving, 0);
  const totalYearInvestment = finishedMonths.reduce((s, m) => s + (m.investment ?? 0), 0);
  const totalYearFinal =
    finishedMonths.length > 0 ? finishedMonths[finishedMonths.length - 1].finalAmount : 0;

  const finishedYears = globalSummaryList.filter((y) => y.year < currentYear);

  const totalGlobalIncome = finishedYears.reduce((s, y) => s + y.income, 0);
  const totalGlobalExpense = finishedYears.reduce((s, y) => s + y.expense, 0);
  const totalGlobalSaving = finishedYears.reduce((s, y) => s + y.saving, 0);
  const totalGlobalInvestment = finishedYears.reduce((s, y) => s + y.investment, 0);
  const totalGlobalFinal =
    finishedYears.length > 0 ? finishedYears[finishedYears.length - 1].finalAmount : 0;

  const wealthChart = useMemo(() => {
    if (!wealthSeries.length || chartWidth <= 0) return null;

    const values = wealthSeries.map((p) => p.finalAmount);
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const span = maxV - minV || 1;

    const H = 130;
    const padX = 10;
    const padY = 12;
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

  // -----------------------------------------------------
  // RENDER
  // -----------------------------------------------------
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const COL_MONTH = 110;
  const COL = 110;
  const COL_FINAL = 130;

  const headerText = "font-semibold text-gray-800 text-[14px]";
  const cellText = "font-medium text-gray-700";

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* =============================== */}
      {/* RESUMEN AÑO */}
      {/* =============================== */}
      <View className="px-6 mt-4 mb-3">
        <Text className="text-[20px] font-bold text-text mb-1">
          Resumen {selectedYear}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20 }}
      >
        <View>
          {/* HEADER */}
          <View
            className="flex-row py-3 px-2"
            style={{
              backgroundColor: "rgba(0,0,0,0.04)",
              borderBottomWidth: 1,
              borderColor: "#E5E7EB",
            }}
          >
            <Text style={{ width: COL_MONTH }} className={headerText}>
              Mes
            </Text>
            <Text style={{ width: COL, textAlign: "center" }} className={headerText}>
              Ingresos
            </Text>
            <Text style={{ width: COL, textAlign: "center" }} className={headerText}>
              Gastos
            </Text>
            <Text style={{ width: COL, textAlign: "center" }} className={headerText}>
              Ahorro
            </Text>
            <Text style={{ width: COL, textAlign: "center" }} className={headerText}>
              Inversión
            </Text>
            <Text style={{ width: COL_FINAL, textAlign: "center" }} className={headerText}>
              Saldo final
            </Text>
          </View>

          {/* ROWS */}
          {yearSummaryList.map((m, i) => {
            const finished =
              isPastSelectedYear || (isCurrentSelectedYear && i < currentMonth);

            return (
              <TouchableOpacity
                key={i}
                activeOpacity={0.7}
                onPress={() =>
                  finished &&
                  navigation.navigate("EditMonth", {
                    year: selectedYear,
                    month: i,
                    monthName: m.monthName,
                    currentValues: manualData[selectedYear]?.[i] || {},
                  })
                }
                className="flex-row py-3 px-2"
                style={{
                  borderBottomWidth: 1,
                  borderColor: "#F1F5F9",
                  opacity: finished ? 1 : 0.4,
                }}
              >
                <Text style={{ width: COL_MONTH }} className="text-gray-800">
                  {m.monthName}
                </Text>

                <Text style={{ width: COL, textAlign: "center" }} className={cellText}>
                  {finished ? formatEuro(m.income) : "–"}
                </Text>

                <Text style={{ width: COL, textAlign: "center" }} className={cellText}>
                  {finished ? formatEuro(m.expense) : "–"}
                </Text>

                <Text
                  style={{ width: COL, textAlign: "center" }}
                  className={`font-semibold ${
                    !finished
                      ? "text-gray-400"
                      : m.saving >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {finished ? formatEuro(m.saving) : "–"}
                </Text>

                <Text
                  style={{ width: COL, textAlign: "center" }}
                  className={`font-semibold ${
                    !finished || m.investment === null
                      ? "text-gray-400"
                      : m.investment >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {finished ? (m.investment !== null ? formatEuro(m.investment) : "—") : "–"}
                </Text>

                <Text
                  style={{ width: COL_FINAL, textAlign: "center" }}
                  className="font-semibold text-gray-800"
                >
                  {finished ? formatEuro(m.finalAmount) : "–"}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* TOTAL AÑO */}
          <View
            className="flex-row py-3 px-2"
            style={{
              backgroundColor: "rgba(0,0,0,0.04)",
              borderTopWidth: 1,
              borderColor: "#E5E7EB",
            }}
          >
            <Text style={{ width: COL_MONTH }} className="font-bold text-gray-900">
              TOTAL
            </Text>

            <Text style={{ width: COL, textAlign: "center" }} className="font-bold text-gray-900">
              {formatEuro(totalYearIncome)}
            </Text>

            <Text style={{ width: COL, textAlign: "center" }} className="font-bold text-gray-900">
              {formatEuro(totalYearExpense)}
            </Text>

            <Text
              style={{ width: COL, textAlign: "center" }}
              className={`font-bold ${totalYearSaving >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {formatEuro(totalYearSaving)}
            </Text>

            <Text
              style={{ width: COL, textAlign: "center" }}
              className={`font-bold ${totalYearInvestment >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {formatEuro(totalYearInvestment)}
            </Text>

            <Text style={{ width: COL_FINAL, textAlign: "center" }} className="font-bold text-gray-900">
              {finishedMonths.length > 0 ? formatEuro(totalYearFinal) : "–"}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* =============================== */}
      {/* GLOBAL */}
      {/* =============================== */}
      <View className="px-6 mt-10 mb-3">
        <Text className="text-[20px] font-bold text-text mb-1">Resumen global</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20 }}
      >
        <View>
          {/* HEADER */}
          <View
            className="flex-row py-3 px-2"
            style={{
              backgroundColor: "rgba(0,0,0,0.04)",
              borderBottomWidth: 1,
              borderColor: "#E5E7EB",
            }}
          >
            <Text style={{ width: COL_MONTH }} className={headerText}>
              Año
            </Text>
            <Text style={{ width: COL, textAlign: "center" }} className={headerText}>
              Ingresos
            </Text>
            <Text style={{ width: COL, textAlign: "center" }} className={headerText}>
              Gastos
            </Text>
            <Text style={{ width: COL, textAlign: "center" }} className={headerText}>
              Ahorro
            </Text>
            <Text style={{ width: COL, textAlign: "center" }} className={headerText}>
              Inversión
            </Text>
            <Text style={{ width: COL_FINAL, textAlign: "center" }} className={headerText}>
              Saldo final
            </Text>
          </View>

          {globalSummaryList.map((y, i) => {
            const finished = y.year < currentYear;
            const isSelected = selectedYear === y.year;

            return (
              <TouchableOpacity
                key={i}
                activeOpacity={0.7}
                onPress={() => setSelectedYear(y.year)}
                className="flex-row py-3 px-2"
                style={{
                  borderBottomWidth: 1,
                  borderColor: "#F1F5F9",
                  backgroundColor: isSelected ? "rgba(59,130,246,0.05)" : "transparent",
                }}
              >
                <Text
                  style={{ width: COL_MONTH }}
                  className={isSelected ? " font-bold" : "text-gray-800"}
                >
                  {y.year}
                </Text>

                <Text style={{ width: COL, textAlign: "center" }} className={cellText}>
                  {finished ? formatEuro(y.income) : "–"}
                </Text>

                <Text style={{ width: COL, textAlign: "center" }} className={cellText}>
                  {finished ? formatEuro(y.expense) : "–"}
                </Text>

                <Text
                  style={{ width: COL, textAlign: "center" }}
                  className={`font-semibold ${
                    !finished
                      ? "text-gray-400"
                      : y.saving >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {finished ? formatEuro(y.saving) : "–"}
                </Text>

                <Text
                  style={{ width: COL, textAlign: "center" }}
                  className={`font-semibold ${
                    !finished
                      ? "text-gray-400"
                      : y.investment >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {finished ? formatEuro(y.investment) : "–"}
                </Text>

                <Text
                  style={{ width: COL_FINAL, textAlign: "center" }}
                  className="font-semibold text-gray-800"
                >
                  {finished ? formatEuro(y.finalAmount) : "–"}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* TOTAL GLOBAL */}
          <View
            className="flex-row py-3 px-2"
            style={{
              backgroundColor: "rgba(0,0,0,0.04)",
              borderTopWidth: 1,
              borderColor: "#E5E7EB",
            }}
          >
            <Text style={{ width: COL_MONTH }} className="font-bold text-gray-900">
              TOTAL
            </Text>

            <Text style={{ width: COL, textAlign: "center" }} className="font-bold text-gray-900">
              {formatEuro(totalGlobalIncome)}
            </Text>

            <Text style={{ width: COL, textAlign: "center" }} className="font-bold text-gray-900">
              {formatEuro(totalGlobalExpense)}
            </Text>

            <Text
              style={{ width: COL, textAlign: "center" }}
              className={`font-bold ${totalGlobalSaving >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {formatEuro(totalGlobalSaving)}
            </Text>

            <Text
              style={{ width: COL, textAlign: "center" }}
              className={`font-bold ${totalGlobalInvestment >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {formatEuro(totalGlobalInvestment)}
            </Text>

            <Text style={{ width: COL_FINAL, textAlign: "center" }} className="font-bold text-gray-900">
              {finishedYears.length > 0 ? formatEuro(totalGlobalFinal) : "–"}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* =============================== */}
      {/* EVOLUCIÓN PATRIMONIO */}
      {/* =============================== */}
      <View className="px-6 mt-10 mb-3">
        <Text className="text-[20px] font-bold text-text mb-1">Evolución del patrimonio</Text>
      </View>

      <View
        className="mx-6 mb-10"
        style={{
          backgroundColor: "white",
          borderRadius: 20,
          padding: 14,
          borderWidth: 1,
          borderColor: "#E5E7EB",
        }}
        onLayout={(e) => setChartWidth(e.nativeEvent.layout.width - 28)} // padding*2
      >
        {!wealthChart ? (
          <Text className="text-gray-400" style={{ paddingVertical: 10 }}>
            No hay suficientes datos para dibujar la gráfica.
          </Text>
        ) : (
          <>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
              <View>
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#94A3B8" }}>Último saldo</Text>
                <Text style={{ fontSize: 22, fontWeight: "900", color: "#0F172A", marginTop: 2 }}>
                  {formatEuro(wealthChart.mapped[wealthChart.mapped.length - 1].finalAmount)}
                </Text>
              </View>
            </View>

            <View
              style={{
                marginTop: 12,
                backgroundColor: "#F8FAFC",
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "#E5E7EB",
              }}
            >
              <Svg width="100%" height={wealthChart.H} viewBox={`0 0 ${wealthChart.W} ${wealthChart.H}`}>
                <Path d={wealthChart.path} stroke={colors.primary} strokeWidth="3" fill="none" />
                <Circle
                  cx={wealthChart.mapped[wealthChart.mapped.length - 1].x}
                  cy={wealthChart.mapped[wealthChart.mapped.length - 1].y}
                  r="4"
                  fill={colors.primary}
                />
              </Svg>

              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 12, paddingBottom: 10 }}>
                <Text style={{ fontSize: 11, fontWeight: "800", color: "#94A3B8" }}>
                  {wealthChart.mapped[0].label}
                </Text>
                <Text style={{ fontSize: 11, fontWeight: "800", color: "#94A3B8" }}>
                  {wealthChart.mapped[wealthChart.mapped.length - 1].label}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>

              <Text style={{ fontSize: 11, fontWeight: "800", color: "#94A3B8" }}>
                Máx: {formatEuro(wealthChart.maxV)}
              </Text>
            </View>
          </>
        )}
      </View>

{/* =============================== */}
{/* BOTÓN AÑADIR AÑO / MES MANUAL */}
{/* =============================== */}
<View className="px-6 mt-2 mb-16">
  <TouchableOpacity
    onPress={() => navigation.navigate("EditMonth", { mode: "select" })}
    activeOpacity={0.85}
    className="py-3 rounded-xl"
    style={{
      backgroundColor: "white",
      borderWidth: 1,
      borderColor: "#E5E7EB",
    }}
  >
    <Text className="text-center text-[14px] font-semibold" style={{ color: "#334155" }}>
      Añadir año / mes manual
    </Text>
  </TouchableOpacity>

  <Text className="text-center text-gray-400 mt-2 text-[12px]">
    Úsalo para un registro manual en cualquier mes.
  </Text>
</View>

    </ScrollView>
  );
}
