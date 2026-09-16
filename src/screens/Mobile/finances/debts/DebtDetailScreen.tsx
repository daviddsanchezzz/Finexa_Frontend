// src/screens/Debts/DebtDetailScreen.tsx
import React, { useCallback, useMemo, useState } from "react";
import { View, Text, SafeAreaView, ScrollView, TextInput, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useFocusEffect } from "@react-navigation/native";
import { colors } from "../../../../theme/theme";
import AppHeader from "../../../../components/AppHeader";
import OverflowMenuButton from "../../../../components/OverflowMenuButton";
import HeroBalanceCard from "../../../../components/HeroBalanceCard";
import StatsRow from "../../../../components/StatsRow";
import SegmentedTabs from "../../../../components/SegmentedTabs";
import TransactionsList from "../../../../components/TransactionsList";
import WalletIcon from "../../../../components/WalletIcon";
import api from "../../../../api/api";
import { formatEuro as formatEuroBase } from "../../../../utils/currency";
import { appAlert } from "../../../../utils/appAlert";
import { markTransactionsDirty } from "../../../../utils/transactionsInvalidation";
import { DEBT_TYPE_OPTIONS, DebtFrequency, DebtType } from "./debtFormShared";

type DebtStatus = "active" | "paid" | "closed";

interface DebtSubcategory {
  id: number;
  name: string;
  emoji?: string | null;
  color?: string | null;
}

interface DebtWallet {
  id: number;
  name: string;
  emoji?: string | null;
}

interface Debt {
  id: number;
  type: DebtType;
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
  nextDueDate?: string | null;
  startDate?: string | null;
  expectedEndDate?: string | null;
  notes?: string | null;
  walletId?: number | null;
  wallet?: DebtWallet | null;
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
  isRecurring?: boolean;
  excludeFromStats?: boolean;
  category?: { id: number; name: string; emoji?: string; color?: string };
  subcategory?: { id: number; name: string; emoji?: string; color?: string };
  wallet?: { id: number; name: string; emoji?: string };
}

type DetailTab = "info" | "transactions" | "amortization";

const formatEuro = (n: number) => `${formatEuroBase(n)} €`;

const FREQUENCY_SUFFIX: Record<DebtFrequency, string> = {
  weekly: "semana",
  monthly: "mes",
  quarterly: "trim.",
  yearly: "año",
};

