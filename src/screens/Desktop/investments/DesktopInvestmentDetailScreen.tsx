// src/screens/Investments/DesktopInvestmentDetailScreen.tsx
import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  Pressable,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from "react-native-svg";

import api from "../../../api/api";
import { colors } from "../../../theme/theme";
import { textStyles } from "../../../theme/typography";

import DesktopInvestmentFormModal from "../../../components/DesktopInvestmentFormModal";
import DesktopInvestmentValuationModal from "../../../components/DesktopInvestmentValuationModal";
import { KpiCard } from "../../../components/KpiCard";

type InvestmentAssetType = "crypto" | "etf" | "stock" | "fund" | "custom";
type InvestmentRiskType = "variable_income" | "fixed_income" | "unknown";
type RangeKey = "1m" | "3m" | "6m" | "1y" | "all";

interface AssetFromApi {
  id: number;
  name: string;
  description?: string | null;
  type: InvestmentAssetType;
  riskType?: InvestmentRiskType | null;
  currency: string;
  initialInvested: number;
  active: boolean;
  createdAt?: string | null;
  symbol?: string | null;
}

interface SeriesPoint {
  date: string; // ISO
  value: number;
  currency?: string;
}

interface SummaryAssetRow {
  id: number;
  invested: number;
  currentValue: number;
  pnl: number;
  lastValuationDate: string | null;
}

type TransactionFromApi = {
  id: number;
  date?: string | null;
  createdAt?: string | null;
  amount: number;
  currency?: string | null;
  note?: string | null;

  investmentAssetId?: number | null;
  investment_asset_id?: number | null;
  investmentAsset?: { id: number } | null;

  type?: string | null;
  kind?: string | null;
  category?: string | null;
  subcategory?: string | null;
};

/** ✅ Valoraciones reales (con id) */
type ValuationFromApi = {
  id: number;
  assetId?: number;
  investmentAssetId?: number;
  date: string;
  value: number;
  currency?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  active?: boolean;
};

function formatMoney(n: number, currency = "EUR") {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString("es-ES", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
function formatPct(pnl: number, invested: number) {
  if (!invested) return "0,0%";
  return `${((pnl / invested) * 100).toFixed(1).replace(".", ",")}%`;
}
function parseISO(iso: string) {
  return new Date(iso).getTime();
}
function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function formatMonthShort(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-ES", { month: "short" }).replace(".", "").toUpperCase();
}
function formatDayShort(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
}
function rangeDays(k: RangeKey) {
  switch (k) {
    case "1m":
      return 30;
    case "3m":
      return 90;
    case "6m":
      return 180;
    case "1y":
      return 365;
    default:
      return null;
  }
}
function pnlTone(pnl: number) {
  if (pnl > 0) return "success";
  if (pnl < 0) return "danger";
  return "neutral";
}
const typeLabel = (t: InvestmentAssetType) => {
  switch (t) {
    case "crypto":
      return "Crypto";
    case "etf":
      return "ETF";
    case "stock":
      return "Acción";
    case "fund":
      return "Fondo";
    default:
      return "Otro";
  }
};
const typeIcon = (t: InvestmentAssetType) => {
  switch (t) {
    case "crypto":
      return "logo-bitcoin";
    case "stock":
      return "trending-up-outline";
    case "etf":
      return "layers-outline";
    case "fund":
      return "pie-chart-outline";
    default:
      return "briefcase-outline";
  }
};

function useUiScale() {
  const { width } = Dimensions.get("window");
  const s = useMemo(() => {
    const raw = width / 1440;
    return Math.max(0.86, Math.min(1.08, raw));
  }, [width]);
  const px = useCallback((n: number) => Math.round(n * s), [s]);
  const fs = useCallback((n: number) => Math.round(n * s), [s]);
  return { s, px, fs, width };
}

/** Encabezado sección (sin cajita) — estilo Dashboard */
function SectionTitle({
  title,
  right,
  px,
  fs,
}: {
  title: string;
  right?: React.ReactNode;
  px: (n: number) => number;
  fs: (n: number) => number;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: px(12) }}>
      <Text style={[textStyles.labelMuted, { fontSize: fs(12), color: "#64748B", letterSpacing: 0.4 }]}>{title}</Text>
      {!!right && <View>{right}</View>}
    </View>
  );
}

