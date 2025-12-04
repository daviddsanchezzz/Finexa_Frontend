import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { colors } from "../theme/theme";
import api from "../api/api";

type TxType = "income" | "expense" | "transfer";

interface Transaction {
  id?: number;
  date: string;
  amount: number;
  type: TxType;
}

interface AdvancedStatsProps {
  initialBalance?: number;
}

interface MonthSummary {
  monthIndex: number;
  monthName: string;
  income: number;
  expense: number;
  saving: number;
  finalAmount: number;
}

interface YearSummary {
  year: number;
  income: number;
  expense: number;
  saving: number;
  finalAmount: number;
}

export default function AdvancedStats({ navigation, initialBalance = 0 }: any) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [manualData, setManualData] = useState<
    Record<number, Record<number, { income?: number; expense?: number; finalBalance?: number }>>
  >({});
  const [loading, setLoading] = useState(true);
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0–11

  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [hasInitializedYear, setHasInitializedYear] = useState(false);

  const formatEuro = (n: number) =>
    n.toLocaleString("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const monthNames = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  // -----------------------------------------------------
  // CARGA TRANSACCIONES + OVERRIDES
  // -----------------------------------------------------
  const loadAll = async () => {
    try {
      setLoading(true);

      const [txRes, manualRes] = await Promise.all([
        api.get("/transactions"),
        api.get("/manual-month"),
      ]);

      setTransactions(txRes.data);

      // Mapear overrides (month 0–11 ya confirmado)
      const map: Record<number, Record<number, { income?: number; expense?: number; finalBalance?: number }>> = {};
      manualRes.data.forEach((row: any) => {
        if (!map[row.year]) map[row.year] = {};
        map[row.year][row.month] = {
          income: row.income ?? undefined,
          expense: row.expense ?? undefined,
          finalBalance: row.finalBalance ?? undefined,
        };
      });
      setManualData(map);
    } catch (error) {
      console.log("❌ Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Reload al volver desde EditMonthScreen
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadAll();
    });
    return unsubscribe;
  }, [navigation]);

  // -----------------------------------------------------
  // CÁLCULOS CON OVERRIDES (TIMELINE GLOBAL)
  // -----------------------------------------------------
  const { monthsByYear, globalSummaryList } = useMemo(() => {
    // Filtrar y ordenar transacciones válidas (ingresos/gastos)
    const validTx = transactions
      .filter((tx) => tx.type === "income" || tx.type === "expense")
      .map((tx) => ({ ...tx, dateObj: new Date(tx.date) }))
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

    // Agregar por año/mes (solo transacciones)
    const perYearMonth: Record<number, { income: number[]; expense: number[] }> = {};

    validTx.forEach((tx) => {
      const y = tx.dateObj.getFullYear();
      const m = tx.dateObj.getMonth(); // 0–11

      if (!perYearMonth[y]) {
        perYearMonth[y] = {
          income: new Array(12).fill(0),
          expense: new Array(12).fill(0),
        };
      }

      if (tx.type === "income") perYearMonth[y].income[m] += Math.abs(tx.amount);
      if (tx.type === "expense") perYearMonth[y].expense[m] += Math.abs(tx.amount);
    });

    // Años conocidos por transacciones o manuales
    const txYears = Object.keys(perYearMonth).map((y) => Number(y));
    const manualYears = Object.keys(manualData).map((y) => Number(y));

    // Año mínimo = el primer año donde haya cualquier dato
    const minYear = Math.min(
      ...txYears,
      ...manualYears,
      currentYear // por si no existiera ningún dato, empezamos en el actual
    );

    // Año máximo SIEMPRE debe ser el actual
    const maxYear = currentYear;

    // Generamos TODOS los años intermedios (timeline completo)
    const yearsSorted: number[] = [];
    for (let y = minYear; y <= maxYear; y++) {
      yearsSorted.push(y);
    }

    if (yearsSorted.length === 0) {
      return { monthsByYear: {} as Record<number, MonthSummary[]>, globalSummaryList: [] as YearSummary[] };
    }

    const monthsByYear: Record<number, MonthSummary[]> = {};
    const yearAgg: Record<number, { income: number; expense: number; saving: number; finalAmount: number }> = {};

    // Saldo global que se va propagando año a año, mes a mes
    let globalRunningBalance = initialBalance;

    yearsSorted.forEach((y) => {
      const d = perYearMonth[y] ?? {
        income: new Array(12).fill(0),
        expense: new Array(12).fill(0),
      };

      let yearIncome = 0;
      let yearExpense = 0;
      let lastFinishedFinalAmount: number | null = null;

      const monthsArr: MonthSummary[] = new Array(12).fill(null).map((_, m) => {
        const isPastYear = y < currentYear;
        const isCurrentYear = y === currentYear;
        const isFinishedMonth = isPastYear || (isCurrentYear && m < currentMonth);

        const override = manualData[y]?.[m];

        const txIncome = d.income[m] ?? 0;
        const txExpense = d.expense[m] ?? 0;

        // Ingreso / gasto: override manda; si no hay override, usamos transacción solo si mes terminado
        const income =
          override?.income !== undefined
            ? override.income
            : isFinishedMonth
            ? txIncome
            : 0;

        const expense =
          override?.expense !== undefined
            ? override.expense
            : isFinishedMonth
            ? txExpense
            : 0;

        const saving = income - expense;

        let finalAmount = 0;

        if (isFinishedMonth) {
          // Solo contamos en agregados si el mes está terminado
          yearIncome += income;
          yearExpense += expense;

          // Manual finalBalance manda totalmente; si no, usamos balance previo + ahorro
          if (override?.finalBalance !== undefined && override?.finalBalance !== null) {
            globalRunningBalance = override.finalBalance;
          } else {
            globalRunningBalance = globalRunningBalance + saving;
          }

          finalAmount = globalRunningBalance;
          lastFinishedFinalAmount = finalAmount;
        } else {
          // Mes futuro / no terminado -> no afecta al saldo global
          finalAmount = 0;
        }

        return {
          monthIndex: m,
          monthName: monthNames[m],
          income,
          expense,
          saving,
          finalAmount,
        };
      });

      const yearSaving = yearIncome - yearExpense;
      const yearFinalAmount = lastFinishedFinalAmount ?? 0;

      monthsByYear[y] = monthsArr;
      yearAgg[y] = {
        income: yearIncome,
        expense: yearExpense,
        saving: yearSaving,
        finalAmount: yearFinalAmount,
      };
    });

    // Construir resumen global por año (solo años terminados con datos reales)
    const globalSummaryList: YearSummary[] = yearsSorted.map((y) => {
      const fullYearFinished = y < currentYear;

      if (!fullYearFinished) {
        return {
          year: y,
          income: 0,
          expense: 0,
          saving: 0,
          finalAmount: 0,
        };
      }

      const agg = yearAgg[y] ?? {
        income: 0,
        expense: 0,
        saving: 0,
        finalAmount: 0,
      };

      return {
        year: y,
        income: agg.income,
        expense: agg.expense,
        saving: agg.saving,
        finalAmount: agg.finalAmount,
      };
    });

    return { monthsByYear, globalSummaryList };
  }, [transactions, manualData, initialBalance, currentYear, currentMonth]);

    useEffect(() => {
    // solo si ya tenemos datos y aún no hemos fijado el año
    if (!hasInitializedYear && globalSummaryList.length > 0) {
      setSelectedYear(currentYear);
      setHasInitializedYear(true);
    }
  }, [globalSummaryList]);


  const yearSummaryList: MonthSummary[] =
    selectedYear !== null ? monthsByYear[selectedYear] || [] : [];

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

  const isPastSelectedYear = selectedYear < currentYear;
  const isCurrentSelectedYear = selectedYear === currentYear;

  // Totales del año seleccionado (solo meses terminados)
  const finishedMonths = yearSummaryList.filter((_, i) =>
    isPastSelectedYear || (isCurrentSelectedYear && i < currentMonth)
  );

  const totalYearIncome = finishedMonths.reduce((s, m) => s + m.income, 0);
  const totalYearExpense = finishedMonths.reduce((s, m) => s + m.expense, 0);
  const totalYearSaving = finishedMonths.reduce((s, m) => s + m.saving, 0);
  const totalYearFinal =
    finishedMonths.length > 0
      ? finishedMonths[finishedMonths.length - 1].finalAmount
      : 0;

  // Totales globales (solo años terminados)
  const finishedYears = globalSummaryList.filter((y) => y.year < currentYear);

  const totalGlobalIncome = finishedYears.reduce((s, y) => s + y.income, 0);
  const totalGlobalExpense = finishedYears.reduce((s, y) => s + y.expense, 0);
  const totalGlobalSaving = finishedYears.reduce((s, y) => s + y.saving, 0);
  const totalGlobalFinal =
    finishedYears.length > 0
      ? finishedYears[finishedYears.length - 1].finalAmount
      : 0;

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
        <Text className="text-gray-500">
          Mes a mes{" "}
          {isPastSelectedYear ? "(año completado)" : "(solo meses completados)"}
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

            <Text
              style={{ width: COL, textAlign: "center" }}
              className="font-bold text-gray-900"
            >
              {formatEuro(totalYearIncome)}
            </Text>

            <Text
              style={{ width: COL, textAlign: "center" }}
              className="font-bold text-gray-900"
            >
              {formatEuro(totalYearExpense)}
            </Text>

            <Text
              style={{ width: COL, textAlign: "center" }}
              className={`font-bold ${
                totalYearSaving >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatEuro(totalYearSaving)}
            </Text>

            <Text
              style={{ width: COL_FINAL, textAlign: "center" }}
              className="font-bold text-gray-900"
            >
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
        <Text className="text-gray-500">Año por año (solo años terminados)</Text>
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
                  className={isSelected ? "text-blue-600 font-bold" : "text-gray-800"}
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

            <Text
              style={{ width: COL, textAlign: "center" }}
              className="font-bold text-gray-900"
            >
              {formatEuro(totalGlobalIncome)}
            </Text>

            <Text
              style={{ width: COL, textAlign: "center" }}
              className="font-bold text-gray-900"
            >
              {formatEuro(totalGlobalExpense)}
            </Text>

            <Text
              style={{ width: COL, textAlign: "center" }}
              className={`font-bold ${
                totalGlobalSaving >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatEuro(totalGlobalSaving)}
            </Text>

            <Text
              style={{ width: COL_FINAL, textAlign: "center" }}
              className="font-bold text-gray-900"
            >
              {finishedYears.length > 0 ? formatEuro(totalGlobalFinal) : "–"}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* =============================== */}
      {/* BOTÓN AÑADIR AÑO / MES MANUAL */}
      {/* =============================== */}

      <View className="px-6 mt-8 mb-16">
        <TouchableOpacity
          onPress={() => navigation.navigate("EditMonth", { mode: "select" })}
          activeOpacity={0.8}
          className="bg-blue-600 py-4 rounded-xl"
        >
          <Text className="text-center text-white text-[16px] font-bold">
            Añadir año / mes manual
          </Text>
        </TouchableOpacity>

        <Text className="text-center text-gray-500 mt-2 text-[13px]">
          Úsalo para crear un registro manual en cualquier mes.
        </Text>
      </View>
    </ScrollView>
  );
}
