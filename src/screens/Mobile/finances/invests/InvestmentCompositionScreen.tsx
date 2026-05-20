// src/screens/Investments/InvestmentCompositionScreen.tsx
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
import api from "../../../../api/api";
import { colors } from "../../../../theme/theme";
import { markInvestmentsDirty } from "../../../../utils/investmentsInvalidation";
import {
  numToInputStr,
  translateCountry,
  translateSector,
  REVERSE_COUNTRY_MAP,
  REVERSE_SECTOR_MAP,
  COUNTRY_SUGGESTIONS,
  SECTOR_SUGGESTIONS,
} from "../../../../utils/investmentLabels";

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = "regions" | "sectors" | "holdings";

type RegionRow  = { id: string; name: string; pct: string };
type SectorRow  = { id: string; name: string; pct: string };
type HoldingRow = { id: string; name: string; ticker: string; weight: string };

type PctSuggestion     = { label: string; value: string };
type HoldingSuggestion = { name: string; ticker: string };

// ── Helpers ───────────────────────────────────────────────────────────────────

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const parsePct = (s: string): number | null => {
  const v = s.trim().replace(",", ".");
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return n;
};

const parseWeight = (s: string): number | null => {
  const v = s.trim().replace(",", ".");
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
};

const pctSum = (rows: Array<{ pct: string }>) =>
  rows.reduce((acc, r) => {
    const n = parsePct(r.pct);
    return acc + (n ?? 0);
  }, 0);

// ── PctRow — shared row for regions & sectors, with optional autocomplete ─────

