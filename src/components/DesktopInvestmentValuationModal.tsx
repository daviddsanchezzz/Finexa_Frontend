// src/components/DesktopInvestmentValuationModal.tsx
import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import api from "../api/api";
import { colors } from "../theme/theme";
import { textStyles, typography } from "../theme/typography";

function isValidISODate(v: string) {
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

function toISODateOnly(isoOrDate: string) {
  // Soporta ISO completo o YYYY-MM-DD
  if (!isoOrDate) return "";
  if (isValidISODate(isoOrDate)) return isoOrDate;

  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function todayISODate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

type Props = {
  visible: boolean;
  assetId: number;
  currency?: string;
  editingValuationId?: number | null; // ✅ NUEVO
  onClose: () => void;
  onSaved?: () => void;
};

type ValuationDetail = {
  id: number;
  assetId?: number;
  investmentAssetId?: number;
  date: string;
  value: number;
  currency?: string | null;
  active?: boolean;
};

export default function DesktopInvestmentValuationModal({
  visible,
  assetId,
  currency = "EUR",
  editingValuationId = null,
  onClose,
  onSaved,
}: Props) {
  const isEdit = !!editingValuationId;

  const [saving, setSaving] = useState(false);
  const [loadingVal, setLoadingVal] = useState(false);

  const [date, setDate] = useState<string>("");
  const [valueText, setValueText] = useState<string>("");

  // ✅ Cargar datos al abrir:
  // - Create: fecha hoy + value vacío
  // - Edit: fetch valoración y rellenar
  useEffect(() => {
    if (!visible) return;

    let cancelled = false;

    const run = async () => {
      // reset mínimo al abrir para evitar "flash" de datos viejos
      setSaving(false);

      if (!isEdit) {
        setLoadingVal(false);
        setDate(todayISODate());
        setValueText("");
        return;
      }

      // Edit mode
      setLoadingVal(true);
      try {
        // ⚠️ Ajusta endpoint si el tuyo es distinto
        const res = await api.get(`/investments/valuations/${editingValuationId}`);
        const v: ValuationDetail | null = res?.data ?? null;

        if (cancelled) return;

        if (v?.id) {
          setDate(toISODateOnly(v.date));
          // mostramos con coma si quieres estilo ES
          // Para no liarla: deja el number "tal cual" con '.' y tu parser lo soporta
          setValueText(String(Number(v.value ?? 0)));
        } else {
          // fallback
          setDate(todayISODate());
          setValueText("");
        }
      } catch (e) {
        if (cancelled) return;
        console.error("❌ Error cargando valoración a editar:", e);
        // fallback a create-like state (pero seguimos en edit)
        setDate(todayISODate());
        setValueText("");
      } finally {
        if (!cancelled) setLoadingVal(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
    // Importante: depende de visible y del id (para permitir editar distintas valoraciones sin cerrar)
  }, [visible, isEdit, editingValuationId]);

  const valueNumber = useMemo(() => parseAmount(valueText), [valueText]);

  const canSave = useMemo(() => {
    if (!assetId) return false;
    if (!isValidISODate(date)) return false;

    // En edición también exigimos valor válido
    if (valueText.trim() && valueNumber === null) return false;
    if (valueNumber === null) return false;
    if (valueNumber < 0) return false;

    // Evita guardar mientras carga la valoración
    if (loadingVal) return false;

    return true;
  }, [assetId, date, valueText, valueNumber, loadingVal]);

  const onSubmit = useCallback(async () => {
    if (!canSave) return;

    try {
      setSaving(true);

      const payload = {
        assetId,
        date, // YYYY-MM-DD
        value: valueNumber!,
        currency, // si en tu backend no hace falta, no pasa nada (o quítalo)
      };

      if (isEdit && editingValuationId) {
        // ⚠️ Ajusta endpoint si el tuyo es distinto
        await api.patch(`/investments/valuations/${editingValuationId}`, payload);
      } else {
        // create
        await api.post(`/investments/valuations`, payload);
      }

      onSaved?.();
    } catch (e) {
      console.error("❌ Error guardando valoración:", e);
    } finally {
      setSaving(false);
    }
  }, [canSave, assetId, date, valueNumber, currency, isEdit, editingValuationId, onSaved]);

  const busy = saving || loadingVal;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={busy ? undefined : onClose}>
      {/* Backdrop */}
      <Pressable
        onPress={busy ? undefined : onClose}
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
          <View
            style={{
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: "#E5E7EB",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
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
                <Text style={[textStyles.h2, { fontSize: 14, fontWeight: "900", color: "#0F172A" }]}>
                  {isEdit ? "Editar valoración" : "Nueva valoración"}
                </Text>
                <Text style={[textStyles.caption, { fontSize: 12, fontWeight: "800", color: "#94A3B8", marginTop: 2 }]}>
                  Guarda el valor actual del activo ({currency})
                </Text>
              </View>
            </View>

            <Pressable
              onPress={busy ? undefined : onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#E5E7EB",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "white",
                opacity: busy ? 0.6 : 1,
              }}
            >
              <Ionicons name="close" size={18} color="#64748B" />
            </Pressable>
          </View>

          {/* Body */}
          <View style={{ padding: 16, gap: 14 }}>
            {loadingVal ? (
              <View style={{ paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 10 }}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[textStyles.bodyMuted, { fontSize: 12, fontWeight: "800", color: "#94A3B8" }]}>
                  Cargando valoración…
                </Text>
              </View>
            ) : null}

            {/* Date */}
            <View style={{ gap: 6, opacity: loadingVal ? 0.7 : 1 }}>
              <Text style={[textStyles.labelMuted, { fontSize: 12 }]}>Fecha</Text>

              {Platform.OS === "web" ? (
                // @ts-ignore
                <input
                  type="date"
                  value={date}
                  disabled={loadingVal}
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
                    opacity: loadingVal ? 0.7 : 1,
                  }}
                />
              ) : (
                <TextInput
                  value={date}
                  editable={!loadingVal}
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
                    opacity: loadingVal ? 0.7 : 1,
                  }}
                />
              )}

              {!!date && !isValidISODate(date) ? (
                <Text style={[textStyles.caption, { fontSize: 11, fontWeight: "800", color: "#DC2626" }]}>
                  Formato inválido (usa YYYY-MM-DD)
                </Text>
              ) : null}
            </View>

            {/* Value */}
            <View style={{ gap: 6, opacity: loadingVal ? 0.7 : 1 }}>
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
                  editable={!loadingVal}
                  onChangeText={setValueText}
                  placeholder={`Ej: 2500 (${currency})`}
                  placeholderTextColor="#94A3B8"
                  keyboardType="decimal-pad"
                  style={{ flex: 1, fontWeight: "900", color: "#0F172A", opacity: loadingVal ? 0.7 : 1 }}
                />
                {valueText.trim() && valueNumber === null ? (
                  <Text style={[textStyles.caption, { fontSize: 11, fontWeight: "900", color: "#DC2626" }]}>inválido</Text>
                ) : null}
              </View>
            </View>
          </View>

          {/* Footer */}
          <View
            style={{
              padding: 16,
              borderTopWidth: 1,
              borderTopColor: "#E5E7EB",
              flexDirection: "row",
              justifyContent: "flex-end",
              gap: 10,
            }}
          >
            <Pressable
              onPress={busy ? undefined : onClose}
              style={{
                height: 42,
                paddingHorizontal: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#E5E7EB",
                backgroundColor: "white",
                alignItems: "center",
                justifyContent: "center",
                opacity: busy ? 0.6 : 1,
              }}
            >
              <Text style={[textStyles.button, { fontSize: 12, fontWeight: "900", color: "#64748B" }]}>Cancelar</Text>
            </Pressable>

            <Pressable
              onPress={onSubmit}
              disabled={!canSave || busy}
              style={{
                height: 42,
                paddingHorizontal: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: !canSave || busy ? "#E5E7EB" : colors.primary,
                backgroundColor: !canSave || busy ? "#E5E7EB" : colors.primary,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
              }}
            >
              {busy ? <ActivityIndicator color="white" /> : <Ionicons name="checkmark-outline" size={18} color="white" />}
              <Text style={[textStyles.button, { fontSize: 12, fontWeight: "900", color: "white" }]}>
                {isEdit ? "Guardar cambios" : "Guardar"}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
