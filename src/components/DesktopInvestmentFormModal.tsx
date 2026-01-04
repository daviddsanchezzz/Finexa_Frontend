// src/components/DesktopInvestmentFormModal.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Platform,
  Pressable,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import api from "../api/api";
import { colors } from "../theme/theme";
import { textStyles, typography } from "../theme/typography";

type InvestmentAssetType = "crypto" | "etf" | "stock" | "fund" | "custom";
type InvestmentRiskType = "variable_income" | "fixed_income";
type RiskOrNull = InvestmentRiskType | null;

const TYPE_OPTIONS: {
  key: InvestmentAssetType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: "crypto", label: "Crypto", icon: "logo-bitcoin" },
  { key: "etf", label: "ETF", icon: "layers-outline" },
  { key: "stock", label: "Acción", icon: "trending-up-outline" },
  { key: "fund", label: "Fondo", icon: "briefcase-outline" },
  { key: "custom", label: "Custom", icon: "shapes-outline" },
];

const RISK_OPTIONS: {
  key: InvestmentRiskType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: "green" | "blue";
}[] = [
  { key: "variable_income", label: "Renta variable", icon: "trending-up-outline", tone: "green" },
  { key: "fixed_income", label: "Renta fija", icon: "shield-checkmark-outline", tone: "blue" },
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

  const hasComma = raw.includes(",");
  const normalized = hasComma
    ? raw.replace(/\s/g, "").replace(/\./g, "").replace(",", ".")
    : raw.replace(/\s/g, "").replace(/,/g, "").trim();

  const n = Number(normalized);
  if (Number.isNaN(n)) return null;
  return n;
}

/** Escalado responsive (mismo patrón) */
function useUiScale() {
  const { width } = Dimensions.get("window");

  const s = useMemo(() => {
    const raw = width / 1440;
    return Math.max(0.86, Math.min(1.08, raw));
  }, [width]);

  const px = useCallback((n: number) => Math.round(n * s), [s]);
  const fs = useCallback((n: number) => Math.round(n * s), [s]);

  return { px, fs, width };
}

function Chip({
  icon,
  label,
  active,
  onPress,
  px,
  fs,
  variant = "neutral",
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
  px: (n: number) => number;
  fs: (n: number) => number;
  variant?: "neutral" | "green" | "blue";
}) {
  const [hover, setHover] = useState(false);

  const styles = useMemo(() => {
    if (variant === "green") {
      return {
        bg: active ? "rgba(16,185,129,0.12)" : "#F3F4F6",
        bd: active ? "rgba(16,185,129,0.35)" : "#E5E7EB",
        fg: active ? "#059669" : "#64748B",
      };
    }
    if (variant === "blue") {
      return {
        bg: active ? "rgba(59,130,246,0.12)" : "#F3F4F6",
        bd: active ? "rgba(59,130,246,0.35)" : "#E5E7EB",
        fg: active ? "#2563EB" : "#64748B",
      };
    }
    return {
      bg: active ? "rgba(37,99,235,0.10)" : "#F3F4F6",
      bd: active ? "rgba(37,99,235,0.35)" : "#E5E7EB",
      fg: active ? colors.primary : "#64748B",
    };
  }, [active, variant]);

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      style={{
        paddingVertical: px(8),
        paddingHorizontal: px(10),
        borderRadius: px(14),
        backgroundColor: hover && !active ? "#EEF2F7" : styles.bg,
        borderWidth: 1,
        borderColor: styles.bd,
        flexDirection: "row",
        alignItems: "center",
        gap: px(6),
      }}
    >
      <Ionicons name={icon} size={px(14)} color={styles.fg} />
      <Text style={[textStyles.label, { fontSize: fs(12), fontWeight: "900", color: styles.fg }]}>{label}</Text>
    </Pressable>
  );
}

