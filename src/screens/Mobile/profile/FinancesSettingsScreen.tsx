import AppSwitch from "../../../components/AppSwitch";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
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

  // Reordena entre los módulos visibles en el hub (mismo criterio que antes
  // usaba el modal "Ordenar módulos" de la pantalla de Finanzas).
  const enabledSorted = [...config].filter((c) => c.enabled).sort((a, b) => a.order - b.order);

  const move = (key: string, dir: "up" | "down") => {
    const idx = enabledSorted.findIndex((c) => c.key === key);
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || swapIdx < 0 || swapIdx >= enabledSorted.length) return;
    const keyA = enabledSorted[idx].key;
    const keyB = enabledSorted[swapIdx].key;
    const orderA = enabledSorted[idx].order;
    const orderB = enabledSorted[swapIdx].order;
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
          Elige qué módulos aparecen en la pantalla de Finanzas, en qué orden,
          y cuál ocupa el 4º tab principal.
        </Text>

        {/* Cabecera de columnas */}
        <View style={{ flexDirection: "row", justifyContent: "flex-end", alignItems: "center", marginBottom: 10, paddingRight: 8 }}>
          <Text style={{ fontSize: 10.5, fontWeight: "600", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.4, width: 40, textAlign: "center" }}>
            Orden
          </Text>
          <Text style={{ fontSize: 10.5, fontWeight: "600", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.4, width: 38, textAlign: "center" }}>
            4º tab
          </Text>
          <Text style={{ fontSize: 10.5, fontWeight: "600", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.4, width: 52, textAlign: "center" }}>
            Visible
          </Text>
        </View>

        <View
          style={{
            backgroundColor: "white",
            borderRadius: 16,
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
              const orderIdx = enabledSorted.findIndex((c) => c.key === m.key);
              return (
                <ModuleRow
                  key={m.key}
                  module={m}
                  enabled={isPinned ? false : enabled}
                  pinned={isPinned}
                  saving={savingKey === m.key}
                  switchingPin={switchingPin}
                  isLast={i === MODULES.length - 1}
                  canMoveUp={orderIdx > 0}
                  canMoveDown={orderIdx >= 0 && orderIdx < enabledSorted.length - 1}
                  onToggleEnabled={(v) => handleToggle(m.key, v)}
                  onPin={() => handlePinModule(m.key)}
                  onMoveUp={() => move(m.key, "up")}
                  onMoveDown={() => move(m.key, "down")}
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
            Las flechas <Text style={{ fontWeight: "700" }}>Orden</Text> solo mueven módulos
            visibles en el hub de Finanzas.
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
  canMoveUp: boolean;
  canMoveDown: boolean;
  onToggleEnabled: (value: boolean) => void;
  onPin: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function ModuleRow({ module: m, enabled, pinned, saving, switchingPin, isLast, canMoveUp, canMoveDown, onToggleEnabled, onPin, onMoveUp, onMoveDown }: ModuleRowProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 14,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: "#F3F4F6",
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

      <View style={{ flex: 1, marginRight: 4 }}>
        <Text style={{ fontSize: 13.5, fontWeight: "600", color: "#1F2937" }} numberOfLines={1}>
          {m.title}
        </Text>
        <Text
          style={{ fontSize: 11.5, color: "#9CA3AF", marginTop: 2, lineHeight: 15 }}
          numberOfLines={1}
        >
          {pinned ? "En el tab principal" : m.subtitle}
        </Text>
      </View>

      <View style={{ width: 40, flexDirection: "row", justifyContent: "center" }}>
        {enabled && (
          <>
            <TouchableOpacity onPress={onMoveUp} disabled={!canMoveUp} hitSlop={8} style={{ opacity: canMoveUp ? 1 : 0.25, paddingHorizontal: 2 }}>
              <Ionicons name="chevron-up" size={16} color="#6B7280" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onMoveDown} disabled={!canMoveDown} hitSlop={8} style={{ opacity: canMoveDown ? 1 : 0.25, paddingHorizontal: 2 }}>
              <Ionicons name="chevron-down" size={16} color="#6B7280" />
            </TouchableOpacity>
          </>
        )}
      </View>

      <TouchableOpacity
        onPress={onPin}
        disabled={pinned || switchingPin}
        hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
        style={{ width: 38, alignItems: "center" }}
      >
        <Ionicons
          name={pinned ? "star" : "star-outline"}
          size={19}
          color={pinned ? colors.primary : "#D1D5DB"}
        />
      </TouchableOpacity>

      <View style={{ width: 52, alignItems: "center" }}>
        {saving ? (
          <ActivityIndicator size={20} color={colors.primary} />
        ) : (
          <AppSwitch accessibilityLabel={`Mostrar ${m.title}`}
            value={enabled}
            onValueChange={onToggleEnabled}
            disabled={pinned}
          />
        )}
      </View>
    </View>
  );
}
