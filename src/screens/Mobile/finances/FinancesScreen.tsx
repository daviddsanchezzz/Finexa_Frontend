// src/screens/Finances/FinancesScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { colors } from "../../../theme/theme";
import {
  MODULES,
  STORAGE_KEY,
  ModuleConfig,
  FinanceModule,
  buildDefaultConfig,
  mergeConfig,
} from "./financeModulesConfig";
import { useTheme } from "../../../context/ThemeContext";

const { width: SW } = Dimensions.get("window");
const H_PAD = 20;
const CARD_GAP = 12;
const CARD_W = (SW - H_PAD * 2 - CARD_GAP) / 2;
const GRID_PAD_TOP = 8;
const GRID_PAD_BOTTOM = 8;
const ADD_BTN_H = 52; // height of "Añadir módulos" button
const ADD_BTN_MARGIN = 8; // margin above it
const MIN_CARD_H = 110;
const MAX_CARD_H = 170;

/* ── Card ─────────────────────────────────────────── */
function ModuleCard({
  module: m,
  height,
  onPress,
}: {
  module: FinanceModule;
  height: number;
  onPress: () => void;
}) {
  const { colors: t } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      style={{
        width: CARD_W,
        height,
        backgroundColor: t.surface,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: t.border,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#0F172A",
        shadowOpacity: 0.07,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
      }}
    >
      <View
        style={{
          width: 60,
          height: 60,
          borderRadius: 18,
          backgroundColor: m.softBg,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
        }}
      >
        <Text style={{ fontSize: 30 }}>{m.emoji}</Text>
      </View>

      <Text
        style={{
          fontSize: 13,
          fontWeight: "700",
          color: t.text,
          textAlign: "center",
          lineHeight: 18,
          paddingHorizontal: 10,
        }}
        numberOfLines={2}
      >
        {m.title}
      </Text>

    </TouchableOpacity>
  );
}

