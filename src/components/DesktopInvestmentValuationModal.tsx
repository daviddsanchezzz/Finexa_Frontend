// src/components/DesktopInvestmentValuationModal.tsx
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { View, Text, Modal, Pressable, TextInput, ActivityIndicator, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import api from "../api/api";
import { colors } from "../theme/theme";
import { textStyles, typography } from "../theme/typography";

function isValidISODate(v: string) {
  // YYYY-MM-DD (input date web)
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
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

type Props = {
  visible: boolean;
  assetId: number;
  currency?: string;
  onClose: () => void;
  onSaved?: () => void;
};

export default function DesktopInvestmentValuationModal({ visible, assetId, currency = "EUR", onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false);

  // defaults
  const [date, setDate] = useState<string>("");
  const [valueText, setValueText] = useState<string>("");

  useEffect(() => {
    if (!visible) return;
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    setDate(`${yyyy}-${mm}-${dd}`);
    setValueText("");
  }, [visible]);

  const valueNumber = useMemo(() => parseAmount(valueText), [valueText]);

  const canSave = useMemo(() => {
    if (!assetId) return false;
    if (!isValidISODate(date)) return false;
    if (valueText.trim() && valueNumber === null) return false;
    if (valueNumber === null) return false;
    if (valueNumber < 0) return false;
    return true;
  }, [assetId, date, valueText, valueNumber]);

  const onSubmit = useCallback(async () => {
    if (!canSave) return;

    try {
      setSaving(true);

      const payload = {
        date, // YYYY-MM-DD
        value: valueNumber!,
        currency, // opcional (si tu backend lo ignora, no pasa nada)
      };

      // ⚠️ Ajusta el endpoint si el tuyo es distinto
      await api.post(`/investments/assets/${assetId}/valuations`, payload);

      onSaved?.();
    } catch (e) {
      console.error("❌ Error creando valoración:", e);
      // si tienes appAlert/Alert, puedes usarlo aquí
    } finally {
      setSaving(false);
    }
  }, [assetId, canSave, currency, date, onSaved, valueNumber]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* Backdrop */}
      <Pressable
        onPress={saving ? undefined : onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(15,23,42,0.45)",
          padding: 24,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Card */}
        <Pressable
          onPress={() => {}}
          style={{
            width: "100%",
            maxWidth: 720,
            borderRadius: 16,
            backgroundColor: "white",
            borderWidth: 1,
            borderColor: "#E5E7EB",
            overflow: "hidden",
            shadowColor: "#000",
            shadowOpacity: 0.18,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
          }}
        >
          {/* Header */}
          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  backgroundColor: "rgba(37,99,235,0.10)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="cash-outline" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={[textStyles.h2, { fontSize: 14, fontWeight: "900", color: "#0F172A" }]}>Nueva valoración</Text>
                <Text style={[textStyles.caption, { fontSize: 12, fontWeight: "800", color: "#94A3B8", marginTop: 2 }]}>
                  Guarda el valor actual del activo ({currency})
                </Text>
              </View>
            </View>

            <Pressable
              onPress={saving ? undefined : onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#E5E7EB",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "white",
              }}
            >
              <Ionicons name="close" size={18} color="#64748B" />
            </Pressable>
          </View>

          {/* Body */}
          <View style={{ padding: 16, gap: 14 }}>
            {/* Date */}
            <View style={{ gap: 6 }}>
              <Text style={[textStyles.labelMuted, { fontSize: 12 }]}>Fecha</Text>

              {Platform.OS === "web" ? (
                // @ts-ignore
                <input
                  type="date"
                  value={date}
                  onChange={(e: any) => setDate(e?.target?.value ?? "")}
                  style={{
                    height: 42,
                    borderRadius: 12,
                    border: "1px solid #E5E7EB",
                    background: "#F8FAFC",
                    padding: "0 12px",
                    fontFamily: typography.family.base,
                    fontWeight: 800,
                    color: "#0F172A",
                    outline: "none",
                  }}
                />
              ) : (
                <TextInput
                  value={date}
                  onChangeText={setDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94A3B8"
                  style={{
                    height: 42,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    backgroundColor: "#F8FAFC",
                    paddingHorizontal: 12,
                    fontWeight: "800",
                    color: "#0F172A",
                  }}
                />
              )}

              {!isValidISODate(date) ? (
                <Text style={[textStyles.caption, { fontSize: 11, fontWeight: "800", color: "#DC2626" }]}>Formato inválido (usa YYYY-MM-DD)</Text>
              ) : null}
            </View>

            {/* Value */}
            <View style={{ gap: 6 }}>
              <Text style={[textStyles.labelMuted, { fontSize: 12 }]}>Valor</Text>
              <View
                style={{
                  height: 42,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  backgroundColor: "#F8FAFC",
                  paddingHorizontal: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Ionicons name="wallet-outline" size={16} color="#64748B" />
                <TextInput
                  value={valueText}
                  onChangeText={setValueText}
                  placeholder={`Ej: 2500 (${currency})`}
                  placeholderTextColor="#94A3B8"
                  keyboardType="decimal-pad"
                  style={{ flex: 1, fontWeight: "900", color: "#0F172A" }}
                />
                {valueText.trim() && valueNumber === null ? (
                  <Text style={[textStyles.caption, { fontSize: 11, fontWeight: "900", color: "#DC2626" }]}>inválido</Text>
                ) : null}
              </View>

            </View>
          </View>

          {/* Footer */}
          <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: "#E5E7EB", flexDirection: "row", justifyContent: "flex-end", gap: 10 }}>
            <Pressable
              onPress={saving ? undefined : onClose}
              style={{
                height: 42,
                paddingHorizontal: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#E5E7EB",
                backgroundColor: "white",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={[textStyles.button, { fontSize: 12, fontWeight: "900", color: "#64748B" }]}>Cancelar</Text>
            </Pressable>

            <Pressable
              onPress={onSubmit}
              disabled={!canSave || saving}
              style={{
                height: 42,
                paddingHorizontal: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: !canSave || saving ? "#E5E7EB" : colors.primary,
                backgroundColor: !canSave || saving ? "#E5E7EB" : colors.primary,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
              }}
            >
              {saving ? <ActivityIndicator color="white" /> : <Ionicons name="checkmark-outline" size={18} color="white" />}
              <Text style={[textStyles.button, { fontSize: 12, fontWeight: "900", color: "white" }]}>Guardar</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