const STATUS_LABEL: Record<DebtStatus, string> = {
  active: "Activa",
  paid: "Pagada",
  closed: "Cerrada",
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function daysUntil(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

function daysLabel(days: number): string {
  if (days < 0) return "Vencido";
  if (days === 0) return "Hoy";
  if (days === 1) return "Mañana";
  return `${days} días`;
}

type AmortizationResult = { months: number; years: number; totalInterest: number } | null;

const simulateAmortization = (
  principal: number,
  annualRatePercent: number,
  baseMonthlyPayment: number,
  extra: number
): AmortizationResult => {
  const monthlyRate = annualRatePercent / 100 / 12;
  const monthlyPayment = baseMonthlyPayment + extra;

  if (monthlyPayment <= 0 || principal <= 0 || monthlyRate < 0) return null;

  let balance = principal;
  let months = 0;
  let interestAcc = 0;
  const MAX_MONTHS = 1200;

  while (balance > 0 && months < MAX_MONTHS) {
    const interest = balance * monthlyRate;
    const principalPaid = monthlyPayment - interest;
    if (principalPaid <= 0) return null;
    interestAcc += interest;
    balance -= principalPaid;
    months++;
  }

  if (months >= MAX_MONTHS) return null;
  return { months, years: months / 12, totalInterest: interestAcc };
};

export default function DebtDetailScreen({ route, navigation }: any) {
  const { debtId } = route.params || {};
  const [tab, setTab] = useState<DetailTab>("info");
  const [extraPerMonthText, setExtraPerMonthText] = useState("50");

  const debtQuery = useQuery({
    queryKey: ["debts", "detail", debtId],
    queryFn: async () => (await api.get(`/debts/${debtId}`)).data as Debt,
    enabled: !!debtId,
  });
  const debt = debtQuery.data ?? null;
  const loadingDebt = debtQuery.isLoading;

  const txQuery = useQuery({
    queryKey: ["debts", "transactions", debt?.subcategoryId],
    queryFn: async () =>
      (await api.get("/transactions", { params: { type: "expense", subcategoryId: debt!.subcategoryId } })).data as Tx[],
    enabled: !!debt?.subcategoryId,
  });
  const transactions = useMemo(
    () =>
      (txQuery.data ?? [])
        .filter((tx) => tx.isRecurring === false)
        .filter((tx) => tx.excludeFromStats !== true)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [txQuery.data]
  );
  const loadingTx = txQuery.isLoading;

  useFocusEffect(
    useCallback(() => {
      debtQuery.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const handleDeleteDebt = () => {
    if (!debt) return;
    appAlert("Eliminar deuda", "¿Seguro que quieres eliminar esta deuda? Esta acción no se puede deshacer.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/debts/${debt.id}`);
            markTransactionsDirty();
            navigation.goBack();
          } catch (error) {
            console.error("❌ Error al eliminar deuda:", error);
            appAlert("Error", "Ha ocurrido un error al eliminar la deuda. Inténtalo de nuevo.");
          }
        },
      },
    ]);
  };

  if (loadingDebt || !debt) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="px-5 pb-2">
          <AppHeader title="Detalle de deuda" showBack showProfile={false} showDatePicker={false} />
        </View>
        <View className="flex-1 justify-center items-center">
          {loadingDebt ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <Text className="text-gray-400 text-center">No se ha encontrado la deuda.</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const total = debt.totalAmount || 0;
  const remaining = Math.max(debt.remainingAmount || 0, 0);
  const paid = debt.payed != null ? Math.max(debt.payed, 0) : total > 0 ? Math.max(Math.min(total, total - remaining), 0) : 0;
  const percentage = total > 0 ? Math.min(100, Math.max(0, Math.round((paid / total) * 100))) : 0;
  const hasPeriodicPayments = debt.monthlyPayment != null && !!debt.paymentFrequency;

  const nextPaymentLabel = debt.status === "active" && debt.nextDueDate ? daysLabel(daysUntil(debt.nextDueDate)) : "—";
  const cuotaLabel = hasPeriodicPayments ? `${formatEuro(debt.monthlyPayment!)}/${FREQUENCY_SUFFIX[debt.paymentFrequency!]}` : "—";
  // Cuotas pagadas = lo declarado al crear/editar la deuda + las transacciones
  // reales registradas desde entonces. Si no hay ninguna de las dos cosas
  // (deuda recién importada sin historial), lo estimamos a partir de lo ya
  // pagado, la cuota y la recurrencia — es una aproximación, no un dato real.
  const declaredInstallmentsPaid = (debt.installmentsPaid || 0) + transactions.length;
  const isInstallmentsEstimated = declaredInstallmentsPaid === 0 && hasPeriodicPayments && paid > 0;
  const installmentsPaid = isInstallmentsEstimated ? Math.round(paid / debt.monthlyPayment!) : declaredInstallmentsPaid;
  const typeLabel = DEBT_TYPE_OPTIONS.find((o) => o.value === debt.type)?.label || "Deuda";

  const canSimulate = !!debt.interestRate && !!debt.monthlyPayment && remaining > 0;
  const extraPerMonth = Number(extraPerMonthText.replace(",", ".")) || 0;

  const baseScenario: AmortizationResult =
    canSimulate && debt.interestRate && debt.monthlyPayment ? simulateAmortization(remaining, debt.interestRate, debt.monthlyPayment, 0) : null;
  const extraScenario: AmortizationResult =
    canSimulate && debt.interestRate && debt.monthlyPayment
      ? simulateAmortization(remaining, debt.interestRate, debt.monthlyPayment, extraPerMonth)
      : null;
  const interestSaved = baseScenario && extraScenario ? baseScenario.totalInterest - extraScenario.totalInterest : null;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pb-2">
        <AppHeader
          title={debt.name}
          titleNumberOfLines={1}
          showBack
          showProfile={false}
          showDatePicker={false}
          rightElement={
            <OverflowMenuButton
              title={debt.name}
              actions={[
                { label: "Editar", onPress: () => navigation.navigate("DebtEdit", { debtId: debt.id }) },
                { label: "Eliminar", style: "destructive", onPress: handleDeleteDebt },
              ]}
              iconSize={19}
              accessibilityLabel="Acciones de la deuda"
              buttonStyle={{ width: 30, height: 36 }}
            />
          }
        />
      </View>

      <View style={{ paddingHorizontal: 20 }}>
        <HeroBalanceCard
          label="Pendiente por pagar"
          value={formatEuro(remaining)}
          style={{ marginBottom: 8 }}
          footer={
            <View style={{ width: "100%", marginTop: 8, alignItems: "center" }}>
              <View style={{ width: "100%", height: 6, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.25)", overflow: "hidden" }}>
                <View style={{ height: "100%", width: `${percentage}%`, borderRadius: 999, backgroundColor: "white" }} />
              </View>
              <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: "600", marginTop: 6, textAlign: "center" }} numberOfLines={1}>
                {percentage}% pagado
              </Text>
            </View>
          }
        />

        <StatsRow
          items={[
            { key: "pagado", label: "PAGADO", value: formatEuro(paid) },
            { key: "cuota", label: "CUOTA", value: cuotaLabel },
            { key: "proximo", label: "PRÓXIMO PAGO", value: nextPaymentLabel },
          ]}
        />
      </View>

      <View style={{ marginTop: 12 }}>
        <SegmentedTabs<DetailTab>
          variant="underline"
          options={[
            { key: "info", label: "Información" },
            { key: "transactions", label: "Transacciones" },
            { key: "amortization", label: "Amortización" },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>

      <ScrollView key={tab} style={{ flex: 1, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40, paddingTop: 14 }}>
        {tab === "info" && (() => {
          const metrics = [
            { label: "Importe inicial", value: formatEuro(total) },
            { label: "Interés / TAE", value: debt.interestRate != null ? `${debt.interestRate}%` : "—" },
            { label: "Cuotas pagadas", value: isInstallmentsEstimated ? `~${installmentsPaid}` : String(installmentsPaid) },
          ];

          const technicalRows: { label: string; value?: string; render?: React.ReactNode }[] = [
            ...(debt.wallet
              ? [
                  {
                    label: "Cuenta asociada",
                    render: (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <WalletIcon emoji={debt.wallet.emoji} size={16} />
                        <Text style={{ fontSize: 13, fontWeight: "800", color: "#0F172A" }} numberOfLines={1}>
                          {debt.wallet.name}
                        </Text>
                      </View>
                    ),
                  },
                ]
              : []),
            ...(hasPeriodicPayments ? [{ label: "Cuota", value: cuotaLabel }] : []),
            ...(debt.startDate ? [{ label: "Fecha de inicio", value: formatDate(debt.startDate) }] : []),
            ...(debt.expectedEndDate ? [{ label: "Fecha prevista de fin", value: formatDate(debt.expectedEndDate) }] : []),
            ...(hasPeriodicPayments && debt.nextDueDate ? [{ label: "Próximo pago", value: formatDate(debt.nextDueDate) }] : []),
          ];

          return (
            <View style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 20, overflow: "hidden" }}>
              <View style={{ paddingHorizontal: 14, paddingTop: 16, paddingBottom: 18 }}>
                <Text style={{ fontSize: 12, fontWeight: "900", color: "#64748B", letterSpacing: 0.55, marginBottom: 17 }}>RESUMEN</Text>
                <View style={{ flexDirection: "row", alignItems: "stretch" }}>
                  {metrics.map((metric, index) => (
                    <View
                      key={metric.label}
                      style={{ flex: 1, alignItems: "center", justifyContent: "flex-start", paddingHorizontal: 8, borderLeftWidth: index > 0 ? 1 : 0, borderLeftColor: "#E8EDF4" }}
                    >
                      <Text style={{ fontSize: 15, fontWeight: "900", color: "#0F172A", textAlign: "center" }} numberOfLines={1}>
                        {metric.value}
                      </Text>
                      <Text style={{ fontSize: 10.5, fontWeight: "600", color: "#94A3B8", textAlign: "center", marginTop: 4 }} numberOfLines={2}>
                        {metric.label}
                      </Text>
                    </View>
                  ))}
                </View>
                {isInstallmentsEstimated ? (
                  <Text style={{ fontSize: 10.5, fontWeight: "600", color: "#94A3B8", textAlign: "center", marginTop: 10 }}>
                    ~ Cuotas pagadas estimadas a partir de lo ya amortizado
                  </Text>
                ) : null}
              </View>

              <View style={{ height: 1, backgroundColor: "#E8EDF4", marginHorizontal: 14 }} />

              <View style={{ paddingHorizontal: 14, paddingTop: 17, paddingBottom: technicalRows.length ? 5 : 18 }}>
                <Text style={{ fontSize: 12, fontWeight: "900", color: "#64748B", letterSpacing: 0.55 }}>SOBRE LA DEUDA</Text>
                <Text style={{ fontSize: 14, fontWeight: "800", color: "#0F172A", lineHeight: 20, marginTop: 11 }}>{debt.name}</Text>
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#64748B", marginTop: 5 }}>
                  {[typeLabel, STATUS_LABEL[debt.status], debt.entity].filter(Boolean).join(" · ")}
                </Text>

                {technicalRows.length ? (
                  <View style={{ borderTopWidth: 1, borderTopColor: "#E8EDF4", marginTop: 14 }}>
                    {technicalRows.map((row, index) => (
                      <View
                        key={row.label}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          minHeight: 43,
                          borderBottomWidth: index < technicalRows.length - 1 ? 1 : 0,
                          borderBottomColor: "#E8EDF4",
                          gap: 16,
                        }}
                      >
                        <Text style={{ fontSize: 12.5, fontWeight: "600", color: "#64748B" }}>{row.label}</Text>
                        {row.render ? (
                          row.render
                        ) : (
                          <Text style={{ flex: 1, minWidth: 0, paddingVertical: 8, fontSize: 13, fontWeight: "800", color: "#0F172A", textAlign: "right" }}>
                            {row.value}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>

              {debt.notes ? (
                <View style={{ borderTopWidth: 1, borderTopColor: "#E8EDF4", paddingHorizontal: 14, paddingVertical: 14 }}>
                  <Text style={{ fontSize: 12, fontWeight: "900", color: "#64748B", letterSpacing: 0.55, marginBottom: 8 }}>NOTAS</Text>
                  <Text style={{ fontSize: 13, lineHeight: 19, color: "#0F172A" }}>{debt.notes}</Text>
                </View>
              ) : null}
            </View>
          );
        })()}

        {tab === "transactions" && (
          <View>
            {loadingTx ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 16 }} />
            ) : transactions.length === 0 ? (
              <Text style={{ fontSize: 13, color: "#94A3B8", textAlign: "center", marginTop: 24 }}>
                Todavía no hay transacciones asociadas a esta deuda.
              </Text>
            ) : (
              <TransactionsList
                transactions={transactions}
                onDeleted={() => txQuery.refetch()}
                navigation={navigation}
              />
            )}
          </View>
        )}

        {tab === "amortization" && (() => {
          const scenarioRows =
            baseScenario && extraScenario
              ? [
                  { label: "Termina en (actual)", value: `${baseScenario.months} meses (${baseScenario.years.toFixed(1)} años)` },
                  { label: "Intereses estimados (actual)", value: formatEuro(Math.round(baseScenario.totalInterest)) },
                  { label: `Termina en (con +${extraPerMonth.toFixed(0)} €/mes)`, value: `${extraScenario.months} meses (${extraScenario.years.toFixed(1)} años)` },
                  { label: "Intereses estimados (con extra)", value: formatEuro(Math.round(extraScenario.totalInterest)) },
                ]
              : [];

          return (
            <View style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 20, overflow: "hidden" }}>
              <View style={{ paddingHorizontal: 14, paddingTop: 16, paddingBottom: canSimulate ? 16 : 18 }}>
                <Text style={{ fontSize: 12, fontWeight: "900", color: "#64748B", letterSpacing: 0.55 }}>SIMULADOR DE PAGO EXTRA</Text>
                <Text style={{ fontSize: 12, color: "#64748B", lineHeight: 17, marginTop: 11 }}>
                  Simula cuánto antes terminarías si añades un pago extra fijo cada mes sobre la cuota actual.
                </Text>

                {!canSimulate ? (
                  <Text style={{ fontSize: 12.5, fontWeight: "600", color: colors.danger, marginTop: 14, lineHeight: 18 }}>
                    Para usar la calculadora, indica el interés y la cuota en la deuda.
                  </Text>
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 14, height: 44, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, paddingHorizontal: 12 }}>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748B", marginRight: 10 }}>Pago extra</Text>
                    <TextInput
                      value={extraPerMonthText}
                      onChangeText={setExtraPerMonthText}
                      keyboardType="numeric"
                      placeholder="0"
                      style={{ flex: 1, textAlign: "right", fontSize: 14, fontWeight: "700", color: colors.ink }}
                    />
                    <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748B", marginLeft: 6 }}>€/mes</Text>
                  </View>
                )}
              </View>

              {canSimulate ? (
                <>
                  <View style={{ height: 1, backgroundColor: "#E8EDF4", marginHorizontal: 14 }} />
                  <View style={{ paddingHorizontal: 14, paddingTop: 17, paddingBottom: 18 }}>
                    {scenarioRows.length ? (
                      <View>
                        {scenarioRows.map((row, index) => (
                          <View
                            key={row.label}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "space-between",
                              minHeight: 43,
                              borderBottomWidth: index < scenarioRows.length - 1 || (interestSaved !== null && interestSaved > 0) ? 1 : 0,
                              borderBottomColor: "#E8EDF4",
                              gap: 16,
                            }}
                          >
                            <Text style={{ fontSize: 12.5, fontWeight: "600", color: "#64748B" }}>{row.label}</Text>
                            <Text style={{ flex: 1, minWidth: 0, paddingVertical: 8, fontSize: 13, fontWeight: "800", color: "#0F172A", textAlign: "right" }}>
                              {row.value}
                            </Text>
                          </View>
                        ))}
                        {interestSaved !== null && interestSaved > 0 ? (
                          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 43, gap: 16 }}>
                            <Text style={{ fontSize: 12.5, fontWeight: "600", color: "#64748B" }}>Ahorro estimado</Text>
                            <Text style={{ fontSize: 13, fontWeight: "800", color: colors.success, textAlign: "right" }}>
                              {formatEuro(Math.round(interestSaved))}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ) : (
                      <Text style={{ fontSize: 12.5, fontWeight: "600", color: colors.danger, lineHeight: 18 }}>
                        Con estos datos la cuota apenas cubre los intereses: al ritmo actual tardarías más de 100 años en pagarla. Revisa el importe de la cuota o el interés de la deuda.
                      </Text>
                    )}
                  </View>
                </>
              ) : null}
            </View>
          );
        })()}
      </ScrollView>
    </SafeAreaView>
  );
}
