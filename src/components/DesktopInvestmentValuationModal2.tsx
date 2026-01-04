// src/components/DesktopInvestmentValuationModal.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/api";
import { colors } from "../theme/theme";

type InvestmentAssetType = "crypto" | "etf" | "stock" | "fund" | "custom" | "cash";

export type ValuationAssetLite = {
  id: number;
  name: string;
  symbol?: string | null;
  type: InvestmentAssetType;
  currency?: string | null;
  currentValue?: number | null;
  lastValuationDate?: string | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;

  assets: ValuationAssetLite[];
  defaultAssetId?: number;
  currencyFallback?: string; // por si algún asset no trae currency
};

const isWeb = Platform.OS === "web";
const noOutline = isWeb ? ({ outlineStyle: "none" } as any) : {};

const moneyToNumber = (s: string) => {
  // admite "1.234,56" o "1234,56" o "1234.56"
  const v = (s || "").replace(/\./g, "").replace(",", ".");
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

function formatShortDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function formatMoney(n: any, currency = "EUR") {
  const v = Number.isFinite(Number(n)) ? Number(n) : 0;
  try {
    return v.toLocaleString("es-ES", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } catch {
    return `${v.toFixed(2)} ${currency}`;
  }
}

// --- helpers date input web
const toDateTimeLocalValue = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
};

const parseDateTimeLocal = (v: string) => {
  if (!v) return null;
  const [datePart, timePart] = v.split("T");
  if (!datePart || !timePart) return null;

  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
  return isNaN(dt.getTime()) ? null : dt;
};

function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        backgroundColor: "white",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        padding: 12,
        marginTop: 10,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <Text style={{ fontSize: 12, fontWeight: "900", color: "#94A3B8" }}>{title}</Text>
        {right}
      </View>
      {children}
    </View>
  );
}

