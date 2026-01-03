// src/screens/Finances/FinancesScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AppHeader from "../../../components/AppHeader";
import { colors } from "../../../theme/theme";

interface FinanceModule {
  key: string;
  title: string;
  subtitle: string;
  emoji: string;
  iconName: keyof typeof Ionicons.glyphMap;
  routeName: string;
  accentColor: string;
  softBg: string;
}

type ModuleConfig = {
  key: string;
  enabled: boolean;
  order: number;
};

const STORAGE_KEY = "finances.modules.config.v1";

/* ===========================
   CATÁLOGO DE MÓDULOS
=========================== */
const MODULES: FinanceModule[] = [
  {
    key: "budgets",
    title: "Presupuestos",
    subtitle: "Limita y controla tus gastos por categoría.",
    emoji: "📊",
    iconName: "wallet-outline",
    routeName: "Budgets",
    accentColor: "#6366F1",
    softBg: "#EEF2FF",
  },
  {
    key: "goals",
    title: "Objetivos",
    subtitle: "Ahorra para lo que más te importa.",
    emoji: "🎯",
    iconName: "flag-outline",
    routeName: "Goals",
    accentColor: "#F97316",
    softBg: "#FFF7ED",
  },
  {
    key: "debts",
    title: "Deudas",
    subtitle: "Controla préstamos, cuotas y pagos pendientes.",
    emoji: "💸",
    iconName: "card-outline",
    routeName: "Debts",
    accentColor: "#EF4444",
    softBg: "#FEF2F2",
  },
  {
    key: "investments",
    title: "Inversión",
    subtitle: "Sigue tu cartera y su rentabilidad.",
    emoji: "📈",
    iconName: "trending-up-outline",
    routeName: "Investments",
    accentColor: "#22C55E",
    softBg: "#ECFDF3",
  },
  {
    key: "trips",
    title: "Viajes",
    subtitle: "Agrupa y analiza los gastos de viajes.",
    emoji: "✈️",
    iconName: "airplane-outline",
    routeName: "Trips",
    accentColor: "#0EA5E9",
    softBg: "#E0F2FE",
  },
  {
    key: "recurring",
    title: "Transacciones recurrentes",
    subtitle: "Gestiona pagos programados y sus próximas ejecuciones.",
    emoji: "🔁",
    iconName: "repeat-outline",
    routeName: "RecurringTransactions",
    accentColor: "#A855F7",
    softBg: "#F3E8FF",
  },
  {
  key: "monthlyContributions",
  title: "Aportaciones mensuales",
  subtitle: "Planifica y controla cuánto aportas cada mes a tus objetivos e inversión.",
  emoji: "🗓️",
  iconName: "calendar-outline",
  routeName: "MonthlyContributions",
  accentColor: "#14B8A6",
  softBg: "#E6FFFB",
},

];

/* ===========================
   HELPERS CONFIG
=========================== */
const buildDefaultConfig = (): ModuleConfig[] =>
  MODULES.map((m, i) => ({
    key: m.key,
    enabled: true,
    order: i,
  }));

const mergeConfig = (saved: ModuleConfig[] | null): ModuleConfig[] => {
  const defaults = buildDefaultConfig();
  const map = new Map(saved?.map((c) => [c.key, c]));
  return defaults
    .map((d) => ({ ...d, ...(map.get(d.key) || {}) }))
    .sort((a, b) => a.order - b.order)
    .map((c, i) => ({ ...c, order: i }));
};