/** Top toolbar button — igual vibe Dashboard */
function TopButton({
  icon,
  label,
  onPress,
  px,
  fs,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label?: string;
  onPress: () => void;
  px: (n: number) => number;
  fs: (n: number) => number;
}) {
  const [hover, setHover] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={Platform.OS === "web" ? () => setHover(true) : undefined}
      onHoverOut={Platform.OS === "web" ? () => setHover(false) : undefined}
      style={{
        height: px(40),
        paddingHorizontal: label ? px(12) : 0,
        width: label ? undefined : px(40),
        borderRadius: px(12),
        backgroundColor: hover ? "rgba(15,23,42,0.06)" : "rgba(255,255,255,0.90)",
        borderWidth: 1,
        borderColor: "rgba(148,163,184,0.25)",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: label ? px(8) : 0,
      }}
    >
      <Ionicons name={icon} size={px(18)} color="#475569" />
      {!!label && <Text style={[textStyles.button, { fontSize: fs(12), fontWeight: "600", color: "#475569" }]}>{label}</Text>}
    </Pressable>
  );
}

/** Soft card (Dashboard style) */
function SoftCard({
  children,
  px,
  pad = 16,
}: {
  children: React.ReactNode;
  px: (n: number) => number;
  pad?: number;
}) {
  return (
    <View
      style={{
        backgroundColor: "white",
        borderRadius: px(16),
        padding: px(pad),
        shadowColor: "#0B1220",
        shadowOpacity: 0.06,
        shadowRadius: px(18),
        shadowOffset: { width: 0, height: px(10) },
      }}
    >
      {children}
    </View>
  );
}