export default function DesktopInvestmentValuationModal2({
  visible,
  onClose,
  onSaved,
  assets,
  defaultAssetId,
  currencyFallback = "EUR",
}: Props) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<ValuationAssetLite | null>(null);

  const [value, setValue] = useState(""); // valor actual
  const [date, setDate] = useState<Date>(new Date());
  const [description, setDescription] = useState("");

  // web date input invisible (como tu CreateTransactionModal)
  const dateInputRef = useRef<any>(null);

  const openDatePicker = useCallback(() => {
    if (!isWeb) return; // desktop: web
    const el = dateInputRef.current as any;
    if (!el) return;
    if (typeof el.showPicker === "function") el.showPicker();
    else {
      el.focus?.();
      el.click?.();
    }
  }, []);

  const assetsSorted = useMemo(() => {
    return [...(assets || [])].sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [assets]);

  const normalizedQuery = useMemo(() => query.trim().toLowerCase(), [query]);

  const filteredAssets = useMemo(() => {
    if (!normalizedQuery) return assetsSorted;
    return assetsSorted.filter((a) => {
      const hay = `${a.name} ${a.symbol || ""}`.toLowerCase();
      return hay.includes(normalizedQuery);
    });
  }, [assetsSorted, normalizedQuery]);

  useEffect(() => {
    if (!visible) return;

    setSaving(false);
    setErr(null);
    setQuery("");

    const def = defaultAssetId ? assetsSorted.find((a) => a.id === defaultAssetId) || null : null;
    const first = assetsSorted[0] || null;

    const pick = def || first;
    setSelectedAsset(pick);

    // por defecto, precargar valor con currentValue si existe (opcional)
    if (pick?.currentValue != null && Number.isFinite(Number(pick.currentValue))) {
      const v = Number(pick.currentValue);
      setValue(v.toFixed(2).replace(".", ","));
    } else {
      setValue("");
    }

    setDate(new Date());
    setDescription("");
  }, [visible, defaultAssetId, assetsSorted]);

  const canSave = useMemo(() => {
    if (saving) return false;
    if (!selectedAsset) return false;

    const n = moneyToNumber(value);
    if (!value || !Number.isFinite(n) || n <= 0) return false;

    return true;
  }, [saving, selectedAsset, value]);

  const postValuation = useCallback(
    async (assetId: number, payload: any) => {
      // 1) endpoint genérico
      try {
        await api.post("/investments/valuations", payload);
        return;
      } catch (e: any) {
        const status = e?.response?.status;
        // 404 -> intentamos endpoint por asset
        if (status !== 404) throw e;
      }

      // 2) endpoint por asset
      await api.post(`/investments/${assetId}/valuations`, payload);
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    if (!canSave || !selectedAsset) return;

    try {
      setSaving(true);
      setErr(null);

      const n = moneyToNumber(value);
      if (!Number.isFinite(n)) {
        setErr("El valor actual no es válido.");
        return;
      }

      const payload: any = {
        assetId: selectedAsset.id,
        value: n,
        date: date.toISOString(),
      };

      await postValuation(selectedAsset.id, payload);

      onSaved();
      onClose();
    } catch (e: any) {
      const msg = String(e?.response?.data?.message || e?.message || "Error guardando la valoración");
      setErr(msg);
    } finally {
      setSaving(false);
    }
  }, [canSave, date, description, onClose, onSaved, postValuation, selectedAsset, value]);

  // Keyboard web: ESC / Ctrl+Enter
  useEffect(() => {
    if (!visible || !isWeb) return;
    const onKeyDown = (e: any) => {
      if (e.key === "Escape") onClose();
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        if (canSave && !saving) handleSubmit();
      }
    };
    // @ts-ignore
    window.addEventListener("keydown", onKeyDown);
    // @ts-ignore
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [visible, onClose, canSave, saving, handleSubmit]);

  // Grid como categorías (3 columnas, 2 filas visibles)
  const COLS = 3;
  const ITEM_H = 44;
  const PAD = 6;
  const VISIBLE_ROWS = 2;
  const gridMaxHeight = VISIBLE_ROWS * (ITEM_H + PAD * 2) + 2;

  const currency = selectedAsset?.currency || currencyFallback;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable
        onPress={onClose}
        style={[
          {
            flex: 1,
            backgroundColor: "rgba(2,6,23,0.45)",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          },
          noOutline,
        ]}
      >
        <Pressable
          onPress={(e: any) => e?.stopPropagation?.()}
          onStartShouldSetResponder={() => true}
          style={[
            {
              width: 900,
              maxWidth: "100%",
              maxHeight: "92%",
              backgroundColor: "#F8FAFC",
              borderRadius: 22,
              borderWidth: 1,
              borderColor: "rgba(15,23,42,0.12)",
              overflow: "hidden",
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 10 },
              elevation: 20,
            },
            noOutline,
          ]}
        >
          {/* Header */}
          <View
            style={{
              height: 56,
              backgroundColor: "white",
              borderBottomWidth: 1,
              borderBottomColor: "#E5E7EB",
              paddingHorizontal: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  backgroundColor: "white",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                }}
              >
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={{ fontSize: 14, fontWeight: "900", color: "#0F172A" }}>Nueva valoración</Text>
                <Text style={{ fontSize: 12, fontWeight: "800", color: "#94A3B8", marginTop: 1 }} numberOfLines={1}>
                  Actualiza el valor actual de un activo
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={!canSave || saving}
                activeOpacity={0.9}
                style={[
                  {
                    height: 40,
                    paddingHorizontal: 14,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: !canSave ? "#E5E7EB" : "rgba(15,23,42,0.14)",
                    backgroundColor: !canSave ? "#F1F5F9" : "white",
                    flexDirection: "row",
                    alignItems: "center",
                    marginRight: 10,
                  },
                  noOutline,
                ]}
              >
                {saving ? <ActivityIndicator /> : <Ionicons name="checkmark" size={18} color="#0F172A" />}
                <Text style={{ marginLeft: 8, fontSize: 12, fontWeight: "900", color: "#0F172A" }}>Guardar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.9}
                style={[
                  {
                    width: 40,
                    height: 40,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    backgroundColor: "white",
                    alignItems: "center",
                    justifyContent: "center",
                  },
                  noOutline,
                ]}
              >
                <Ionicons name="close" size={18} color="#0F172A" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 14, paddingBottom: 18 }}>
            {!!err && (
              <View
                style={{
                  backgroundColor: "rgba(239,68,68,0.10)",
                  borderWidth: 1,
                  borderColor: "rgba(239,68,68,0.25)",
                  borderRadius: 18,
                  padding: 12,
                  marginBottom: 10,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "900", color: "#991B1B" }}>{err}</Text>
              </View>
            )}

            {/* TOP: Activo + Valor */}
            <View style={{ flexDirection: "row", alignItems: "stretch" }}>
              <View
                style={{
                  flex: 1,
                  backgroundColor: "white",
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  padding: 12,
                  marginRight: 10,
                  minWidth: 320,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "900", color: "#94A3B8", marginBottom: 10 }}>Activo</Text>

                {/* Search */}
                <View
                  style={{
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    backgroundColor: "white",
                    paddingHorizontal: 12,
                    height: 42,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Ionicons name="search" size={16} color="#94A3B8" />
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Buscar activo..."
                    placeholderTextColor="#94A3B8"
                    style={{ marginLeft: 10, flex: 1, fontSize: 13, fontWeight: "800", color: "#0F172A" }}
                  />
                  {query ? (
                    <TouchableOpacity onPress={() => setQuery("")} style={[{ padding: 6 }, noOutline]} activeOpacity={0.9}>
                      <Ionicons name="close-circle" size={18} color="#CBD5E1" />
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Grid */}
                <View style={{ marginTop: 10, maxHeight: gridMaxHeight }}>
                  <ScrollView showsVerticalScrollIndicator>
                    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                      {filteredAssets.map((a) => {
                        const active = selectedAsset?.id === a.id;
                        const label = `${a.name}${a.symbol ? ` (${a.symbol})` : ""}`;
                        return (
                          <TouchableOpacity
                            key={a.id}
                            onPress={() => {
                              setSelectedAsset(a);
                              // si tiene currentValue, precarga (sin obligar)
                              if (a.currentValue != null && Number.isFinite(Number(a.currentValue))) {
                                setValue(Number(a.currentValue).toFixed(2).replace(".", ","));
                              }
                            }}
                            activeOpacity={0.9}
                            style={[{ width: `${100 / COLS}%`, padding: PAD }, noOutline]}
                          >
                            <View
                              style={{
                                height: ITEM_H,
                                borderRadius: 14,
                                borderWidth: 1,
                                borderColor: active ? "rgba(59,130,246,0.55)" : "#E5E7EB",
                                backgroundColor: active ? "rgba(59,130,246,0.10)" : "white",
                                alignItems: "center",
                                justifyContent: "center",
                                paddingHorizontal: 10,
                              }}
                            >
                              <Text style={{ fontSize: 13, fontWeight: "900", color: "#0F172A" }} numberOfLines={1}>
                                {label}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}

                      {!filteredAssets.length ? (
                        <View style={{ paddingVertical: 16 }}>
                          <Text style={{ fontSize: 13, fontWeight: "800", color: "#94A3B8" }}>
                            No hay resultados para “{query}”.
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </ScrollView>
                </View>

                {/* Info del seleccionado */}
                {selectedAsset ? (
                  <View
                    style={{
                      marginTop: 10,
                      padding: 10,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: "rgba(15,23,42,0.10)",
                      backgroundColor: "#F8FAFC",
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "900", color: "#64748B" }} numberOfLines={2}>
                      {selectedAsset.lastValuationDate
                        ? `Última valoración: ${formatShortDate(selectedAsset.lastValuationDate)}`
                        : "Sin valoraciones previas"}
                      {selectedAsset.currentValue != null ? ` · Valor actual: ${formatMoney(selectedAsset.currentValue, currency)}` : ""}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Valor grande */}
              <View
                style={{
                  width: 320,
                  backgroundColor: "white",
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  padding: 12,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "900", color: "#94A3B8", alignSelf: "flex-start" }}>Valor actual</Text>
                <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: 4 }}>
                  <TextInput
                    value={value}
                    onChangeText={(t) => setValue(t.replace(".", ","))}
                    placeholder="0,00"
                    placeholderTextColor="#CBD5E1"
                    inputMode="decimal"
                    style={{
                      fontSize: 44,
                      fontWeight: "900",
                      color: "#0F172A",
                      textAlign: "center",
                      width: 170,
                      paddingVertical: 6,
                    }}
                    onSubmitEditing={() => {
                      if (canSave && !saving) handleSubmit();
                    }}
                    blurOnSubmit={false}
                  />
                  <Text style={{ fontSize: 26, fontWeight: "900", color: "#94A3B8", marginLeft: 6, paddingBottom: 10 }}>
                    {currency === "EUR" ? "€" : currency}
                  </Text>
                </View>
              </View>
            </View>

            {/* Nota + Fecha */}
            <View style={{ flexDirection: "row", marginTop: 10 }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Section title="Nota (opcional)">
                  <View style={{ borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "white", padding: 10 }}>
                    <TextInput
                      value={description}
                      onChangeText={setDescription}
                      placeholder="Ej: cierre de mercado, valoración mensual..."
                      placeholderTextColor="#94A3B8"
                      style={{ fontSize: 13, fontWeight: "800", color: "#0F172A" }}
                    />
                  </View>
                </Section>
              </View>

              <View style={{ width: 320 }}>
                <Section
                  title="Fecha"
                  right={
                    <TouchableOpacity activeOpacity={0.9} onPress={() => setDate(new Date())} style={[{ paddingVertical: 6 }, noOutline]}>
                      <Text style={{ fontSize: 12, fontWeight: "900", color: colors.primary }}>Ahora</Text>
                    </TouchableOpacity>
                  }
                >
                  <TouchableOpacity
                    onPress={openDatePicker}
                    activeOpacity={0.9}
                    style={[
                      {
                        height: 40,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                        backgroundColor: "white",
                        paddingHorizontal: 12,
                        flexDirection: "row",
                        alignItems: "center",
                      },
                      noOutline,
                    ]}
                  >
                    <Ionicons name="calendar-outline" size={16} color="#64748B" />
                    <Text style={{ marginLeft: 8, fontSize: 13, fontWeight: "900", color: "#0F172A" }}>
                      {date.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}{" "}
                      {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                    <View style={{ flex: 1 }} />
                    <Ionicons name="chevron-down" size={16} color="#94A3B8" />
                  </TouchableOpacity>

                  {/* Web: input real invisible (abre selector nativo) */}
                  {isWeb ? (
                    <input
                      ref={dateInputRef}
                      type="datetime-local"
                      value={toDateTimeLocalValue(date)}
                      onChange={(e) => {
                        const next = parseDateTimeLocal((e.target as any).value);
                        if (next) setDate(next);
                      }}
                      tabIndex={-1}
                      aria-hidden
                      style={{
                        position: "absolute",
                        opacity: 0,
                        pointerEvents: "none",
                        width: 1,
                        height: 1,
                      }}
                    />
                  ) : null}
                </Section>
              </View>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
