import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../../api/api";
import { useAuth } from "../../../context/AuthContext";
import { useNetWorthTrend } from "../../../hooks/useNetWorthTrend";
import { useInvestmentPeriodProfit } from "../../../hooks/useInvestmentPeriodProfit";
import {
  formatCurrency,
  formatEuro,
  formatEuroSigned,
} from "../../../utils/currency";
import { MONTH_NAMES_ES } from "../../../utils/wealthSeries";
import { markTransactionsDirty } from "../../../utils/transactionsInvalidation";
import TrendChart from "../../../components/TrendChart";
import PieChart from "../../../components/PieChart";
import WalletIcon from "../../../components/WalletIcon";
import WalletGoalReservationsModal from "../../../components/WalletGoalReservationsModal";

const BLUE = "#2458E8",
  INK = "#25334B",
  MUTED = "#74829A",
  BORDER = "#E3EAF4";
const FONT =
  Platform.OS === "web"
    ? '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    : "System";
type Wallet = {
  id: number;
  name: string;
  emoji?: string;
  balance: number;
  currency: string;
  kind: "cash" | "savings" | "investment";
};
type Asset = {
  id: number;
  name: string;
  abbreviation?: string | null;
  currentValue: number;
  pnl: number;
  type: string;
};
type Debt = {
  id: number;
  name: string;
  emoji?: string;
  remainingAmount: number;
  status: string;
};
type Composition = {
  wallets: Wallet[];
  investments: {
    totalCurrentValue: number;
    totalPnL: number;
    totalInvested: number;
    assets: Asset[];
  };
  debts: Debt[];
};

const money = (n: number, currency = "EUR") => formatCurrency(n, currency);
const Signed = ({
  value,
  currency = "EUR",
  onBlue = false,
}: {
  value: number;
  currency?: string;
  onBlue?: boolean;
}) => (
  <Text
    style={[
      s.signed,
      {
        color: onBlue
          ? value < 0
            ? "#FFD5DC"
            : "#D7E3FF"
          : value > 0
            ? "#16846B"
            : value < 0
              ? "#D45B69"
              : MUTED,
      },
    ]}
  >
    {value > 0 ? "+" : ""}
    {money(value, currency)}
  </Text>
);

function Section({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={s.card}>
      <View style={s.cardHead}>
        <View>
          <Text style={s.cardTitle}>{title}</Text>
          {caption && <Text style={s.caption}>{caption}</Text>}
        </View>
      </View>
      {children}
    </View>
  );
}

function Pill({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[s.pill, active && s.pillOn]}>
      <Text style={[s.pillText, active && s.pillTextOn]}>{label}</Text>
    </Pressable>
  );
}