/** Segmented (Dashboard-ish) */
function SegmentedRange({
  value,
  onChange,
  px,
  fs,
}: {
  value: RangeKey;
  onChange: (v: RangeKey) => void;
  px: (n: number) => number;
  fs: (n: number) => number;
}) {
  const items: Array<{ key: RangeKey; label: string }> = [
    { key: "1m", label: "1M" },
    { key: "3m", label: "3M" },
    { key: "6m", label: "6M" },
    { key: "1y", label: "1Y" },
    { key: "all", label: "Todo" },
  ];

  return (
    <View style={{ flexDirection: "row", backgroundColor: "rgba(15,23,42,0.06)", padding: px(4), borderRadius: px(12), height: px(40) }}>
      {items.map((x) => {
        const active = value === x.key;
        return (
          <TouchableOpacity
            key={x.key}
            activeOpacity={0.9}
            onPress={() => onChange(x.key)}
            style={{
              paddingHorizontal: px(12),
              alignItems: "center",
              justifyContent: "center",
              borderRadius: px(10),
              backgroundColor: active ? "white" : "transparent",
              shadowColor: active ? "#0B1220" : "transparent",
              shadowOpacity: active ? 0.08 : 0,
              shadowRadius: px(10),
              shadowOffset: { width: 0, height: px(6) },
            }}
          >
            <Text style={[textStyles.label, { fontSize: fs(12), fontWeight: active ? "800" : "700", color: active ? "#0F172A" : "#64748B" }]}>
              {x.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/** =========================
 * Operations helpers
 * ========================= */
type InvestmentOperationType = "transfer_in" | "transfer_out" | "buy" | "sell" | "swap_in" | "swap_out";

type InvestmentOperationFromApi = {
  id: number;
  userId?: number;
  assetId: number;
  type: InvestmentOperationType;
  date?: string | null;
  amount: number;
  fee?: number | null;
  transactionId?: number | null;
  swapGroupId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  active?: boolean;
};

type BackendOpType = "transfer_in" | "transfer_out" | "buy" | "sell" | "swap_in" | "swap_out";

function opLabel(t: BackendOpType) {
  switch (t) {
    case "transfer_in":
      return "Aportación";
    case "transfer_out":
      return "Retirada";
    case "buy":
      return "Compra";
    case "sell":
      return "Venta";
    case "swap_in":
      return "Swap (entrada)";
    case "swap_out":
      return "Swap (salida)";
  }
}

function opSignedAmount(op: InvestmentOperationFromApi) {
  const amount = Math.abs(Number(op.amount || 0));
  const fee = Math.abs(Number(op.fee || 0));

  switch (op.type) {
    case "transfer_in":
    case "buy":
      return amount + fee;
    case "transfer_out":
    case "sell":
      return -(amount - fee);
    case "swap_in":
    case "swap_out":
    default:
      return 0;
  }
}

function opIso(op: InvestmentOperationFromApi) {
  return op.date || op.createdAt || "";
}

type Tone = "neutral" | "success" | "danger";

function opTone(t?: string | null): Tone {
  if (t === "buy" || t === "deposit" || t === "transfer_in") return "success";
  if (t === "sell" || t === "withdraw" || t === "transfer_out") return "danger";
  return "neutral";
}

/** ===== Chart ===== */
function buildPath(points: { x: number; y: number }[]) {
  if (!points.length) return "";
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
}

function SparkLine({ series, height }: { series: SeriesPoint[]; height: number }) {
  const pts = series;
  const W = 1000;
  const H = 300;
  const padX = 28;
  const padY = 22;

  const values = pts.map((p) => Number(p.value || 0));
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const span = maxV - minV || 1;

  const step = pts.length <= 1 ? 0 : (W - padX * 2) / (pts.length - 1);

  const mapped = pts.map((p, i) => {
    const x = padX + i * step;
    const t = (Number(p.value || 0) - minV) / span;
    const y = padY + (1 - t) * (H - padY * 2);
    return { x, y };
  });

  const path = buildPath(mapped);
  const areaPath =
    mapped.length >= 2
      ? `${path} L ${mapped[mapped.length - 1].x.toFixed(2)} ${(H - padY).toFixed(2)} L ${mapped[0].x.toFixed(2)} ${(H - padY).toFixed(2)} Z`
      : "";

  const last = mapped[mapped.length - 1];

  return (
    <View style={{ width: "100%", height }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          <LinearGradient id="areaGradDesktopDetail" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.primary} stopOpacity="0.18" />
            <Stop offset="1" stopColor={colors.primary} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>

        <Path d={`M ${padX} ${padY} L ${W - padX} ${padY}`} stroke="#EEF2F7" strokeWidth="2" />
        <Path
          d={`M ${padX} ${(padY + (H - padY * 2) * 0.5).toFixed(2)} L ${W - padX} ${(padY + (H - padY * 2) * 0.5).toFixed(2)}`}
          stroke="#EEF2F7"
          strokeWidth="2"
        />
        <Path d={`M ${padX} ${H - padY} L ${W - padX} ${H - padY}`} stroke="#EEF2F7" strokeWidth="2" />

        {areaPath ? <Path d={areaPath} fill="url(#areaGradDesktopDetail)" /> : null}
        <Path d={path} stroke={colors.primary} strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />

        {last ? (
          <>
            <Circle cx={last.x} cy={last.y} r="7" fill={colors.primary} />
            <Circle cx={last.x} cy={last.y} r="12" fill={colors.primary} opacity="0.12" />
          </>
        ) : null}
      </Svg>
    </View>
  );
}

/** ===== Simple Panel Table (2/3 columnas) ===== */
type PanelRow = {
  id: string;
  left: string;
  middle?: { label: string; tone?: Tone; icon?: keyof typeof Ionicons.glyphMap };
  right: string;
  rightTone?: Tone;
  onPress?: () => void;
};

function PanelTable({
  title,
  leftHeader,
  middleHeader,
  rightHeader,
  rows,
  emptyText,
  px,
  fs,
}: {
  title: string;
  leftHeader: string;
  middleHeader?: string;
  rightHeader: string;
  rows: PanelRow[];
  emptyText: string;
  px: (n: number) => number;
  fs: (n: number) => number;
}) {
  const isWeb = Platform.OS === "web";
  const hasMiddle = !!middleHeader;

  const tonePalette = (t?: Tone) => {
    if (t === "success") return { fg: "#16A34A", bg: "rgba(34,197,94,0.10)", bd: "rgba(34,197,94,0.18)" };
    if (t === "danger") return { fg: "#DC2626", bg: "rgba(239,68,68,0.10)", bd: "rgba(239,68,68,0.18)" };
    return { fg: "#0F172A", bg: "rgba(15,23,42,0.05)", bd: "rgba(15,23,42,0.10)" };
  };

  const bodyH = px(380);
  const leftFlex = hasMiddle ? 1.1 : 1.25;
  const midFlex = 0.9;
  const rightFlex = 1;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "white",
        borderRadius: px(16),
        paddingTop: px(10),
        overflow: "hidden",
        shadowColor: "#0B1220",
        shadowOpacity: 0.06,
        shadowRadius: px(18),
        shadowOffset: { width: 0, height: px(10) },
      }}
    >
      <View style={{ paddingHorizontal: px(16), paddingTop: px(8), paddingBottom: px(10) }}>
        <Text style={[textStyles.h2, { fontSize: fs(13), fontWeight: "900", color: "#0F172A" }]}>{title}</Text>
      </View>

      <View style={{ height: 1, backgroundColor: "rgba(148,163,184,0.20)" }} />

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "rgba(15,23,42,0.03)",
          borderBottomWidth: 1,
          borderBottomColor: "rgba(148,163,184,0.20)",
          paddingHorizontal: px(16),
          paddingVertical: px(9),
        }}
      >
        <Text style={[textStyles.labelMuted, { flex: leftFlex, fontSize: fs(10.5), color: "#64748B" }]} numberOfLines={1}>
          {leftHeader}
        </Text>

        {hasMiddle ? (
          <Text style={[textStyles.labelMuted, { flex: midFlex, fontSize: fs(10.5), textAlign: "center", color: "#64748B" }]} numberOfLines={1}>
            {middleHeader}
          </Text>
        ) : null}

        <Text style={[textStyles.labelMuted, { flex: rightFlex, fontSize: fs(10.5), textAlign: "right", color: "#64748B" }]} numberOfLines={1}>
          {rightHeader}
        </Text>
      </View>

      <ScrollView style={{ height: bodyH }} showsVerticalScrollIndicator>
        {rows.length === 0 ? (
          <View style={{ padding: px(16) }}>
            <Text style={[textStyles.bodyMuted, { fontSize: fs(12), fontWeight: "700", color: "#94A3B8" }]}>{emptyText}</Text>
          </View>
        ) : (
          rows.map((r, idx) => {
            const clickable = !!r.onPress;
            const rightPalette = tonePalette(r.rightTone);
            const midPalette = tonePalette(r.middle?.tone);

            return (
              <Pressable
                key={r.id}
                onPress={r.onPress}
                disabled={!clickable}
                style={({ hovered, pressed }) => [
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: px(16),
                    paddingVertical: px(12),
                    borderBottomWidth: idx === rows.length - 1 ? 0 : 1,
                    borderBottomColor: "rgba(148,163,184,0.16)",
                    backgroundColor: "white",
                    opacity: pressed ? 0.92 : 1,
                  },
                  clickable && isWeb && hovered ? { backgroundColor: "rgba(15,23,42,0.03)" } : null,
                ]}
              >
                <View style={{ flex: leftFlex, paddingRight: px(12) }}>
                  <Text style={[textStyles.body, { fontSize: fs(12), fontWeight: "900", color: "#0F172A" }]} numberOfLines={1}>
                    {r.left}
                  </Text>
                </View>

                {hasMiddle ? (
                  <View style={{ flex: midFlex, alignItems: "center", justifyContent: "center" }}>
                    {r.middle ? (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingHorizontal: px(10),
                          height: px(22),
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: midPalette.bd,
                          backgroundColor: midPalette.bg,
                          gap: px(6),
                        }}
                      >
                        {r.middle.icon ? <Ionicons name={r.middle.icon} size={px(13)} color={midPalette.fg} /> : null}
                        <Text style={{ fontSize: fs(10.5), fontWeight: "900", color: midPalette.fg }} numberOfLines={1}>
                          {r.middle.label}
                        </Text>
                      </View>
                    ) : (
                      <Text style={{ fontSize: fs(11), fontWeight: "700", color: "#94A3B8" }}>—</Text>
                    )}
                  </View>
                ) : null}

                <View style={{ flex: rightFlex, alignItems: "flex-end" }}>
                  <Text style={[textStyles.number, { fontSize: fs(12), fontWeight: "900", color: rightPalette.fg, textAlign: "right" }]} numberOfLines={1}>
                    {r.right}
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

/** ===== Contributions helpers (no usadas ahora) ===== */
function matchesAsset(tx: TransactionFromApi, assetId: number) {
  const a = tx.investmentAssetId ?? tx.investment_asset_id ?? tx.investmentAsset?.id ?? null;
  return Number(a) === Number(assetId);
}
function txIso(tx: TransactionFromApi) {
  return tx.date || tx.createdAt || "";
}

export default function DesktopInvestmentDetailScreen({ navigation }: any) {
  const route = useRoute<any>();
  const assetId: number | undefined = route?.params?.assetId;

  const { px, fs, width } = useUiScale();
  const WIDE = width >= 1120;
  const CHART_H = px(280);

  const [loading, setLoading] = useState(true);

  const [asset, setAsset] = useState<AssetFromApi | null>(null);
  const [summaryRow, setSummaryRow] = useState<SummaryAssetRow | null>(null);
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [range, setRange] = useState<RangeKey>("3m");

  const [operations, setOperations] = useState<InvestmentOperationFromApi[]>([]);
  const [valuations, setValuations] = useState<ValuationFromApi[]>([]);

  // modales
  const [editOpen, setEditOpen] = useState(false);
  const [valuationOpen, setValuationOpen] = useState(false);

  // ✅ para abrir el modal en modo editar (si tu modal lo soporta)
  const [editingValuationId, setEditingValuationId] = useState<number | null>(null);

  const currency = useMemo(() => asset?.currency ?? "EUR", [asset?.currency]);

  const fetchAll = useCallback(async () => {
    if (!assetId) return;

    try {
      setLoading(true);

      const aRes = await api.get(`/investments/assets/${assetId}`);
      setAsset(aRes.data || null);

      const sRes = await api.get(`/investments/summary`);
      const row = (sRes.data?.assets || []).find((x: any) => Number(x.id) === Number(assetId)) || null;
      setSummaryRow(row);

      const serRes = await api.get(`/investments/assets/${assetId}/series`);
      setSeries(Array.isArray(serRes.data) ? serRes.data : []);

      // valoraciones reales con id
      const vRes = await api.get(`/investments/valuations`, { params: { assetId } });
      const vList = Array.isArray(vRes.data) ? vRes.data : vRes.data?.valuations ?? [];
      setValuations(Array.isArray(vList) ? vList : []);

      // operations
      const oRes = await api.get(`/investments/operations`, { params: { assetId } });
      const list = Array.isArray(oRes.data) ? oRes.data : oRes.data?.operations ?? [];
      setOperations(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error("❌ Error cargando DesktopInvestmentDetail:", e);
      setAsset(null);
      setSummaryRow(null);
      setSeries([]);
      setValuations([]);
      setOperations([]);
      navigation?.goBack?.();
    } finally {
      setLoading(false);
    }
  }, [assetId, navigation]);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll])
  );

  const sortedSeries = useMemo(
    () => [...series].filter((p) => !!p?.date).sort((a, b) => parseISO(a.date) - parseISO(b.date)),
    [series]
  );

  const filteredSeries = useMemo(() => {
    if (!sortedSeries.length) return [];
    if (range === "all") return sortedSeries;

    const days = rangeDays(range);
    if (!days) return sortedSeries;

    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const f = sortedSeries.filter((p) => parseISO(p.date) >= cutoff);
    return f.length >= 4 ? f : sortedSeries.slice(-8);
  }, [sortedSeries, range]);

  const stats = useMemo(() => {
    const invested = summaryRow?.invested ?? (asset?.initialInvested ?? 0);
    const currentValue = summaryRow?.currentValue ?? invested;
    const pnl = summaryRow?.pnl ?? currentValue - invested;
    const initialInvested = asset?.initialInvested ?? 0;

    const last =
      summaryRow?.lastValuationDate
        ? formatShortDate(summaryRow.lastValuationDate)
        : sortedSeries.length
        ? formatShortDate(sortedSeries[sortedSeries.length - 1].date)
        : "Sin datos";

    return { invested, currentValue, pnl, last, initialInvested };
  }, [asset, summaryRow, sortedSeries]);

  const pnlColor = stats.pnl > 0 ? "#16A34A" : stats.pnl < 0 ? "#DC2626" : "#64748B";

  const headerTitle = asset ? `${asset.name}${asset.symbol ? ` (${String(asset.symbol).toUpperCase()})` : ""}` : "Detalle del activo";

  /** ✅ Valoraciones */
  const valuationsRows: PanelRow[] = useMemo(() => {
    const list = [...valuations]
      .filter((v) => (v.active ?? true))
      .filter((v) => {
        const vAsset = v.assetId ?? v.investmentAssetId ?? null;
        return vAsset == null ? true : Number(vAsset) === Number(assetId);
      })
      .filter((v) => !!v.date)
      .sort((a, b) => parseISO(b.date) - parseISO(a.date));

    return list.map((v) => ({
      id: `val-${v.id}`,
      left: formatShortDate(v.date),
      right: formatMoney(Number(v.value || 0), currency),
      rightTone: "neutral",
      onPress: () => {
        setEditingValuationId(v.id);
        setValuationOpen(true);
      },
    }));
  }, [valuations, currency, assetId]);

  /** ✅ Operaciones */
  const operationsRows: PanelRow[] = useMemo(() => {
    if (!assetId) return [];

    const ops = [...operations]
      .filter((op) => (op.active ?? true))
      .filter((op) => Number(op.assetId) === Number(assetId))
      .filter((op) => !!opIso(op))
      .sort((a, b) => parseISO(opIso(b)) - parseISO(opIso(a)));

    return ops.map((op) => {
      const iso = opIso(op);
      const amount = opSignedAmount(op);

      const icon =
        op.type === "buy"
          ? "add-circle-outline"
          : op.type === "sell"
          ? "remove-circle-outline"
          : op.type === "transfer_in"
          ? "download-outline"
          : op.type === "transfer_out"
          ? "log-out-outline"
          : "swap-horizontal-outline";

      return {
        id: `op-${op.id}`,
        left: formatShortDate(iso),
        middle: { label: opLabel(op.type), tone: opTone(op.type), icon },
        right: formatMoney(amount, currency),
        rightTone: opTone(op.type),
      };
    });
  }, [operations, assetId, currency]);

  if (!assetId) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F6F8FC", padding: px(22), justifyContent: "center" }}>
        <Text style={[textStyles.bodyMuted, { fontSize: fs(13), fontWeight: "700", color: "#94A3B8" }]}>Falta assetId en la navegación.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F6F8FC" }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: px(22),
          paddingTop: px(18),
          paddingBottom: px(90),
          maxWidth: px(1400),
          width: "100%",
          alignSelf: "center",
        }}
      >
        {/* ===== Top toolbar (Dashboard style) ===== */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: px(14), marginBottom: px(14) }}>
          <View style={{ flex: 1 }}>
            <Text style={[textStyles.h1, { fontSize: fs(22), color: "#0F172A", fontWeight: "900" }]} numberOfLines={2}>
              {headerTitle}
            </Text>
            <Text style={[textStyles.bodyMuted, { marginTop: px(4), fontSize: fs(12), color: "#64748B", fontWeight: "700" }]} numberOfLines={1}>
              {loading ? "Cargando…" : `Última valoración: ${stats.last}`}
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: px(10) }}>
            <TopButton icon="arrow-back-outline" label="Volver" onPress={() => navigation.goBack?.()} px={px} fs={fs} />
            <TopButton icon="create-outline" label="Editar" onPress={() => setEditOpen(true)} px={px} fs={fs} />
            <TopButton
              icon="cash-outline"
              label="Valorar"
              onPress={() => {
                setEditingValuationId(null);
                setValuationOpen(true);
              }}
              px={px}
              fs={fs}
            />
            <TopButton icon="refresh-outline" onPress={fetchAll} px={px} fs={fs} />
          </View>
        </View>

        {/* ===== KPI row (KpiCard) ===== */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: px(14) }}>
          <KpiCard
            title="VALOR ACTUAL"
            value={loading ? "—" : formatMoney(stats.currentValue, currency)}
            subtitle={<Text style={[textStyles.caption, { fontSize: fs(12), color: "#94A3B8" }]} numberOfLines={1}>Valor de mercado</Text>}
            icon="wallet-outline"
            variant="premium"
            px={px}
            fs={fs}
          />

          <KpiCard
            title="INVERTIDO"
            value={loading ? "—" : formatMoney(stats.invested, currency)}
            subtitle={<Text style={[textStyles.caption, { fontSize: fs(12), color: "#94A3B8" }]} numberOfLines={1}>Capital aportado</Text>}
            icon="add-circle-outline"
            tone="info"
            px={px}
            fs={fs}
          />

          <KpiCard
            title="P/L"
            value={loading ? "—" : formatMoney(stats.pnl, currency)}
            subtitle={<Text style={[textStyles.caption, { fontSize: fs(12), color: "#94A3B8" }]} numberOfLines={1}>{stats.pnl >= 0 ? "Ganancia total" : "Pérdida total"}</Text>}
            icon="stats-chart-outline"
            tone={pnlTone(stats.pnl) as any}
            px={px}
            fs={fs}
          />

          <KpiCard
            title="% P/L"
            value={loading ? "—" : formatPct(stats.pnl, stats.invested)}
            subtitle={<Text style={[textStyles.caption, { fontSize: fs(12), color: "#94A3B8" }]} numberOfLines={1}>Rentabilidad</Text>}
            icon="trending-up-outline"
            tone={pnlTone(stats.pnl) as any}
            px={px}
            fs={fs}
          />
        </View>

        {/* ===== Charts + Info ===== */}
        <View style={{ marginTop: px(12), flexDirection: WIDE ? "row" : "column", gap: px(12) }}>
          <View style={{ flex: 1, minWidth: WIDE ? px(680) : undefined }}>
            <SoftCard px={px} pad={16}>
              <SectionTitle title="Evolución" right={<SegmentedRange value={range} onChange={setRange} px={px} fs={fs} />} px={px} fs={fs} />
              <View style={{ marginTop: px(10), height: CHART_H, justifyContent: "center" }}>
                {loading ? (
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : filteredSeries.length < 2 ? (
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <Text style={[textStyles.bodyMuted, { fontSize: fs(12), fontWeight: "700", color: "#94A3B8" }]}>
                      No hay suficientes puntos para dibujar la gráfica (mínimo 2).
                    </Text>
                  </View>
                ) : (
                  <SparkLine series={filteredSeries} height={CHART_H} />
                )}
              </View>

              {!loading && filteredSeries.length >= 2 ? (
                <View style={{ marginTop: px(10), flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={[textStyles.caption, { fontSize: fs(11), color: "#94A3B8", fontWeight: "800" }]}>
                    {range === "1m" ? formatDayShort(filteredSeries[0].date) : formatMonthShort(filteredSeries[0].date)}
                  </Text>
                  <Text style={[textStyles.caption, { fontSize: fs(11), color: "#94A3B8", fontWeight: "800" }]}>
                    {range === "1m"
                      ? formatDayShort(filteredSeries[filteredSeries.length - 1].date)
                      : formatMonthShort(filteredSeries[filteredSeries.length - 1].date)}
                  </Text>
                </View>
              ) : null}
            </SoftCard>
          </View>

          <View style={{ width: WIDE ? px(420) : "100%" }}>
            <SoftCard px={px} pad={16}>
              <SectionTitle title="Información" px={px} fs={fs} />
              <View style={{ marginTop: px(10) }}>
                {loading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : !asset ? (
                  <Text style={[textStyles.bodyMuted, { fontSize: fs(12), fontWeight: "700", color: "#94A3B8" }]}>Sin datos.</Text>
                ) : (
                  <View style={{ gap: px(10) }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: px(12) }}>
                      <Text style={[textStyles.caption, { fontSize: fs(12), color: "#94A3B8", fontWeight: "800" }]}>Tipo</Text>
                      <Text style={[textStyles.body, { fontSize: fs(12), fontWeight: "900", color: "#0F172A" }]}>{typeLabel(asset.type)}</Text>
                    </View>

                    <View style={{ height: 1, backgroundColor: "rgba(148,163,184,0.20)" }} />

                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: px(12) }}>
                      <Text style={[textStyles.caption, { fontSize: fs(12), color: "#94A3B8", fontWeight: "800" }]}>Moneda</Text>
                      <Text style={[textStyles.body, { fontSize: fs(12), fontWeight: "900", color: "#0F172A" }]}>{asset.currency}</Text>
                    </View>

                    <View style={{ height: 1, backgroundColor: "rgba(148,163,184,0.20)" }} />

                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: px(12) }}>
                      <Text style={[textStyles.caption, { fontSize: fs(12), color: "#94A3B8", fontWeight: "800" }]}>P/L</Text>
                      <Text style={[textStyles.body, { fontSize: fs(12), fontWeight: "900", color: pnlColor }]}>{formatMoney(stats.pnl, currency)}</Text>
                    </View>

                    {asset.initialInvested ? (
                      <>
                        <View style={{ height: 1, backgroundColor: "rgba(148,163,184,0.20)" }} />
                        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: px(12) }}>
                          <Text style={[textStyles.caption, { fontSize: fs(12), color: "#94A3B8", fontWeight: "800" }]}>Invertido inicialmente</Text>
                          <Text style={[textStyles.body, { fontSize: fs(12), fontWeight: "900", color: "#0F172A" }]}>{formatMoney(stats.initialInvested, currency)}</Text>
                        </View>
                      </>
                    ) : null}

                    {asset.description?.trim() ? (
                      <>
                        <View style={{ height: 1, backgroundColor: "rgba(148,163,184,0.20)" }} />
                        <View style={{ gap: px(6) }}>
                          <Text style={[textStyles.caption, { fontSize: fs(12), color: "#94A3B8", fontWeight: "800" }]}>Descripción</Text>
                          <Text style={[textStyles.body, { fontSize: fs(12), fontWeight: "700", color: "#334155", lineHeight: fs(18) }]}>{asset.description}</Text>
                        </View>
                      </>
                    ) : null}
                  </View>
                )}
              </View>
            </SoftCard>
          </View>
        </View>

        {/* ===== Bottom lists ===== */}
        <View style={{ marginTop: px(12), flexDirection: WIDE ? "row" : "column", gap: px(12) }}>
          <PanelTable
            title="Valoraciones"
            leftHeader="Fecha"
            rightHeader="Valor"
            rows={loading ? [] : valuationsRows}
            emptyText={loading ? "Cargando…" : "No hay valoraciones."}
            px={px}
            fs={fs}
          />

          <PanelTable
            title="Operaciones"
            leftHeader="Fecha"
            middleHeader="Tipo"
            rightHeader="Importe"
            rows={loading ? [] : operationsRows}
            emptyText={loading ? "Cargando…" : "No hay operaciones."}
            px={px}
            fs={fs}
          />
        </View>
      </ScrollView>

      {/* MODALS */}
      <DesktopInvestmentFormModal
        visible={editOpen}
        assetId={assetId}
        onClose={() => setEditOpen(false)}
        onSaved={async () => {
          setEditOpen(false);
          await fetchAll();
        }}
      />

      {/* NOTA:
         - Este screen pasa editingValuationId.
         - Si tu DesktopInvestmentValuationModal NO soporta esta prop, elimínala aquí o añádela en el modal.
      */}
      <DesktopInvestmentValuationModal
        visible={valuationOpen}
        assetId={assetId}
        currency={currency}
        // @ts-ignore
        editingValuationId={editingValuationId}
        onClose={() => {
          setValuationOpen(false);
          setEditingValuationId(null);
        }}
        onSaved={async () => {
          setValuationOpen(false);
          setEditingValuationId(null);
          await fetchAll();
        }}
      />
    </View>
  );
}
