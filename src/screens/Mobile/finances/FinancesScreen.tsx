// src/screens/Finances/FinancesScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import AppHeader from "../../../components/AppHeader";
import {
  MODULES,
  STORAGE_KEY,
  ModuleConfig,
  buildDefaultConfig,
  mergeConfig,
} from "./financeModulesConfig";

export default function FinancesScreen({ navigation }: any) {
  const [config, setConfig] = useState<ModuleConfig[]>(buildDefaultConfig());
  const [organizeOpen, setOrganizeOpen] = useState(false);

  const loadConfig = async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    setConfig(mergeConfig(raw ? JSON.parse(raw) : null));
  };

  useEffect(() => {
    loadConfig();
  }, []);

  // Reload when returning from FinancesSettings
  useFocusEffect(
    React.useCallback(() => {
      loadConfig();
    }, [])
  );

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

  // Enabled modules sorted by order — used in the organize modal
  const enabledConfig = useMemo(
    () => [...config].filter((c) => c.enabled).sort((a, b) => a.order - b.order),
    [config]
  );

  // Move within enabled modules only, leaving disabled modules untouched
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
          <Text className="text-[13px] font-semibold text-text">Organizar</Text>
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

            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ORGANIZE MODAL — reorder only */}
      <Modal visible={organizeOpen} transparent animationType="fade">
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl px-4 pt-4 pb-6">
            <View className="flex-row justify-between items-center mb-1">
              <Text className="text-[15px] font-semibold text-text">
                Ordenar módulos
              </Text>
              <TouchableOpacity onPress={() => setOrganizeOpen(false)}>
                <Text className="text-[13px] font-semibold text-text">
                  Listo
                </Text>
              </TouchableOpacity>
            </View>

            <Text className="text-[12px] text-[#9CA3AF] mb-4">
              Arrastra o usa las flechas para cambiar el orden de los módulos activos.
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {enabledConfig.map((c, i) => {
                const m = MODULES.find((x) => x.key === c.key)!;
                return (
                  <View
                    key={c.key}
                    className="flex-row items-center py-3 border-b border-black/5"
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

                    <View style={{ flex: 1 }}>
                      <Text className="text-[13px] font-semibold text-text">
                        {m.title}
                      </Text>
                    </View>

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
                        disabled={i === enabledConfig.length - 1}
                        className="px-2"
                        style={{
                          opacity: i === enabledConfig.length - 1 ? 0.3 : 1,
                        }}
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
