// src/screens/Investments/InvestmentFormScreen.tsx
import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import AppHeader from "../../../../components/AppHeader";
import api from "../../../../api/api";
import { colors } from "../../../../theme/theme";

type InvestmentAssetType = "crypto" | "etf" | "stock" | "fund" | "custom";
type InvestmentRiskType = "variable_income" | "fixed_income"; // ✅ solo dos valores
type RiskOrNull = InvestmentRiskType | null; // ✅ o ninguno

const TYPE_OPTIONS: {
  key: InvestmentAssetType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: "crypto", label: "Crypto", icon: "logo-bitcoin" },
  { key: "etf", label: "ETF", icon: "pie-chart-outline" },
  { key: "stock", label: "Acción", icon: "trending-up-outline" },
  { key: "fund", label: "Fondo", icon: "briefcase-outline" },
  { key: "custom", label: "Custom", icon: "shapes-outline" },
];

const RISK_OPTIONS: {
  key: InvestmentRiskType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: "variable_income", label: "Renta variable", icon: "trending-up-outline" },
  { key: "fixed_income", label: "Renta fija", icon: "shield-checkmark-outline" },
];

interface AssetFromApi {
  id: number;
  name: string;
  description?: string | null;
  type: InvestmentAssetType;
  riskType?: RiskOrNull;
  currency: string;
  initialInvested: number;
  active: boolean;
}

function isValidCurrencyCode(v: string) {
  return /^[A-Z]{3}$/.test(v);
}

/** acepta "1234", "1.234,56", "1234.56" */
function parseAmount(input: string): number | null {
  const raw = input.trim();
  if (!raw) return null;

  const normalized = raw
    .replace(/\s/g, "")
    .replace(/\./g, "") // miles
    .replace(",", "."); // decimal

  const n = Number(normalized);
  if (Number.isNaN(n)) return null;
  return n;
}

