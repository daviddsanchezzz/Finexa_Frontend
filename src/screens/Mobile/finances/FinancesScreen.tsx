// src/screens/Finances/FinancesScreen.tsx
import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import {
  MODULES,
  STORAGE_KEY,
  ModuleConfig,
  FinanceModule,
  buildDefaultConfig,
  mergeConfig,
} from "./financeModulesConfig";
import { useTheme } from "../../../context/ThemeContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFinanceModuleSummaries } from "../../../hooks/useFinanceModuleSummaries";
import { BottomTabLayoutContext } from '../../../navigation/BottomTabLayoutContext';
import { FINANCE_HUB_KEYS, FinanceHubKey, FinanceModuleSummary } from "../../../utils/financeModuleSummaries";

const H_PAD = 20;
const CARD_GAP = 8;
const GRID_PAD_TOP = 8;
const GRID_PAD_BOTTOM = 16;
const CARD_H = 80;
const INVESTMENTS_VISIBILITY_KEY = 'finances.hub.investments.visible.v1';
const MODULE_DESCRIPTIONS: Record<FinanceHubKey, string> = {
  budgets: 'Límites mensuales', goals: 'Tus metas de ahorro', debts: 'Pagos y préstamos',
  trips: 'Planes y gastos', projects: 'Tu beneficio personal', recurring: 'Pagos programados', investments: 'Cartera y rentabilidad',
};

/* ── Card ─────────────────────────────────────────── */
function ModuleCard({
  module: m,
  width,
  height,
  summary,
  onPress,
}: {
  module: FinanceModule;
  width: number;
  height: number;
  summary: FinanceModuleSummary;
  onPress: () => void;
}) {
  const { colors: t } = useTheme();
  const amountMatch = summary.text.match(/^([+−]?\d[\d.,]*\s(?:€|[A-Z]{3}))\s(.+)$/);
  const value = amountMatch?.[1] ?? summary.text;
  const caption = amountMatch?.[2];
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${m.title}. ${summary.text}`}
      activeOpacity={0.82}
      style={{
        width,
        minHeight: height,
        backgroundColor: t.surface,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: t.border,
        justifyContent: "center",
        paddingHorizontal: 14,
        paddingVertical: 8,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            backgroundColor: m.softBg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={m.iconName} size={19} color={m.accentColor} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={2} style={{ fontSize: 14, fontWeight: '700', lineHeight: 18, color: t.text }}>{m.title}</Text>
          <Text numberOfLines={1} style={{ fontSize: 11.5, lineHeight: 16, color: t.textSecondary, marginTop: 2 }}>{MODULE_DESCRIPTIONS[m.key as FinanceHubKey]}</Text>
        </View>
        <View style={{ maxWidth: '35%', alignItems: 'flex-end' }}>
          <Text numberOfLines={2} style={{ fontSize: amountMatch ? 15 : 12, lineHeight: 18, fontWeight: amountMatch ? '700' : '500', textAlign: 'right', fontVariant: ['tabular-nums'],
            color: t.textSecondary }}>{value}</Text>
          {!!caption && <Text numberOfLines={1} style={{ fontSize: 11.5, lineHeight: 16, color: t.textSecondary, marginTop: 2 }}>{caption}</Text>}
        </View>
        <Ionicons name="chevron-forward" size={16} color={t.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

/* ── Screen ───────────────────────────────────────── */
export default function FinancesScreen({ navigation }: any) {
  const bottomTabHeight = useContext(BottomTabLayoutContext);
  const { isDark, colors: t } = useTheme();
  const [config, setConfig] = useState<ModuleConfig[]>(buildDefaultConfig());
  const { width: windowWidth } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const [containerHeight, setContainerHeight] = useState<number | null>(null);
  const summaries = useFinanceModuleSummaries();
  const cardWidth = (containerWidth ?? windowWidth) - H_PAD * 2;

  const loadConfig = async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    let next = mergeConfig(raw ? JSON.parse(raw) : null);
    // Reveal the previously hidden investment card once. Later visibility
    // choices made in Gestionar are preserved independently of the pinned tab.
    if (!(await AsyncStorage.getItem(INVESTMENTS_VISIBILITY_KEY))) {
      next = next.map((module) => module.key === 'investments' ? { ...module, enabled: true } : module);
      await AsyncStorage.multiSet([[STORAGE_KEY, JSON.stringify(next)], [INVESTMENTS_VISIBILITY_KEY, '1']]);
    }
    setConfig(next);
  };

  useEffect(() => { loadConfig(); }, []);
  useFocusEffect(useCallback(() => { loadConfig(); }, []));

  const modulesToRender = useMemo(() => {
    const map = new Map(config.map((c) => [c.key, c]));
    return MODULES.filter((m) => FINANCE_HUB_KEYS.includes(m.key as FinanceHubKey) && map.get(m.key)?.enabled).sort(
      (a, b) => map.get(a.key)!.order - map.get(b.key)!.order
    );
  }, [config]);

  const visibleRows = Math.max(1, Math.min(6, modulesToRender.length));
  const cardHeight = containerHeight === null ? CARD_H : Math.max(72,
    (containerHeight - GRID_PAD_TOP - GRID_PAD_BOTTOM - CARD_GAP * (visibleRows - 1)) / visibleRows);

  const rows = useMemo(() => {
    const result: FinanceModule[][] = [];
    for (const module of modulesToRender) result.push([module]);
    return result;
  }, [modulesToRender]);
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: isDark ? t.background : "#F3F4F6" }}>
      {/* ── Header ── */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: H_PAD,
          paddingTop: 14,
          paddingBottom: 10,
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: "800", color: t.text }}>
          Finanzas
        </Text>

        <TouchableOpacity
          onPress={() => navigation.navigate("FinancesSettings" as never)}
          accessibilityRole="button"
          accessibilityLabel="Gestionar módulos"
          accessibilityHint="Mostrar, ocultar y reordenar los módulos de Finanzas"
          style={{
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 10,
            width: 44,
            height: 44,
          }}
        >
          <Ionicons name="options-outline" size={22} color={t.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Grid */}
      <View
        style={{ flex: 1, paddingHorizontal: H_PAD, marginBottom: bottomTabHeight }}
        onLayout={(e) => {
          setContainerWidth(e.nativeEvent.layout.width);
          setContainerHeight(e.nativeEvent.layout.height);
        }}
      >
        {/* Empty state */}
        {modulesToRender.length === 0 && (
          <View style={{ alignItems: "center", paddingTop: 80 }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>📭</Text>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#1F2937", marginBottom: 8 }}>
              Sin módulos activos
            </Text>
            <Text style={{ fontSize: 13, color: "#6B7280", textAlign: "center", lineHeight: 19 }}>
              Pulsa Gestionar para activar y ordenar tus módulos.
            </Text>
          </View>
        )}

        {/* Modules */}
        {modulesToRender.length > 0 && (
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingTop: GRID_PAD_TOP,
              paddingBottom: GRID_PAD_BOTTOM,
            }}
          >
            {rows.map((pair, rowIdx) => (
              <View
                key={rowIdx}
                style={{
                  flexDirection: "row",
                  gap: CARD_GAP,
                  marginBottom: rowIdx < rows.length - 1 ? CARD_GAP : 0,
                }}
              >
                {pair.map((m) => (
                  <ModuleCard
                    key={m.key}
                    module={m}
                    width={cardWidth}
                    height={cardHeight}
                    summary={summaries[m.key as FinanceHubKey]}
                    onPress={() => navigation.navigate(m.routeName as never)}
                  />
                ))}
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}