function Field({
  label,
  hint,
  leftIcon,
  right,
  children,
  px,
  fs,
}: {
  label: string;
  hint?: string;
  leftIcon: keyof typeof Ionicons.glyphMap;
  right?: React.ReactNode;
  children: React.ReactNode;
  px: (n: number) => number;
  fs: (n: number) => number;
}) {
  return (
    <View style={{ marginTop: px(14) }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: px(6) }}>
        <Text style={[textStyles.labelMuted, { fontSize: fs(11), color: "#94A3B8" }]}>{label}</Text>
        {!!right && <View>{right}</View>}
      </View>

      <View
        style={{
          borderRadius: px(14),
          borderWidth: 1,
          borderColor: "#E5E7EB",
          backgroundColor: "#F9FAFB",
          paddingHorizontal: px(12),
          paddingVertical: px(10),
          flexDirection: "row",
          alignItems: "center",
          gap: px(10),
        }}
      >
        <Ionicons name={leftIcon} size={px(16)} color="#64748B" />
        <View style={{ flex: 1 }}>{children}</View>
      </View>

      {!!hint && (
        <Text style={[textStyles.caption, { marginTop: px(8), fontSize: fs(11), color: "#94A3B8", fontWeight: "700", lineHeight: fs(15) }]}>
          {hint}
        </Text>
      )}
    </View>
  );
}

type Props = {
  visible: boolean;
  onClose: () => void;
  assetId?: number;
  onSaved?: () => void; // para refrescar la lista
};