export default function InvestmentFormScreen({ navigation, route }: any) {
  const assetId: number | undefined = route?.params?.assetId;
  const isEdit = !!assetId;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<InvestmentAssetType>("custom");
  const [riskType, setRiskType] = useState<RiskOrNull>(null); // ✅ null por defecto
  const [currency, setCurrency] = useState("EUR");

  const [initialInvestedText, setInitialInvestedText] = useState<string>("");

  const title = useMemo(
    () => (isEdit ? "Editar inversión" : "Nueva inversión"),
    [isEdit]
  );

  const initialInvestedNumber = useMemo(
    () => parseAmount(initialInvestedText),
    [initialInvestedText]
  );

  // UX: sugerencia automática de riskType para tipos inequívocos
  const autoRiskForType = useCallback((t: InvestmentAssetType): RiskOrNull => {
    if (t === "crypto" || t === "stock") return "variable_income";
    return null;
  }, []);

  const canSave = useMemo(() => {
    if (!name.trim()) return false;

    const cur = currency.trim().toUpperCase();
    if (cur && !isValidCurrencyCode(cur)) return false;

    if (initialInvestedText.trim()) {
      if (initialInvestedNumber === null) return false;
      if (initialInvestedNumber < 0) return false;
    }

    return true;
  }, [name, currency, initialInvestedText, initialInvestedNumber]);

  const loadAsset = useCallback(async () => {
    if (!assetId) return;

    try {
      setLoading(true);
      const res = await api.get(`/investments/assets/${assetId}`);
      const a: AssetFromApi = res.data;

      setName(a.name ?? "");
      setDescription(a.description ?? "");
      setType(a.type ?? "custom");
      setRiskType((a.riskType ?? null) as RiskOrNull);
      setCurrency((a.currency ?? "EUR").toUpperCase());

      setInitialInvestedText(
        typeof a.initialInvested === "number" ? String(a.initialInvested) : "0"
      );
    } catch (e) {
      console.error("❌ Error loading asset:", e);
      Alert.alert("Error", "No se pudo cargar la inversión.");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [assetId, navigation]);

  useFocusEffect(
    useCallback(() => {
      loadAsset();
    }, [loadAsset])
  );

  const onSave = async () => {
    const parsed = initialInvestedText.trim()
      ? parseAmount(initialInvestedText)
      : null;

    if (initialInvestedText.trim() && parsed === null) {
      Alert.alert(
        "Importe inválido",
        "Revisa el aportado previo (ej: 2500 o 2.500,50)."
      );
      return;
    }
    if (parsed !== null && parsed < 0) {
      Alert.alert("Importe inválido", "El aportado previo no puede ser negativo.");
      return;
    }

    // ✅ normaliza description: si viene vacío, manda null para permitir “borrar”
    const desc = description.trim();

    const payload: any = {
      name: name.trim(),
      description: desc ? desc : null, // ✅ importante
      type,
      riskType: riskType ?? null, // ✅ importante (solo 2 valores o null)
      currency: currency.trim() ? currency.trim().toUpperCase() : "EUR",
      ...(parsed !== null ? { initialInvested: parsed } : {}),
    };

    if (!payload.name) {
      Alert.alert("Falta nombre", "Introduce un nombre para la inversión.");
      return;
    }
    if (payload.currency && !isValidCurrencyCode(payload.currency)) {
      Alert.alert(
        "Divisa inválida",
        "Usa un código ISO de 3 letras (por ejemplo: EUR, USD)."
      );
      return;
    }

    try {
      setSaving(true);

      if (isEdit) {
        await api.patch(`/investments/assets/${assetId}`, payload);
      } else {
        if (!("initialInvested" in payload)) payload.initialInvested = 0;
        await api.post(`/investments/assets`, payload);
      }

      navigation.goBack();
    } catch (e: any) {
      console.error("❌ Error saving asset:", e);
      const msg =
        e?.response?.data?.message ||
        (isEdit ? "No se pudo actualizar la inversión." : "No se pudo crear la inversión.");
      Alert.alert("Error", String(msg));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!assetId) return;

    Alert.alert(
      "Eliminar inversión",
      "Se ocultará la inversión pero no se borrarán tus transacciones históricas.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              setSaving(true);
              await api.delete(`/investments/assets/${assetId}`);
              navigation.goBack();
            } catch (e) {
              console.error("❌ Error deleting asset:", e);
              Alert.alert("Error", "No se pudo eliminar la inversión.");
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const onSelectType = (t: InvestmentAssetType) => {
    setType(t);
    const suggested = autoRiskForType(t);
    // ✅ solo autocompleta si aún no se ha definido
    if (suggested && riskType === null) setRiskType(suggested);
  };

  const clearRisk = () => setRiskType(null);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pb-3">
        <AppHeader
          title={title}
          showProfile={false}
          showDatePicker={false}
          showBack={true}
        />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="text-gray-400 mt-3 text-sm">Cargando…</Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-5"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 30 }}
        >
          {/* HERO CARD */}
          <View
            style={{
              backgroundColor: colors.primary,
              borderRadius: 24,
              padding: 18,
              marginBottom: 12,
              shadowColor: "#000",
              shadowOpacity: 0.12,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
            }}
          >
            <View className="flex-row items-center">
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 999,
                  backgroundColor: "rgba(255,255,255,0.16)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="sparkles-outline" size={18} color="white" />
              </View>

              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "white" }}>
                  {isEdit ? "Configura tu inversión" : "Crea una inversión"}
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.7)",
                    marginTop: 2,
                  }}
                >
                  Selecciónala al hacer una transferencia a tu wallet de inversión.
                </Text>
              </View>
            </View>
          </View>

          {/* FORM CARD */}
          <View
            className="rounded-3xl mb-3"
            style={{
              backgroundColor: "white",
              padding: 14,
              shadowColor: "#000",
              shadowOpacity: 0.04,
              shadowRadius: 5,
              shadowOffset: { width: 0, height: 2 },
            }}
          >
            {/* NAME */}
            <Text className="text-[11px] text-gray-400">Nombre</Text>
            <View
              className="flex-row items-center mt-1 rounded-2xl"
              style={{
                backgroundColor: "#F9FAFB",
                borderWidth: 1,
                borderColor: "#E5E7EB",
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            >
              <Ionicons name="text-outline" size={16} color="#64748B" />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder='Ej: Bitcoin, VWCE, "Mi cartera bonos"'
                placeholderTextColor="#9CA3AF"
                style={{
                  marginLeft: 10,
                  flex: 1,
                  color: "#111827",
                  fontWeight: "600",
                }}
              />
            </View>

            {/* DESCRIPTION */}
            <Text className="text-[11px] text-gray-400 mt-4">Descripción (opcional)</Text>
            <View
              className="flex-row items-center mt-1 rounded-2xl"
              style={{
                backgroundColor: "#F9FAFB",
                borderWidth: 1,
                borderColor: "#E5E7EB",
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            >
              <Ionicons name="document-text-outline" size={16} color="#64748B" />
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Ej: BTC, ISIN, broker, notas…"
                placeholderTextColor="#9CA3AF"
                style={{
                  marginLeft: 10,
                  flex: 1,
                  color: "#111827",
                  fontWeight: "600",
                }}
              />
              {!!description.trim() && (
                <TouchableOpacity
                  onPress={() => setDescription("")}
                  style={{ padding: 6, borderRadius: 10 }}
                  activeOpacity={0.9}
                >
                  <Ionicons name="close" size={16} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            {/* TYPE */}
            <Text className="text-[11px] text-gray-400 mt-4">Tipo</Text>
            <View className="flex-row flex-wrap mt-2" style={{ gap: 8 }}>
              {TYPE_OPTIONS.map((opt) => {
                const active = type === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    onPress={() => onSelectType(opt.key)}
                    activeOpacity={0.9}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 10,
                      borderRadius: 14,
                      backgroundColor: active ? "#EEF2FF" : "#F3F4F6",
                      borderWidth: 1,
                      borderColor: active ? colors.primary : "#E5E7EB",
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={14}
                      color={active ? colors.primary : "#64748B"}
                    />
                    <Text
                      style={{
                        marginLeft: 6,
                        fontSize: 12,
                        fontWeight: "700",
                        color: active ? colors.primary : "#64748B",
                      }}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* RISK TYPE */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
              <Text className="text-[11px] text-gray-400">Riesgo</Text>

              {riskType !== null ? (
                <TouchableOpacity onPress={clearRisk} activeOpacity={0.9} style={{ flexDirection: "row", gap: 6 }}>
                  <Ionicons name="close-circle-outline" size={16} color="#94A3B8" />
                  <Text style={{ fontSize: 11, fontWeight: "800", color: "#94A3B8" }}>Quitar</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <View className="flex-row flex-wrap mt-2" style={{ gap: 8 }}>
              {RISK_OPTIONS.map((opt) => {
                const active = riskType === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    onPress={() => setRiskType(opt.key)}
                    activeOpacity={0.9}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 10,
                      borderRadius: 14,
                      backgroundColor: active ? "#ECFDF5" : "#F3F4F6",
                      borderWidth: 1,
                      borderColor: active ? "#10B981" : "#E5E7EB",
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={14}
                      color={active ? "#059669" : "#64748B"}
                    />
                    <Text
                      style={{
                        marginLeft: 6,
                        fontSize: 12,
                        fontWeight: "700",
                        color: active ? "#059669" : "#64748B",
                      }}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text className="text-[11px] text-gray-400 mt-3 leading-4">
              Selecciona renta fija o renta variable, o déjalo sin definir.
            </Text>

            {/* CURRENCY */}
            <Text className="text-[11px] text-gray-400 mt-4">Divisa</Text>
            <View
              className="flex-row items-center mt-1 rounded-2xl"
              style={{
                backgroundColor: "#F9FAFB",
                borderWidth: 1,
                borderColor: "#E5E7EB",
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            >
              <Ionicons name="cash-outline" size={16} color="#64748B" />
              <TextInput
                value={currency}
                onChangeText={(v) => setCurrency(v.toUpperCase())}
                placeholder="EUR"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="characters"
                maxLength={3}
                style={{
                  marginLeft: 10,
                  flex: 1,
                  color: "#111827",
                  fontWeight: "700",
                }}
              />
              {!isValidCurrencyCode(currency.trim() || "EUR") ? (
                <Text style={{ fontSize: 11, color: "#DC2626", fontWeight: "700" }}>
                  ISO
                </Text>
              ) : null}
            </View>

            {/* APORTADO PREVIO */}
            <Text className="text-[11px] text-gray-400 mt-4">Aportado previo (antes de usar la app)</Text>
            <View
              className="flex-row items-center mt-1 rounded-2xl"
              style={{
                backgroundColor: "#F9FAFB",
                borderWidth: 1,
                borderColor: "#E5E7EB",
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            >
              <Ionicons name="arrow-down-circle-outline" size={16} color="#64748B" />
              <TextInput
                value={initialInvestedText}
                onChangeText={setInitialInvestedText}
                placeholder="Ej: 2500"
                placeholderTextColor="#9CA3AF"
                keyboardType="decimal-pad"
                style={{
                  marginLeft: 10,
                  flex: 1,
                  color: "#111827",
                  fontWeight: "700",
                }}
              />
              {initialInvestedText.trim() && initialInvestedNumber === null ? (
                <Text style={{ fontSize: 11, color: "#DC2626", fontWeight: "700" }}>
                  inválido
                </Text>
              ) : null}
            </View>

            <Text className="text-[11px] text-gray-400 mt-3 leading-4">
              Esto es lo que ya habías aportado antes de empezar con la app. Las aportaciones nuevas
              las registrarás como transferencias a tu wallet de inversión.
            </Text>
          </View>

          {/* ACTIONS */}
          <TouchableOpacity
            onPress={onSave}
            disabled={!canSave || saving}
            className="flex-row items-center justify-center py-3 rounded-2xl"
            style={{
              backgroundColor: !canSave || saving ? "#E5E7EB" : colors.primary,
              shadowColor: "#000",
              shadowOpacity: !canSave || saving ? 0 : 0.08,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 3 },
            }}
            activeOpacity={0.9}
          >
            {saving ? (
              <ActivityIndicator color={!canSave ? "#64748B" : "white"} />
            ) : (
              <Ionicons name="checkmark-outline" size={18} color="white" />
            )}
            <Text
              className="text-sm font-semibold ml-2"
              style={{ color: !canSave || saving ? "#64748B" : "white" }}
            >
              {isEdit ? "Guardar cambios" : "Crear inversión"}
            </Text>
          </TouchableOpacity>

          {isEdit ? (
            <TouchableOpacity
              onPress={onDelete}
              disabled={saving}
              className="flex-row items-center justify-center py-3 rounded-2xl mt-2"
              style={{
                backgroundColor: "#FEF2F2",
                borderWidth: 1,
                borderColor: "#FECACA",
              }}
              activeOpacity={0.9}
            >
              <Ionicons name="trash-outline" size={18} color="#DC2626" />
              <Text className="text-sm font-semibold ml-2" style={{ color: "#DC2626" }}>
                Eliminar inversión
              </Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
