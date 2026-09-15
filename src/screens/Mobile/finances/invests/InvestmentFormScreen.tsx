// src/screens/Investments/InvestmentFormScreen.tsx
import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../../../api/api";
import { markInvestmentsDirty } from "../../../../utils/investmentsInvalidation";
import { CRYPTO_PRESETS, getCryptoLogoUrl } from "../../../../constants/bankPresets";
import PresetPickerCard from "../../../../components/PresetPickerCard";
import {
  CreationFlow,
  EditingActionRow,
  EditingForm,
  FormCurrencyPicker,
  FormError,
  FormMoneyField,
  FormNumberField,
  FormOptionCard,
  FormSection,
  FormSegmentedControl,
  FormTextField,
} from "../../../../components/creation";

type InvestmentAssetType = "crypto" | "etf" | "stock" | "fund" | "custom";
type InvestmentRiskType = "variable_income" | "fixed_income"; // ✅ solo dos valores
type RiskOrNull = InvestmentRiskType | null; // ✅ o ninguno

const TYPE_OPTIONS: {
  key: InvestmentAssetType;
  label: string;
}[] = [
  { key: "crypto", label: "Crypto" },
  { key: "etf", label: "ETF" },
  { key: "stock", label: "Acción" },
  { key: "fund", label: "Fondo" },
  { key: "custom", label: "Custom" },
];

const RISK_OPTIONS: {
  key: InvestmentRiskType;
  label: string;
}[] = [
  { key: "variable_income", label: "Renta variable" },
  { key: "fixed_income", label: "Renta fija" },
];

interface AssetFromApi {
  id: number;
  name: string;
  abbreviation?: string | null;
  identificator?: string | null;
  provider?: string | null;
  quantity?: number | string | null;
  description?: string | null;
  type: InvestmentAssetType;
  riskType?: RiskOrNull;
  currency: string;
  initialInvested: number;
  active: boolean;
  archived: boolean;
}

function isValidCurrencyCode(v: string) {
  return /^[A-Z]{3}$/.test(v);
}