/* ===========================
   SCREEN
=========================== */
export default function FinancesScreen({ navigation }: any) {
  const [config, setConfig] = useState<ModuleConfig[]>(buildDefaultConfig());
  const [organizeOpen, setOrganizeOpen] = useState(false);

  /* Load config */
  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      setConfig(mergeConfig(raw ? JSON.parse(raw) : null));
    })();
  }, []);

  const saveConfig = async (next: ModuleConfig[]) => {
    setConfig(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const modulesToRender = useMemo(() => {
    const map = new Map(config.map((c) => [c.key, c]));
    return MODULES.filter((m) => map.get(m.key)?.enabled)
      .sort((a, b) => map.get(a.key)!.order - map.get(b.key)!.order);
  }, [config]);

  /* ===== Actions ===== */
  const toggleEnabled = (key: string) =>
    saveConfig(
      config.map((c) =>
        c.key === key ? { ...c, enabled: !c.enabled } : c
      )
    );

  const move = (key: string, dir: "up" | "down") => {
    const idx = config.findIndex((c) => c.key === key);
    const swap = dir === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || swap < 0 || swap >= config.length) return;
    const next = [...config];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    saveConfig(next.map((c, i) => ({ ...c, order: i })));
  };

  /* ===========================
     RENDER
=========================== */
  return (
    <SafeAreaView className="flex-1 bg-[#F3F4F6]">
      {/* HEADER */}
      <View className="px-5 pb-1">
        <AppHeader
          title="Finanzas personales"
          showProfile={false}
          showDatePicker={false}
        />
      </View>

      {/* ACTION */}
      <View className="px-5 flex-row justify-end">
        <TouchableOpacity onPress={() => setOrganizeOpen(true)}>
          <Text className="text-[13px] font-semibold text-text">
            Organizar
          </Text>
        </TouchableOpacity>
      </View>

      {/* MODULE LIST */}
      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 10, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {modulesToRender.map((m) => (
          <TouchableOpacity
            key={m.key}
            onPress={() => navigation.navigate(m.routeName)}
            activeOpacity={0.9}
            style={{
              backgroundColor: "#fff",
              borderRadius: 22,
              borderWidth: 1,
              borderColor: "#E2E8F0",
              padding: 16,
              marginBottom: 12,
              flexDirection: "row",
              alignItems: "center",
              shadowColor: "#0F172A",
              shadowOpacity: 0.03,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              elevation: 2,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 18,
                backgroundColor: m.softBg,
                justifyContent: "center",
                alignItems: "center",
                marginRight: 12,
              }}
            >
              <Text style={{ fontSize: 24 }}>{m.emoji}</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text className="text-[14px] font-bold text-[#0F172A]">
                {m.title}
              </Text>
              <Text className="text-[11px] text-[#6B7280]" numberOfLines={2}>
                {m.subtitle}
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color="#94A3B8"
            />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ORGANIZE MODAL */}
      <Modal visible={organizeOpen} transparent animationType="fade">
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl px-4 pt-4 pb-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-[15px] font-semibold text-text">
                Organizar módulos
              </Text>
              <TouchableOpacity onPress={() => setOrganizeOpen(false)}>
                <Text className="text-[13px] font-semibold text-text">
                  Listo
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {config.map((c, i) => {
                const m = MODULES.find((x) => x.key === c.key)!;
                return (
                  <View
                    key={c.key}
                    className="flex-row items-center py-3 border-b border-black/5"
                  >
                    <Text className="text-[18px] w-8">{m.emoji}</Text>

                    <View className="flex-1">
                      <Text className="text-[13px] font-semibold text-text">
                        {m.title}
                      </Text>
                    </View>

<Switch
  value={c.enabled}
  onValueChange={() => toggleEnabled(c.key)}
  trackColor={{
    false: "rgba(0,0,0,0.12)",
    true: `${colors.primary}40`,
  }}
  thumbColor="#E5E7EB" // aún más neutro
  ios_backgroundColor="rgba(0,0,0,0.12)"
/>

                    <View className="flex-row ml-2">
                      <TouchableOpacity
                        onPress={() => move(c.key, "up")}
                        disabled={i === 0}
                        className="px-2"
                        style={{ opacity: i === 0 ? 0.3 : 1 }}
                      >
                        <Ionicons name="chevron-up" size={18} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => move(c.key, "down")}
                        disabled={i === config.length - 1}
                        className="px-2"
                        style={{ opacity: i === config.length - 1 ? 0.3 : 1 }}
                      >
                        <Ionicons name="chevron-down" size={18} />
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
