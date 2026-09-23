import React, { useState, useCallback, useRef, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Platform, Animated, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import AppHeader from "../../../components/AppHeader";
import HeroBalanceCard from "../../../components/HeroBalanceCard";
import StatsRow from "../../../components/StatsRow";
import TransactionsList from "../../../components/TransactionsList";
import NotificationsSheet from "../../../components/NotificationsSheet";
import InvestmentMonthReturnModal from "../../../components/InvestmentMonthReturnModal";
import HomeFiltersModal, { DEFAULT_HOME_FILTERS, applyHomeFilters, countActiveHomeFilters, type HomeFilters } from "../../../components/HomeFiltersModal";
import { useNotificationsFeed } from "../../../hooks/useNotificationsFeed";
import { useNetWorthTrend } from "../../../hooks/useNetWorthTrend";
import { useInvestmentPeriodProfit } from "../../../hooks/useInvestmentPeriodProfit";
import { formatEuro } from "../../../utils/currency";
import api from "../../../api/api";
import DateFilterModal from "../../../components/DateFilterModal";
import { HomeScreenSkeleton } from "../../../components/skeletons/HomeScreenSkeleton";
import { exportTransactionsCsv } from "../../../utils/csvExport";
import { colors as staticColors } from "../../../theme/theme";
import { useTheme } from "../../../context/ThemeContext";
import { getTransactionsDataVersion, subscribeTransactionsInvalidation } from "../../../utils/transactionsInvalidation";
import NetWorthCompositionModal from "../../../components/NetWorthCompositionModal";
import { useHomePreferences } from "../../../hooks/useHomePreferences";

export default function HomeScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { showInvestmentReturn, isLoading: preferencesLoading } = useHomePreferences();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [rentabilidadModalVisible, setRentabilidadModalVisible] = useState(false);
  const [netWorthCompositionVisible, setNetWorthCompositionVisible] = useState(false);
  const [filtersModalVisible, setFiltersModalVisible] = useState(false);
  const [filters, setFilters] = useState<HomeFilters>(DEFAULT_HOME_FILTERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilterType, setDateFilterType] = useState<"day" | "week" | "month" | "year" | "all" | "custom">("month");
  const { unreadCount: unreadNotificationsCount } = useNotificationsFeed();
  const netWorth = useNetWorthTrend(dateFilterType);

  const [invalidationVersion, setInvalidationVersion] = useState<number>(() => getTransactionsDataVersion());
  useEffect(() => subscribeTransactionsInvalidation((v) => setInvalidationVersion(v)), []);

  const hasFetched = useRef(false);
  const lastFetchKey = useRef<string>("");
  const lastFetchedVersion = useRef<number>(-1);
  const webScrollAtTop = useRef(true);
  const webTouchStartY = useRef(0);
  const pullAnim = useRef(new Animated.Value(0)).current;
  const currentPullY = useRef(0);
  const webRefreshingRef = useRef(false);
  const PULL_THRESHOLD = 80;
  const PULL_MAX = 65;

  function isMonthlyReportBannerVisible(now = new Date()) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), 2, 0, 0, 0, 0);
    return now >= start && now < end;
  }

  const showMonthlyReportBanner = isMonthlyReportBannerVisible();

  const reportMonthLabel = (() => {
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return prev
      .toLocaleString("es-ES", { month: "long", year: "numeric" })
      .replace("de ", "");
  })();

  const [dateLabel, setDateLabel] = useState(() => {
    const now = new Date();
    return now
      .toLocaleString("es-ES", { month: "long", year: "numeric" })
      .replace("de ", "");
  });

  const fetchTransactions = async (isManual = false) => {
    try {
      if (!isManual) setLoading(true);

      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const params: any = {
        dateFrom: firstDay.toISOString(),
        dateTo: lastDay.toISOString(),
      };

      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const res = await api.get("/transactions", { params });

      const filtered = res.data
        .filter((tx: any) => tx.isRecurring === false)
        .filter((tx: any) => tx.excludeFromStats !== true)
        .sort(
          (a: any, b: any) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );
      setTransactions(filtered);
    } catch (err) {
      console.error("❌ Error al obtener transacciones:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTransactions(true);
  }, [dateFrom, dateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  useFocusEffect(
    useCallback(() => {
      const key = `${dateFrom ?? ""}|${dateTo ?? ""}`;
      if (hasFetched.current && lastFetchKey.current === key && lastFetchedVersion.current === invalidationVersion) return;
      lastFetchKey.current = key;
      hasFetched.current = true;
      lastFetchedVersion.current = invalidationVersion;
      fetchTransactions();
    }, [dateFrom, dateTo, invalidationVersion]) // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleWebTouchStart = useCallback((e: any) => {
    if (Platform.OS === "web") {
      webTouchStartY.current = e.nativeEvent?.touches?.[0]?.pageY ?? 0;
      currentPullY.current = 0;
    }
  }, []);

  const handleWebTouchMove = useCallback((e: any) => {
    if (Platform.OS !== "web" || webRefreshingRef.current || !webScrollAtTop.current) return;
    const y = e.nativeEvent?.touches?.[0]?.pageY ?? 0;
    const delta = Math.max(0, y - webTouchStartY.current);
    currentPullY.current = delta;
    pullAnim.setValue(Math.min(PULL_MAX, Math.sqrt(delta) * 4.5));
  }, [pullAnim]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleWebTouchEnd = useCallback(async () => {
    if (Platform.OS !== "web") return;
    const delta = currentPullY.current;
    currentPullY.current = 0;
    if (webScrollAtTop.current && delta > PULL_THRESHOLD && !webRefreshingRef.current) {
      webRefreshingRef.current = true;
      Animated.spring(pullAnim, { toValue: 36, useNativeDriver: true }).start();
      await onRefresh();
      webRefreshingRef.current = false;
    }
    Animated.spring(pullAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
  }, [pullAnim, onRefresh]); // eslint-disable-line react-hooks/exhaustive-deps

  const toSigned = (tx: any) => {
    if (tx.type === "transfer") return 0;
    return tx.type === "expense" ? -Math.abs(tx.amount) : Math.abs(tx.amount);
  };

  const totalBalance = transactions.reduce((acc, tx) => acc + toSigned(tx), 0);
  const totalIncome = transactions
    .filter((tx) => tx.type === "income")
    .reduce((acc, tx) => acc + Math.abs(tx.amount), 0);
  const totalExpense = transactions
    .filter((tx) => tx.type === "expense")
    .reduce((acc, tx) => acc + Math.abs(tx.amount), 0);

  const effectivePeriodFrom =
    dateFrom ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const effectivePeriodTo =
    dateTo ?? new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString();
  const {
    profit: totalInvestment,
    hasAssets: hasInvestmentAssets,
    isLoading: investmentProfitLoading,
  } = useInvestmentPeriodProfit(effectivePeriodFrom, effectivePeriodTo);

  const balancePeriodLabel = (() => {
    const from = new Date(effectivePeriodFrom);
    switch (dateFilterType) {
      case "year":
        return `Balance de ${from.getFullYear()}`;
      case "week":
        return "Balance de esta semana";
      case "day":
        return "Balance de hoy";
      case "all":
        return "Balance total";
      case "custom":
        return "Balance del periodo";
      case "month":
      default:
        return `Balance de ${from.toLocaleDateString("es-ES", { month: "long" })}`;
    }
  })();

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const searchedTransactions = trimmedQuery
    ? transactions.filter((tx) => {
        const haystack = [tx.description, tx.category?.name, tx.subcategory?.name, tx.wallet?.name]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(trimmedQuery);
      })
    : transactions;

  const visibleTransactions = applyHomeFilters(searchedTransactions, filters);
  const activeFilterCount = countActiveHomeFilters(filters);

  // Un único gate de carga: si esperásemos solo a `loading` (transacciones),
  // Patrimonio neto (que depende de useNetWorthTrend, más lento) aparecía
  // de golpe después de que el resto del contenido ya estuviera pintado.
  const isLoading = loading || netWorth.isLoading || investmentProfitLoading || preferencesLoading;

  return (
    <SafeAreaView className="flex-1 bg-background" style={Platform.OS === "web" ? { overflow: "hidden" } : undefined}>
      {/* HEADER */}
      <View className="px-5 pb-2">
        <AppHeader
          onOpenDateModal={() => setDateModalVisible(true)}
          dateLabel={dateLabel}
          title="Inicio"
          showProfile={true}
          showBack={false}
          showNotificationsBell={true}
          onOpenNotifications={() => setNotificationsVisible(true)}
          unreadNotificationsCount={unreadNotificationsCount}
        />

        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, gap: 8 }}>
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.card,
              borderRadius: 13,
              paddingHorizontal: 12,
              height: 38,
            }}
          >
            <Ionicons name="search-outline" size={16} color={colors.textMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Buscar transacciones"
              placeholderTextColor={colors.textMuted}
              style={
                Platform.OS === "web"
                  ? ({ flex: 1, marginLeft: 6, fontSize: 13, color: colors.text, outlineStyle: "none", outlineWidth: 0 } as any)
                  : { flex: 1, marginLeft: 6, fontSize: 13, color: colors.text }
              }
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            onPress={() => setFiltersModalVisible(true)}
            activeOpacity={0.8}
            style={{
              width: 38,
              height: 38,
              borderRadius: 13,
              backgroundColor: colors.card,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="options-outline" size={18} color={colors.textSecondary} />
            {activeFilterCount > 0 && (
              <View
                style={{
                  position: "absolute",
                  top: -3,
                  right: -3,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 8,
                  paddingHorizontal: 3,
                  backgroundColor: colors.primary,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1.5,
                  borderColor: colors.background,
                }}
              >
                <Text style={{ color: "white", fontSize: 9.5, fontWeight: "800" }}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <NotificationsSheet visible={notificationsVisible} onClose={() => setNotificationsVisible(false)} />

      {Platform.OS === "web" && !isLoading && (
        <View style={{ position: "absolute", top: 52, left: 0, right: 0, alignItems: "center", zIndex: 0 }}>
          <Animated.View style={{
            opacity: pullAnim.interpolate({ inputRange: [0, 20, PULL_MAX], outputRange: [0, 0, 1], extrapolate: "clamp" }),
            transform: [{ scale: pullAnim.interpolate({ inputRange: [0, PULL_MAX], outputRange: [0.5, 1], extrapolate: "clamp" }) }],
          }}>
            <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 8, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          </Animated.View>
        </View>
      )}

      {isLoading ? (
        <ScrollView
          className="flex-1 px-5"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <HomeScreenSkeleton />
        </ScrollView>
      ) : (
        <Animated.View
          style={Platform.OS === "web" ? { flex: 1, transform: [{ translateY: pullAnim }] } : { flex: 1 }}
          onTouchStart={handleWebTouchStart}
          onTouchMove={handleWebTouchMove}
          onTouchEnd={handleWebTouchEnd}
        >
          <View className="px-5 pb-2">
            {/* PATRIMONIO NETO */}
            <HeroBalanceCard
              label="Patrimonio neto"
              value={`${formatEuro(netWorth.current)} €`}
              onPress={() => setNetWorthCompositionVisible(true)}
              style={{ marginBottom: 10 }}
              footer={
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4, gap: 6 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: "600", color: netWorth.periodDelta >= 0 ? "#86EFAC" : "#FCA5A5" }}>
                    {netWorth.periodDelta >= 0 ? "+" : "−"}
                    {formatEuro(Math.abs(netWorth.periodDelta))} € {netWorth.periodLabel}
                  </Text>
                  {Math.abs(netWorth.pctChange) > 0.05 && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: "rgba(255,255,255,0.10)",
                        borderRadius: 999,
                        paddingHorizontal: 6,
                        paddingVertical: 1.5,
                        gap: 2,
                      }}
                    >
                      <Ionicons
                        name={netWorth.pctChange >= 0 ? "arrow-up" : "arrow-down"}
                        size={8}
                        color={netWorth.pctChange >= 0 ? "rgba(134,239,172,0.85)" : "rgba(252,165,165,0.85)"}
                      />
                      <Text style={{ fontSize: 9.5, fontWeight: "700", color: netWorth.pctChange >= 0 ? "rgba(134,239,172,0.85)" : "rgba(252,165,165,0.85)" }}>
                        {Math.abs(netWorth.pctChange).toFixed(1)}%
                      </Text>
                    </View>
                  )}
                </View>
              }
            />

            {showInvestmentReturn && (
            <View className="items-center mb-2">
              <Text className="text-textSecondary text-[11px] font-semibold">
                {balancePeriodLabel}
              </Text>
              <Text className="text-text text-[18px] font-extrabold" style={{ marginTop: 1, fontVariant: ["tabular-nums"] }}>
                {formatEuro(totalBalance)} €
              </Text>
            </View>
            )}

            {/* Indicadores */}
            <StatsRow
              items={[
                { key: "ingresos", label: "INGRESOS", value: `${formatEuro(totalIncome)} €`, color: staticColors.success },
                { key: "gastos", label: "GASTOS", value: `${formatEuro(totalExpense)} €`, color: staticColors.danger },
                ...(!showInvestmentReturn ? [{
                  key: "balance",
                  label: "BALANCE",
                  value: `${formatEuro(totalBalance)} €`,
                  color: colors.text,
                }] : hasInvestmentAssets ? [{
                  key: "rentabilidad",
                  label: "RENTABILIDAD",
                  value: `${totalInvestment >= 0 ? "+" : "−"}${formatEuro(Math.abs(totalInvestment))} €`,
                  color: totalInvestment >= 0 ? staticColors.success : staticColors.danger,
                  onPress: () => setRentabilidadModalVisible(true),
                }] : []),
              ]}
            />

            {showMonthlyReportBanner && (
              <View className="mt-3">
                <View
                  className="w-full px-4 py-3 rounded-2xl"
                  style={{
                    backgroundColor: "#FFFBEB",
                    borderWidth: 1,
                    borderColor: "#FDE68A",
                  }}
                >
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate("Reports")}
                  >
                    <View className="flex-row items-start">
                      <Ionicons
                        name="document-text-outline"
                        size={18}
                        color="#B45309"
                        style={{ marginTop: 1 }}
                      />
                      <View className="ml-3 flex-1">
                        <Text className="text-[13px] font-semibold text-[#92400E]">
                          Informe mensual disponible
                        </Text>
                        <Text className="text-[12px] text-[#92400E] opacity-80 mt-0.5 leading-4">
                          El informe de{" "}
                          <Text className="font-semibold">{reportMonthLabel}</Text>{" "}
                          ya está listo.
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          <ScrollView
            className="flex-1 px-5 pt-0 mb-8"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 70 }}
            scrollEventThrottle={16}
            onScroll={(e) => { if (Platform.OS === "web") webScrollAtTop.current = e.nativeEvent.contentOffset.y <= 0; }}
            refreshControl={Platform.OS !== "web" ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}
          >
            <TransactionsList
              transactions={visibleTransactions}
              navigation={navigation}
              onDeleted={fetchTransactions}
            />

            {trimmedQuery && visibleTransactions.length === 0 && (
              <View style={{ alignItems: "center", paddingVertical: 32 }}>
                <Ionicons name="search-outline" size={26} color={colors.textMuted} />
                <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 8 }}>
                  Sin resultados para "{searchQuery.trim()}"
                </Text>
              </View>
            )}

            {visibleTransactions.length > 0 && (
              <TouchableOpacity
                onPress={() => exportTransactionsCsv(visibleTransactions)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 10,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                  marginTop: 8,
                  gap: 6,
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="download-outline" size={16} color={colors.textSecondary} />
                <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: "600" }}>
                  Exportar CSV
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </Animated.View>
      )}

      {/* MODALES */}
      <DateFilterModal
        visible={dateModalVisible}
        onClose={() => setDateModalVisible(false)}
        onSelect={({ from, to, label, type }) => {
          setDateFrom(from);
          setDateTo(to);
          setDateLabel(label);
          setDateFilterType(type as any);
        }}
      />

      {hasInvestmentAssets && (
        <InvestmentMonthReturnModal
          visible={rentabilidadModalVisible}
          onClose={() => setRentabilidadModalVisible(false)}
        />
      )}

      <NetWorthCompositionModal
        visible={netWorthCompositionVisible}
        onClose={() => setNetWorthCompositionVisible(false)}
        onOpenDetails={() => {
          setNetWorthCompositionVisible(false);
          navigation.navigate("NetWorth");
        }}
        current={netWorth.current}
        wallets={netWorth.wallets}
      />

      <HomeFiltersModal
        visible={filtersModalVisible}
        onClose={() => setFiltersModalVisible(false)}
        filters={filters}
        onApply={setFilters}
        baseTransactions={searchedTransactions}
      />
    </SafeAreaView>
  );
}
