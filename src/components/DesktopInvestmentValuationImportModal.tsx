// src/components/DesktopInvestmentValuationImportModal.tsx
// Importar un histórico de valoraciones desde un Excel (Desktop): 1) subir el
// archivo, 2) enlazar cada columna con un activo existente (o ignorarla),
// 3) confirmar. Solo crea valoraciones, nunca operaciones/aportaciones.
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/api";
import { colors } from "../theme/theme";
import { useUIStore } from "../store/uiStore";
import type { ValuationAssetLite } from "./DesktopInvestmentValuationModal2";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  assets: ValuationAssetLite[];
};

const isWeb = Platform.OS === "web";
const noOutline = isWeb ? ({ outlineStyle: "none" } as any) : {};

type ParsedRow = { date: string; values: Record<string, number | null> };
type ParseResult = { columns: string[]; rows: ParsedRow[]; dateRange: { from: string; to: string } };
type ColumnMapping = { assetId: number | null; currency: "EUR" | "USD" };

function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function guessAssetForColumn(column: string, assets: ValuationAssetLite[]): ValuationAssetLite | null {
  const colWords = normalize(column).split(" ").filter((w) => w.length >= 3);
  if (!colWords.length) return null;
  let best: { asset: ValuationAssetLite; score: number } | null = null;
  for (const a of assets) {
    const hay = normalize(`${a.name} ${a.symbol || ""}`);
    const score = colWords.reduce((s, w) => (hay.includes(w) ? s + 1 : s), 0);
    if (score > 0 && (!best || score > best.score)) best = { asset: a, score };
  }
  return best?.asset ?? null;
}

function guessCurrency(column: string): "EUR" | "USD" {
  return /cripto|crypto|bitcoin|\bbtc\b|\beth\b|usd|\$/i.test(column) ? "USD" : "EUR";
}

function formatAmount(n: number, currency: string) {
  try {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}

function pickExcelFileWeb(): Promise<{ blob: Blob; filename: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept =
      ".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel";
    input.style.position = "fixed";
    input.style.top = "-1000px";
    input.style.left = "-1000px";
    input.style.opacity = "0";
    document.body.appendChild(input);

    let settled = false;
    const finish = (v: { blob: Blob; filename: string } | null) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("focus", onFocus);
      if (input.parentNode) input.parentNode.removeChild(input);
      resolve(v);
    };
    const onFocus = () => {
      setTimeout(() => {
        if (!settled && !input.files?.length) finish(null);
      }, 500);
    };
    window.addEventListener("focus", onFocus);
    input.oncancel = () => finish(null);
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        finish(null);
        return;
      }
      finish({ blob: file, filename: file.name });
    };
    input.click();
  });
}