function ManualMonthModal({
  visible,
  onClose,
  initialYear,
  initialMonth,
  existing,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  initialYear: number;
  initialMonth: number;
  existing?: any;
  onSaved: () => void;
}) {
  const [year, setYear] = useState(initialYear),
    [month, setMonth] = useState(initialMonth);
  const [income, setIncome] = useState(""),
    [expense, setExpense] = useState(""),
    [balance, setBalance] = useState("");
  const [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [confirmDelete, setConfirmDelete] = useState(false);
  React.useEffect(() => {
    if (visible) {
      setYear(initialYear);
      setMonth(initialMonth);
      setIncome(existing?.income == null ? "" : String(existing.income));
      setExpense(existing?.expense == null ? "" : String(existing.expense));
      setBalance(
        existing?.finalBalance == null ? "" : String(existing.finalBalance),
      );
      setError("");
      setConfirmDelete(false);
    }
  }, [visible, initialYear, initialMonth, existing]);
  const number = (value: string) =>
    value.trim() === ""
      ? undefined
      : Number(value.replace(/\./g, "").replace(",", "."));
  const save = async () => {
    const values = [number(income), number(expense), number(balance)];
    if (values.some((v) => v !== undefined && !Number.isFinite(v)))
      return setError("Introduce importes válidos.");
    setSaving(true);
    setError("");
    try {
      await api.post("/manual-month", {
        year,
        month,
        income: values[0],
        expense: values[1],
        finalBalance: values[2],
      });
      markTransactionsDirty();
      onSaved();
      onClose();
    } catch {
      setError("No se pudo guardar el registro manual.");
    } finally {
      setSaving(false);
    }
  };
  const remove = async () => {
    if (!existing) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      setError("Pulsa “Eliminar ajuste” de nuevo para confirmarlo.");
      return;
    }
    setSaving(true);
    try {
      await api.delete(`/manual-month/${year}/${month}`);
      markTransactionsDirty();
      onSaved();
      onClose();
    } catch {
      setError("No se pudo eliminar el registro manual.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={s.modalBack}>
        <View style={s.modal}>
          <View style={s.modalHead}>
            <View>
              <Text style={s.modalTitle}>Ajustar mes manualmente</Text>
              <Text style={s.caption}>
                Completa solo los datos que quieras corregir.
              </Text>
            </View>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={22} color={INK} />
            </Pressable>
          </View>
          <View style={s.yearLine}>
            <Pressable onPress={() => setYear((y) => y - 1)}>
              <Ionicons name="chevron-back" size={20} color={BLUE} />
            </Pressable>
            <Text style={s.yearText}>{year}</Text>
            <Pressable onPress={() => setYear((y) => y + 1)}>
              <Ionicons name="chevron-forward" size={20} color={BLUE} />
            </Pressable>
          </View>
          <View style={s.monthGrid}>
            {MONTH_NAMES_ES.map((name, i) => (
              <Pressable
                key={name}
                onPress={() => setMonth(i)}
                style={[s.monthChoice, month === i && s.monthChoiceOn]}
              >
                <Text
                  style={[s.monthChoiceText, month === i && { color: "white" }]}
                >
                  {name.slice(0, 3)}
                </Text>
              </Pressable>
            ))}
          </View>
          {[
            ["Ingresos", income, setIncome],
            ["Gastos", expense, setExpense],
            ["Patrimonio al cierre", balance, setBalance],
          ].map(([label, value, setter]: any) => (
            <View key={label} style={s.inputGroup}>
              <Text style={s.inputLabel}>{label}</Text>
              <TextInput
                value={value}
                onChangeText={setter}
                keyboardType="decimal-pad"
                placeholder="Sin modificar"
                placeholderTextColor="#AAB5C6"
                style={s.input}
              />
            </View>
          ))}
          {!!error && <Text style={s.error}>{error}</Text>}
          <View style={s.modalActions}>
            {existing && (
              <Pressable onPress={remove} disabled={saving} style={s.delete}>
                <Text style={s.deleteText}>Eliminar ajuste</Text>
              </Pressable>
            )}
            <View style={{ flex: 1 }} />
            <Pressable onPress={onClose} style={s.cancel}>
              <Text style={s.cancelText}>Cancelar</Text>
            </Pressable>
            <Pressable onPress={save} disabled={saving} style={s.save}>
              <Text style={s.saveText}>
                {saving ? "Guardando…" : "Guardar"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function DesktopNetWorthScreen({ navigation }: any) {
  const { user } = useAuth();
  const client = useQueryClient();
  const currency = user?.currency || "EUR";
  const [tab, setTab] = useState<"composition" | "evolution">("composition");
  const [group, setGroup] = useState<"type" | "wallet">("type");
  const [range, setRange] = useState("6M");
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [manual, setManual] = useState<{ month: number; row?: any } | null>(
    null,
  );
  const composition = useQuery({
    queryKey: ["desktopNetWorthComposition"],
    queryFn: async () => {
      const [wallets, investments, debts] = await Promise.all([
        api.get("/wallets"),
        api.get("/investments/summary"),
        api.get("/debts"),
      ]);
      return {
        wallets: wallets.data || [],
        investments: investments.data || { totalCurrentValue: 0, assets: [] },
        debts: debts.data || [],
      } as Composition;
    },
    staleTime: 30_000,
  });
  const net = useNetWorthTrend("month");
  const currentMonthStart = new Date();
  currentMonthStart.setDate(1);
  currentMonthStart.setHours(0, 0, 0, 0);
  const investment = useInvestmentPeriodProfit(
    currentMonthStart.toISOString(),
    new Date().toISOString(),
  );
  const manualRows = useQuery({
    queryKey: ["desktopManualMonth"],
    queryFn: async () => (await api.get("/manual-month")).data || [],
  });
  const c = composition.data;
  const wallets = c?.wallets || [];
  const cash = wallets.filter((x) => x.kind === "cash");
  const savings = wallets.filter((x) => x.kind === "savings");
  const debts = (c?.debts || []).filter((x) => x.status === "active");
  const cashTotal = cash.reduce((a, x) => a + Number(x.balance || 0), 0),
    savingsTotal = savings.reduce((a, x) => a + Number(x.balance || 0), 0),
    investmentTotal = Number(c?.investments.totalCurrentValue || 0),
    debtTotal = debts.reduce((a, x) => a + Number(x.remainingAmount || 0), 0),
    assetsTotal = cashTotal + savingsTotal + investmentTotal,
    netAssets = assetsTotal - debtTotal;
  const segments = [
    { label: "Liquidez", value: cashTotal, color: "#3B82F6" },
    { label: "Ahorro", value: savingsTotal, color: "#10B981" },
    { label: "Inversión", value: investmentTotal, color: "#8B5CF6" },
    ...(debtTotal
      ? [{ label: "Deudas", value: debtTotal, color: "#EF4444" }]
      : []),
  ];
  const points = useMemo(() => {
    let all = net.series;
    const now = new Date().getFullYear();
    if (range === "6M") all = all.slice(-6);
    if (range === "YTD") all = all.filter((x) => x.year === now);
    if (range === "1A") all = all.slice(-12);
    return [
      ...all.map((x) => ({ label: x.label, value: x.finalAmount })),
      { label: "Hoy", value: net.current },
    ];
  }, [net.series, net.current, range]);
  const months = net.monthsByYear[year] || [];
  const now = new Date();
  const finished = (m: number) =>
    year < now.getFullYear() ||
    (year === now.getFullYear() && m < now.getMonth());
  const refresh = async () => {
    await Promise.all([
      composition.refetch(),
      manualRows.refetch(),
      client.invalidateQueries({ queryKey: ["netWorthTrendSeries"] }),
      client.invalidateQueries({ queryKey: ["netWorthCurrent"] }),
    ]);
  };
  const opening = net.current - net.periodDelta;
  const pct = opening ? (net.periodDelta / Math.abs(opening)) * 100 : 0;
  const manualExisting = manualRows.data?.find(
    (x: any) => x.year === year && x.month === manual?.month,
  );
  return (
    <ScrollView
      style={s.page}
      contentContainerStyle={s.pageContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={s.header}>
        <View>
          <Text style={s.eyebrow}>MI DINERO</Text>
          <Text style={s.title}>Patrimonio</Text>
          <Text style={s.subtitle}>
            Lo que tienes, cómo está repartido y cómo evoluciona.
          </Text>
        </View>
        <Pressable onPress={refresh} style={s.refresh}>
          <Ionicons name="refresh" size={16} color={BLUE} />
          <Text style={s.refreshText}>Actualizar</Text>
        </Pressable>
      </View>
      <View style={s.tabs}>
        <Pill
          label="Composición"
          active={tab === "composition"}
          onPress={() => setTab("composition")}
        />
        <Pill
          label="Evolución"
          active={tab === "evolution"}
          onPress={() => setTab("evolution")}
        />
      </View>
      {tab === "composition" ? (
        <>
          <View style={s.hero}>
            <View>
              <Text style={s.heroEyebrow}>PATRIMONIO NETO</Text>
              <Text style={s.heroValue}>
                {composition.isPending ? "—" : money(netAssets, currency)}
              </Text>
              <Text style={s.heroCaption}>
                Activos {money(assetsTotal, currency)} · Deudas{" "}
                {money(debtTotal, currency)}
              </Text>
            </View>
            <View style={s.heroSide}>
              <Text style={s.heroSideLabel}>Este mes</Text>
              <Signed value={net.periodDelta} currency={currency} onBlue />
              <Text style={s.heroSideCaption}>
                {net.periodDelta >= 0 ? "Sube" : "Baja"}{" "}
                {Math.abs(pct).toFixed(1)}% frente al cierre anterior
              </Text>
            </View>
          </View>
          {composition.isError ? (
            <View style={s.errorCard}>
              <Text style={s.error}>
                No se pudo cargar la composición. Pulsa Actualizar para
                reintentar.
              </Text>
            </View>
          ) : (
            <>
              <View style={s.twoCols}>
                <Section
                  title="Cómo se reparte"
                  caption="Activos y deudas actuales"
                >
                  <View style={s.compositionTop}>
                    <View style={s.chartWrap}>
                      <PieChart
                        data={segments.map((x) => ({
                          ...x,
                          realValue: x.value,
                        }))}
                        size={150}
                        innerRadius={46}
                        formatValue={(v) => money(v, currency)}
                      />
                    </View>
                    <View style={s.legend}>
                      {segments.map((x) => (
                        <View key={x.label} style={s.legendRow}>
                          <View style={[s.dot, { backgroundColor: x.color }]} />
                          <Text style={s.legendLabel}>{x.label}</Text>
                          <Text style={s.legendValue}>
                            {money(x.value, currency)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </Section>
                <Section title="Resumen" caption="La fotografía de hoy">
                  <View style={s.summaryHero}>
                    <Text style={s.summaryLabel}>Patrimonio neto</Text>
                    <Text style={s.summaryHeroValue}>
                      {money(netAssets, currency)}
                    </Text>
                  </View>
                  <View style={s.summaryGrid}>
                    <View style={s.summaryMetric}>
                      <Text style={s.summaryLabel}>Activos</Text>
                      <Text style={s.summaryValue}>
                        {money(assetsTotal, currency)}
                      </Text>
                    </View>
                    <View style={s.summaryMetric}>
                      <Text style={s.summaryLabel}>Pasivos</Text>
                      <Text style={[s.summaryValue, { color: "#D45B69" }]}>
                        −{money(debtTotal, currency)}
                      </Text>
                    </View>
                    <View style={s.summaryMetric}>
                      <Text style={s.summaryLabel}>Rentabilidad total</Text>
                      <Signed
                        value={Number(c?.investments.totalPnL || 0)}
                        currency={currency}
                      />
                    </View>
                  </View>
                </Section>
              </View>
              <Section
                title="Detalle de tu patrimonio"
                caption="Consulta las carteras, activos y deudas que forman el total"
              >
                <View style={s.groupSwitch}>
                  <Pill
                    label="Por tipo"
                    active={group === "type"}
                    onPress={() => setGroup("type")}
                  />
                  <Pill
                    label="Por cartera"
                    active={group === "wallet"}
                    onPress={() => setGroup("wallet")}
                  />
                </View>
                {group === "wallet" ? (
                  <Rows
                    rows={wallets.map((w) => ({
                      key: `w${w.id}`,
                      icon: w.emoji,
                      title: w.name,
                      sub:
                        w.kind === "cash"
                          ? "Liquidez"
                          : w.kind === "savings"
                            ? "Ahorro"
                            : "Inversión",
                      value: w.balance,
                      currency: w.currency,
                      onPress: () => setSelectedWallet(w),
                    }))}
                  />
                ) : (
                  <>
                    <Group
                      title="Liquidez"
                      color="#3B82F6"
                      total={cashTotal}
                      currency={currency}
                      rows={cash.map((w) => ({
                        key: `c${w.id}`,
                        icon: w.emoji,
                        title: w.name,
                        value: w.balance,
                        currency: w.currency,
                        onPress: () => setSelectedWallet(w),
                      }))}
                    />
                    <Group
                      title="Ahorro"
                      color="#10B981"
                      total={savingsTotal}
                      currency={currency}
                      rows={savings.map((w) => ({
                        key: `s${w.id}`,
                        icon: w.emoji,
                        title: w.name,
                        value: w.balance,
                        currency: w.currency,
                        onPress: () => setSelectedWallet(w),
                      }))}
                    />
                    <Group
                      title="Inversiones"
                      color="#8B5CF6"
                      total={investmentTotal}
                      currency={currency}
                      rows={(c?.investments.assets || [])
                        .sort((a, b) => b.currentValue - a.currentValue)
                        .map((a) => ({
                          key: `a${a.id}`,
                          icon: "📈",
                          title: a.abbreviation || a.name,
                          sub: a.type,
                          value: a.currentValue,
                          currency,
                        }))}
                    />
                    {debtTotal > 0 && (
                      <Group
                        title="Deudas"
                        color="#EF4444"
                        total={-debtTotal}
                        currency={currency}
                        rows={debts.map((d) => ({
                          key: `d${d.id}`,
                          icon: d.emoji || "💳",
                          title: d.name,
                          sub: "Pendiente",
                          value: -d.remainingAmount,
                          currency,
                        }))}
                      />
                    )}
                  </>
                )}
              </Section>
            </>
          )}
        </>
      ) : (
        <>
          <View style={s.hero}>
            <View>
              <Text style={s.heroEyebrow}>EVOLUCIÓN DEL PATRIMONIO</Text>
              <Text style={s.heroValue}>{money(net.current, currency)}</Text>
              <Text style={s.heroCaption}>
                Saldo actual de todas tus carteras
              </Text>
            </View>
            <View style={s.heroSide}>
              <Text style={s.heroSideLabel}>{net.periodLabel}</Text>
              <Signed value={net.periodDelta} currency={currency} onBlue />
              <Text style={s.heroSideCaption}>
                {net.pctChange >= 0 ? "+" : ""}
                {net.pctChange.toFixed(1)}% frente al periodo anterior
              </Text>
            </View>
          </View>
          <Section
            title="Tu patrimonio en el tiempo"
            caption="Incluye cierres mensuales y el saldo de hoy"
          >
            <View style={s.rangeLine}>
              {["6M", "YTD", "1A", "Todo"].map((label) => (
                <Pill
                  key={label}
                  label={label}
                  active={range === label}
                  onPress={() => setRange(label)}
                />
              ))}
            </View>
            {net.isLoading ? (
              <ActivityIndicator color={BLUE} style={{ height: 210 }} />
            ) : (
              <TrendChart
                formatValue={(v) => money(v, currency)}
                height={220}
                xLabels={points.map((x) => x.label)}
                tooltipLabels={points.map((x) => x.label)}
                series={[
                  {
                    key: "wealth",
                    label: "Patrimonio",
                    color: BLUE,
                    values: points.map((x) => x.value),
                    area: true,
                  },
                ]}
              />
            )}
          </Section>
          <View style={s.twoCols}>
            <Section
              title="Qué ha cambiado este mes"
              caption="La variación no siempre viene de movimientos"
            >
              <View style={s.breakdown}>
                <Break
                  label="Ingresos menos gastos"
                  value={net.periodSavings}
                  currency={currency}
                />
                <Break
                  label="Rentabilidad de inversiones"
                  value={investment.profit}
                  currency={currency}
                />
                <Break
                  label="Ajustes y valoraciones"
                  value={
                    net.periodDelta - net.periodSavings - investment.profit
                  }
                  currency={currency}
                />
              </View>
            </Section>
            <Section
              title="Comparativa del periodo"
              caption="Respecto al último cierre"
            >
              <View style={s.breakdown}>
                <Break
                  label="Variación del patrimonio"
                  value={net.periodDelta}
                  currency={currency}
                />
                <View style={s.breakRow}>
                  <Text style={s.breakLabel}>Variación porcentual</Text>
                  <Text style={s.breakValue}>
                    {net.pctChange >= 0 ? "+" : ""}
                    {net.pctChange.toFixed(1)}%
                  </Text>
                </View>
                <View style={s.breakRow}>
                  <Text style={s.breakLabel}>Patrimonio de referencia</Text>
                  <Text style={s.breakValue}>{money(opening, currency)}</Text>
                </View>
              </View>
            </Section>
          </View>
          <Section
            title="Evolución mensual"
            caption="Los ajustes manuales corrigen los importes históricos"
          >
            <View style={s.tableHead}>
              <Text style={[s.tableLabel, { flex: 1.2 }]}>Mes</Text>
              <Text style={s.tableLabel}>Ingresos</Text>
              <Text style={s.tableLabel}>Gastos</Text>
              <Text style={s.tableLabel}>Ahorro</Text>
              <Text style={s.tableLabel}>Inversión</Text>
              <Text style={s.tableLabel}>Cierre</Text>
              <Text style={[s.tableLabel, { width: 44 }]}> </Text>
            </View>
            <View style={s.yearTableControl}>
              <Pressable onPress={() => setYear((y) => y - 1)}>
                <Ionicons name="chevron-back" size={18} color={BLUE} />
              </Pressable>
              <Text style={s.yearText}>{year}</Text>
              <Pressable onPress={() => setYear((y) => y + 1)}>
                <Ionicons name="chevron-forward" size={18} color={BLUE} />
              </Pressable>
            </View>
            {months.map((m) => (
              <View
                key={m.monthIndex}
                style={[
                  s.tableRow,
                  !finished(m.monthIndex) && { opacity: 0.45 },
                ]}
              >
                <Text style={[s.rowText, { flex: 1.2, fontWeight: "700" }]}>
                  {m.monthName}
                </Text>
                {finished(m.monthIndex) ? (
                  <>
                    <Text style={s.rowText}>{money(m.income, currency)}</Text>
                    <Text style={s.rowText}>{money(m.expense, currency)}</Text>
                    <Text style={s.rowText}>{money(m.saving, currency)}</Text>
                    <Text style={s.rowText}>
                      {m.investment == null
                        ? "—"
                        : money(m.investment, currency)}
                    </Text>
                    <Text style={[s.rowText, { fontWeight: "700" }]}>
                      {money(m.finalAmount, currency)}
                    </Text>
                  </>
                ) : (
                  <Text style={[s.rowText, { flex: 5 }]}>Aún no cerrado</Text>
                )}
                <Pressable
                  onPress={() =>
                    setManual({
                      month: m.monthIndex,
                      row: manualRows.data?.find(
                        (x: any) => x.year === year && x.month === m.monthIndex,
                      ),
                    })
                  }
                  style={s.edit}
                >
                  <Ionicons name="create-outline" size={16} color={BLUE} />
                </Pressable>
              </View>
            ))}
          </Section>
          <Section
            title="Resumen anual"
            caption="Selecciona un año para ver su detalle mensual"
          >
            <View style={s.tableHead}>
              <Text style={[s.tableLabel, { flex: 1.2 }]}>Año</Text>
              <Text style={s.tableLabel}>Ingresos</Text>
              <Text style={s.tableLabel}>Gastos</Text>
              <Text style={s.tableLabel}>Ahorro</Text>
              <Text style={s.tableLabel}>Inversión</Text>
              <Text style={s.tableLabel}>Cierre</Text>
            </View>
            {net.globalSummaryList.map((row) => (
              <Pressable
                key={row.year}
                onPress={() => setYear(row.year)}
                style={s.tableRow}
              >
                <Text style={[s.rowText, { flex: 1.2, fontWeight: "700" }]}>
                  {row.year}
                </Text>
                <Text style={s.rowText}>{money(row.income, currency)}</Text>
                <Text style={s.rowText}>{money(row.expense, currency)}</Text>
                <Text style={s.rowText}>{money(row.saving, currency)}</Text>
                <Text style={s.rowText}>{money(row.investment, currency)}</Text>
                <Text style={[s.rowText, { fontWeight: "700" }]}>
                  {money(row.finalAmount, currency)}
                </Text>
              </Pressable>
            ))}
          </Section>
        </>
      )}
      {selectedWallet && (
        <WalletGoalReservationsModal
          wallet={selectedWallet as any}
          onClose={() => setSelectedWallet(null)}
          onOpenGoal={(goalId) => {
            setSelectedWallet(null);
            navigation.navigate("GoalDetail", { goalId });
          }}
        />
      )}
      <ManualMonthModal
        visible={!!manual}
        onClose={() => setManual(null)}
        initialYear={year}
        initialMonth={manual?.month ?? now.getMonth()}
        existing={manual?.row ?? manualExisting}
        onSaved={() => {
          void refresh();
        }}
      />
    </ScrollView>
  );
}

function Break({
  label,
  value,
  currency,
}: {
  label: string;
  value: number;
  currency: string;
}) {
  return (
    <View style={s.breakRow}>
      <Text style={s.breakLabel}>{label}</Text>
      <Signed value={value} currency={currency} />
    </View>
  );
}
function Group({ title, color, total, currency, rows }: any) {
  return (
    <View style={s.group}>
      <View style={s.groupTitle}>
        <View style={[s.dot, { backgroundColor: color }]} />
        <Text style={s.groupName}>{title}</Text>
        <Text style={s.groupTotal}>{money(total, currency)}</Text>
      </View>
      <Rows rows={rows} />
    </View>
  );
}
function Rows({ rows }: { rows: any[] }) {
  return (
    <>
      {rows.length ? (
        rows.map((row) => (
          <Pressable
            key={row.key}
            onPress={row.onPress}
            disabled={!row.onPress}
            style={s.assetRow}
          >
            <View style={s.assetIcon}>
              {row.icon?.length <= 2 ? (
                <Text style={{ fontSize: 18 }}>{row.icon || "•"}</Text>
              ) : (
                <WalletIcon emoji={row.icon} size={20} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.assetName}>{row.title}</Text>
              {row.sub && <Text style={s.assetSub}>{row.sub}</Text>}
            </View>
            <Text
              style={[s.assetValue, { color: row.value < 0 ? "#D45B69" : INK }]}
            >
              {row.value < 0 ? "−" : ""}
              {money(Math.abs(row.value), row.currency)}
            </Text>
            {row.onPress && (
              <Ionicons name="chevron-forward" size={16} color="#A0ACBD" />
            )}
          </Pressable>
        ))
      ) : (
        <Text style={s.empty}>Sin elementos todavía.</Text>
      )}
    </>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F7F9FC" },
  pageContent: {
    padding: 34,
    paddingBottom: 56,
    maxWidth: 1600,
    width: "100%",
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  eyebrow: {
    fontFamily: FONT,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    color: "#91A0B5",
  },
  title: {
    fontFamily: FONT,
    fontSize: 30,
    fontWeight: "800",
    color: INK,
    marginTop: 8,
  },
  subtitle: { fontFamily: FONT, fontSize: 14, color: MUTED, marginTop: 5 },
  refresh: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    backgroundColor: "white",
  },
  refreshText: {
    fontFamily: FONT,
    fontSize: 13,
    fontWeight: "700",
    color: INK,
  },
  tabs: { flexDirection: "row", gap: 6, marginBottom: 18 },
  pill: { paddingHorizontal: 15, paddingVertical: 9, borderRadius: 9 },
  pillOn: { backgroundColor: "#EAF0FF" },
  pillText: { fontFamily: FONT, color: MUTED, fontSize: 13, fontWeight: "700" },
  pillTextOn: { color: BLUE },
  hero: {
    borderRadius: 20,
    backgroundColor: BLUE,
    padding: 26,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
    shadowColor: "#1C3FA6",
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 3,
  },
  heroEyebrow: {
    fontFamily: FONT,
    color: "#BFD0FF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  heroValue: {
    fontFamily: FONT,
    color: "white",
    fontSize: 36,
    fontWeight: "800",
    marginTop: 10,
  },
  heroCaption: {
    fontFamily: FONT,
    color: "#C8D7FF",
    fontSize: 13,
    marginTop: 6,
  },
  heroSide: { alignItems: "flex-end", justifyContent: "center" },
  heroSideLabel: { fontFamily: FONT, color: "#BFD0FF", fontSize: 12 },
  heroSideCaption: {
    fontFamily: FONT,
    color: "#D8E3FF",
    fontSize: 12,
    marginTop: 6,
  },
  signed: { fontFamily: FONT, fontSize: 16, fontWeight: "800", marginTop: 4 },
  twoCols: { flexDirection: "row", gap: 16, alignItems: "stretch" },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
    marginBottom: 16,
    flex: 1,
  },
  cardHead: { marginBottom: 16 },
  cardTitle: { fontFamily: FONT, fontSize: 16, fontWeight: "800", color: INK },
  caption: { fontFamily: FONT, fontSize: 12, color: MUTED, marginTop: 4 },
  compositionTop: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 176,
  },
  chartWrap: { width: 205, flexShrink: 0, alignItems: "center" },
  legend: { flex: 1, gap: 11, paddingLeft: 2, minWidth: 0 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  legendLabel: {
    fontFamily: FONT,
    fontSize: 13,
    color: MUTED,
    flex: 1,
    flexShrink: 1,
  },
  legendValue: {
    fontFamily: FONT,
    fontSize: 13,
    color: INK,
    fontWeight: "700",
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  summaryHero: { borderRadius: 12, backgroundColor: "#F3F6FF", padding: 14 },
  summaryHeroValue: {
    fontFamily: FONT,
    fontSize: 24,
    fontWeight: "800",
    color: INK,
    marginTop: 5,
  },
  summaryMetric: {
    flex: 1,
    minWidth: 0,
    borderLeftWidth: 2,
    borderLeftColor: "#E5ECFA",
    paddingLeft: 10,
  },
  summaryLabel: { fontFamily: FONT, fontSize: 12, color: MUTED },
  summaryValue: {
    fontFamily: FONT,
    fontSize: 17,
    color: INK,
    fontWeight: "800",
    marginTop: 6,
  },
  groupSwitch: { flexDirection: "row", gap: 4, marginBottom: 12 },
  group: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 13,
    marginTop: 5,
  },
  groupTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 7,
  },
  groupName: {
    fontFamily: FONT,
    fontWeight: "800",
    fontSize: 14,
    color: INK,
    flex: 1,
  },
  groupTotal: { fontFamily: FONT, fontSize: 14, color: INK, fontWeight: "800" },
  assetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: "#F0F3F8",
  },
  assetIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F7FB",
  },
  assetName: { fontFamily: FONT, fontSize: 14, color: INK, fontWeight: "700" },
  assetSub: { fontFamily: FONT, fontSize: 12, color: MUTED, marginTop: 2 },
  assetValue: {
    fontFamily: FONT,
    fontSize: 14,
    fontWeight: "800",
    marginRight: 4,
  },
  empty: { fontFamily: FONT, color: MUTED, fontSize: 13, paddingVertical: 14 },
  rangeLine: { flexDirection: "row", gap: 5, marginBottom: 12 },
  breakdown: { gap: 1 },
  breakRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F3F8",
  },
  breakLabel: { fontFamily: FONT, fontSize: 13, color: MUTED },
  breakValue: { fontFamily: FONT, fontSize: 14, color: INK, fontWeight: "800" },
  tableHead: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tableLabel: {
    fontFamily: FONT,
    fontSize: 11,
    color: MUTED,
    fontWeight: "800",
    flex: 1,
    textAlign: "right",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
  },
  rowText: {
    fontFamily: FONT,
    fontSize: 12,
    color: INK,
    flex: 1,
    textAlign: "right",
  },
  edit: { width: 44, alignItems: "flex-end" },
  yearTableControl: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 10,
  },
  yearText: { fontFamily: FONT, fontSize: 15, fontWeight: "800", color: INK },
  errorCard: {
    backgroundColor: "#FFF3F4",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  error: { fontFamily: FONT, color: "#C84759", fontSize: 13 },
  modalBack: {
    flex: 1,
    backgroundColor: "rgba(19,32,57,.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modal: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: "white",
    borderRadius: 18,
    padding: 22,
  },
  modalHead: { flexDirection: "row", justifyContent: "space-between" },
  modalTitle: { fontFamily: FONT, fontSize: 18, fontWeight: "800", color: INK },
  yearLine: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 18,
    marginVertical: 18,
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 14,
  },
  monthChoice: {
    width: "23%",
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F3F6FA",
    alignItems: "center",
  },
  monthChoiceOn: { backgroundColor: BLUE },
  monthChoiceText: {
    fontFamily: FONT,
    fontSize: 12,
    color: MUTED,
    fontWeight: "700",
  },
  inputGroup: { marginTop: 10 },
  inputLabel: {
    fontFamily: FONT,
    fontSize: 12,
    color: INK,
    fontWeight: "700",
    marginBottom: 5,
  },
  input: {
    fontFamily: FONT,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 10,
    color: INK,
    fontSize: 14,
  },
  modalActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
  },
  delete: { paddingHorizontal: 10, paddingVertical: 10 },
  deleteText: {
    fontFamily: FONT,
    color: "#D45B69",
    fontSize: 12,
    fontWeight: "700",
  },
  cancel: { paddingHorizontal: 14, paddingVertical: 10 },
  cancelText: {
    fontFamily: FONT,
    color: MUTED,
    fontSize: 13,
    fontWeight: "700",
  },
  save: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: BLUE,
  },
  saveText: {
    fontFamily: FONT,
    color: "white",
    fontSize: 13,
    fontWeight: "800",
  },
});
