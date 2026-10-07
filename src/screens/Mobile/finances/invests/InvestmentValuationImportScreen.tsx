// src/screens/Mobile/finances/invests/InvestmentValuationImportScreen.tsx
// Importar un histórico de valoraciones desde un Excel: 1) seleccionar archivo,
// 2) enlazar cada columna del Excel con un activo de la app (o ignorarla),
// 3) confirmar y guardar. No crea operaciones/aportaciones, solo valoraciones.
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import api from "../../../../api/api";
import { colors } from "../../../../theme/theme";
import ModalHeader from "../../../../components/ModalHeader";
import { markInvestmentsDirty } from "../../../../utils/investmentsInvalidation";
import { useUIStore } from "../../../../store/uiStore";
import { FormSegmentedControl } from "../../../../components/creation";

type InvestmentAssetType = "crypto" | "etf" | "stock" | "fund" | "custom" | "cash";

interface Asset {
  id: number;
  name: string;
  abbreviation?: string | null;
  type: InvestmentAssetType;
  currency: string;
}

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

function guessAssetForColumn(column: string, assets: Asset[]): Asset | null {
  const colWords = normalize(column).split(" ").filter((w) => w.length >= 3);
  if (!colWords.length) return null;
  let best: { asset: Asset; score: number } | null = null;
  for (const a of assets) {
    const hay = normalize(`${a.name} ${a.abbreviation || ""}`);
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

async function pickExcelFile(): Promise<{ blob: Blob; filename: string } | null> {
  if (Platform.OS === "web") {
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

  const result = await DocumentPicker.getDocumentAsync({
    type: [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  const response = await fetch(asset.uri);
  const blob = await response.blob();
  return { blob, filename: asset.name || "valoraciones.xlsx" };
}

export default function InvestmentValuationImportScreen({ navigation }: any) {
  const showToast = useUIStore((s) => s.showToast);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [mapping, setMapping] = useState<Record<string, ColumnMapping>>({});
  const [picking, setPicking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pickerColumn, setPickerColumn] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      api
        .get("/investments/assets")
        .then((res) => setAssets(Array.isArray(res.data) ? res.data : []))
        .catch(() => {});
    }, [])
  );

  const handlePickFile = async () => {
    try {
      setPicking(true);
      const picked = await pickExcelFile();
      if (!picked) return;

      const formData = new FormData();
      formData.append("file", picked.blob as any, picked.filename);

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
    if (!parseResult) return {};
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

      markInvestmentsDirty();
      showToast(`Importadas ${res.data?.count ?? totalToImport} valoraciones.`, "success");
      navigation.goBack();
    } catch (e: any) {
      const msg = e?.response?.data?.message || "No se pudo completar la importación.";
      showToast(String(msg), "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
        <ModalHeader title="Importar desde Excel" onClose={() => navigation.goBack()} closeLabel="Cancelar" />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {!parseResult ? (
          <View style={{ gap: 16 }}>
            <Text style={{ fontSize: 13, lineHeight: 19, color: "#64748B", fontWeight: "600" }}>
              Sube un Excel con una columna de fecha y una columna por cada cuenta/plan. En el siguiente
              paso eliges a qué activo corresponde cada columna antes de guardar nada.
            </Text>

            <TouchableOpacity
              onPress={handlePickFile}
              disabled={picking}
              activeOpacity={0.8}
              style={{
                borderWidth: 1.5,
                borderStyle: "dashed",
                borderColor: "#CBD5E1",
                borderRadius: 16,
                paddingVertical: 36,
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              {picking ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <>
                  <Ionicons name="document-attach-outline" size={28} color={colors.primary} />
                  <Text style={{ fontSize: 14, fontWeight: "800", color: colors.ink }}>
                    Seleccionar archivo Excel
                  </Text>
                  <Text style={{ fontSize: 12, color: "#94A3B8", fontWeight: "600" }}>.xlsx o .xls</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            <View
              style={{
                backgroundColor: "#F1F5F9",
                borderRadius: 14,
                padding: 14,
                gap: 4,
              }}
            >
              <Text style={{ fontSize: 12.5, fontWeight: "700", color: colors.ink }}>
                {parseResult.rows.length} fechas detectadas · {parseResult.dateRange.from} → {parseResult.dateRange.to}
              </Text>
              <Text style={{ fontSize: 11.5, color: "#64748B", fontWeight: "600" }}>
                Enlaza cada columna con un activo. Las que dejes como "Ignorar" no se importan.
              </Text>
            </View>

            {parseResult.columns.map((col) => {
              const m = mapping[col] ?? { assetId: null, currency: "EUR" as const };
              const stat = columnStats[col];
              const asset = assets.find((a) => a.id === m.assetId) || null;
              return (
                <View
                  key={col}
                  style={{
                    borderWidth: 1,
                    borderColor: "#E8EDF3",
                    borderRadius: 14,
                    padding: 14,
                    gap: 10,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 14, fontWeight: "800", color: colors.ink }} numberOfLines={1}>
                      {col}
                    </Text>
                    <Text style={{ fontSize: 11, color: "#94A3B8", fontWeight: "700" }}>
                      {stat?.count ?? 0} valores
                    </Text>
                  </View>

                  {stat?.lastValue !== null && stat?.lastValue !== undefined ? (
                    <Text style={{ fontSize: 11.5, color: "#94A3B8", fontWeight: "600" }}>
                      Último valor: {formatAmount(stat.lastValue, m.currency)}
                    </Text>
                  ) : null}

                  <TouchableOpacity
                    onPress={() => setPickerColumn(col)}
                    activeOpacity={0.75}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      minHeight: 44,
                      borderRadius: 11,
                      backgroundColor: "#F8FAFC",
                      paddingHorizontal: 12,
                    }}
                  >
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 13.5,
                        fontWeight: "700",
                        color: asset ? colors.ink : "#94A3B8",
                      }}
                      numberOfLines={1}
                    >
                      {asset ? asset.abbreviation?.trim() || asset.name : "Ignorar esta columna"}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#94A3B8" />
                  </TouchableOpacity>

                  {m.assetId !== null ? (
                    <FormSegmentedControl
                      label="Divisa de esta columna"
                      value={m.currency}
                      options={[
                        { value: "EUR", label: "EUR" },
                        { value: "USD", label: "USD" },
                      ]}
                      onChange={(v) =>
                        setMapping((prev) => ({ ...prev, [col]: { ...prev[col], currency: v as "EUR" | "USD" } }))
                      }
                    />
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {parseResult ? (
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 24,
            backgroundColor: colors.background,
            borderTopWidth: 1,
            borderTopColor: "#E8EDF3",
            gap: 8,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: "700", color: "#64748B", textAlign: "center" }}>
            {mappedColumnsCount} columna{mappedColumnsCount === 1 ? "" : "s"} enlazada
            {mappedColumnsCount === 1 ? "" : "s"} · {totalToImport} valoracion{totalToImport === 1 ? "" : "es"} a
            importar
          </Text>
          <TouchableOpacity
            onPress={handleConfirm}
            disabled={submitting || totalToImport === 0}
            activeOpacity={0.85}
            style={{
              minHeight: 50,
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: totalToImport === 0 ? "#CBD5E1" : colors.primary,
            }}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ fontSize: 15, fontWeight: "800", color: "#fff" }}>Confirmar importación</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      <Modal
        visible={pickerColumn !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerColumn(null)}
      >
        <Pressable
          onPress={() => setPickerColumn(null)}
          style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.38)" }}
        />
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            maxHeight: "72%",
            backgroundColor: colors.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingBottom: 24,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 20,
              paddingVertical: 17,
              borderBottomWidth: 1,
              borderBottomColor: "#E8EDF3",
            }}
          >
            <Text style={{ flex: 1, fontSize: 17, fontWeight: "900", color: colors.ink }} numberOfLines={1}>
              {pickerColumn}
            </Text>
            <TouchableOpacity onPress={() => setPickerColumn(null)} hitSlop={10}>
              <Ionicons name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <TouchableOpacity
              onPress={() => {
                if (pickerColumn) {
                  setMapping((prev) => ({ ...prev, [pickerColumn]: { ...prev[pickerColumn], assetId: null } }));
                }
                setPickerColumn(null);
              }}
              activeOpacity={0.72}
              style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, minHeight: 54, gap: 12 }}
            >
              <Ionicons name="close-circle-outline" size={18} color="#94A3B8" />
              <Text style={{ flex: 1, fontSize: 14, fontWeight: "700", color: "#64748B" }}>
                Ignorar esta columna
              </Text>
              {pickerColumn && mapping[pickerColumn]?.assetId === null ? (
                <Ionicons name="checkmark" size={20} color={colors.primary} />
              ) : null}
            </TouchableOpacity>
            {assets.map((a) => {
              const active = pickerColumn ? mapping[pickerColumn]?.assetId === a.id : false;
              return (
                <TouchableOpacity
                  key={a.id}
                  onPress={() => {
                    if (pickerColumn) {
                      setMapping((prev) => ({ ...prev, [pickerColumn]: { ...prev[pickerColumn], assetId: a.id } }));
                    }
                    setPickerColumn(null);
                  }}
                  activeOpacity={0.72}
                  style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, minHeight: 54, gap: 12 }}
                >
                  <Text style={{ flex: 1, fontSize: 14, fontWeight: "700", color: colors.ink }} numberOfLines={1}>
                    {a.abbreviation?.trim() || a.name}
                  </Text>
                  {active ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
