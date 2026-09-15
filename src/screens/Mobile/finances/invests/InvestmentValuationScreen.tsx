// src/screens/Investments/InvestmentValuationScreen.tsx
import React, { useCallback, useMemo, useState } from "react";
import { View, Text, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../../../api/api";
import { colors } from "../../../../theme/theme";
import CrossPlatformDateTimePicker from "../../../../components/CrossPlatformDateTimePicker";
import { markInvestmentsDirty } from "../../../../utils/investmentsInvalidation";
import { formatEuro } from "../../../../utils/currency";
import {
  EditingForm,
  FormMoneyField,
  FormSection,
  FormSelect,
} from "../../../../components/creation";

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
  return formatEuro(n);
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

  const submitLabel = isLockedToAsset
    ? isEditing ? "Guardar cambios" : "Guardar valor"
    : `Guardar ${selectedMultiRows.length || ""} valoración${selectedMultiRows.length === 1 ? "" : "es"}`.trim();

  return (
    <EditingForm
      title={isEditing ? "Editar valoración" : "Añadir valoración"}
      onClose={() => navigation.goBack()}
      onSubmit={onSave}
      submitLabel={submitLabel}
      isLoading={loading}
      isSubmitting={saving}
      isValid={canSave && visibleAssets.length > 0}
    >
      <View style={{ gap: 18 }}>
        <FormSection>
          <FormSelect
            label="Fecha"
            required
            value={date.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
            onPress={() => setShowDatePicker(true)}
          />
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
        </FormSection>

        {isLockedToAsset ? (
          <FormSection title="LA INVERSIÓN">
            {visibleAssets[0] ? (
              <View>
                <Text style={{ fontSize: 15, fontWeight: "800", color: colors.ink }} numberOfLines={1}>
                  {visibleAssets[0].abbreviation?.trim() || visibleAssets[0].name}
                </Text>
                <Text style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>
                  Divisa: {visibleAssets[0].currency}
                </Text>
              </View>
            ) : (
              <Text style={{ fontSize: 13, color: "#94A3B8", fontWeight: "600" }}>
                No se encontró el activo preseleccionado.
              </Text>
            )}

            <FormMoneyField
              label="Valor total"
              required
              value={valueText}
              onChangeText={setValueText}
              currency={selectedAsset?.currency ?? "EUR"}
              error={valueText.trim() && parsedValue === null ? "Introduce un valor válido." : null}
              showError
            />
          </FormSection>
        ) : (
          <FormSection
            title="VALORACIONES"
            description="Introduce el valor total de cada activo para la fecha elegida. Deja en blanco los que no quieras actualizar."
          >
            <View style={{ gap: 14 }}>
              {visibleAssets.map((a) => {
                const raw = multiValues[a.id] ?? "";
                const parsed = parseAmount(raw);
                const invalid = raw.trim().length > 0 && (parsed === null || parsed < 0);
                return (
                  <FormMoneyField
                    key={a.id}
                    label={a.abbreviation?.trim() || a.name}
                    value={raw}
                    onChangeText={(txt) => setMultiValues((prev) => ({ ...prev, [a.id]: txt }))}
                    currency={a.currency}
                    error={invalid ? "Valor inválido." : null}
                    showError
                  />
                );
              })}
            </View>
          </FormSection>
        )}

        <Text style={{ fontSize: 11.5, lineHeight: 16, color: "#94A3B8" }}>
          Consejo: usa el valor total que te muestra el broker para la fecha elegida. Si repites la misma fecha y
          activo, se sobreescribe.
        </Text>
      </View>
    </EditingForm>
  );
}