export default function DesktopInvestmentValuationImportModal({ visible, onClose, onSaved, assets }: Props) {
  const showToast = useUIStore((s) => s.showToast);

  const [picking, setPicking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [mapping, setMapping] = useState<Record<string, ColumnMapping>>({});

  const reset = () => {
    setParseResult(null);
    setMapping({});
    setPicking(false);
    setSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handlePickFile = async () => {
    try {
      setPicking(true);
      const picked = await pickExcelFileWeb();
      if (!picked) return;

      const formData = new FormData();
      formData.append("file", picked.blob, picked.filename);

      const res = await api.post("/investments/valuations/import/parse", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const result: ParseResult = res.data;
      setParseResult(result);

      const initialMapping: Record<string, ColumnMapping> = {};
      result.columns.forEach((col) => {
        const guessed = guessAssetForColumn(col, assets);
        initialMapping[col] = { assetId: guessed?.id ?? null, currency: guessCurrency(col) };
      });
      setMapping(initialMapping);
    } catch (e: any) {
      const msg = e?.response?.data?.message || "No se pudo leer el archivo.";
      showToast(String(msg), "error");
    } finally {
      setPicking(false);
    }
  };

  const columnStats = useMemo(() => {
    if (!parseResult) return {} as Record<string, { count: number; lastValue: number | null }>;
    const stats: Record<string, { count: number; lastValue: number | null }> = {};
    parseResult.columns.forEach((col) => {
      let count = 0;
      let lastValue: number | null = null;
      parseResult.rows.forEach((row) => {
        const v = row.values[col];
        if (v !== null && v !== undefined) {
          count += 1;
          lastValue = v;
        }
      });
      stats[col] = { count, lastValue };
    });
    return stats;
  }, [parseResult]);

  const mappedColumnsCount = useMemo(
    () => Object.values(mapping).filter((m) => m.assetId !== null).length,
    [mapping]
  );

  const totalToImport = useMemo(() => {
    if (!parseResult) return 0;
    return parseResult.columns.reduce((sum, col) => {
      if (mapping[col]?.assetId === null || mapping[col]?.assetId === undefined) return sum;
      return sum + (columnStats[col]?.count ?? 0);
    }, 0);
  }, [parseResult, mapping, columnStats]);

  const handleConfirm = async () => {
    if (!parseResult || totalToImport === 0) return;
    try {
      setSubmitting(true);
      const commitMapping: Record<string, { assetId: number; currency: string }> = {};
      parseResult.columns.forEach((col) => {
        const m = mapping[col];
        if (m?.assetId !== null && m?.assetId !== undefined) {
          commitMapping[col] = { assetId: m.assetId, currency: m.currency };
        }
      });

      const res = await api.post("/investments/valuations/import/commit", {
        mapping: commitMapping,
        rows: parseResult.rows,
      });

      showToast(`Importadas ${res.data?.count ?? totalToImport} valoraciones.`, "success");
      onSaved();
      handleClose();
    } catch (e: any) {
      const msg = e?.response?.data?.message || "No se pudo completar la importación.";
      showToast(String(msg), "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose} statusBarTranslucent>
      <Pressable
        onPress={handleClose}
        style={[{ flex: 1, backgroundColor: "rgba(2,6,23,0.45)", alignItems: "center", justifyContent: "center", padding: 16 }, noOutline]}
      >
        <Pressable
          onPress={(e: any) => e?.stopPropagation?.()}
          onStartShouldSetResponder={() => true}
          style={[
            {
              width: 820,
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
                <Ionicons name="document-attach-outline" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={{ fontSize: 14, fontWeight: "900", color: "#0F172A" }}>Importar desde Excel</Text>
                <Text style={{ fontSize: 12, fontWeight: "800", color: "#94A3B8", marginTop: 1 }} numberOfLines={1}>
                  Enlaza cada columna con un activo antes de guardar nada
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {parseResult ? (
                <TouchableOpacity
                  onPress={handleConfirm}
                  disabled={submitting || totalToImport === 0}
                  activeOpacity={0.9}
                  style={[
                    {
                      height: 40,
                      paddingHorizontal: 14,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: totalToImport === 0 ? "#E5E7EB" : "rgba(15,23,42,0.14)",
                      backgroundColor: totalToImport === 0 ? "#F1F5F9" : "white",
                      flexDirection: "row",
                      alignItems: "center",
                      marginRight: 10,
                    },
                    noOutline,
                  ]}
                >
                  {submitting ? <ActivityIndicator /> : <Ionicons name="checkmark" size={18} color="#0F172A" />}
                  <Text style={{ marginLeft: 8, fontSize: 12, fontWeight: "900", color: "#0F172A" }}>
                    Importar {totalToImport || ""}
                  </Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                onPress={handleClose}
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
            {!parseResult ? (
              <View>
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#64748B", marginBottom: 14, lineHeight: 19 }}>
                  Sube un Excel con una columna de fecha y una columna por cada cuenta/plan. En el siguiente paso
                  eliges a qué activo corresponde cada columna.
                </Text>
                <TouchableOpacity
                  onPress={handlePickFile}
                  disabled={picking}
                  activeOpacity={0.85}
                  style={[
                    {
                      borderWidth: 1.5,
                      borderStyle: "dashed",
                      borderColor: "#CBD5E1",
                      borderRadius: 18,
                      paddingVertical: 48,
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      backgroundColor: "white",
                    },
                    noOutline,
                  ]}
                >
                  {picking ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <>
                      <Ionicons name="document-attach-outline" size={30} color={colors.primary} />
                      <Text style={{ fontSize: 14, fontWeight: "900", color: "#0F172A" }}>
                        Seleccionar archivo Excel
                      </Text>
                      <Text style={{ fontSize: 12, color: "#94A3B8", fontWeight: "700" }}>.xlsx o .xls</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <View
                  style={{
                    backgroundColor: "white",
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    padding: 12,
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: "900", color: "#0F172A" }}>
                    {parseResult.rows.length} fechas detectadas · {parseResult.dateRange.from} → {parseResult.dateRange.to}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: "#64748B", fontWeight: "700", marginTop: 2 }}>
                    {mappedColumnsCount} de {parseResult.columns.length} columnas enlazadas · {totalToImport} valoraciones a importar
                  </Text>
                </View>

                {parseResult.columns.map((col) => {
                  const m = mapping[col] ?? { assetId: null, currency: "EUR" as const };
                  const stat = columnStats[col];
                  return (
                    <View
                      key={col}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: "white",
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                        padding: 12,
                        marginBottom: 8,
                        gap: 12,
                      }}
                    >
                      <View style={{ flex: 1.1, minWidth: 0 }}>
                        <Text style={{ fontSize: 13, fontWeight: "900", color: "#0F172A" }} numberOfLines={1}>
                          {col}
                        </Text>
                        <Text style={{ fontSize: 11, color: "#94A3B8", fontWeight: "700", marginTop: 2 }}>
                          {stat?.count ?? 0} valores
                          {stat?.lastValue !== null && stat?.lastValue !== undefined
                            ? ` · último ${formatAmount(stat.lastValue, m.currency)}`
                            : ""}
                        </Text>
                      </View>

                      <View style={{ flex: 1.4, minWidth: 0 }}>
                        {isWeb ? (
                          <select
                            value={m.assetId ?? ""}
                            onChange={(e: any) => {
                              const v = e.target.value;
                              setMapping((prev) => ({
                                ...prev,
                                [col]: { ...prev[col], assetId: v === "" ? null : Number(v) },
                              }));
                            }}
                            style={{
                              width: "100%",
                              height: 38,
                              borderRadius: 10,
                              border: "1px solid #E5E7EB",
                              backgroundColor: "#F8FAFC",
                              fontSize: 13,
                              fontWeight: 700,
                              color: "#0F172A",
                              padding: "0 8px",
                            }}
                          >
                            <option value="">Ignorar esta columna</option>
                            {assets.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name}
                                {a.symbol ? ` (${a.symbol})` : ""}
                              </option>
                            ))}
                          </select>
                        ) : null}
                      </View>

                      <View style={{ width: 110 }}>
                        {m.assetId !== null ? (
                          <View style={{ flexDirection: "row", borderRadius: 10, backgroundColor: "#F1F5F9", padding: 3 }}>
                            {(["EUR", "USD"] as const).map((c) => {
                              const active = m.currency === c;
                              return (
                                <TouchableOpacity
                                  key={c}
                                  onPress={() => setMapping((prev) => ({ ...prev, [col]: { ...prev[col], currency: c } }))}
                                  activeOpacity={0.8}
                                  style={[
                                    {
                                      flex: 1,
                                      height: 32,
                                      borderRadius: 8,
                                      alignItems: "center",
                                      justifyContent: "center",
                                      backgroundColor: active ? "white" : "transparent",
                                    },
                                    noOutline,
                                  ]}
                                >
                                  <Text style={{ fontSize: 11.5, fontWeight: active ? "900" : "700", color: active ? "#0F172A" : "#94A3B8" }}>
                                    {c}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