export default function DesktopInvestmentFormModal({ visible, onClose, assetId, onSaved }: Props) {
  const isEdit = !!assetId;
  const { px, fs, width } = useUiScale();
  const WIDE = width >= 1100;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<InvestmentAssetType>("custom");
  const [riskType, setRiskType] = useState<RiskOrNull>(null);
  const [currency, setCurrency] = useState("EUR");
  const [initialInvestedText, setInitialInvestedText] = useState<string>("");

  const title = useMemo(() => (isEdit ? "Editar inversión" : "Nueva inversión"), [isEdit]);
  const initialInvestedNumber = useMemo(() => parseAmount(initialInvestedText), [initialInvestedText]);

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

  const resetForCreate = useCallback(() => {
    setName("");
    setDescription("");
    setType("custom");
    setRiskType(null);
    setCurrency("EUR");
    setInitialInvestedText("");
  }, []);

  const loadAsset = useCallback(async () => {
    if (!assetId) {
      resetForCreate();
      return;
    }

    try {
      setLoading(true);
      const res = await api.get(`/investments/assets/${assetId}`);
      const a: AssetFromApi = res.data;

      setName(a.name ?? "");
      setDescription(a.description ?? "");
      setType((a.type ?? "custom") as InvestmentAssetType);
      setRiskType((a.riskType ?? null) as RiskOrNull);
      setCurrency((a.currency ?? "EUR").toUpperCase());
      setInitialInvestedText(typeof a.initialInvested === "number" ? String(a.initialInvested) : "0");
    } catch (e) {
      console.error("❌ Error loading asset (modal):", e);
      onClose();
    } finally {
      setLoading(false);
    }
  }, [assetId, onClose, resetForCreate]);

  // Importante: recargar cuando el modal se abre
  useEffect(() => {
    if (visible) loadAsset();
  }, [visible, loadAsset]);

  // Mantengo useFocusEffect por si lo abres con navegación “real”
  useFocusEffect(
    useCallback(() => {
      if (visible) loadAsset();
    }, [visible, loadAsset])
  );

  const onSelectType = (t: InvestmentAssetType) => {
    setType(t);
    const suggested = autoRiskForType(t);
    if (suggested && riskType === null) setRiskType(suggested);
  };

  const onSave = useCallback(async () => {
    const parsed = initialInvestedText.trim() ? parseAmount(initialInvestedText) : null;
    if (initialInvestedText.trim() && parsed === null) return;
    if (parsed !== null && parsed < 0) return;

    const desc = description.trim();

    const payload: any = {
      name: name.trim(),
      description: desc ? desc : null,
      type,
      riskType: riskType ?? null,
      currency: currency.trim() ? currency.trim().toUpperCase() : "EUR",
      ...(parsed !== null ? { initialInvested: parsed } : {}),
    };

    if (!payload.name) return;
    if (payload.currency && !isValidCurrencyCode(payload.currency)) return;

    try {
      setSaving(true);

      if (isEdit) {
        await api.patch(`/investments/assets/${assetId}`, payload);
      } else {
        if (!("initialInvested" in payload)) payload.initialInvested = 0;
        await api.post(`/investments/assets`, payload);
      }

      onSaved?.();
      onClose();
    } catch (e) {
      console.error("❌ Error saving asset (modal):", e);
    } finally {
      setSaving(false);
    }
  }, [assetId, currency, description, initialInvestedText, isEdit, name, onClose, onSaved, riskType, type]);

  const onDelete = useCallback(async () => {
    if (!assetId) return;

    try {
      setSaving(true);
      await api.delete(`/investments/assets/${assetId}`);
      onSaved?.();
      onClose();
    } catch (e) {
      console.error("❌ Error deleting asset (modal):", e);
    } finally {
      setSaving(false);
    }
  }, [assetId, onClose, onSaved]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* Overlay */}
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(2,6,23,0.55)",
          padding: px(22),
          justifyContent: "center",
        }}
      >
        {/* Stop propagation */}
        <Pressable
          onPress={() => {}}
          style={{
            width: "100%",
            maxWidth: WIDE ? px(1080) : px(920),
            alignSelf: "center",
            backgroundColor: "white",
            borderRadius: px(16),
            borderWidth: 1,
            borderColor: "#E5E7EB",
            overflow: "hidden",
            shadowColor: "#000",
            shadowOpacity: 0.12,
            shadowRadius: px(18),
            shadowOffset: { width: 0, height: px(10) },
            maxHeight: "90%",
          }}
        >
          {/* Header */}
          <View
            style={{
              paddingHorizontal: px(16),
              paddingVertical: px(12),
              borderBottomWidth: 1,
              borderBottomColor: "#E5E7EB",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: px(12),
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={[textStyles.h1, { fontSize: fs(16), fontWeight: "900", color: "#0F172A" }]} numberOfLines={1}>
                {title}
              </Text>
              <Text style={[textStyles.caption, { marginTop: px(2), fontSize: fs(11), fontWeight: "700", color: "#94A3B8" }]} numberOfLines={1}>
                {isEdit ? "Actualiza datos del activo" : "Crea un activo para tu portfolio"}
              </Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: px(10) }}>
              {isEdit ? (
                <TouchableOpacity
                  onPress={onDelete}
                  disabled={saving}
                  activeOpacity={0.9}
                  style={{
                    height: px(36),
                    paddingHorizontal: px(12),
                    borderRadius: px(12),
                    borderWidth: 1,
                    borderColor: "#FECACA",
                    backgroundColor: "#FEF2F2",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: px(8),
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  <Ionicons name="trash-outline" size={px(16)} color="#DC2626" />
                  <Text style={[textStyles.button, { fontSize: fs(12), fontWeight: "900", color: "#DC2626" }]}>Eliminar</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.9}
                style={{
                  width: px(36),
                  height: px(36),
                  borderRadius: px(12),
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  backgroundColor: "#F8FAFC",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="close-outline" size={px(18)} color="#64748B" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onSave}
                disabled={!canSave || saving}
                activeOpacity={0.9}
                style={{
                  height: px(36),
                  paddingHorizontal: px(14),
                  borderRadius: px(12),
                  backgroundColor: !canSave || saving ? "#E5E7EB" : colors.primary,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: px(8),
                }}
              >
                {saving ? (
                  <ActivityIndicator color={!canSave ? "#64748B" : "white"} />
                ) : (
                  <Ionicons name="checkmark-outline" size={px(16)} color={!canSave || saving ? "#64748B" : "white"} />
                )}
                <Text style={[textStyles.button, { fontSize: fs(12), fontWeight: "900", color: !canSave || saving ? "#64748B" : "white" }]}>
                  {isEdit ? "Guardar" : "Crear"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Body */}
          {loading ? (
            <View style={{ padding: px(22), alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[textStyles.bodyMuted, { marginTop: px(10), fontSize: fs(12), color: "#94A3B8", fontWeight: "700" }]}>Cargando…</Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: px(16), paddingBottom: px(18) }}
            >
              <View style={{ flexDirection: WIDE ? "row" : "column", gap: px(14) }}>
                {/* Form */}
                <View style={{ flex: 1 }}>
                  <Field label="Nombre" leftIcon="text-outline" px={px} fs={fs} >
                    {Platform.OS === "web" ? (
                      // @ts-ignore
                      <input
                        value={name}
                        onChange={(e: any) => setName(e?.target?.value ?? "")}
                        
                        style={{
                          width: "100%",
                          border: "none",
                          outline: "none",
                          fontSize: fs(13),
                          fontFamily: typography.family.base,
                          fontWeight: 800,
                          background: "transparent",
                          color: "#0F172A",
                        }}
                      />
                    ) : (
                      <TextInput
                        value={name}
                        onChangeText={setName}
                        placeholderTextColor="#9CA3AF"
                        style={{ fontSize: fs(13), fontWeight: "800", color: "#0F172A" }}
                      />
                    )}
                  </Field>

                  <Field
                    label="Descripción (opcional)"
                    leftIcon="document-text-outline"
                    px={px}
                    fs={fs}
                    right={
                      !!description.trim() ? (
                        <TouchableOpacity activeOpacity={0.9} onPress={() => setDescription("")} style={{ flexDirection: "row", alignItems: "center", gap: px(6) }}>
                          <Ionicons name="close-circle-outline" size={px(16)} color="#94A3B8" />
                          <Text style={[textStyles.caption, { fontSize: fs(11), fontWeight: "900", color: "#94A3B8" }]}>Limpiar</Text>
                        </TouchableOpacity>
                      ) : null
                    }
                  >
                    {Platform.OS === "web" ? (
                      // @ts-ignore
                      <input
                        value={description}
                        onChange={(e: any) => setDescription(e?.target?.value ?? "")}
                        style={{
                          width: "100%",
                          border: "none",
                          outline: "none",
                          fontSize: fs(13),
                          fontFamily: typography.family.base,
                          fontWeight: 800,
                          background: "transparent",
                          color: "#0F172A",
                        }}
                      />
                    ) : (
                      <TextInput
                        value={description}
                        onChangeText={setDescription}
                        placeholderTextColor="#9CA3AF"
                        style={{ fontSize: fs(13), fontWeight: "800", color: "#0F172A" }}
                      />
                    )}
                  </Field>

                  <View style={{ marginTop: px(16) }}>
                    <Text style={[textStyles.labelMuted, { fontSize: fs(11), color: "#94A3B8" }]}>Tipo</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: px(10), gap: px(8) }}>
                      {TYPE_OPTIONS.map((opt) => (
                        <Chip
                          key={opt.key}
                          icon={opt.icon}
                          label={opt.label}
                          active={type === opt.key}
                          onPress={() => onSelectType(opt.key)}
                          px={px}
                          fs={fs}
                          variant="neutral"
                        />
                      ))}
                    </View>
                  </View>

                  <View style={{ marginTop: px(16) }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <Text style={[textStyles.labelMuted, { fontSize: fs(11), color: "#94A3B8" }]}>Riesgo</Text>
                      {riskType !== null ? (
                        <TouchableOpacity activeOpacity={0.9} onPress={() => setRiskType(null)} style={{ flexDirection: "row", alignItems: "center", gap: px(6) }}>
                          <Ionicons name="close-circle-outline" size={px(16)} color="#94A3B8" />
                          <Text style={[textStyles.caption, { fontSize: fs(11), fontWeight: "900", color: "#94A3B8" }]}>Quitar</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: px(10), gap: px(8) }}>
                      {RISK_OPTIONS.map((opt) => (
                        <Chip
                          key={opt.key}
                          icon={opt.icon}
                          label={opt.label}
                          active={riskType === opt.key}
                          onPress={() => setRiskType(opt.key)}
                          px={px}
                          fs={fs}
                          variant={opt.tone}
                        />
                      ))}
                    </View>

                    <Text style={[textStyles.caption, { marginTop: px(10), fontSize: fs(11), color: "#94A3B8", fontWeight: "700", lineHeight: fs(15) }]}>
                      Selecciona renta fija o renta variable, o déjalo sin definir.
                    </Text>
                  </View>

                  <Field
                    label="Divisa"
                    leftIcon="cash-outline"
                    px={px}
                    fs={fs}
                    right={
                      !isValidCurrencyCode((currency || "").trim().toUpperCase() || "EUR") ? (
                        <Text style={[textStyles.caption, { fontSize: fs(11), color: "#DC2626", fontWeight: "900" }]}>ISO</Text>
                      ) : null
                    }
                    hint="Código ISO de 3 letras: EUR, USD…"
                  >
                    <TextInput
                      value={currency}
                      onChangeText={(v) => setCurrency((v || "").toUpperCase())}
                      placeholder="EUR"
                      placeholderTextColor="#9CA3AF"
                      autoCapitalize="characters"
                      maxLength={3}
                      style={{ fontSize: fs(13), fontWeight: "900", color: "#0F172A" }}
                    />
                  </Field>

                  <Field
                    label="Aportado previo (antes de usar la app)"
                    leftIcon="arrow-down-circle-outline"
                    px={px}
                    fs={fs}
                    right={
                      initialInvestedText.trim() && initialInvestedNumber === null ? (
                        <Text style={[textStyles.caption, { fontSize: fs(11), color: "#DC2626", fontWeight: "900" }]}>inválido</Text>
                      ) : null
                    }
                    hint="Lo aportado antes de la app. Aportaciones nuevas: transferencias."
                  >
                    <TextInput
                      value={initialInvestedText}
                      onChangeText={setInitialInvestedText}
                      placeholderTextColor="#9CA3AF"
                      keyboardType="decimal-pad"
                      style={{ fontSize: fs(13), fontWeight: "900", color: "#0F172A" }}
                    />
                  </Field>
                </View>

                {/* Sidebar resumen */}
                <View style={{ width: WIDE ? px(360) : "100%" }}>
                  <View
                    style={{
                      borderRadius: px(14),
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                      backgroundColor: "#F8FAFC",
                      padding: px(14),
                    }}
                  >
                    <Text style={[textStyles.labelMuted, { fontSize: fs(12) }]}>Resumen</Text>

                    <View style={{ marginTop: px(10), gap: px(10) }}>
                      <Row label="Nombre" value={name.trim() || "—"} px={px} fs={fs} />
                      <Row label="Tipo" value={TYPE_OPTIONS.find((x) => x.key === type)?.label ?? "—"} px={px} fs={fs} />
                      <Row label="Riesgo" value={riskType === "fixed_income" ? "Renta fija" : riskType === "variable_income" ? "Renta variable" : "—"} px={px} fs={fs} />
                      <Row label="Divisa" value={(currency.trim().toUpperCase() || "EUR") as any} px={px} fs={fs} danger={!isValidCurrencyCode(currency.trim().toUpperCase() || "EUR")} />

                      <View style={{ height: 1, backgroundColor: "#E5E7EB", marginTop: px(6) }} />

                      <Text style={[textStyles.caption, { fontSize: fs(11), color: "#94A3B8", fontWeight: "700", lineHeight: fs(15) }]}>
                        Para crypto/acciones se sugiere “renta variable” automáticamente si aún no has definido riesgo.
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Row({
  label,
  value,
  px,
  fs,
  danger,
}: {
  label: string;
  value: string;
  px: (n: number) => number;
  fs: (n: number) => number;
  danger?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: px(10) }}>
      <Text style={[textStyles.caption, { fontSize: fs(12), fontWeight: "800", color: "#64748B" }]} numberOfLines={1}>
        {label}
      </Text>
      <Text
        style={[textStyles.body, { fontSize: fs(12), fontWeight: "900", color: danger ? "#DC2626" : "#0F172A", maxWidth: "62%", textAlign: "right" }]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}
