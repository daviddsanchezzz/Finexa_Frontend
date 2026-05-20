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
import { markInvestmentsDirty } from "../../../../utils/investmentsInvalidation";

type InvestmentAssetType = "crypto" | "etf" | "stock" | "fund" | "custom" | "cash";

interface Asset {
  id: number;
  name: string;
  abbreviation?: string | null;
  identificator?: string | null;
  type: InvestmentAssetType;
  currency: string;
}

type ValuationFromApi = {
  id: number;
  assetId?: number;
  investmentAssetId?: number;
  date?: string | null;
  value?: number | string | null;
  createdAt?: string | null;
};

function parseAmount(input: string): number | null {
  const raw = input.trim();
  if (!raw) return null;
  const normalized = raw.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  if (Number.isNaN(n)) return null;
  return n;
}

function toInputAmount(n: number): string {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function InvestmentValuationScreen({ navigation, route }: any) {
  const preselectedAssetId: number | undefined = route?.params?.assetId;
  const editingValuationId: number | undefined = route?.params?.editingValuationId;
  const isLockedToAsset = Number.isFinite(Number(preselectedAssetId));
  const isEditing = Number.isFinite(Number(editingValuationId));

  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(preselectedAssetId ?? null);
  const [valueText, setValueText] = useState<string>("");
  const [multiValues, setMultiValues] = useState<Record<number, string>>({});

  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const visibleAssets = useMemo(() => {
    if (!isLockedToAsset) return assets;
    return assets.filter((a) => Number(a.id) === Number(preselectedAssetId));
  }, [assets, isLockedToAsset, preselectedAssetId]);

  const selectedAsset = useMemo(
    () => assets.find((a) => a.id === selectedAssetId) || null,
    [assets, selectedAssetId]
  );

  const parsedValue = useMemo(() => parseAmount(valueText), [valueText]);

  const invalidMultiAssetIds = useMemo(() => {
    const ids: number[] = [];
    Object.entries(multiValues).forEach(([k, v]) => {
      if (!v.trim()) return;
      const parsed = parseAmount(v);
      if (parsed === null || parsed < 0) ids.push(Number(k));
    });
    return ids;
  }, [multiValues]);

  const selectedMultiRows = useMemo(() => {
    return visibleAssets
      .map((a) => {
        const raw = multiValues[a.id] ?? "";
        const parsed = parseAmount(raw);
        return { asset: a, raw, parsed };
      })
      .filter((r) => r.raw.trim() && r.parsed !== null && r.parsed >= 0);
  }, [visibleAssets, multiValues]);

  const canSave = useMemo(() => {
    if (!date) return false;
    if (isLockedToAsset) {
      if (!selectedAssetId) return false;
      if (parsedValue === null || parsedValue < 0) return false;
      if (Number(selectedAssetId) !== Number(preselectedAssetId)) return false;
      return true;
    }
    if (invalidMultiAssetIds.length > 0) return false;
    return selectedMultiRows.length > 0;
  }, [
    date,
    isLockedToAsset,
    selectedAssetId,
    parsedValue,
    preselectedAssetId,
    invalidMultiAssetIds.length,
    selectedMultiRows.length,
  ]);

  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true);
      const [assetsRes, valuationsRes, editingRes] = await Promise.all([
        api.get("/investments/assets"),
        api.get("/investments/valuations"),
        isEditing ? api.get(`/investments/valuations/${editingValuationId}`) : Promise.resolve({ data: null }),
      ]);

      const rawVals = Array.isArray(valuationsRes.data)
        ? valuationsRes.data
        : Array.isArray(valuationsRes.data?.valuations)
          ? valuationsRes.data.valuations
          : [];
      const valuations: ValuationFromApi[] = rawVals;

      const latestByAsset = new Map<number, { ts: number; value: number }>();
      valuations.forEach((v) => {
        const id = Number(v.assetId ?? v.investmentAssetId);
        if (!Number.isFinite(id) || id <= 0) return;
        const num = Number(v.value ?? NaN);
        if (!Number.isFinite(num)) return;
        const ts = new Date(v.date || v.createdAt || 0).getTime() || 0;
        const prev = latestByAsset.get(id);
        if (!prev || ts >= prev.ts) {
          latestByAsset.set(id, { ts, value: num });
        }
      });

      const res = assetsRes;
      const list: Asset[] = Array.isArray(res.data) ? res.data : [];
      setAssets(list);

      if (!isLockedToAsset) {
        const defaults: Record<number, string> = {};
        list.forEach((a) => {
          const last = latestByAsset.get(a.id);
          if (last) defaults[a.id] = toInputAmount(last.value);
        });
        setMultiValues(defaults);
      }

      if (isLockedToAsset) {
        const exists = list.some((a) => Number(a.id) === Number(preselectedAssetId));
        if (!exists) {
          Alert.alert("No encontrado", "Ese activo ya no existe o no está disponible.");
          navigation.goBack();
          return;
        }
        setSelectedAssetId(Number(preselectedAssetId));
        if (isEditing && editingRes.data) {
          const ev = editingRes.data as ValuationFromApi;
          const v = Number(ev.value ?? NaN);
          if (Number.isFinite(v)) setValueText(toInputAmount(v));
          const d = ev.date ? new Date(ev.date) : null;
          if (d && !Number.isNaN(d.getTime())) setDate(d);
        } else {
          const singleLatest = latestByAsset.get(Number(preselectedAssetId));
          if (singleLatest) setValueText(toInputAmount(singleLatest.value));
        }
      } else if (!selectedAssetId && list.length > 0) {
        setSelectedAssetId(list[0].id);
      }
    } catch (e) {
      console.error("Error fetching assets:", e);
      Alert.alert("Error", "No se pudieron cargar tus inversiones.");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [navigation, selectedAssetId, isLockedToAsset, preselectedAssetId, isEditing, editingValuationId]);

  useFocusEffect(
    useCallback(() => {
      fetchAssets();
    }, [fetchAssets])
  );

  const onSave = async () => {
    const safeDate = new Date(date);
    safeDate.setHours(12, 0, 0, 0);

    try {
      setSaving(true);

      if (isLockedToAsset) {
        if (!selectedAssetId) return;
        const v = parseAmount(valueText);
        if (v === null || v < 0) {
          Alert.alert("Valor inválido", "Introduce un valor válido (ej: 3100,50).");
          return;
        }
        if (isEditing && editingValuationId) {
          await api.patch(`/investments/valuations/${editingValuationId}`, {
            assetId: selectedAssetId,
            date: safeDate.toISOString(),
            value: v,
            currency: selectedAsset?.currency ?? "EUR",
          });
        } else {
          await api.post("/investments/valuations", {
            assetId: selectedAssetId,
            date: safeDate.toISOString(),
            value: v,
            currency: selectedAsset?.currency ?? "EUR",
          });
        }
      } else {
        if (invalidMultiAssetIds.length > 0) {
          Alert.alert("Valores inválidos", "Revisa los importes marcados en rojo.");
          return;
        }
        if (!selectedMultiRows.length) {
          Alert.alert("Sin datos", "Introduce al menos una valoración.");
          return;
        }

        await api.post("/investments/valuations/batch", {
          date: safeDate.toISOString(),
          items: selectedMultiRows.map((row) => ({
            assetId: row.asset.id,
            value: Number(row.parsed),
            currency: row.asset.currency || "EUR",
          })),
        });
      }

      markInvestmentsDirty();
      navigation.goBack();
    } catch (e: any) {
      console.error("Error saving valuation:", e);
      const msg = e?.response?.data?.message || "No se pudo guardar la valoración.";
      Alert.alert("Error", String(msg));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pb-3">
        <AppHeader title={isEditing ? "Editar valoración" : "Añadir valoración"} showProfile={false} showDatePicker={false} showBack />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="text-gray-400 mt-3 text-sm">Cargando...</Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-5"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 30 }}
        >
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
                  {isLockedToAsset
                    ? "Guarda el valor total de esta inversión para una fecha concreta."
                    : "Guarda valoraciones de varios activos a la vez en una sola fecha."}
                </Text>
              </View>
            </View>
          </View>

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
            <Text className="text-[11px] text-gray-400">Fecha</Text>
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

            {isLockedToAsset ? (
              <>
                <Text className="text-[11px] text-gray-400 mt-4">Inversión</Text>
                {visibleAssets[0] ? (
                  <View
                    style={{
                      marginTop: 8,
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 16,
                      backgroundColor: "#EEF2FF",
                      borderWidth: 1,
                      borderColor: colors.primary,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "800", color: "#111827" }} numberOfLines={1}>
                      {visibleAssets[0].abbreviation?.trim() || visibleAssets[0].name}
                    </Text>
                    <Text style={{ fontSize: 11, color: "#6B7280", marginTop: 1 }}>
                      Divisa: {visibleAssets[0].currency}
                    </Text>
                  </View>
                ) : (
                  <Text className="text-gray-400 mt-3 text-sm">No se encontró el activo preseleccionado.</Text>
                )}

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
                    keyboardType="numeric"
                    style={{ marginLeft: 10, flex: 1, color: "#111827", fontWeight: "700" }}
                  />
                  {valueText.trim() && parsedValue === null ? (
                    <Text style={{ fontSize: 11, color: "#DC2626", fontWeight: "700" }}>inválido</Text>
                  ) : null}
                </View>
              </>
            ) : (
              <>
                <View style={{ marginTop: 14 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      paddingBottom: 8,
                      borderBottomWidth: 1,
                      borderBottomColor: "#E5E7EB",
                    }}
                  >
                    <Text style={{ flex: 1.5, fontSize: 11, fontWeight: "800", color: "#64748B" }}>Activo</Text>
                    <Text style={{ width: 56, fontSize: 11, fontWeight: "800", color: "#64748B", textAlign: "center" }}>Divisa</Text>
                    <Text style={{ width: 110, fontSize: 11, fontWeight: "800", color: "#64748B", textAlign: "right" }}>Valor</Text>
                  </View>

                  {visibleAssets.map((a, idx) => {
                    const raw = multiValues[a.id] ?? "";
                    const parsed = parseAmount(raw);
                    const invalid = raw.trim().length > 0 && (parsed === null || parsed < 0);
                    return (
                      <View
                        key={a.id}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingVertical: 10,
                          borderBottomWidth: idx === visibleAssets.length - 1 ? 0 : 1,
                          borderBottomColor: "#F1F5F9",
                        }}
                      >
                        <Text style={{ flex: 1.5, fontSize: 12, fontWeight: "800", color: "#0F172A" }} numberOfLines={1}>
                          {a.abbreviation?.trim() || a.name}
                        </Text>
                        <Text style={{ width: 56, fontSize: 12, fontWeight: "700", color: "#64748B", textAlign: "center" }}>
                          {a.currency}
                        </Text>
                        <View style={{ width: 110, alignItems: "flex-end" }}>
                          <TextInput
                            value={raw}
                            onChangeText={(txt) => setMultiValues((prev) => ({ ...prev, [a.id]: txt }))}
                            placeholder="-"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="numeric"
                            style={{
                              width: 110,
                              textAlign: "right",
                              fontSize: 12,
                              fontWeight: "800",
                              color: invalid ? "#DC2626" : "#0F172A",
                              backgroundColor: "#F8FAFC",
                              borderRadius: 10,
                              borderWidth: 1,
                              borderColor: invalid ? "#FCA5A5" : "#E5E7EB",
                              paddingHorizontal: 10,
                              paddingVertical: 7,
                            }}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            <Text className="text-[11px] text-gray-400 mt-3 leading-4">
              Consejo: usa el valor total que te muestra el broker para la fecha elegida. Si repites la misma fecha y activo, se sobreescribe.
            </Text>
          </View>

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
              {isLockedToAsset ? "Guardar valor" : `Guardar ${selectedMultiRows.length || ""} valoración${selectedMultiRows.length === 1 ? "" : "es"}`.trim()}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