/* ── Screen ───────────────────────────────────────── */
export default function FinancesScreen({ navigation }: any) {
  const { isDark, colors: t } = useTheme();
  const [config, setConfig] = useState<ModuleConfig[]>(buildDefaultConfig());
  const [organizeOpen, setOrganizeOpen] = useState(false);
  const [containerH, setContainerH] = useState<number | null>(null);

  const loadConfig = async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    setConfig(mergeConfig(raw ? JSON.parse(raw) : null));
  };

  useEffect(() => { loadConfig(); }, []);
  useFocusEffect(useCallback(() => { loadConfig(); }, []));

  const saveConfig = async (next: ModuleConfig[]) => {
    setConfig(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const modulesToRender = useMemo(() => {
    const map = new Map(config.map((c) => [c.key, c]));
    return MODULES.filter((m) => map.get(m.key)?.enabled).sort(
      (a, b) => map.get(a.key)!.order - map.get(b.key)!.order
    );
  }, [config]);

  const enabledConfig = useMemo(
    () => [...config].filter((c) => c.enabled).sort((a, b) => a.order - b.order),
    [config]
  );

  const hasDisabled = config.some((c) => !c.enabled);

  const rows = useMemo(() => {
    const result: FinanceModule[][] = [];
    for (let i = 0; i < modulesToRender.length; i += 2)
      result.push(modulesToRender.slice(i, i + 2));
    return result;
  }, [modulesToRender]);

  // Dynamic card height: fill exactly the available container
  const cardH = useMemo(() => {
    if (containerH === null || modulesToRender.length === 0) return MIN_CARD_H;
    const numRows = Math.ceil(modulesToRender.length / 2);
    const addBtnTotalH =
      hasDisabled && modulesToRender.length > 0
        ? ADD_BTN_H + ADD_BTN_MARGIN
        : 0;
    const available =
      containerH -
      GRID_PAD_TOP -
      GRID_PAD_BOTTOM -
      (numRows - 1) * CARD_GAP -
      addBtnTotalH;
    return Math.min(MAX_CARD_H, Math.max(MIN_CARD_H, available / numRows));
  }, [containerH, modulesToRender.length, hasDisabled]);

  const move = (key: string, dir: "up" | "down") => {
    const idx = enabledConfig.findIndex((c) => c.key === key);
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || swapIdx < 0 || swapIdx >= enabledConfig.length) return;
    const keyA = enabledConfig[idx].key;
    const keyB = enabledConfig[swapIdx].key;
    const orderA = enabledConfig[idx].order;
    const orderB = enabledConfig[swapIdx].order;
    const next = config
      .map((c) => {
        if (c.key === keyA) return { ...c, order: orderB };
        if (c.key === keyB) return { ...c, order: orderA };
        return c;
      })
      .sort((a, b) => a.order - b.order)
      .map((c, i) => ({ ...c, order: i }));
    saveConfig(next);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? t.background : "#F3F4F6" }}>
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
          onPress={() => setOrganizeOpen(true)}
          disabled={enabledConfig.length < 2}
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: t.surface,
            borderRadius: 10,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderWidth: 1,
            borderColor: t.border,
            opacity: enabledConfig.length < 2 ? 0.35 : 1,
          }}
        >
          <Ionicons name="swap-vertical-outline" size={15} color={colors.text} />
          <Text style={{ fontSize: 12, fontWeight: "600", color: colors.text, marginLeft: 4 }}>
            Organizar
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Grid container — measures available height ── */}
      <View
        style={{ flex: 1, paddingHorizontal: H_PAD }}
        onLayout={(e) => setContainerH(e.nativeEvent.layout.height)}
      >
        {/* Empty state */}
        {modulesToRender.length === 0 && (
          <View style={{ alignItems: "center", paddingTop: 80 }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>📭</Text>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#1F2937", marginBottom: 8 }}>
              Sin módulos activos
            </Text>
            <Text style={{ fontSize: 13, color: "#6B7280", textAlign: "center", lineHeight: 19 }}>
              Ve a Perfil → Finanzas personal para activar módulos.
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("FinancesSettings" as never)}
              style={{
                marginTop: 20,
                backgroundColor: colors.primary,
                borderRadius: 14,
                paddingVertical: 12,
                paddingHorizontal: 24,
              }}
            >
              <Text style={{ color: "white", fontWeight: "700", fontSize: 14 }}>
                Activar módulos
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Grid — only render once height is known */}
        {containerH !== null && modulesToRender.length > 0 && (
          <ScrollView
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
                    height={cardH}
                    onPress={() => navigation.navigate(m.routeName as never)}
                  />
                ))}
              </View>
            ))}

            {/* Add modules */}
            {hasDisabled && (
              <TouchableOpacity
                onPress={() => navigation.navigate("FinancesSettings" as never)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: ADD_BTN_MARGIN,
                  height: ADD_BTN_H,
                  borderRadius: 16,
                  borderWidth: 1.5,
                  borderColor: "#D1D5DB",
                  borderStyle: "dashed",
                }}
              >
                <Ionicons name="add-circle-outline" size={18} color="#9CA3AF" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 13, color: "#6B7280", fontWeight: "600" }}>
                  Añadir módulos
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}
      </View>

      {/* ── Organize modal ── */}
      <Modal visible={organizeOpen} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}>
          <View
            style={{
              backgroundColor: t.surface,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: 32,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: t.text }}>
                Ordenar módulos
              </Text>
              <TouchableOpacity onPress={() => setOrganizeOpen(false)}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.primary }}>
                  Listo
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 16 }}>
              Usa las flechas para cambiar el orden de aparición.
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {enabledConfig.map((c, i) => {
                const m = MODULES.find((x) => x.key === c.key)!;
                return (
                  <View
                    key={c.key}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 12,
                      borderBottomWidth: i < enabledConfig.length - 1 ? 1 : 0,
                      borderBottomColor: t.border,
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: m.softBg,
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 10,
                      }}
                    >
                      <Text style={{ fontSize: 18 }}>{m.emoji}</Text>
                    </View>

                    <Text style={{ flex: 1, fontSize: 13, fontWeight: "600", color: t.text }}>
                      {m.title}
                    </Text>

                    <View style={{ flexDirection: "row" }}>
                      <TouchableOpacity
                        onPress={() => move(c.key, "up")}
                        disabled={i === 0}
                        style={{ paddingHorizontal: 8, opacity: i === 0 ? 0.25 : 1 }}
                      >
                        <Ionicons name="chevron-up" size={20} color={t.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => move(c.key, "down")}
                        disabled={i === enabledConfig.length - 1}
                        style={{ paddingHorizontal: 8, opacity: i === enabledConfig.length - 1 ? 0.25 : 1 }}
                      >
                        <Ionicons name="chevron-down" size={20} color={t.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
