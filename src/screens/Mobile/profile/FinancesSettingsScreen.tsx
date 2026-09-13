import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Switch,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AppHeader from "../../../components/AppHeader";
import { colors } from "../../../theme/theme";
import {
  MODULES,
  STORAGE_KEY,
  ModuleConfig,
  FinanceModule,
  mergeConfig,
} from "../finances/financeModulesConfig";
import { usePinnedFinanceModule } from "../../../hooks/usePinnedFinanceModule";

export default function FinancesSettingsScreen(_: any) {
  const [config, setConfig] = useState<ModuleConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const { pinnedKey, setPinnedKey, isLoading: pinnedLoading } = usePinnedFinanceModule();
  const [switchingPin, setSwitchingPin] = useState(false);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      setConfig(mergeConfig(raw ? JSON.parse(raw) : null));
      setLoading(false);
    })();
  }, []);

  const saveConfig = async (next: ModuleConfig[]) => {
    setConfig(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const handleToggle = async (key: string, value: boolean) => {
    setSavingKey(key);
    const next = config.map((c) =>
      c.key === key ? { ...c, enabled: value } : c
    );
    await saveConfig(next);
    setSavingKey(null);
  };

  const handlePinModule = async (key: string) => {
    if (key === pinnedKey || switchingPin) return;
    setSwitchingPin(true);
    const previousKey = pinnedKey;
    await setPinnedKey(key);
    // El módulo recién pineado se oculta del hub; el anterior vuelve, pero desactivado.
    const next = config.map((c) => {
      if (c.key === key || c.key === previousKey) return { ...c, enabled: false };
      return c;
    });
    await saveConfig(next);
    setSwitchingPin(false);
  };

  const configMap = new Map(config.map((c) => [c.key, c]));
  const activeCount = config.filter((c) => c.enabled).length;
  const isReady = !loading && !pinnedLoading;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pb-2">
        <AppHeader
          title="Finanzas personal"
          showProfile={false}
          showDatePicker={false}
          showBack={true}
        />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Descripción */}
        <Text
          style={{
            fontSize: 13,
            color: "#6B7280",
            lineHeight: 19,
            marginBottom: 20,
          }}
        >
          Elige qué módulos aparecen en la pantalla de Finanzas y cuál ocupa
          el 4º tab principal.
        </Text>

        {/* Cabecera de columnas */}
        <View style={{ flexDirection: "row", justifyContent: "flex-end", alignItems: "center", marginBottom: 10, paddingRight: 16 }}>
          <Text style={{ fontSize: 11, fontWeight: "600", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.6, width: 44, textAlign: "center" }}>
            4º tab
          </Text>
          <Text style={{ fontSize: 11, fontWeight: "600", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.6, width: 60, textAlign: "center" }}>
            Visible
          </Text>
        </View>

        <View
          style={{
            backgroundColor: "white",
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#F3F4F6",
            overflow: "hidden",
            marginBottom: 16,
          }}
        >
          {!isReady ? (
            <ActivityIndicator color={colors.primary} style={{ margin: 20 }} />
          ) : (
            MODULES.map((m, i) => {
              const cfg = configMap.get(m.key);
              const enabled = cfg?.enabled ?? true;
              const isPinned = pinnedKey === m.key;
              return (
                <ModuleRow
                  key={m.key}
                  module={m}
                  enabled={isPinned ? false : enabled}
                  pinned={isPinned}
                  saving={savingKey === m.key}
                  switchingPin={switchingPin}
                  isLast={i === MODULES.length - 1}
                  onToggleEnabled={(v) => handleToggle(m.key, v)}
                  onPin={() => handlePinModule(m.key)}
                />
              );
            })
          )}
        </View>

        <Text style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 24 }}>
          {activeCount} módulo{activeCount === 1 ? "" : "s"} visible{activeCount === 1 ? "" : "s"} en el hub de Finanzas.
        </Text>

        {/* Nota pie */}
        <View
          style={{
            backgroundColor: "#F9FAFB",
            borderRadius: 14,
            padding: 14,
            flexDirection: "row",
            alignItems: "flex-start",
          }}
        >
          <Ionicons
            name="information-circle-outline"
            size={18}
            color="#9CA3AF"
            style={{ marginRight: 10, marginTop: 1 }}
          />
          <Text style={{ fontSize: 12, color: "#6B7280", flex: 1, lineHeight: 18 }}>
            Para cambiar el orden en que aparecen los módulos, usa el botón{" "}
            <Text style={{ fontWeight: "700" }}>Organizar</Text> en la pantalla
            de Finanzas.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface ModuleRowProps {
  module: FinanceModule;
  enabled: boolean;
  pinned: boolean;
  saving: boolean;
  switchingPin: boolean;
  isLast: boolean;
  onToggleEnabled: (value: boolean) => void;
  onPin: () => void;
}

function ModuleRow({ module: m, enabled, pinned, saving, switchingPin, isLast, onToggleEnabled, onPin }: ModuleRowProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: "#F3F4F6",
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          backgroundColor: m.softBg,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        }}
      >
        <Text style={{ fontSize: 20 }}>{m.emoji}</Text>
      </View>

      <View style={{ flex: 1, marginRight: 8 }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: "#1F2937" }}>
          {m.title}
        </Text>
        <Text
          style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2, lineHeight: 16 }}
          numberOfLines={2}
        >
          {pinned ? "En el tab principal" : m.subtitle}
        </Text>
      </View>

      <TouchableOpacity
        onPress={onPin}
        disabled={pinned || switchingPin}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={{ width: 44, alignItems: "center" }}
      >
        <Ionicons
          name={pinned ? "star" : "star-outline"}
          size={20}
          color={pinned ? colors.primary : "#D1D5DB"}
        />
      </TouchableOpacity>

      <View style={{ width: 60, alignItems: "center" }}>
        {saving ? (
          <ActivityIndicator size={20} color={colors.primary} />
        ) : (
          <Switch
            value={enabled}
            onValueChange={onToggleEnabled}
            disabled={pinned}
            trackColor={{ false: "#E5E7EB", true: colors.primary }}
            thumbColor="white"
          />
        )}
      </View>
    </View>
  );
}