import { numToInputStr } from "../../../../utils/investmentLabels";

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
  const [saveError, setSaveError] = useState<string | null>(null);
  const [archiveConfirming, setArchiveConfirming] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [isArchived, setIsArchived] = useState(false);

  const [name, setName] = useState("");
  const [abbreviation, setAbbreviation] = useState("");
  const [identificator, setIdentificator] = useState("");
  const [quantityText, setQuantityText] = useState("");
  const [description, setDescription] = useState("");
  const [provider, setProvider] = useState("");
  const [type, setType] = useState<InvestmentAssetType>("custom");
  const [riskType, setRiskType] = useState<RiskOrNull>(null); // ✅ null por defecto
  const [currency, setCurrency] = useState("EUR");

  const [initialInvestedText, setInitialInvestedText] = useState<string>("");

  const initialInvestedNumber = useMemo(
    () => parseAmount(initialInvestedText),
    [initialInvestedText]
  );
  const quantityNumber = useMemo(() => parseAmount(quantityText), [quantityText]);
  const identifierLabel = useMemo(() => {
    if (type === "fund") return "ISIN";
    if (type === "crypto") return "Símbolo";
    return "Identificador";
  }, [type]);

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
    if (quantityText.trim()) {
      if (quantityNumber === null) return false;
      if (quantityNumber < 0) return false;
    }

    return true;
  }, [name, currency, initialInvestedText, initialInvestedNumber, quantityText, quantityNumber]);

  const loadAsset = useCallback(async () => {
    if (!assetId) return;

    try {
      setLoading(true);
      const res = await api.get(`/investments/assets/${assetId}`);
      const a: AssetFromApi = res.data;

      setName(a.name ?? "");
      setAbbreviation(a.abbreviation ?? "");
      setIdentificator(a.identificator ?? "");
      const q = a.quantity == null ? null : Number(a.quantity);
      setQuantityText(Number.isFinite(q as number) ? numToInputStr(q as number) : "");
      setDescription(a.description ?? "");
      setProvider(a.provider ?? "");
      setType(a.type ?? "custom");
      setRiskType((a.riskType ?? null) as RiskOrNull);
      setCurrency((a.currency ?? "EUR").toUpperCase());
      setIsArchived(!!a.archived);

      setInitialInvestedText(
        typeof a.initialInvested === "number" ? numToInputStr(a.initialInvested, 2) : "0"
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
    const parsedQuantity = quantityText.trim() ? parseAmount(quantityText) : null;
    if (quantityText.trim() && parsedQuantity === null) {
      Alert.alert(
        "Participaciones inválidas",
        "Revisa las participaciones (ej: 2 o 2,5)."
      );
      return;
    }
    if (parsedQuantity !== null && parsedQuantity < 0) {
      Alert.alert("Participaciones inválidas", "No pueden ser negativas.");
      return;
    }

    // ✅ normaliza description: si viene vacío, manda null para permitir “borrar”
    const desc = description.trim();

    const payload: any = {
      name: name.trim(),
      abbreviation: abbreviation.trim() ? abbreviation.trim() : null,
      identificator: identificator.trim() ? identificator.trim().toUpperCase() : null,
      ...(parsedQuantity !== null ? { quantity: parsedQuantity } : {}),
      description: desc ? desc : null, // ✅ importante
      provider: provider.trim() || null,
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
      setSaveError(null);
      setSaving(true);

      if (isEdit) {
        await api.patch(`/investments/assets/${assetId}`, payload);
      } else {
        if (!("initialInvested" in payload)) payload.initialInvested = 0;
        await api.post(`/investments/assets`, payload);
      }

      markInvestmentsDirty();
      navigation.goBack();
    } catch (e: any) {
      console.error("❌ Error saving asset:", e);
      const msg =
        e?.response?.data?.message ||
        (isEdit ? "No se pudo actualizar la inversión." : "No se pudo crear la inversión.");
      if (isEdit) Alert.alert("Error", String(msg));
      else setSaveError(String(msg));
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
              markInvestmentsDirty();
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

  const onArchive = async () => {
    if (!assetId) return;
    if (!archiveConfirming) {
      setArchiveError(null);
      setArchiveConfirming(true);
      return;
    }
    try {
      setSaving(true);
      await api.patch(`/investments/assets/${assetId}/archive`);
      markInvestmentsDirty();
      navigation.goBack();
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        "Para archivar, registra una valoración de 0 primero.";
      setArchiveError(String(msg));
      setArchiveConfirming(false);
    } finally {
      setSaving(false);
    }
  };

  const [unarchiveConfirming, setUnarchiveConfirming] = useState(false);
  const [unarchiveError, setUnarchiveError] = useState<string | null>(null);

  const onUnarchive = async () => {
    if (!assetId) return;
    if (!unarchiveConfirming) {
      setUnarchiveError(null);
      setUnarchiveConfirming(true);
      return;
    }
    try {
      setSaving(true);
      await api.patch(`/investments/assets/${assetId}/unarchive`);
      markInvestmentsDirty();
      navigation.goBack();
    } catch (e: any) {
      const msg = e?.response?.data?.message || "No se pudo desarchivar la inversión.";
      setUnarchiveError(String(msg));
      setUnarchiveConfirming(false);
    } finally {
      setSaving(false);
    }
  };

  const onSelectType = (t: InvestmentAssetType) => {
    setType(t);
    const suggested = autoRiskForType(t);
    // ✅ solo autocompleta si aún no se ha definido
    if (suggested && riskType === null) setRiskType(suggested);
  };

  const clearRisk = () => setRiskType(null);

  if (!isEdit) {
    const quantityError = !quantityText.trim()
      ? null
      : quantityNumber === null
        ? "Introduce un número válido."
        : quantityNumber < 0
          ? "Las participaciones no pueden ser negativas."
          : null;
    const initialInvestedError = !initialInvestedText.trim()
      ? null
      : initialInvestedNumber === null
        ? "Introduce un importe válido."
        : initialInvestedNumber < 0
          ? "El importe aportado no puede ser negativo."
          : null;
    const currencyError = isValidCurrencyCode(currency.trim() || "EUR")
      ? null
      : "Usa un código ISO de tres letras, por ejemplo EUR.";

    return (
      <CreationFlow
        title="Nueva inversión"
        submitLabel="Crear inversión"
        onClose={() => navigation.goBack()}
        onSubmit={onSave}
        isSubmitting={saving}
        submitError={saveError}
        steps={[
          {
            id: "asset",
            title: "El activo",
            description: "Identifica el producto y dónde lo tienes contratado.",
            isValid: !!name.trim() && !currencyError,
            content: ({ showErrors }) => (
              <View style={{ gap: 18 }}>
                <FormSection>
                  <FormTextField
                    label="Nombre"
                    required
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    returnKeyType="next"
                    error={!name.trim() ? "Introduce un nombre para la inversión." : null}
                    showError={showErrors}
                  />

                  <View>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#64748B", marginBottom: 5 }}>Tipo de activo</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", margin: -4 }}>
                      {TYPE_OPTIONS.map((option) => (
                        <View key={option.key} style={{ width: "33.333%", padding: 4 }}>
                          <FormOptionCard
                            label={option.label}
                            selected={type === option.key}
                            onPress={() => onSelectType(option.key)}
                          />
                        </View>
                      ))}
                    </View>
                  </View>

                  {type === "crypto" ? (
                    <View>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: "#64748B", marginBottom: 4 }}>
                        Criptomoneda
                      </Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{ gap: 12, paddingVertical: 4 }}
                      >
                        {CRYPTO_PRESETS.map((preset) => (
                          <PresetPickerCard
                            key={preset.key}
                            logoUrl={getCryptoLogoUrl(preset.symbol)}
                            label={preset.name}
                            selected={identificator.trim().toLowerCase() === preset.symbol}
                            onPress={() => {
                              setIdentificator(preset.symbol.toUpperCase());
                              if (!name.trim()) setName(preset.name);
                            }}
                          />
                        ))}
                      </ScrollView>
                    </View>
                  ) : null}

                  <FormTextField
                    label="Abreviación"
                    value={abbreviation}
                    onChangeText={setAbbreviation}
                    returnKeyType="next"
                  />

                  <FormTextField
                    label={identifierLabel}
                    value={identificator}
                    onChangeText={setIdentificator}
                    autoCapitalize="characters"
                    returnKeyType="next"
                  />

                  <FormSegmentedControl<InvestmentRiskType>
                    label="Clase de activo"
                    value={riskType}
                    options={RISK_OPTIONS.map((option) => ({ value: option.key, label: option.label }))}
                    onChange={setRiskType}
                    onClear={clearRisk}
                  />

                  <FormCurrencyPicker value={currency} onChange={setCurrency} required />

                  <FormTextField
                    label="Gestora"
                    value={provider}
                    onChangeText={setProvider}
                    autoCapitalize="words"
                    autoCorrect={false}
                    returnKeyType="done"
                  />
                </FormSection>
              </View>
            ),
          },
          {
            id: "position",
            title: "Tu posición",
            description: "Añade lo que ya tenías antes de empezar a usar Spendly.",
            isValid: !quantityError && !initialInvestedError,
            content: ({ showErrors }) => (
              <View style={{ gap: 18 }}>
                <FormSection>
                  <FormTextField
                    label="Broker"
                    value={description}
                    onChangeText={setDescription}
                    returnKeyType="next"
                  />
                  <FormNumberField
                    label="Participaciones"
                    value={quantityText}
                    onChangeText={setQuantityText}
                    error={quantityError}
                    showError={showErrors}
                    returnKeyType="next"
                  />
                  <FormMoneyField
                    label="Aportado previamente"
                    value={initialInvestedText}
                    onChangeText={setInitialInvestedText}
                    currency={currency.trim().toUpperCase() || "EUR"}
                    error={initialInvestedError}
                    showError={showErrors}
                    hint="Las nuevas aportaciones se registrarán después como operaciones."
                    returnKeyType="done"
                  />
                </FormSection>
              </View>
            ),
          },
        ]}
      />
    );
  }

  return (
      <EditingForm
        title="Editar inversión"
        onClose={() => navigation.goBack()}
        onSubmit={onSave}
        isLoading={loading}
        isSubmitting={saving}
        isValid={canSave}
      >
        <View style={{ gap: 20 }}>
          <FormSection title="EL ACTIVO">
            <FormTextField
              label="Nombre"
              required
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="next"
              error={!name.trim() ? "Introduce un nombre para la inversión." : null}
            />

            <View>
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#64748B", marginBottom: 5 }}>Tipo de activo</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", margin: -4 }}>
                {TYPE_OPTIONS.map((option) => (
                  <View key={option.key} style={{ width: "33.333%", padding: 4 }}>
                    <FormOptionCard
                      label={option.label}
                      selected={type === option.key}
                      onPress={() => onSelectType(option.key)}
                    />
                  </View>
                ))}
              </View>
            </View>

            {type === "crypto" ? (
              <View>
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#64748B", marginBottom: 4 }}>Criptomoneda</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ gap: 12, paddingVertical: 4 }}
                >
                  {CRYPTO_PRESETS.map((preset) => (
                    <PresetPickerCard
                      key={preset.key}
                      logoUrl={getCryptoLogoUrl(preset.symbol)}
                      label={preset.name}
                      selected={identificator.trim().toLowerCase() === preset.symbol}
                      onPress={() => {
                        setIdentificator(preset.symbol.toUpperCase());
                        if (!name.trim()) setName(preset.name);
                      }}
                    />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <FormTextField
              label="Abreviación"
              value={abbreviation}
              onChangeText={setAbbreviation}
              returnKeyType="next"
            />
            <FormTextField
              label={identifierLabel}
              value={identificator}
              onChangeText={setIdentificator}
              autoCapitalize="characters"
              returnKeyType="next"
            />
            <FormSegmentedControl<InvestmentRiskType>
              label="Clase de activo"
              value={riskType}
              options={RISK_OPTIONS.map((option) => ({ value: option.key, label: option.label }))}
              onChange={setRiskType}
              onClear={clearRisk}
            />
            <FormCurrencyPicker value={currency} onChange={setCurrency} required />
            <FormTextField
              label="Gestora"
              value={provider}
              onChangeText={setProvider}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
            />
          </FormSection>

          <FormSection title="TU POSICIÓN">
            <FormTextField
              label="Broker"
              value={description}
              onChangeText={setDescription}
              returnKeyType="next"
            />
            <FormNumberField
              label="Participaciones"
              value={quantityText}
              onChangeText={setQuantityText}
              error={quantityText.trim() && quantityNumber === null ? "Introduce un número válido." : quantityNumber !== null && quantityNumber < 0 ? "Las participaciones no pueden ser negativas." : null}
              returnKeyType="next"
            />
            <FormMoneyField
              label="Aportado previamente"
              value={initialInvestedText}
              onChangeText={setInitialInvestedText}
              currency={currency.trim().toUpperCase() || "EUR"}
              error={initialInvestedText.trim() && initialInvestedNumber === null ? "Introduce un importe válido." : initialInvestedNumber !== null && initialInvestedNumber < 0 ? "El importe aportado no puede ser negativo." : null}
              hint="Las nuevas aportaciones se registran como operaciones."
              returnKeyType="done"
            />
          </FormSection>

          <FormSection title="OTRAS ACCIONES">
            <View style={{ borderTopWidth: 1, borderTopColor: "#E8EDF3" }}>
              {isArchived ? (
                unarchiveConfirming ? (
                  <View style={{ paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "#E8EDF3" }}>
                    <Text style={{ fontSize: 13.5, lineHeight: 19, fontWeight: "600", color: "#475569" }}>
                      Volverá a aparecer en tu cartera.
                    </Text>
                    <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 22, marginTop: 11 }}>
                      <TouchableOpacity onPress={() => setUnarchiveConfirming(false)} disabled={saving} hitSlop={8}>
                        <Text style={{ fontSize: 13, fontWeight: "700", color: "#94A3B8" }}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={onUnarchive} disabled={saving} hitSlop={8}>
                        <Text style={{ fontSize: 13, fontWeight: "800", color: "#16A34A" }}>Restaurar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <EditingActionRow label="Restaurar inversión" onPress={onUnarchive} disabled={saving} />
                )
              ) : archiveConfirming ? (
                <View style={{ paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "#E8EDF3" }}>
                  <Text style={{ fontSize: 13.5, lineHeight: 19, fontWeight: "600", color: "#475569" }}>
                    La inversión dejará de aparecer en tu cartera. Su última valoración debe ser 0.
                  </Text>
                  <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 22, marginTop: 11 }}>
                    <TouchableOpacity onPress={() => setArchiveConfirming(false)} disabled={saving} hitSlop={8}>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: "#94A3B8" }}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onArchive} disabled={saving} hitSlop={8}>
                      <Text style={{ fontSize: 13, fontWeight: "800", color: "#B45309" }}>Archivar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <EditingActionRow label="Archivar inversión" onPress={onArchive} disabled={saving} />
              )}

              <EditingActionRow label="Eliminar inversión" onPress={onDelete} disabled={saving} destructive />
            </View>

            <FormError message={archiveError || unarchiveError} />
          </FormSection>
        </View>
      </EditingForm>
  );
}
