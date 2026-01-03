// src/screens/Debts/DebtDetailScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../../../theme/theme";
import TransactionsList from "../../../../components/TransactionsList";
import api from "../../../../api/api";

type DebtType = "loan" | "personal";
type DebtDirection = "i_ow" | "they_owe";
type DebtStatus = "active" | "paid" | "closed";

interface DebtSubcategory {
  id: number;
  name: string;
  emoji?: string | null;
  color?: string | null;
}

interface Debt {
  id: number;
  type: DebtType;
  direction: DebtDirection;
  status: DebtStatus;
  name: string;
  entity: string;
  emoji?: string | null;
  color?: string | null;
  totalAmount: number;
  payed?: number | null;
  remainingAmount: number;
  interestRate?: number | null;
  monthlyPayment?: number | null;
  nextDueDate?: string | null;
  startDate?: string | null;
  subcategoryId?: number | null;
  subcategory?: DebtSubcategory | null;
  installmentsPaid?: number | null;
}

type TxType = "income" | "expense" | "transfer";

interface Tx {
  id: number;
  date: string;
  amount: number;
  type: TxType;
  description?: string;
  category?: {
    id: number;
    name: string;
    emoji?: string;
    color?: string;
  };
  subcategory?: {
    id: number;
    name: string;
    emoji?: string;
    color?: string;
  };
  wallet?: {
    id: number;
    name: string;
    emoji?: string;
  };
}

const getDebtTypeLabel = (type: DebtType) => {
  switch (type) {
    case "loan":
      return "Préstamo";
    case "personal":
      return "Deuda personal";
    default:
      return "Deuda";
  }
};

const getStatusLabel = (status: DebtStatus) => {
  switch (status) {
    case "active":
      return "Activa";
    case "paid":
      return "Pagada";
    case "closed":
      return "Cerrada";
    default:
      return "Activa";
  }
};

const getStatusPillStyles = (status: DebtStatus) => {
  switch (status) {
    case "active":
      return {
        bg: "rgba(34,197,94,0.20)",
        textColor: "#dcfce7",
      };
    case "paid":
      return {
        bg: "rgba(59,130,246,0.20)",
        textColor: "#dbeafe",
      };
    case "closed":
      return {
        bg: "rgba(148,163,184,0.20)",
        textColor: "#e5e7eb",
      };
    default:
      return {
        bg: "rgba(34,197,94,0.20)",
        textColor: "#dcfce7",
      };
  }
};

type AmortizationResult = {
  months: number;
  years: number;
  totalInterest: number;
} | null;

const simulateAmortization = (
  principal: number,
  annualRatePercent: number,
  baseMonthlyPayment: number,
  extra: number
): AmortizationResult => {
  const monthlyRate = (annualRatePercent / 100) / 12;
  const monthlyPayment = baseMonthlyPayment + extra;

  if (monthlyPayment <= 0 || principal <= 0 || monthlyRate < 0) return null;

  let balance = principal;
  let months = 0;
  let interestAcc = 0;

  const MAX_MONTHS = 1200;

  while (balance > 0 && months < MAX_MONTHS) {
    const interest = balance * monthlyRate;
    const principalPaid = monthlyPayment - interest;

    if (principalPaid <= 0) {
      return null;
    }

    interestAcc += interest;
    balance -= principalPaid;
    months++;
  }

  if (months >= MAX_MONTHS) return null;

  const years = months / 12;
  return {
    months,
    years,
    totalInterest: interestAcc,
  };
};

