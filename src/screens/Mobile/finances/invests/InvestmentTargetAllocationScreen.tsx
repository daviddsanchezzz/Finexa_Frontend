import React, { useCallback, useState } from "react";
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../../../api/api";
import { colors } from "../../../../theme/theme";

type InvestmentAssetType = "crypto" | "etf" | "stock" | "fund" | "custom";

type TargetItem = {
  assetId: number;
  assetName: string;
  assetType: InvestmentAssetType;
  currentValue: number;
  actualPct: number;
  targetPct: number;
  driftPct: number;
};

type TargetsResponse = {
  totalCurrentValue: number;
  targetSumPct: number;
  items: TargetItem[];
};

export default function InvestmentTargetAllocationScreen({ navigation }: any) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [targets, setTargets] = useState<TargetsResponse | null>(null);
  const [targetInputs, setTargetInputs] = useState<Record<number, string>>({});

  const fetchTargets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/investments/targets");
      const data = (res.data || null) as TargetsResponse | null;
      setTargets(data);
      const next: Record<number, string> = {};
      (data?.items || []).forEach((it) => {
        next[it.assetId] = Number(it.targetPct || 0).toFixed(2).replace(".", ",");
      });
      setTargetInputs(next);
    } catch {
      Alert.alert("Error", "No se pudo cargar la distribución objetivo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchTargets();
    }, [fetchTargets])
  );

  const sum = (targets?.items || []).reduce((s, it) => {
    const v = Number((targetInputs[it.assetId] || "0").replace(",", "."));
    return s + (Number.isFinite(v) ? v : 0);
  }, 0);

  const save = async () => {
    if (!targets?.items?.length) return;
    const items = targets.items.map((it) => {
      const v = Number((targetInputs[it.assetId] || "0").replace(",", "."));
      return { assetId: it.assetId, targetPct: Number.isFinite(v) ? v : 0 };
    });

    if (Math.abs(sum - 100) > 0.01) {
      Alert.alert("Distribución objetivo", `La suma debe ser 100%. Ahora: ${sum.toFixed(2)}%`);
      return;
    }

    try {
      setSaving(true);
      await api.put("/investments/targets", { items });
      Alert.alert("Guardado", "Distribución objetivo actualizada.");
      navigation.goBack();
    } catch {
      Alert.alert("Error", "No se pudo guardar la distribución objetivo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 10, flexDirection: "row", alignItems: "center" }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 8 }}>
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: "900", color: "#0F172A" }}>Distribución objetivo</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <View style={{ backgroundColor: "white", borderRadius: 20, borderWidth: 1, borderColor: "#E5E7EB", padding: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: "900", color: "#0F172A" }}>Por activo</Text>
              <Text style={{ fontSize: 12, fontWeight: "800", color: Math.abs(sum - 100) <= 0.01 ? "#16A34A" : "#DC2626" }}>
                Suma {sum.toFixed(2)}%
              </Text>
            </View>

            {(targets?.items || []).map((it) => (
              <View
                key={`edit-target-${it.assetId}`}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: "#F1F5F9",
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: "800", color: "#0F172A" }} numberOfLines={1}>{it.assetName}</Text>
                  <Text style={{ fontSize: 10, fontWeight: "700", color: "#94A3B8", marginTop: 2 }}>
                    Actual {Number(it.actualPct || 0).toFixed(2).replace(".", ",")}%
                  </Text>
                </View>
                <TextInput
                  value={targetInputs[it.assetId] ?? "0,00"}
                  onChangeText={(v) => setTargetInputs((prev) => ({ ...prev, [it.assetId]: v.replace(/[^0-9,.-]/g, "") }))}
                  keyboardType="decimal-pad"
                  style={{
                    width: 90,
                    height: 36,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    backgroundColor: "#FFFFFF",
                    paddingHorizontal: 10,
                    textAlign: "right",
                    fontSize: 12,
                    fontWeight: "800",
                    color: "#0F172A",
                  }}
                />
                <Text style={{ fontSize: 12, fontWeight: "800", color: "#64748B" }}>%</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            onPress={save}
            disabled={saving}
            activeOpacity={0.85}
            style={{
              marginTop: 12,
              height: 44,
              borderRadius: 12,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
              opacity: saving ? 0.7 : 1,
            }}
          >
            <Text style={{ color: "white", fontSize: 14, fontWeight: "900" }}>{saving ? "Guardando..." : "Guardar"}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
