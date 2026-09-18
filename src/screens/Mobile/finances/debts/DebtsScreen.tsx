// src/screens/Debts/DebtsHomeScreen.tsx
import React, { useState, useMemo, useCallback } from "react";
import { View, Text, SafeAreaView, ScrollView } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AppHeader from "../../../../components/AppHeader";
import AddButton from "../../../../components/AddButton";
import HeroBalanceCard from "../../../../components/HeroBalanceCard";
import StatsRow from "../../../../components/StatsRow";
import SegmentedTabs from "../../../../components/SegmentedTabs";
import DebtListCard, { DebtFrequency } from "../../../../components/DebtListCard";
import { DebtsScreenSkeleton } from "../../../../components/skeletons/DebtsScreenSkeleton";
import { useDebtsQuery } from "../../../../hooks/useDebtsQuery";
import { formatEuro as formatEuroBase } from "../../../../utils/currency";

type DebtType = "loan" | "mortgage" | "credit_card" | "personal" | "other";
type DebtDirection = "i_ow" | "they_owe";
type DebtStatus = "active" | "paid" | "closed";

interface Debt {
  id: number;
  type: DebtType;
  direction: DebtDirection;
  status: DebtStatus;
  name: string;
  entity?: string | null;
  emoji?: string | null;
  color?: string | null;
  totalAmount: number;
  payed?: number | null;
  remainingAmount: number;
  interestRate?: number | null;
  monthlyPayment?: number | null;
  paymentFrequency?: DebtFrequency | null;
  startDate?: string | null;
  nextDueDate?: string | null;
  installmentsPaid?: number | null;
}

// Normaliza una cuota a su equivalente mensual según su frecuencia, para
// poder sumar cuotas de distintas periodicidades en un único indicador.
const MONTHLY_EQUIVALENT_FACTOR: Record<DebtFrequency, number> = {
  weekly: 52 / 12,
  monthly: 1,
  quarterly: 1 / 3,
  yearly: 1 / 12,
};

type FilterType = "active" | "paid" | "all";

const formatEuro = (n: number) => `${formatEuroBase(n)} €`;

// Días restantes hasta una fecha (redondeado a días naturales, sin horas).
function daysUntil(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

export default function DebtsHomeScreen({ navigation, isPinnedModuleTab = false }: any) {
  const [filter, setFilter] = useState<FilterType>("active");

  const debtsQuery = useDebtsQuery();
  const debts: Debt[] = debtsQuery.data ?? [];
  const loading = debtsQuery.isLoading;

  useFocusEffect(
    useCallback(() => {
      debtsQuery.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  // Nos centramos en lo que YO debo — "me deben" queda fuera por ahora.
  const iOweDebts = useMemo(() => debts.filter((d) => d.direction === "i_ow"), [debts]);
  const iOweActiveDebts = useMemo(() => iOweDebts.filter((d) => d.status === "active"), [iOweDebts]);

  const filteredDebts = useMemo(() => {
    if (filter === "all") return iOweDebts;
    return iOweDebts.filter((d) => d.status === filter);
  }, [iOweDebts, filter]);

  const summary = useMemo(() => {
    const totalRemaining = iOweActiveDebts.reduce((s, d) => s + (d.remainingAmount || 0), 0);
    const totalOriginal = iOweActiveDebts.reduce((s, d) => s + (d.totalAmount || 0), 0);
    const totalPaid = iOweActiveDebts.reduce((s, d) => {
      const paid = d.payed != null ? d.payed : Math.max(0, Math.min(d.totalAmount, d.totalAmount - d.remainingAmount));
      return s + paid;
    }, 0);
    const monthlyEquivalentPayment = iOweActiveDebts.reduce((s, d) => {
      if (d.monthlyPayment == null || !d.paymentFrequency) return s;
      return s + d.monthlyPayment * MONTHLY_EQUIVALENT_FACTOR[d.paymentFrequency];
    }, 0);
    const pctPaid = totalOriginal > 0 ? Math.min(100, (totalPaid / totalOriginal) * 100) : 0;

    const nextDueDates = iOweActiveDebts
      .map((d) => d.nextDueDate)
      .filter((d): d is string => !!d)
      .map((d) => new Date(d))
      .filter((d) => !isNaN(d.getTime()));
    const nextDue = nextDueDates.length > 0 ? nextDueDates.reduce((min, d) => (d < min ? d : min)) : null;

    return {
      totalRemaining,
      monthlyEquivalentPayment,
      pctPaid,
      activeCount: iOweActiveDebts.length,
      nextDue,
    };
  }, [iOweActiveDebts]);

  const nextPaymentLabel = useMemo(() => {
    if (!summary.nextDue) return "—";
    const diff = daysUntil(summary.nextDue.toISOString());
    if (diff < 0) return "Vencido";
    if (diff === 0) return "Hoy";
    if (diff === 1) return "Mañana";
    return `${diff} días`;
  }, [summary.nextDue]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* HEADER */}
      <View className="px-5 pb-2">
        <AppHeader
          title="Deudas"
          showProfile={false}
          showDatePicker={false}
          showBack={!isPinnedModuleTab}
          rightElement={<AddButton label="Añadir" onPress={() => navigation.navigate("DebtForm")} />}
        />
      </View>

      {loading ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <DebtsScreenSkeleton />
        </ScrollView>
      ) : (
        <View className="flex-1">
          {/* HERO + STATS */}
          <View style={{ marginBottom: 16, paddingHorizontal: 20 }}>
            <HeroBalanceCard
              label="Deuda activa"
              value={formatEuro(summary.totalRemaining)}
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
                        width: `${summary.pctPaid}%`,
                        borderRadius: 999,
                        backgroundColor: "white",
                      }}
                    />
                  </View>
                  <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: "600", marginTop: 6, textAlign: "center" }} numberOfLines={1}>
                    {summary.pctPaid.toFixed(0)}% pagado
                  </Text>
                </View>
              }
            />

            <StatsRow
              items={[
                { key: "cuota", label: "CUOTAS/MES", value: formatEuro(summary.monthlyEquivalentPayment) },
                { key: "activas", label: "ACTIVAS", value: String(summary.activeCount) },
                { key: "proximo", label: "PRÓXIMO PAGO", value: nextPaymentLabel },
              ]}
            />
          </View>

          {/* FILTROS */}
          <SegmentedTabs<FilterType>
            options={[
              { key: "active", label: "Activas" },
              { key: "paid", label: "Pagadas" },
              { key: "all", label: "Todas" },
            ]}
            value={filter}
            onChange={setFilter}
            variant="underline"
          />

          {/* LISTA DE DEUDAS */}
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 20, paddingTop: 14 }}
          >
            {filteredDebts.length === 0 ? (
              <Text className="text-center text-gray-400 mb-4 text-sm">
                No hay deudas en este estado.
              </Text>
            ) : (
              filteredDebts.map((d) => {
                const total = d.totalAmount;
                const paid =
                  d.payed != null ? d.payed : Math.max(0, Math.min(total, total - d.remainingAmount));

                return (
                  <DebtListCard
                    key={d.id}
                    title={d.name}
                    icon={d.emoji}
                    color={d.color}
                    totalAmount={total}
                    paidAmount={paid}
                    remainingAmount={d.remainingAmount}
                    monthlyPayment={d.monthlyPayment}
                    paymentFrequency={d.paymentFrequency}
                    nextDueDate={d.status === "active" ? d.nextDueDate : null}
                    onPress={() => navigation.navigate("DebtDetail", { debtId: d.id })}
                  />
                );
              })
            )}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}