function PctRow({
  row,
  placeholder,
  onChange,
  onDelete,
  suggestions = [],
  showSuggestions = false,
  onFocus,
  onPickSuggestion,
}: {
  row: RegionRow | SectorRow;
  placeholder: string;
  onChange: (id: string, field: "name" | "pct", val: string) => void;
  onDelete: (id: string) => void;
  suggestions?: PctSuggestion[];
  showSuggestions?: boolean;
  onFocus?: (id: string) => void;
  onPickSuggestion?: (id: string, s: PctSuggestion) => void;
}) {
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {/* Name */}
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#F8FAFC",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: showSuggestions && suggestions.length > 0 ? colors.primary : "#E5E7EB",
            paddingHorizontal: 10,
            height: 40,
          }}
        >
          <TextInput
            value={row.name}
            onChangeText={(v) => onChange(row.id, "name", v)}
            onFocus={() => onFocus?.(row.id)}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            style={{ flex: 1, fontSize: 13, fontWeight: "700", color: "#0F172A" }}
          />
        </View>

        {/* Pct */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View
            style={{
              width: 58,
              backgroundColor: "#F8FAFC",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#E5E7EB",
              paddingHorizontal: 8,
              height: 40,
              justifyContent: "center",
            }}
          >
            <TextInput
              value={row.pct}
              onChangeText={(v) => onChange(row.id, "pct", v)}
              placeholder="0"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              style={{ fontSize: 13, fontWeight: "800", color: "#0F172A", textAlign: "right" }}
            />
          </View>
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#64748B" }}>%</Text>
        </View>

        {/* Delete */}
        <TouchableOpacity
          onPress={() => onDelete(row.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{
            width: 32, height: 32, borderRadius: 10,
            backgroundColor: "#FEF2F2",
            alignItems: "center", justifyContent: "center",
          }}
        >
          <Ionicons name="close-outline" size={16} color="#DC2626" />
        </TouchableOpacity>
      </View>

      {/* Autocomplete dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <View
          style={{
            marginTop: 4,
            marginRight: 40,
            backgroundColor: "white",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#E5E7EB",
            overflow: "hidden",
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
            elevation: 3,
          }}
        >
          {suggestions.map((s, idx) => (
            <TouchableOpacity
              key={s.value}
              onPress={() => onPickSuggestion?.(row.id, s)}
              activeOpacity={0.85}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderBottomWidth: idx < suggestions.length - 1 ? 1 : 0,
                borderBottomColor: "#F1F5F9",
              }}
            >
              <Ionicons name="search-outline" size={13} color="#94A3B8" style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#0F172A" }} numberOfLines={1}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ── HoldingRowComp ────────────────────────────────────────────────────────────

function HoldingRowComp({
  row,
  suggestions,
  showSuggestions,
  onFocusName,
  onChange,
  onDelete,
  onPickSuggestion,
}: {
  row: HoldingRow;
  suggestions: HoldingSuggestion[];
  showSuggestions: boolean;
  onFocusName: (id: string) => void;
  onChange: (id: string, field: "name" | "ticker" | "weight", val: string) => void;
  onDelete: (id: string) => void;
  onPickSuggestion: (id: string, s: HoldingSuggestion) => void;
}) {
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {/* Name with autocomplete trigger */}
        <View
          style={{
            flex: 1,
            backgroundColor: "#F8FAFC",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: showSuggestions && suggestions.length > 0 ? colors.primary : "#E5E7EB",
            paddingHorizontal: 10,
            height: 40,
            justifyContent: "center",
          }}
        >
          <TextInput
            value={row.name}
            onChangeText={(v) => onChange(row.id, "name", v)}
            onFocus={() => onFocusName(row.id)}
            placeholder="Empresa / activo"
            placeholderTextColor="#9CA3AF"
            style={{ fontSize: 13, fontWeight: "700", color: "#0F172A" }}
          />
        </View>

        {/* Ticker */}
        <View
          style={{
            width: 64,
            backgroundColor: "#F8FAFC",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#E5E7EB",
            paddingHorizontal: 8,
            height: 40,
            justifyContent: "center",
          }}
        >
          <TextInput
            value={row.ticker}
            onChangeText={(v) => onChange(row.id, "ticker", v.toUpperCase())}
            placeholder="TICK"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="characters"
            style={{ fontSize: 12, fontWeight: "800", color: "#0F172A", textAlign: "center" }}
          />
        </View>

        {/* Weight */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View
            style={{
              width: 58,
              backgroundColor: "#F8FAFC",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#E5E7EB",
              paddingHorizontal: 8,
              height: 40,
              justifyContent: "center",
            }}
          >
            <TextInput
              value={row.weight}
              onChangeText={(v) => onChange(row.id, "weight", v)}
              placeholder="0"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              style={{ fontSize: 13, fontWeight: "800", color: "#0F172A", textAlign: "right" }}
            />
          </View>
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#64748B" }}>%</Text>
        </View>

        {/* Delete */}
        <TouchableOpacity
          onPress={() => onDelete(row.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{
            width: 32, height: 32, borderRadius: 10,
            backgroundColor: "#FEF2F2",
            alignItems: "center", justifyContent: "center",
          }}
        >
          <Ionicons name="close-outline" size={16} color="#DC2626" />
        </TouchableOpacity>
      </View>

      {/* Autocomplete suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <View
          style={{
            marginTop: 4, marginRight: 40,
            backgroundColor: "white",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#E5E7EB",
            overflow: "hidden",
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
            elevation: 3,
          }}
        >
          {suggestions.map((s, idx) => (
            <TouchableOpacity
              key={`${s.name}-${idx}`}
              onPress={() => onPickSuggestion(row.id, s)}
              activeOpacity={0.85}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderBottomWidth: idx < suggestions.length - 1 ? 1 : 0,
                borderBottomColor: "#F1F5F9",
              }}
            >
              <Ionicons name="search-outline" size={13} color="#94A3B8" style={{ marginRight: 8 }} />
              <Text style={{ flex: 1, fontSize: 13, fontWeight: "700", color: "#0F172A" }} numberOfLines={1}>
                {s.name}
              </Text>
              {s.ticker ? (
                <Text style={{ fontSize: 11, fontWeight: "800", color: "#64748B", marginLeft: 8 }}>
                  {s.ticker}
                </Text>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function InvestmentCompositionScreen({ navigation, route }: any) {
  const assetId: number   = route?.params?.assetId;
  const assetName: string = route?.params?.assetName ?? "Activo";

  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [tab, setTab]           = useState<Tab>("regions");

  const [regions,  setRegions]  = useState<RegionRow[]>([]);
  const [sectors,  setSectors]  = useState<SectorRow[]>([]);
  const [holdings, setHoldings] = useState<HoldingRow[]>([]);

  // Autocomplete focus state
  const [focusedRegionId,  setFocusedRegionId]  = useState<string | null>(null);
  const [focusedSectorId,  setFocusedSectorId]  = useState<string | null>(null);
  const [focusedHoldingId, setFocusedHoldingId] = useState<string | null>(null);
  const [allHoldingSuggestions, setAllHoldingSuggestions] = useState<HoldingSuggestion[]>([]);

  // ── Derived: autocomplete suggestions ────────────────────────────────────

  const activeRegionSuggestions = useMemo<PctSuggestion[]>(() => {
    if (!focusedRegionId) return [];
    const row = regions.find((r) => r.id === focusedRegionId);
    if (!row || row.name.trim().length < 1) return [];
    const q = row.name.toLowerCase();
    return COUNTRY_SUGGESTIONS.filter((s) => s.label.toLowerCase().includes(q)).slice(0, 6);
  }, [focusedRegionId, regions]);

  const activeSectorSuggestions = useMemo<PctSuggestion[]>(() => {
    if (!focusedSectorId) return [];
    const row = sectors.find((s) => s.id === focusedSectorId);
    if (!row || row.name.trim().length < 1) return [];
    const q = row.name.toLowerCase();
    return SECTOR_SUGGESTIONS.filter((s) => s.label.toLowerCase().includes(q)).slice(0, 6);
  }, [focusedSectorId, sectors]);

  const activeHoldingSuggestions = useMemo<HoldingSuggestion[]>(() => {
    if (!focusedHoldingId) return [];
    const row = holdings.find((h) => h.id === focusedHoldingId);
    if (!row || row.name.trim().length < 2) return [];
    const q = row.name.toLowerCase();
    return allHoldingSuggestions.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 6);
  }, [focusedHoldingId, holdings, allHoldingSuggestions]);

  // ── Derived: sums ─────────────────────────────────────────────────────────

  const regionSum  = useMemo(() => pctSum(regions),  [regions]);
  const sectorSum  = useMemo(() => pctSum(sectors),  [sectors]);
  const holdingSum = useMemo(
    () => holdings.reduce((acc, h) => acc + (parseWeight(h.weight) ?? 0), 0),
    [holdings]
  );

  // ── Load ──────────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!assetId) return;
    try {
      setLoading(true);

      // Pre-fill from normalized composition endpoint
      const cRes = await api.get(`/investments/assets/${assetId}/composition`);
      const comp = cRes.data;

      if (comp?.regions?.length) {
        setRegions(
          comp.regions.map((r: any) => ({
            id: newId(),
            name: translateCountry(r.country),
            pct: numToInputStr(Number(r.pct), 1),
          }))
        );
      }
      if (comp?.sectors?.length) {
        setSectors(
          comp.sectors.map((s: any) => ({
            id: newId(),
            name: translateSector(s.sector),
            pct: numToInputStr(Number(s.pct), 1),
          }))
        );
      }
      if (comp?.holdings?.length) {
        setHoldings(
          comp.holdings.map((h: any) => ({
            id: newId(),
            name: h.name ?? "",
            ticker: h.ticker ?? "",
            weight: numToInputStr(Number(h.weight || 0), 2),
          }))
        );
      }

      // Collect holding suggestions from all other assets' composition (parallel)
      const aRes = await api.get("/investments/assets");
      const allAssets: Array<{ id: number }> = Array.isArray(aRes.data) ? aRes.data : [];
      const otherIds = allAssets.map((a) => a.id).filter((id) => id !== assetId);

      const compResults = await Promise.allSettled(
        otherIds.map((id) => api.get(`/investments/assets/${id}/composition`))
      );

      const nameMap = new Map<string, string>(); // name → ticker

      (comp?.holdings ?? []).forEach((h: any) => {
        if (h.name) nameMap.set(h.name, h.ticker ?? "");
      });

      compResults.forEach((res) => {
        if (res.status !== "fulfilled") return;
        const hs: any[] = res.value?.data?.holdings ?? [];
        hs.forEach((h) => {
          if (h.name) nameMap.set(h.name, h.ticker ?? "");
        });
      });

      setAllHoldingSuggestions(
        Array.from(nameMap.entries()).map(([name, ticker]) => ({ name, ticker }))
      );
    } catch (e) {
      console.error("❌ Error loading composition:", e);
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  // ── Mutations ─────────────────────────────────────────────────────────────

  const changeRegion = (id: string, field: "name" | "pct", val: string) => {
    setRegions((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: val } : r)));
    if (field === "name") setFocusedRegionId(id);
  };

  const changeSector = (id: string, field: "name" | "pct", val: string) => {
    setSectors((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: val } : s)));
    if (field === "name") setFocusedSectorId(id);
  };

  const changeHolding = (id: string, field: "name" | "ticker" | "weight", val: string) => {
    setHoldings((prev) => prev.map((h) => (h.id === id ? { ...h, [field]: val } : h)));
    if (field === "name") setFocusedHoldingId(id);
  };

  const addRegion  = () => setRegions((p) => [...p, { id: newId(), name: "", pct: "" }]);
  const addSector  = () => setSectors((p) => [...p, { id: newId(), name: "", pct: "" }]);
  const addHolding = () => setHoldings((p) => [...p, { id: newId(), name: "", ticker: "", weight: "" }]);

  const pickRegionSuggestion = (id: string, s: PctSuggestion) => {
    setRegions((prev) => prev.map((r) => (r.id === id ? { ...r, name: s.label } : r)));
    setFocusedRegionId(null);
  };

  const pickSectorSuggestion = (id: string, s: PctSuggestion) => {
    setSectors((prev) => prev.map((sec) => (sec.id === id ? { ...sec, name: s.label } : sec)));
    setFocusedSectorId(null);
  };

  const pickHoldingSuggestion = (id: string, s: HoldingSuggestion) => {
    setHoldings((prev) =>
      prev.map((h) => (h.id === id ? { ...h, name: s.name, ticker: s.ticker } : h))
    );
    setFocusedHoldingId(null);
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    const countriesJson: Record<string, number> = {};
    for (const r of regions) {
      if (!r.name.trim()) continue;
      const p = parsePct(r.pct);
      if (p === null) {
        Alert.alert("Porcentaje inválido", `Revisa el % de "${r.name}".`);
        return;
      }
      // Reverse-lookup: Spanish display name → English DB key
      const dbKey = REVERSE_COUNTRY_MAP[r.name.trim()] ?? r.name.trim();
      countriesJson[dbKey] = p;
    }

    const sectorsJson: Record<string, number> = {};
    for (const s of sectors) {
      if (!s.name.trim()) continue;
      const p = parsePct(s.pct);
      if (p === null) {
        Alert.alert("Porcentaje inválido", `Revisa el % del sector "${s.name}".`);
        return;
      }
      const dbKey = REVERSE_SECTOR_MAP[s.name.trim()] ?? s.name.trim();
      sectorsJson[dbKey] = p;
    }

    const topHoldingsJson: Array<{ name: string; ticker: string | null; weight: number }> = [];
    for (const h of holdings) {
      if (!h.name.trim()) continue;
      const w = parseWeight(h.weight);
      if (w === null) {
        Alert.alert("Peso inválido", `Revisa el peso de "${h.name}".`);
        return;
      }
      topHoldingsJson.push({ name: h.name.trim(), ticker: h.ticker.trim() || null, weight: w });
    }

    try {
      setSaving(true);
      await api.put(`/investments/assets/${assetId}/composition`, {
        regions:  Object.entries(countriesJson).map(([country, pct]) => ({ country, pct })),
        sectors:  Object.entries(sectorsJson).map(([sector, pct]) => ({ sector, pct })),
        holdings: topHoldingsJson,
      });
      markInvestmentsDirty();
      navigation.goBack();
    } catch (e) {
      console.error("❌ Error saving composition:", e);
      Alert.alert("Error", "No se pudo guardar la composición. Comprueba la conexión.");
    } finally {
      setSaving(false);
    }
  };

  // ── Sum badge ─────────────────────────────────────────────────────────────

  const SumBadge = ({ sum }: { sum: number }) => {
    const diff = Math.abs(sum - 100);
    const color = diff < 0.1 ? "#16A34A" : diff < 5 ? "#D97706" : "#94A3B8";
    return (
      <View
        style={{
          paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
          backgroundColor: diff < 0.1 ? "#DCFCE7" : diff < 5 ? "#FEF3C7" : "#F1F5F9",
        }}
      >
        <Text style={{ fontSize: 11, fontWeight: "800", color }}>
          {sum.toLocaleString("es-ES", { maximumFractionDigits: 1 })}%
        </Text>
      </View>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (!assetId) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: "#94A3B8" }}>Falta assetId.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const TABS: Array<{ key: Tab; label: string }> = [
    { key: "regions",  label: "Regiones" },
    { key: "sectors",  label: "Sectores" },
    { key: "holdings", label: "Holdings" },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* ── Header ── */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12 }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ marginRight: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: "900", color: "#0F172A" }} numberOfLines={1}>
            Composición
          </Text>
          <Text style={{ fontSize: 11, color: "#94A3B8", fontWeight: "600", marginTop: 1 }} numberOfLines={1}>
            {assetName}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
          style={{
            flexDirection: "row", alignItems: "center", gap: 6,
            paddingHorizontal: 16, paddingVertical: 9,
            borderRadius: 14, backgroundColor: "#0F172A",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving
            ? <ActivityIndicator size="small" color="white" />
            : <Ionicons name="checkmark-outline" size={15} color="white" />
          }
          <Text style={{ fontSize: 13, fontWeight: "800", color: "white" }}>Guardar</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          {/* ── Tabs ── */}
          <View
            style={{
              flexDirection: "row", gap: 8, padding: 6,
              marginHorizontal: 20, marginBottom: 12,
              borderRadius: 18, backgroundColor: "#F1F5F9",
              borderWidth: 1, borderColor: "#E5E7EB",
            }}
          >
            {TABS.map((t) => {
              const active = tab === t.key;
              const count = t.key === "regions" ? regions.length : t.key === "sectors" ? sectors.length : holdings.length;
              return (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => setTab(t.key)}
                  activeOpacity={0.9}
                  style={{
                    flex: 1, paddingVertical: 7, borderRadius: 12,
                    backgroundColor: active ? "white" : "transparent",
                    alignItems: "center",
                    flexDirection: "row", justifyContent: "center", gap: 6,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "900", color: active ? "#0F172A" : "#64748B" }}>
                    {t.label}
                  </Text>
                  {count > 0 && (
                    <View
                      style={{
                        paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999,
                        backgroundColor: active ? "#EEF2FF" : "#E5E7EB",
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: "900", color: active ? colors.primary : "#64748B" }}>
                        {count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <ScrollView
            className="flex-1 px-5"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 60 }}
          >
            {/* ── Regions ── */}
            {tab === "regions" && (
              <View style={{ backgroundColor: "white", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#E5E7EB" }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <View>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: "#0F172A" }}>Regiones</Text>
                    <Text style={{ fontSize: 11, fontWeight: "600", color: "#94A3B8", marginTop: 2 }}>
                      País o región y su peso
                    </Text>
                  </View>
                  {regions.length > 0 && <SumBadge sum={regionSum} />}
                </View>

                {regions.length > 0 && (
                  <View style={{ flexDirection: "row", marginBottom: 6, paddingRight: 40 }}>
                    <Text style={{ flex: 1, fontSize: 10, fontWeight: "700", color: "#94A3B8" }}>NOMBRE</Text>
                    <Text style={{ width: 72, fontSize: 10, fontWeight: "700", color: "#94A3B8", textAlign: "right" }}>%</Text>
                  </View>
                )}

                {regions.map((r) => (
                  <PctRow
                    key={r.id}
                    row={r}
                    placeholder="Ej: Estados Unidos"
                    onChange={changeRegion}
                    onDelete={(id) => setRegions((p) => p.filter((x) => x.id !== id))}
                    suggestions={activeRegionSuggestions}
                    showSuggestions={focusedRegionId === r.id}
                    onFocus={setFocusedRegionId}
                    onPickSuggestion={pickRegionSuggestion}
                  />
                ))}

                <TouchableOpacity
                  onPress={addRegion}
                  activeOpacity={0.8}
                  style={{
                    flexDirection: "row", alignItems: "center", gap: 8,
                    paddingVertical: 10, paddingHorizontal: 12,
                    borderRadius: 12, borderWidth: 1.5,
                    borderColor: colors.primary, borderStyle: "dashed",
                    marginTop: regions.length > 0 ? 4 : 0,
                  }}
                >
                  <Ionicons name="add-outline" size={16} color={colors.primary} />
                  <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primary }}>Añadir región</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── Sectors ── */}
            {tab === "sectors" && (
              <View style={{ backgroundColor: "white", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#E5E7EB" }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <View>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: "#0F172A" }}>Sectores</Text>
                    <Text style={{ fontSize: 11, fontWeight: "600", color: "#94A3B8", marginTop: 2 }}>
                      Sector económico y su peso
                    </Text>
                  </View>
                  {sectors.length > 0 && <SumBadge sum={sectorSum} />}
                </View>

                {sectors.length > 0 && (
                  <View style={{ flexDirection: "row", marginBottom: 6, paddingRight: 40 }}>
                    <Text style={{ flex: 1, fontSize: 10, fontWeight: "700", color: "#94A3B8" }}>NOMBRE</Text>
                    <Text style={{ width: 72, fontSize: 10, fontWeight: "700", color: "#94A3B8", textAlign: "right" }}>%</Text>
                  </View>
                )}

                {sectors.map((s) => (
                  <PctRow
                    key={s.id}
                    row={s}
                    placeholder="Ej: Tecnología"
                    onChange={changeSector}
                    onDelete={(id) => setSectors((p) => p.filter((x) => x.id !== id))}
                    suggestions={activeSectorSuggestions}
                    showSuggestions={focusedSectorId === s.id}
                    onFocus={setFocusedSectorId}
                    onPickSuggestion={pickSectorSuggestion}
                  />
                ))}

                <TouchableOpacity
                  onPress={addSector}
                  activeOpacity={0.8}
                  style={{
                    flexDirection: "row", alignItems: "center", gap: 8,
                    paddingVertical: 10, paddingHorizontal: 12,
                    borderRadius: 12, borderWidth: 1.5,
                    borderColor: colors.primary, borderStyle: "dashed",
                    marginTop: sectors.length > 0 ? 4 : 0,
                  }}
                >
                  <Ionicons name="add-outline" size={16} color={colors.primary} />
                  <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primary }}>Añadir sector</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── Holdings ── */}
            {tab === "holdings" && (
              <View style={{ backgroundColor: "white", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#E5E7EB" }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <View>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: "#0F172A" }}>Holdings</Text>
                    <Text style={{ fontSize: 11, fontWeight: "600", color: "#94A3B8", marginTop: 2 }}>
                      Empieza a escribir para buscar entre tus activos
                    </Text>
                  </View>
                  {holdings.length > 0 && <SumBadge sum={holdingSum} />}
                </View>

                {holdings.length > 0 && (
                  <View style={{ flexDirection: "row", marginBottom: 6, paddingRight: 40, gap: 8 }}>
                    <Text style={{ flex: 1, fontSize: 10, fontWeight: "700", color: "#94A3B8" }}>NOMBRE</Text>
                    <Text style={{ width: 64, fontSize: 10, fontWeight: "700", color: "#94A3B8", textAlign: "center" }}>TICKER</Text>
                    <Text style={{ width: 72, fontSize: 10, fontWeight: "700", color: "#94A3B8", textAlign: "right" }}>PESO %</Text>
                  </View>
                )}

                {holdings.map((h) => (
                  <HoldingRowComp
                    key={h.id}
                    row={h}
                    suggestions={activeHoldingSuggestions}
                    showSuggestions={focusedHoldingId === h.id}
                    onFocusName={setFocusedHoldingId}
                    onChange={changeHolding}
                    onDelete={(id) => {
                      setHoldings((p) => p.filter((x) => x.id !== id));
                      if (focusedHoldingId === id) setFocusedHoldingId(null);
                    }}
                    onPickSuggestion={pickHoldingSuggestion}
                  />
                ))}

                <TouchableOpacity
                  onPress={addHolding}
                  activeOpacity={0.8}
                  style={{
                    flexDirection: "row", alignItems: "center", gap: 8,
                    paddingVertical: 10, paddingHorizontal: 12,
                    borderRadius: 12, borderWidth: 1.5,
                    borderColor: colors.primary, borderStyle: "dashed",
                    marginTop: holdings.length > 0 ? 4 : 0,
                  }}
                >
                  <Ionicons name="add-outline" size={16} color={colors.primary} />
                  <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primary }}>Añadir holding</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}