export default function DebtDetailScreen({ route, navigation }: any) {
  const { debtId } = route.params || {};

  const [debt, setDebt] = useState<Debt | null>(null);
  const [loadingDebt, setLoadingDebt] = useState(true);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);

  const [extraPerMonthText, setExtraPerMonthText] = useState("50");
  const [showCalculator, setShowCalculator] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);

  // ---------------- FETCH DEUDA ----------------
  const fetchDebt = async () => {
    if (!debtId) return;
    try {
      setLoadingDebt(true);
      const res = await api.get(`/debts/${debtId}`);
      setDebt(res.data);
    } catch (err) {
      console.error("❌ Error al obtener deuda:", err);
    } finally {
      setLoadingDebt(false);
    }
  };

  // ---------------- FETCH TRANSACCIONES (por subcategoryId) ----------------
  const fetchTransactions = async (subcategoryId?: number | null) => {
    if (!subcategoryId) {
      setTransactions([]);
      return;
    }
    try {
      setLoadingTx(true);
      const params: any = {
        type: "expense",
        subcategoryId,
      };
      const res = await api.get("/transactions", { params });

      const sorted = (res.data || []).sort(
        (a: Tx, b: Tx) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setTransactions(sorted);
    } catch (err) {
      console.error("❌ Error al obtener transacciones de la deuda:", err);
    } finally {
      setLoadingTx(false);
    }
  };

  useEffect(() => {
    fetchDebt();
  }, [debtId]);

  useEffect(() => {
    if (debt?.subcategoryId) {
      fetchTransactions(debt.subcategoryId);
    }
  }, [debt?.subcategoryId]);

    const handleDeleteDebt = () => {
    if (!debt) return;

    Alert.alert(
      "Eliminar deuda",
      "¿Seguro que quieres eliminar esta deuda? Esta acción no se puede deshacer.",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/debts/${debt.id}`);
              navigation.goBack();
            } catch (error) {
              console.error("❌ Error al eliminar deuda:", error);
              Alert.alert(
                "Error",
                "Ha ocurrido un error al eliminar la deuda. Inténtalo de nuevo."
              );
            }
          },
        },
      ]
    );
  };

  // ESTADOS DE CARGA / ERROR
  if (loadingDebt) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="px-5 pt-3 pb-2 flex-row items-center">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ paddingRight: 12, paddingVertical: 4 }}
          >
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900">
            Detalle de deuda
          </Text>
        </View>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!debt) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="px-5 pt-3 pb-2 flex-row items-center">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ paddingRight: 12, paddingVertical: 4 }}
          >
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900">
            Detalle de deuda
          </Text>
        </View>

        <View className="flex-1 justify-center items-center px-5">
          <Text className="text-gray-400 text-center">
            No se ha encontrado la deuda.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ---------------- CÁLCULOS ----------------
  const total = debt.totalAmount || 0;
  const remaining = Math.max(debt.remainingAmount || 0, 0);

  const paid =
    debt.payed != null
      ? Math.max(debt.payed, 0)
      : total > 0
      ? Math.max(Math.min(total, total - remaining), 0)
      : 0;

  const percentage =
    total > 0 ? Math.min(100, Math.max(0, Math.round((paid / total) * 100))) : 0;

  const baseInstallmentsPaid = debt.installmentsPaid || 0;
  const txInstallmentsPaid = transactions.length;
  const installmentsPaid = baseInstallmentsPaid + txInstallmentsPaid;

  const canSimulate =
    !!debt.interestRate && !!debt.monthlyPayment && remaining > 0;

  const extraPerMonth = Number(extraPerMonthText.replace(",", ".")) || 0;

  const baseScenario: AmortizationResult =
    canSimulate && debt.interestRate && debt.monthlyPayment
      ? simulateAmortization(
          remaining,
          debt.interestRate,
          debt.monthlyPayment,
          0
        )
      : null;

  const extraScenario: AmortizationResult =
    canSimulate && debt.interestRate && debt.monthlyPayment
      ? simulateAmortization(
          remaining,
          debt.interestRate,
          debt.monthlyPayment,
          extraPerMonth
        )
      : null;

  const approxInstallmentsLeft =
    baseScenario && baseScenario.months !== undefined
      ? baseScenario.months
      : null;

  const approxYearsLeft =
    baseScenario && baseScenario.years !== undefined
      ? baseScenario.years.toFixed(1)
      : null;

  const interestSaved =
    baseScenario && extraScenario
      ? baseScenario.totalInterest - extraScenario.totalInterest
      : null;

  const formatDate = (value?: string | null) => {
    if (!value) return "-";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const nextDueDateFormatted = formatDate(debt.nextDueDate);
  const startDateFormatted = formatDate(debt.startDate);
  const statusStyles = getStatusPillStyles(debt.status);

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* HEADER */}
      <View className="px-5 pt-3 pb-2 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ paddingRight: 10, paddingVertical: 4 }}
          >
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </TouchableOpacity>

          <Text className="text-lg font-semibold text-gray-900">
            Detalle de deuda
          </Text>
          </View>
          <View className="flex-row items-center">

            <TouchableOpacity
              onPress={handleDeleteDebt}
              style={{ paddingHorizontal: 4, paddingVertical: 4 }}
            >
              <Text
                className="text-[14px] font-semibold mr-2"
                style={{ color: "#DC2626" }} // rojo elegante
              >
                Eliminar
              </Text>
            </TouchableOpacity>


          <TouchableOpacity
            onPress={() => navigation.navigate("DebtForm", { editDebt: debt })}
            style={{ paddingHorizontal: 8, paddingVertical: 4 }}
          >
            <Text
              className="text-[14px] font-semibold"
              style={{ color: colors.primary }}
            >
              Editar
            </Text>
          </TouchableOpacity>

        </View>
      </View>


      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* HERO CARD */}
        <View
          style={{
            borderRadius: 24,
            padding: 20,
            marginBottom: 16,
            backgroundColor: colors.primary,
            shadowColor: "#000",
            shadowOpacity: 0.12,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 4,
          }}
        >
          <View className="flex-row justify-between items-start mb-4">
            <View className="flex-row items-center flex-1 pr-4">
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(255,255,255,0.15)",
                }}
              >
                <Text style={{ fontSize: 24 }}>
                  {debt.subcategory?.emoji || debt.emoji || "💸"}
                </Text>
              </View>

              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text
                  style={{
                    fontSize: 13,
                    color: "rgba(255,255,255,0.7)",
                  }}
                  numberOfLines={1}
                >
                  {debt.entity}
                </Text>

                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: "white",
                    marginTop: 2,
                  }}
                  numberOfLines={2}
                >
                  {debt.name}
                </Text>
              </View>
            </View>

            <View className="items-end">
              <View
                style={{
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  backgroundColor: "rgba(255,255,255,0.20)",
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color: "white",
                  }}
                >
                  {getDebtTypeLabel(debt.type)}
                </Text>
              </View>

              <View
                style={{
                  marginTop: 6,
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 2,
                  backgroundColor: statusStyles.bg,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "500",
                    color: statusStyles.textColor,
                  }}
                >
                  {getStatusLabel(debt.status)}
                </Text>
              </View>
            </View>
          </View>

          {/* IMPORTE PENDIENTE */}
          <View style={{ marginBottom: 12 }}>
            <Text
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.7)",
                marginBottom: 3,
              }}
            >
              Pendiente por pagar
            </Text>

            <Text
              style={{
                fontSize: 30,
                fontWeight: "800",
                color: "white",
              }}
            >
              {remaining.toLocaleString("es-ES")} €
            </Text>

            <Text
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.7)",
                marginTop: 3,
              }}
            >
              De un total de{" "}
              <Text style={{ fontWeight: "600", color: "white" }}>
                {total.toLocaleString("es-ES")} €
              </Text>
            </Text>
          </View>

          {/* PROGRESO */}
          <View style={{ marginBottom: 12 }}>
            <View className="flex-row justify-between mb-1">
              <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.8)" }}>
                Pagado: {paid.toLocaleString("es-ES")} €
              </Text>
              <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.8)" }}>
                {percentage}% completado
              </Text>
            </View>

            <View
              style={{
                height: 8,
                borderRadius: 999,
                backgroundColor: "rgba(255,255,255,0.25)",
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  height: "100%",
                  width: `${percentage}%`,
                  borderRadius: 999,
                  backgroundColor: "white",
                }}
              />
            </View>
          </View>

          {/* DATOS RÁPIDOS */}
          <View
            style={{
              marginTop: 6,
              paddingTop: 10,
              borderTopWidth: 1,
              borderTopColor: "rgba(255,255,255,0.2)",
            }}
          >
            <View className="flex-row">
              <View className="flex-1">
                <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
                  Inicio
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: "white",
                    marginTop: 2,
                  }}
                >
                  {startDateFormatted}
                </Text>
              </View>

              <View className="flex-1 items-center">
                <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
                  Próximo pago
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: "white",
                    marginTop: 2,
                  }}
                >
                  {nextDueDateFormatted}
                </Text>
                {debt.monthlyPayment != null && (
                  <Text
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.7)",
                      marginTop: 1,
                    }}
                  >
                    {debt.monthlyPayment.toLocaleString("es-ES")} €/mes
                  </Text>
                )}
              </View>

              <View className="flex-1 items-end">
                <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
                  Cuotas
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: "white",
                    marginTop: 2,
                  }}
                >
                  {installmentsPaid}
                </Text>

                {approxInstallmentsLeft !== null && approxYearsLeft && (
                  <Text
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.7)",
                      marginTop: 1,
                    }}
                  >
                    {approxInstallmentsLeft} restantes
                  </Text>
                )}
              </View>
            </View>
          </View>

          {approxInstallmentsLeft !== null && approxYearsLeft && (
            <View
              style={{
                marginTop: 14,
                borderRadius: 14,
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: "rgba(255,255,255,0.18)",
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  color: "white",
                }}
              >
                Te quedan aproximadamente{" "}
                <Text style={{ fontWeight: "700", color: "white" }}>
                  {approxInstallmentsLeft} cuotas
                </Text>{" "}
                ({approxYearsLeft} años aprox.).
              </Text>
            </View>
          )}
        </View>

        {/* RESUMEN NUMÉRICO */}
        <View
          style={{
            borderRadius: 20,
            padding: 16,
            backgroundColor: "white",
            borderWidth: 1,
            borderColor: "#e5e7eb",
            marginBottom: 16,
          }}
        >
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-[13px] font-semibold text-slate-900">
              Detalle de la financiación
            </Text>
            <View className="flex-row items-center">
              <Ionicons
                name="shield-checkmark-outline"
                size={16}
                color="#6b7280"
              />
              <Text className="text-[11px] text-gray-500 ml-1">
                Información estimada
              </Text>
            </View>
          </View>

          <View className="flex-row flex-wrap -mx-1">
            <View className="w-1/2 px-1 mb-2">
              <View className="rounded-2xl bg-slate-50 px-3 py-3">
                <Text className="text-[11px] text-gray-500">
                  Total financiado
                </Text>
                <Text className="text-base font-semibold text-slate-900 mt-1">
                  {total.toLocaleString("es-ES")} €
                </Text>
              </View>
            </View>

            {debt.monthlyPayment != null && (
              <View className="w-1/2 px-1 mb-2">
                <View className="rounded-2xl bg-slate-50 px-3 py-3">
                  <Text className="text-[11px] text-gray-500">
                    Cuota mensual
                  </Text>
                  <Text className="text-base font-semibold text-slate-900 mt-1">
                    {debt.monthlyPayment.toLocaleString("es-ES")} €/mes
                  </Text>
                </View>
              </View>
            )}

            <View className="w-1/2 px-1 mb-2">
              <View className="rounded-2xl bg-emerald-50 px-3 py-3">
                <Text className="text-[11px] text-emerald-700">
                  Pagado hasta ahora
                </Text>
                <Text className="text-base font-semibold text-emerald-800 mt-1">
                  {paid.toLocaleString("es-ES")} €
                </Text>
              </View>
            </View>

            <View className="w-1/2 px-1 mb-2">
              <View className="rounded-2xl bg-rose-50 px-3 py-3">
                <Text className="text-[11px] text-rose-600">
                  Pendiente actual
                </Text>
                <Text className="text-base font-semibold text-rose-700 mt-1">
                  {remaining.toLocaleString("es-ES")} €
                </Text>
              </View>
            </View>

            {debt.interestRate != null && (
              <View className="w-1/2 px-1 mb-1">
                <View className="rounded-2xl bg-indigo-50 px-3 py-3">
                  <Text className="text-[11px] text-indigo-700">Interés</Text>
                  <Text className="text-base font-semibold text-indigo-800 mt-1">
                    {debt.interestRate}% TIN
                  </Text>
                </View>
              </View>
            )}

            {baseScenario && (
              <View className="w-1/2 px-1 mb-2">
                <View className="rounded-2xl bg-amber-50 px-3 py-3">
                  <Text className="text-[11px] text-amber-700">
                    Intereses futuros (estim.)
                  </Text>
                  <Text className="text-base font-semibold text-amber-800 mt-1">
                    {Math.round(
                      baseScenario.totalInterest
                    ).toLocaleString("es-ES")}{" "}
                    €
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* CALCULADORA (PLEGABLE) */}
        <View
          style={{
            borderRadius: 20,
            marginBottom: 16,
            backgroundColor: "white",
            borderWidth: 1,
            borderColor: "#e5e7eb",
          }}
        >
          <TouchableOpacity
            onPress={() => setShowCalculator((prev) => !prev)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View>
              <Text className="text-[13px] font-semibold text-slate-900">
                Calculadora de amortización
              </Text>
              <Text className="text-[11px] text-gray-500 mt-0.5">
                Simula pagos extra mensuales
              </Text>
            </View>
            <Ionicons
              name={
                showCalculator ? "chevron-up-outline" : "chevron-down-outline"
              }
              size={18}
              color="#6b7280"
            />
          </TouchableOpacity>

          {showCalculator && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
              {!canSimulate ? (
                <Text className="text-[12px] text-rose-700 mt-2">
                  Para usar la calculadora necesitas indicar interés y cuota
                  mensual en la deuda.
                </Text>
              ) : (
                <>
                  <View className="flex-row items-center mb-2">
                    <Ionicons
                      name="calculator-outline"
                      size={16}
                      color={colors.primary}
                    />
                    <Text className="text-[11px] text-gray-500 ml-1">
                      Simulación rápida
                    </Text>
                  </View>

                  <Text className="text-[12px] text-gray-500 mb-3">
                    Simula cuánto antes terminarías si añades un pago extra fijo
                    cada mes sobre la cuota actual.
                  </Text>

                  <View className="flex-row items-center mt-1 mb-4">
                    <Text className="text-[13px] text-gray-700 mr-8">
                      Pago extra mensual
                    </Text>
                    <View className="flex-1 flex-row items-center rounded-full border border-slate-200 px-3 py-1.5 bg-slate-50">
                      <TextInput
                        value={extraPerMonthText}
                        onChangeText={setExtraPerMonthText}
                        keyboardType="numeric"
                        placeholder="0"
                        style={{
                          flex: 1,
                          fontSize: 14,
                          paddingVertical: 3,
                        }}
                      />
                      <Text className="text-[13px] text-gray-500">€/mes</Text>
                    </View>
                  </View>

                  {baseScenario && extraScenario ? (
                    <>
                      <View className="mb-3 rounded-xl border border-slate-100 px-3 py-2.5">
                        <Text className="text-[11px] text-gray-500 mb-1">
                          Escenario actual
                        </Text>
                        <Text className="text-[13px] text-slate-900 font-medium">
                          Terminarías en aprox.{" "}
                          <Text className="font-semibold">
                            {baseScenario.months} meses
                          </Text>{" "}
                          ({baseScenario.years.toFixed(1)} años) y pagarías
                          alrededor de{" "}
                          <Text className="font-semibold">
                            {Math.round(
                              baseScenario.totalInterest
                            ).toLocaleString("es-ES")}{" "}
                            €
                          </Text>{" "}
                          en intereses (desde hoy).
                        </Text>
                      </View>

                      <View className="mb-3 rounded-xl border border-emerald-100 bg-emerald-50/40 px-3 py-2.5">
                        <Text className="text-[11px] text-emerald-700 mb-1">
                          Con pago extra de {extraPerMonth.toFixed(0)} €/mes
                        </Text>
                        <Text className="text-[13px] text-emerald-900 font-medium">
                          Terminarías en aprox.{" "}
                          <Text className="font-semibold">
                            {extraScenario.months} meses
                          </Text>{" "}
                          ({extraScenario.years.toFixed(1)} años) y pagarías unos{" "}
                          <Text className="font-semibold">
                            {Math.round(
                              extraScenario.totalInterest
                            ).toLocaleString("es-ES")}{" "}
                            €
                          </Text>{" "}
                          en intereses.
                        </Text>
                      </View>

                      {interestSaved !== null && interestSaved > 0 && (
                        <View className="mt-1 rounded-xl bg-emerald-600 px-3 py-2">
                          <Text className="text-[12px] text-emerald-50 font-medium">
                            Ahorrarías aproximadamente{" "}
                            <Text className="font-semibold">
                              {Math.round(
                                interestSaved
                              ).toLocaleString("es-ES")}{" "}
                              €
                            </Text>{" "}
                            en intereses y terminarías antes la deuda.
                          </Text>
                        </View>
                      )}
                    </>
                  ) : (
                    <Text className="text-[12px] text-rose-700 mt-2">
                      Con los datos actuales la cuota no es suficiente para
                      reducir el capital. Revisa el importe de la cuota o el
                      pago extra.
                    </Text>
                  )}
                </>
              )}
            </View>
          )}
        </View>

        {/* TRANSACCIONES (PLEGABLE) */}
        <View
          style={{
            borderRadius: 20,
            marginBottom: 16,
            backgroundColor: "white",
            borderWidth: 1,
            borderColor: "#e5e7eb",
          }}
        >
          <TouchableOpacity
            onPress={() => setShowTransactions((prev) => !prev)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View>
              <Text className="text-[13px] font-semibold text-slate-900">
                Transacciones de la deuda
              </Text>
              <Text className="text-[11px] text-gray-500 mt-0.5">
                {loadingTx
                  ? "Cargando movimientos..."
                  : `${transactions.length} movimientos asociados`}
              </Text>
            </View>
            <Ionicons
              name={
                showTransactions ? "chevron-up-outline" : "chevron-down-outline"
              }
              size={18}
              color="#6b7280"
            />
          </TouchableOpacity>

          {showTransactions && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
              {loadingTx ? (
                <ActivityIndicator
                  size="small"
                  color={colors.primary}
                  style={{ marginTop: 8 }}
                />
              ) : transactions.length === 0 ? (
                <Text className="text-[12px] text-gray-400 mt-2">
                  Todavía no hay transacciones asociadas a esta deuda.
                </Text>
              ) : (
                <>
                  <View className="h-8 w-8 rounded-full bg-slate-100 items-center justify-center mb-2 self-end">
                    <Ionicons
                      name="swap-vertical-outline"
                      size={18}
                      color="#6b7280"
                    />
                  </View>

                  <TransactionsList
                    transactions={transactions}
                    onDeleted={() => {
                      if (debt?.subcategoryId) {
                        fetchTransactions(debt.subcategoryId);
                      }
                    }}
                    navigation={navigation}
                  />
                </>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
