// src/screens/Investments/InvestmentValuationScreen.tsx
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
import CrossPlatformDateTimePicker from "../../../../components/CrossPlatformDateTimePicker";

type InvestmentAssetType = "crypto" | "etf" | "stock" | "fund" | "custom";

interface Asset {
  id: number;
  name: string;
  symbol?: string | null;
  type: InvestmentAssetType;
  currency: string;
}

function parseAmount(input: string): number | null {
  const raw = input.trim();
  if (!raw) return null;

  const normalized = raw.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  if (Number.isNaN(n)) return null;
  return n;
}

export default function InvestmentValuationScreen({ navigation, route }: any) {
  const preselectedAssetId: number | undefined = route?.params?.assetId;

  // ✅ cuando viene assetId por params, bloqueamos selector y solo mostramos ese
  const isLockedToAsset = Number.isFinite(Number(preselectedAssetId));

  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(
    preselectedAssetId ?? null
  );

  // ✅ fecha normal (día) + selector estilo AddScreen
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [valueText, setValueText] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedAsset = useMemo(
    () => assets.find((a) => a.id === selectedAssetId) || null,
    [assets, selectedAssetId]
  );

  // ✅ si viene assetId, solo renderizamos ese asset
  const visibleAssets = useMemo(() => {
    if (!isLockedToAsset) return assets;
    return assets.filter((a) => Number(a.id) === Number(preselectedAssetId));
  }, [assets, isLockedToAsset, preselectedAssetId]);

  const parsedValue = useMemo(() => parseAmount(valueText), [valueText]);

  const canSave = useMemo(() => {
    if (!selectedAssetId) return false;
    if (!date) return false;
    if (parsedValue === null) return false;
    if (parsedValue < 0) return false;

    // ✅ si está bloqueado, aseguramos que el selectedAssetId sea el preselected
    if (isLockedToAsset && Number(selectedAssetId) !== Number(preselectedAssetId)) return false;

    return true;
  }, [selectedAssetId, date, parsedValue, isLockedToAsset, preselectedAssetId]);

  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/investments/assets");
      const list: Asset[] = Array.isArray(res.data) ? res.data : [];
      setAssets(list);

      // ✅ si viene assetId, forzamos selección a ese
      if (isLockedToAsset) {
        const exists = list.some((a) => Number(a.id) === Number(preselectedAssetId));
        if (!exists) {
          Alert.alert("No encontrado", "Ese activo ya no existe o no está disponible.");
          navigation.goBack();
          return;
        }
        setSelectedAssetId(Number(preselectedAssetId));
        return;
      }

      // ✅ si no viene assetId, comportamiento anterior
      if (!selectedAssetId && list.length > 0) {
        setSelectedAssetId(list[0].id);
      }
    } catch (e) {
      console.error("❌ Error fetching assets:", e);
      Alert.alert("Error", "No se pudieron cargar tus inversiones.");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [navigation, selectedAssetId, isLockedToAsset, preselectedAssetId]);

  useFocusEffect(
    useCallback(() => {
      fetchAssets();
    }, [fetchAssets])
  );

  const onSave = async () => {
    if (!selectedAssetId) return;

    if (isLockedToAsset && Number(selectedAssetId) !== Number(preselectedAssetId)) {
      Alert.alert("Error", "El activo seleccionado no coincide con el activo preseleccionado.");
      return;
    }

    const v = parseAmount(valueText);
    if (v === null || v < 0) {
      Alert.alert("Valor inválido", "Introduce un valor válido (ej: 3100,50).");
      return;
    }

    // ✅ recomendado: fijar a mediodía para evitar problemas de timezone
    const safeDate = new Date(date);
    safeDate.setHours(12, 0, 0, 0);

    try {
      setSaving(true);

      await api.post("/investments/valuations", {
        assetId: selectedAssetId,
        date: safeDate.toISOString(),
        value: v,
        currency: selectedAsset?.currency ?? "EUR",
      });

      navigation.goBack();
    } catch (e: any) {
      console.error("❌ Error saving valuation:", e);
      const msg = e?.response?.data?.message || "No se pudo guardar la valoración.";
      Alert.alert("Error", String(msg));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pb-3">
        <AppHeader title="Añadir valoración" showProfile={false} showDatePicker={false} showBack={true} />
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
          {/* HERO */}
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
                <Ionicons name="calendar-outline" size={18} color="white" />
              </View>

              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "white" }}>Valoración</Text>
                <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>
                  Guarda el valor total de la inversión en una fecha concreta.
                </Text>
              </View>
            </View>
          </View>

          {/* FORM */}
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
            {/* ASSET SELECT */}
            <Text className="text-[11px] text-gray-400">Inversión</Text>

            {assets.length === 0 ? (
              <Text className="text-gray-400 mt-3 text-sm">No tienes inversiones aún. Crea una primero.</Text>
            ) : visibleAssets.length === 0 ? (
              <Text className="text-gray-400 mt-3 text-sm">
                No se encontró el activo preseleccionado.
              </Text>
            ) : (
              <View className="mt-2" style={{ gap: 8 }}>
                {visibleAssets.map((a) => {
                  const active = a.id === selectedAssetId;

                  return (
                    <TouchableOpacity
                      key={a.id}
                      onPress={() => {
                        if (isLockedToAsset) return; // ✅ bloqueado
                        setSelectedAssetId(a.id);
                      }}
                      activeOpacity={isLockedToAsset ? 1 : 0.9}
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        borderRadius: 16,
                        backgroundColor: active ? "#EEF2FF" : "#F9FAFB",
                        borderWidth: 1,
                        borderColor: active ? colors.primary : "#E5E7EB",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        opacity: isLockedToAsset ? 1 : 1,
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                        <View
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 14,
                            backgroundColor: "white",
                            borderWidth: 1,
                            borderColor: "#E5E7EB",
                            alignItems: "center",
                            justifyContent: "center",
                            marginRight: 10,
                          }}
                        >
                          <Ionicons
                            name="layers-outline"
                            size={16}
                            color={active ? colors.primary : "#64748B"}
                          />
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: "700", color: "#111827" }} numberOfLines={1}>
                            {a.name}
                            {a.symbol ? ` · ${a.symbol}` : ""}
                          </Text>
                          <Text style={{ fontSize: 11, color: "#6B7280", marginTop: 1 }}>
                            Divisa: {a.currency}
                            {isLockedToAsset ? " · (fijado)" : ""}
                          </Text>
                        </View>
                      </View>

                      {active ? (
                        <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                      ) : (
                        <Ionicons name="ellipse-outline" size={18} color="#CBD5E1" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* FECHA */}
            <Text className="text-[11px] text-gray-400 mt-4">Fecha</Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              className="py-2 flex-row justify-between items-center border-b border-gray-200 mb-2"
              activeOpacity={0.8}
            >
              <Text className="text-[15px] text-black">
                {date.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
              </Text>
              <Ionicons name="calendar-outline" size={19} color="black" />
            </TouchableOpacity>

            <CrossPlatformDateTimePicker
              isVisible={showDatePicker}
              mode="date"
              date={date}
              onConfirm={(d) => {
                setShowDatePicker(false);
                setDate(d);
              }}
              onCancel={() => setShowDatePicker(false)}
            />

            {/* VALUE */}
            <Text className="text-[11px] text-gray-400 mt-4">Valor total</Text>
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
                value={valueText}
                onChangeText={setValueText}
                placeholder="Ej: 3100,50"
                placeholderTextColor="#9CA3AF"
                keyboardType="decimal-pad"
                style={{ marginLeft: 10, flex: 1, color: "#111827", fontWeight: "700" }}
              />
              {valueText.trim() && parsedValue === null ? (
                <Text style={{ fontSize: 11, color: "#DC2626", fontWeight: "700" }}>inválido</Text>
              ) : null}
            </View>

            <Text className="text-[11px] text-gray-400 mt-3 leading-4">
              Consejo: mete el valor total que te muestra el broker/app para esa inversión en la fecha en la que haces la
              valoración. Si repites la misma fecha, se sobreescribe (upsert).
            </Text>
          </View>

          {/* ACTIONS */}
          <TouchableOpacity
            onPress={onSave}
            disabled={!canSave || saving || visibleAssets.length === 0}
            className="flex-row items-center justify-center py-3 rounded-2xl"
            style={{
              backgroundColor: !canSave || saving || visibleAssets.length === 0 ? "#E5E7EB" : colors.primary,
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
              style={{ color: !canSave || saving || visibleAssets.length === 0 ? "#64748B" : "white" }}
            >
              Guardar valor
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
