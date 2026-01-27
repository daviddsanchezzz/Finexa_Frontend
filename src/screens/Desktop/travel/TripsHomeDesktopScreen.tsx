// src/screens/Desktop/trips/TripsBoardScreen.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import api from "../../../api/api";
import { colors } from "../../../theme/theme";
import { textStyles, typography } from "../../../theme/typography";
import { DesktopTripModal, TripFromApi as TripEdit } from "../../../components/DesktopTripModal";
import { KpiCard } from "../../../components/KpiCard";

type BoardMode = "status" | "continent" | "year";
type KanbanTone =
  | "neutral"
  | "blue"
  | "green"
  | "purple"
  | "orange"
  | "pink"
  | "teal";

type ContinentKey =
  | "europe"
  | "africa"
  | "asia"
  | "north_america"
  | "south_america"
  | "oceania"
  | "antarctica"
  | "unknown";

type ContinentStat = {
  continent: ContinentKey;
  visitedCountries: number;
  totalCountries: number;
  pct: number;
  trips: number;
};

type ContinentsStatsDto = ContinentStat[]; // 👈 ahora es array


type KanbanColumnModel = {
  id: string;           // "wishlist" | "planning" | "seen" | "europe" | "2024" ...
  title: string;
  tone: KanbanTone;
  trips: TripUI[];
  droppable: boolean;   // solo true en status
  count: number;
  subcount?: string; // texto extra a mostrar al lado del count
};

const UNKNOWN_CONTINENT_ID = "unknown";
const UNKNOWN_YEAR_ID = "unknown";

/** ===== Types ===== */
type TripLane = "seen" | "planning" | "wishlist";

type TripListFromApi = {
  id: number;
  name: string;
  destination?: string | null;
  emoji?: string | null;
  color?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  cost?: number | null;
  continent?: string | null;
  year?: number | null;
  status?: TripLane;
};

interface TripUI {
  id: number;
  name: string;
  destination: string;
  emoji?: string;
  color?: string;
  startDate: string | null;
  endDate: string | null;
  cost: number;
  lane: TripLane; // lane = status
  continent?: string | null;
  year?: number | null;
}

type TripsSummaryDto = {
  daysToNextTrip: number | null;
  nextTrip: {
    id: number;
    name: string;
    startDate: string | null;
  } | null;

  visitedCountries: number;
  pendingCountries: number;
  visitedPct: number;     // 0..100
  totalCountries: number; // 249
};


/** ===== Utils ===== */
function formatEuro(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function uniqueCountryCount(trips: TripUI[]) {
  const set = new Set(
    trips
      .map((t) => (t.destination || "").trim().toUpperCase())
      .filter(Boolean)
  );
  return set.size;
}


function norm(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function isValidISODate(iso?: string | null) {
  if (!iso) return false;
  const d = new Date(iso);
  return !Number.isNaN(d.getTime());
}

function formatDateRange(startISO?: string | null, endISO?: string | null) {
  if (!isValidISODate(startISO) || !isValidISODate(endISO)) return "Sin fecha";
  const s = new Date(startISO!);
  const e = new Date(endISO!);

  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" };
  const startStr = s.toLocaleDateString("es-ES", opts);
  const endStr = e.toLocaleDateString("es-ES", opts);

  return `${startStr} · ${endStr}`;
}



function continentLabel(c?: string | null) {
  const v = (c || "").toLowerCase();
  if (v === "europe") return "Europa";
  if (v === "africa") return "África";
  if (v === "asia") return "Asia";
  if (v === "america" || v === "north_america") return "Norteamérica";
  if (v === "south_america") return "Sudamérica";
  if (v === "oceania") return "Oceanía";
  return c ? c : "";
}

/** Escalado responsive */
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

/** ===== Small UI atoms (matching screenshot style) ===== */
function Pill({
  label,
  tone = "neutral",
  px,
  fs,
  leftIcon,
}: {
  label: string;
  tone?: KanbanTone; // ✅ aquí
  px: (n: number) => number;
  fs: (n: number) => number;
  leftIcon?: keyof typeof Ionicons.glyphMap;
}) {
const map = {
  neutral: { bg: "rgba(15,23,42,0.06)", fg: "#0F172A" },
  blue:    { bg: "rgba(37,99,235,0.10)", fg: "#2563EB" },
  green:   { bg: "rgba(16,185,129,0.12)", fg: "#059669" },
  purple:  { bg: "rgba(139,92,246,0.12)", fg: "#7C3AED" },
  orange:  { bg: "rgba(249,115,22,0.14)", fg: "#EA580C" },
  pink:    { bg: "rgba(236,72,153,0.12)", fg: "#DB2777" },
  teal:    { bg: "rgba(20,184,166,0.12)", fg: "#0D9488" },
} as const;

  const c = map[tone ?? "neutral"];
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: px(8),
        paddingHorizontal: px(12),
        height: px(30),
        borderRadius: 999,
        backgroundColor: c.bg,
      }}
    >
      {!!leftIcon && <Ionicons name={leftIcon} size={px(14)} color={c.fg} />}
      <Text style={{ fontSize: fs(12), fontWeight: "700", color: c.fg }}>{label}</Text>
    </View>
  );
}
function toneForContinent(id: string): KanbanTone {
  switch ((id || "").toLowerCase()) {
    case "europe":
      return "blue";
    case "asia":
      return "purple";
    case "africa":
      return "orange";
    case "north_america":
      return "blue";
    case "america":
      return "green";
    case "south_america":
      return "pink";
    case "oceania":
      return "teal";
    case "antarctica":
      return "neutral";
    default:
      return "neutral";
  }
}

const YEAR_TONES: KanbanTone[] = [
  "blue",
  "green",
  "purple",
  "orange",
  "teal",
  "pink",
];

function toneForYear(key: string, index: number): KanbanTone {
  if (key === "unknown") return "neutral";
  return YEAR_TONES[index % YEAR_TONES.length];
}



function IconButton({
  icon,
  onPress,
  px,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  px: (n: number) => number;
}) {
  const [hover, setHover] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onHoverIn={Platform.OS === "web" ? () => setHover(true) : undefined}
      onHoverOut={Platform.OS === "web" ? () => setHover(false) : undefined}
      style={{
        width: px(34),
        height: px(34),
        borderRadius: px(12),
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: hover ? "rgba(15,23,42,0.06)" : "rgba(255,255,255,0.92)",
        borderWidth: 1,
        borderColor: "rgba(148,163,184,0.22)",
      }}
    >
      <Ionicons name={icon} size={px(16)} color="#475569" />
    </Pressable>
  );
}

function PrimaryButton({
  label,
  onPress,
  px,
  fs,
}: {
  label: string;
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
        height: px(36),
        paddingHorizontal: px(14),
        borderRadius: px(12),
        backgroundColor: hover ? "rgba(15,23,42,0.92)" : "#0F172A",
        flexDirection: "row",
        alignItems: "center",
        gap: px(8),
      }}
    >
      <Ionicons name="add-outline" size={px(18)} color="white" />
      <Text style={{ fontSize: fs(12), fontWeight: "700", color: "white" }}>{label}</Text>
    </Pressable>
  );
}

function BoardSearchBar({
  q,
  setQ,
  px,
  fs,
}: {
  q: string;
  setQ: (v: string) => void;
  px: (n: number) => number;
  fs: (n: number) => number;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: px(10), flex: 1 }}>
      <View
        style={{
          flex: 1,
          height: px(36),
          borderRadius: px(14),
          backgroundColor: "white",
          borderWidth: 1,
          borderColor: "rgba(148,163,184,0.22)",
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: px(12),
          gap: px(10),
        }}
      >
        <Ionicons name="search-outline" size={px(16)} color="#64748B" />

        {Platform.OS === "web" ? (
          // @ts-ignore
          <input
            value={q}
            onChange={(e: any) => setQ(e?.target?.value ?? "")}
            placeholder="Buscar viajes…"
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: fs(13),
              fontFamily: typography.family.base,
              fontWeight: 700,
              background: "transparent",
              color: "#0F172A",
            }}
          />
        ) : (
          <Text style={{ fontSize: fs(12), color: "#94A3B8", fontWeight: "700" }}>Buscar (solo web)</Text>
        )}

        {!!q && (
          <TouchableOpacity activeOpacity={0.9} onPress={() => setQ("")}>
            <Ionicons name="close-circle" size={px(16)} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}



/** ===== Mini dropdown menu (3 dots) ===== */
function stop(e: any) {
  e?.preventDefault?.();
  e?.stopPropagation?.();
}

function DotsMenu({
  open,
  onOpen,
  onClose,
  px,
  fs,
  onEdit,
  onDelete,
}: {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  px: (n: number) => number;
  fs: (n: number) => number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={{ position: "relative" as any }}>
      <Pressable
        onPress={(e) => {
          stop(e);
          open ? onClose() : onOpen();
        }}
        style={{
          width: px(28),
          height: px(28),
          borderRadius: px(10),
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="ellipsis-horizontal" size={px(16)} color="#94A3B8" />
      </Pressable>

      {open && (
        <>
          {Platform.OS === "web" && (
            <Pressable
              onPress={(e) => {
                stop(e);
                onClose();
              }}
              style={{
                position: "fixed" as any,
                left: 0,
                top: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "transparent",
                zIndex: 10,
              }}
            />
          )}

          <View
            style={{
              position: "absolute",
              right: 0,
              top: px(30),
              width: px(170),
              borderRadius: px(14),
              backgroundColor: "white",
              borderWidth: 1,
              borderColor: "rgba(148,163,184,0.22)",
              shadowColor: "#0B1220",
              shadowOpacity: 0.1,
              shadowRadius: px(18),
              shadowOffset: { width: 0, height: px(12) },
              zIndex: 20,
              padding: px(6),
            }}
          >
            <Pressable
              onPress={(e) => {
                stop(e);
                onClose();
                onEdit();
              }}
              style={{
                height: px(36),
                borderRadius: px(12),
                paddingHorizontal: px(10),
                flexDirection: "row",
                alignItems: "center",
                gap: px(10),
              }}
            >
              <Ionicons name="create-outline" size={px(16)} color="#0F172A" />
              <Text style={{ fontSize: fs(12), fontWeight: "700", color: "#0F172A" }}>Editar</Text>
            </Pressable>

            <View style={{ height: 1, backgroundColor: "rgba(148,163,184,0.14)", marginVertical: px(4) }} />

            <Pressable
              onPress={(e) => {
                stop(e);
                onClose();
                onDelete();
              }}
              style={{
                height: px(36),
                borderRadius: px(12),
                paddingHorizontal: px(10),
                flexDirection: "row",
                alignItems: "center",
                gap: px(10),
              }}
            >
              <Ionicons name="trash-outline" size={px(16)} color="#DC2626" />
              <Text style={{ fontSize: fs(12), fontWeight: "700", color: "#DC2626" }}>Eliminar</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

function HoverIcon({
  icon,
  tooltip,
  px,
  fs,
  onOpenChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tooltip: string;
  px: (n: number) => number;
  fs: (n: number) => number;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  return (
    <Pressable
      onHoverIn={Platform.OS === "web" ? () => { setOpen(true); setHover(true); } : undefined}
      onHoverOut={Platform.OS === "web" ? () => { setOpen(false); setHover(false); } : undefined}
      onPress={Platform.OS !== "web" ? () => setOpen((v) => !v) : undefined}
      style={{
        position: "relative" as any,
        paddingHorizontal: px(4),
        paddingVertical: px(2),
      }}
    >
      <Ionicons name={icon} size={px(16)} color={hover ? "#0F172A" : "#64748B"} />

      {open && !!tooltip && (
        <View
          style={{
            position: "absolute",
            right: 0,
            top: px(22),
            zIndex: 20000,
            backgroundColor: "#0F172A",
            paddingHorizontal: px(10),
            paddingVertical: px(8),
            borderRadius: px(10),
            shadowColor: "#0B1220",
            shadowOpacity: 0.25,
            shadowRadius: px(14),
            shadowOffset: { width: 0, height: px(10) },
            maxWidth: px(180),
          }}
        >
          <Text style={{ fontSize: fs(11), fontWeight: "700", color: "white" }} numberOfLines={2}>
            {tooltip}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function countryNameFromCode(code?: string | null) {
  const cca2 = (code || "").trim().toUpperCase();
  if (!cca2) return "";

  try {
    // @ts-ignore
    const dn = new Intl.DisplayNames(["es"], { type: "region" });
    return dn.of(cca2) || cca2;
  } catch {
    return cca2;
  }
}

function CountryHoverFlag({
  code,
  px,
  fs,
  onOpenChange,
}: {
  code?: string | null;
  px: (n: number) => number;
  fs: (n: number) => number;
  onOpenChange?: (open: boolean) => void;
}) {
  const cca2 = (code || "").trim().toLowerCase();
  const label = countryNameFromCode(code);

  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  const canImg = Platform.OS === "web" && /^[a-z]{2}$/.test(cca2);

  return (
    <Pressable
      onHoverIn={Platform.OS === "web" ? () => { setOpen(true); setHover(true); } : undefined}
      onHoverOut={Platform.OS === "web" ? () => { setOpen(false); setHover(false); } : undefined}
      onPress={Platform.OS !== "web" ? () => setOpen((v) => !v) : undefined}
      style={{
        position: "relative" as any,
        paddingHorizontal: px(4),
        paddingVertical: px(2),
        opacity: hover ? 1 : 0.95,
      }}
    >
      {canImg ? (
        // @ts-ignore
        <img
          src={`https://flagcdn.com/24x18/${cca2}.png`}
          alt={label || cca2.toUpperCase()}
          style={{
            width: px(18),
            height: px(14),
            borderRadius: 3,
            display: "block",
            boxShadow: hover ? "0 0 0 1px rgba(15,23,42,0.18)" : "none",
          }}
          onError={(e: any) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <Text style={{ fontSize: fs(11), fontWeight: "700", color: "#334155" }}>
          {(code || "").toUpperCase() || "—"}
        </Text>
      )}

      {open && !!label && (
        <View
          style={{
            position: "absolute",
            right: 0,
            top: px(22),
            zIndex: 20000,
            backgroundColor: "#0F172A",
            paddingHorizontal: px(10),
            paddingVertical: px(8),
            borderRadius: px(10),
            shadowColor: "#0B1220",
            shadowOpacity: 0.25,
            shadowRadius: px(14),
            shadowOffset: { width: 0, height: px(10) },
            maxWidth: "none",
            whiteSpace: "nowrap",
          }}
        >
          <Text
            style={{
              fontSize: fs(11),
              fontWeight: "700",
              color: "white",
              whiteSpace: "nowrap",
            }}
            numberOfLines={1}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

/** Trip card — with 3-dots menu + drag between columns (web) */
function TripKanbanCard({
  trip,
  px,
  fs,
  onOpenDetail,
  onEdit,
  onDelete,
  onDragStartTrip,
}: {
  trip: TripUI;
  px: (n: number) => number;
  fs: (n: number) => number;
  onOpenDetail: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDragStartTrip?: (tripId: number) => void;
}) {
  const [hover, setHover] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [metaOpen, setMetaOpen] = useState(false);

  const yearLabel = trip.year ?? (isValidISODate(trip.startDate) ? new Date(trip.startDate!).getFullYear() : null);
  const contLabel = continentLabel(trip.continent);
  const dateLabel = formatDateRange(trip.startDate, trip.endDate);

  const hasSomeDate = isValidISODate(trip.startDate) || isValidISODate(trip.endDate);

return (
  <Draggable
    id={trip.id}
    onDragStartTrip={onDragStartTrip}
    style={{
      position: "relative",
      zIndex: menuOpen || metaOpen ? 9999 : 0,
      elevation: menuOpen || metaOpen ? 30 : 0,
      overflow: "visible",
      borderRadius: px(12),
      backgroundColor: "white",
      borderWidth: 1,
      borderColor: hover ? "rgba(148,163,184,0.35)" : "rgba(148,163,184,0.20)",
      padding: px(12),
      paddingTop: px(12),
      boxShadow: hover ? "0 10px 24px rgba(11,18,32,0.08)" : "0 10px 24px rgba(11,18,32,0.05)",
    }}
  >
    <Pressable
      onPress={() => {
        if (!menuOpen) onOpenDetail();
      }}
      onHoverIn={Platform.OS === "web" ? () => setHover(true) : undefined}
      onHoverOut={Platform.OS === "web" ? () => setHover(false) : undefined}
      style={{ display: "block" as any }}
    >
      {/* dots */}
      <View style={{ position: "absolute", top: px(8), right: px(8), zIndex: 10000 }}>
        <DotsMenu
          open={menuOpen}
          onOpen={() => setMenuOpen(true)}
          onClose={() => setMenuOpen(false)}
          px={px}
          fs={fs}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </View>

      {/* title */}
      <Text
        style={{
          fontSize: fs(13),
          fontWeight: "700",
          color: "#0F172A",
          paddingRight: px(34),
        }}
        numberOfLines={1}
      >
        {trip.name}
      </Text>

{/* bottom row */}
<View
  style={{
    marginTop: px(10),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: px(10),
  }}
>
  {/* LEFT: date + year */}
  <View style={{ flexDirection: "row", alignItems: "center", gap: px(8) }}>
    {hasSomeDate && (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: px(8),
          paddingHorizontal: px(10),
          height: px(28),
          borderRadius: 999,
          backgroundColor: "rgba(15,23,42,0.08)",
        }}
      >
        <Ionicons name="calendar-outline" size={px(14)} color="#475569" />
        <Text style={{ fontSize: fs(12), fontWeight: "700", color: "#0F172A" }}>
          {dateLabel}
        </Text>
      </View>
    )}

    {!!yearLabel && (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: px(10),
          height: px(28),
          borderRadius: 999,
          backgroundColor: "rgba(15,23,42,0.08)",
        }}
      >
        <Text style={{ fontSize: fs(12), fontWeight: "700", color: "#0F172A" }}>
          {yearLabel}
        </Text>
      </View>
    )}
  </View>

  {/* RIGHT: meta icons */}
  <View style={{ flexDirection: "row", alignItems: "center", gap: px(6) }}>
    {!!contLabel && (
      <HoverIcon
        icon="earth-outline"
        tooltip={contLabel}
        px={px}
        fs={fs}
        onOpenChange={setMetaOpen}
      />
    )}

    {trip.lane === "seen" && (trip.cost || 0) > 0 && (
      <HoverIcon
        icon="cash-outline"
        tooltip={`${formatEuro(trip.cost || 0)}`}
        px={px}
        fs={fs}
        onOpenChange={setMetaOpen}
      />
    )}

    <CountryHoverFlag
      code={trip.destination}
      px={px}
      fs={fs}
      onOpenChange={setMetaOpen}
    />
  </View>
</View>

    </Pressable>
  </Draggable>
  );
}

function DropZone({
  columnId,
  children,
  onDropTrip,
  onDragOver,
  onDragLeave,
  style,
  enabled,
}: {
  columnId: string;
  children: React.ReactNode;
  onDropTrip?: (tripId: number, columnId: string) => void;
  onDragOver?: (columnId: string) => void;
  onDragLeave?: () => void;
  style: any;
  enabled?: boolean;
}) {
  if (Platform.OS === "web") {
    // @ts-ignore
    return (
      <div
        onDragOver={(e) => {
          if (!enabled) return;
          e.preventDefault();
          onDragOver?.(columnId);
        }}
        onDragLeave={() => {
          if (!enabled) return;
          onDragLeave?.();
        }}
        onDrop={(e) => {
          if (!enabled) return;
          e.preventDefault();
          const raw = e.dataTransfer?.getData("text/plain");
          const tripId = Number(raw);
          if (Number.isFinite(tripId) && tripId > 0) onDropTrip?.(tripId, columnId);
          onDragLeave?.();
        }}
        style={style}
      >
        {children}
      </div>
    );
  }

  return <View style={style}>{children}</View>;
}

function Draggable({
  id,
  onDragStartTrip,
  onDragEndTrip,
  style,
  children,
}: {
  id: number;
  onDragStartTrip?: (tripId: number) => void;
  onDragEndTrip?: () => void;
  style: any;
  children: React.ReactNode;
}) {
  if (Platform.OS === "web") {
    // @ts-ignore
    return (
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer?.setData("text/plain", String(id));
          e.dataTransfer.effectAllowed = "move";
          onDragStartTrip?.(id);
        }}
        onDragEnd={() => {
          onDragEndTrip?.();
          onDragStartTrip?.(-1);
        }}
        style={{
          ...style,
          cursor: "grab",
          userSelect: "none",
        }}
      >
        {children}
      </div>
    );
  }

  return <Pressable style={style}>{children}</Pressable>;
}



/** Column — drop target for drag & drop (web) */
function KanbanColumnLikeShot({
  title,
  tone,
  columnId,
  count,
  subcount,
  children,
  loading,
  px,
  fs,
  onDropTrip,
  isDragOver,
  onDragOverColumn,
  onDragLeaveColumn,
  droppable,
}: {
  title: string;
tone: KanbanTone;
  columnId: string;
  count: number;
  subcount?: string;
  children: React.ReactNode;
  loading: boolean;
  px: (n: number) => number;
  fs: (n: number) => number;
  onDropTrip?: (tripId: number, columnId: string) => void;
  isDragOver?: boolean;
  onDragOverColumn?: (columnId: string) => void;
  onDragLeaveColumn?: () => void;
  droppable: boolean;
}) {
const headerPill = useMemo(() => {
  const icon =
    tone === "green"
      ? "checkmark-circle-outline"
      : tone === "blue"
      ? "radio-button-on-outline"
      : "time-outline";

  return <Pill label={title} tone={tone} leftIcon={icon} px={px} fs={fs} />;
}, [tone, title, px, fs]);

  return (
    <DropZone
      columnId={columnId}
      enabled={droppable}
      onDropTrip={onDropTrip}
      onDragOver={onDragOverColumn}
      onDragLeave={onDragLeaveColumn}
      style={{
        width: px(360),
        borderRadius: px(14),
        backgroundColor: "transparent",
        borderWidth: 1,
        borderColor: isDragOver ? "rgba(37,99,235,0.55)" : "transparent",
        padding: px(12),
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: px(10) }}>
<View style={{ flexDirection: "row", alignItems: "center", gap: px(10) }}>
  {headerPill}

<View>
  {!subcount ? (
    <Text style={{ fontSize: fs(12), fontWeight: "700", color: "#64748B" }}>
      {count}
    </Text>
  ) : (
    <Text style={{ fontSize: fs(11), fontWeight: "700", color: "#64748B" }}>
      {subcount}
    </Text>
  )}
</View>
</View>

        <TouchableOpacity
          activeOpacity={0.9}
          style={{
            width: px(30),
            height: px(30),
            borderRadius: px(10),
            alignItems: "center",
            justifyContent: "center",
            opacity: 0.6,
          }}
        >
          <Ionicons name="ellipsis-horizontal" size={px(18)} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      <View style={{ height: 1, backgroundColor: "rgba(148,163,184,0.16)", marginTop: px(10), marginBottom: px(10) }} />

      {loading ? (
        <View style={{ paddingVertical: px(20), alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{ gap: px(10), paddingBottom: px(2) }}
        >
          {children}
        </ScrollView>
      )}
    </DropZone>
  );
}

function BoardModeSelector({
  value,
  onChange,
  px,
  fs,
}: {
  value: "status" | "continent" | "year";
  onChange: (v: "status" | "continent" | "year") => void;
  px: (n: number) => number;
  fs: (n: number) => number;
}) {
  const Btn = ({
    id,
    label,
    icon,
  }: {
    id: "status" | "continent" | "year";
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }) => {
    const active = value === id;
    return (
      <Pressable
        onPress={() => onChange(id)}
        style={({ hovered, pressed }) => [
          {
            height: px(34),
            paddingHorizontal: px(12),
            borderRadius: px(12),
            flexDirection: "row",
            alignItems: "center",
            gap: px(8),
            backgroundColor: active ? "#0F172A" : "transparent",
            opacity: pressed ? 0.95 : 1,
          },
          Platform.OS === "web" && hovered && !active ? { backgroundColor: "rgba(15,23,42,0.06)" } : null,
        ]}
      >
        <Ionicons name={icon} size={px(16)} color={active ? "white" : "#475569"} />
        <Text style={{ fontSize: fs(12), fontWeight: "700", color: active ? "white" : "#0F172A" }}>
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: px(6),
        padding: px(4),
        borderRadius: px(14),
        backgroundColor: "white",
        borderWidth: 1,
        borderColor: "rgba(148,163,184,0.22)",
      }}
    >
      <Btn id="status" label="Estado" icon="albums-outline" />
      <Btn id="continent" label="Continente" icon="earth-outline" />
      <Btn id="year" label="Año" icon="calendar-outline" />
    </View>
  );
}


/** ===== Screen ===== */
export default function TripsBoardScreen({ navigation }: any) {
  const { px, fs, width } = useUiScale();
  const WIDE = width >= 1200;

  const [boardMode, setBoardMode] = useState<BoardMode>("status");

  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<TripUI[]>([]);
  const [q, setQ] = useState("");

  const [tripModalOpen, setTripModalOpen] = useState(false);
  const [editTrip, setEditTrip] = useState<TripEdit | null>(null);

  const [deleteBusy, setDeleteBusy] = useState<number | null>(null);

  const draggingIdRef = useRef<number | null>(null);
const [dragOverId, setDragOverId] = useState<string | null>(null);

  const [summary, setSummary] = useState<TripsSummaryDto | null>(null);
const [summaryLoading, setSummaryLoading] = useState(true);

const [continentStats, setContinentStats] = useState<ContinentsStatsDto | null>(null);
const [continentStatsLoading, setContinentStatsLoading] = useState(false);

const fetchContinentsStats = useCallback(async () => {
  try {
    setContinentStatsLoading(true);
    const res = await api.get("/trips/continents-stats");
    setContinentStats(res.data as ContinentsStatsDto);
  } catch (e) {
    console.error("❌ Error al obtener continents-stats:", e);
    setContinentStats(null);
  } finally {
    setContinentStatsLoading(false);
  }
}, []);

const continentStatsMap = useMemo(() => {
  const m = new Map<string, ContinentStat>();
  for (const row of continentStats ?? []) m.set(row.continent, row);
  return m;
}, [continentStats]);

const fetchSummary = useCallback(async () => {
  try {
    setSummaryLoading(true);
    const res = await api.get("/trips/summary");
    setSummary(res.data as TripsSummaryDto);
  } catch (e) {
    console.error("❌ Error al obtener summary:", e);
    setSummary(null);
  } finally {
    setSummaryLoading(false);
  }
}, []);

  const fetchTrips = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/trips");
      const data: TripListFromApi[] = res.data || [];

      const mapped: TripUI[] = data.map((t) => ({
        id: t.id,
        name: t.name,
        destination: t.destination || "",
        emoji: t.emoji || undefined,
        color: t.color || undefined,
        startDate: t.startDate ?? null,
        endDate: t.endDate ?? null,
        cost: typeof t.cost === "number" ? t.cost : 0,
        lane: (t.status as TripLane) || "wishlist",
        continent: t.continent ?? null,
        year: typeof t.year === "number" ? t.year : null,
      }));

      setTrips(mapped);
    } catch (e) {
      console.error("❌ Error al obtener viajes:", e);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchTrips();
      fetchSummary();
      fetchContinentsStats();
    }, [fetchTrips, fetchSummary, fetchContinentsStats])
  );

const uniqueCountries = new Set(
  trips
    .map((t) => (t.destination || "").trim().toUpperCase())
    .filter(Boolean)
);
const uniqueCount = uniqueCountries.size;


  const filteredTrips = useMemo(() => {
    const needle = norm(q);
    if (!needle) return trips;
    return trips.filter((t) => norm(`${t.name} ${t.destination}`).includes(needle));
  }, [trips, q]);

  const lanes = useMemo(() => {
    const seen = filteredTrips.filter((t) => t.lane === "seen");
    const planning = filteredTrips.filter((t) => t.lane === "planning");
    const wishlist = filteredTrips.filter((t) => t.lane === "wishlist");

    const planningSorted = [...planning].sort((a, b) => {
      const A = isValidISODate(a.startDate) ? new Date(a.startDate!).getTime() : Number.POSITIVE_INFINITY;
      const B = isValidISODate(b.startDate) ? new Date(b.startDate!).getTime() : Number.POSITIVE_INFINITY;
      return A - B;
    });

    const seenSorted = [...seen].sort((a, b) => {
      const A = isValidISODate(a.endDate) ? new Date(a.endDate!).getTime() : 0;
      const B = isValidISODate(b.endDate) ? new Date(b.endDate!).getTime() : 0;
      return B - A;
    });

    const wishlistSorted = [...wishlist].sort((a, b) => (a.name || "").localeCompare(b.name || "", "es"));

    return { seen: seenSorted, planning: planningSorted, wishlist: wishlistSorted };
  }, [filteredTrips]);

  const columns = useMemo<KanbanColumnModel[]>(() => {
if (boardMode === "status") {
  return [
    { id: "wishlist", title: "Por visitar", tone: "neutral", trips: lanes.wishlist, droppable: true, count: lanes.wishlist.length },
    { id: "planning", title: "Organizando", tone: "blue", trips: lanes.planning, droppable: true, count: lanes.planning.length },
    { id: "seen", title: "Vistos", tone: "green", trips: lanes.seen, droppable: true, count: lanes.seen.length },
  ];
}

  // continent / year: solo vistos
  const seenTrips = filteredTrips.filter((t) => t.lane === "seen");

if (boardMode === "continent") {
  const order = [
    "europe",
    "africa",
    "asia",
    "north_america",
    "south_america",
    "oceania",
  ];



  const groups = new Map<string, TripUI[]>();
  for (const t of seenTrips) {
    const key = (t.continent || "").toLowerCase().trim() || UNKNOWN_CONTINENT_ID;
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }

  // ✅ crea columnas para TODOS los continentes (aunque tengan 0)
  const cols = order.map((k) => {
    const trips = (groups.get(k) ?? []).slice().sort((a, b) => {
      const A = isValidISODate(a.endDate) ? new Date(a.endDate!).getTime() : 0;
      const B = isValidISODate(b.endDate) ? new Date(b.endDate!).getTime() : 0;
      return B - A;
    });

    const st = continentStatsMap.get(k);
const visited = st?.visitedCountries ?? uniqueCountryCount(trips);
const total = st?.totalCountries ?? 0;
const pct = st?.pct ?? (total > 0 ? Math.round((visited / total) * 100) : 0);

// ✅ lo que se verá como "31/52 · 67%"
const label = total > 0 ? `${visited}/${total} · ${pct}%` : `${visited}/—`;


    return {
      id: k,
      title: k === UNKNOWN_CONTINENT_ID ? "Sin continente" : continentLabel(k),
      tone: toneForContinent(k),
      trips,
      droppable: false,
  count: trips.length,        // o lo que quieras como número principal
  subcount: label,            // ✅ "31/52 · 67%"

    };
  });

  // ✅ ordena de más a menos por cantidad, y deja "Sin continente" al final
  cols.sort((a, b) => {
    if (a.id === UNKNOWN_CONTINENT_ID) return 1;
    if (b.id === UNKNOWN_CONTINENT_ID) return -1;
    return b.trips.length - a.trips.length;
  });

  return cols;
}

  // boardMode === "year"
  const groups = new Map<string, TripUI[]>();
  for (const t of seenTrips) {
    const y =
      typeof t.year === "number"
        ? t.year
        : isValidISODate(t.startDate)
        ? new Date(t.startDate!).getFullYear()
        : null;

    const key = y != null ? String(y) : UNKNOWN_YEAR_ID;
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }

  const years = Array.from(groups.keys())
    .filter((k) => k !== UNKNOWN_YEAR_ID)
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => b - a); // DESC

  const orderedKeys = [...years.map(String), ...(groups.has(UNKNOWN_YEAR_ID) ? [UNKNOWN_YEAR_ID] : [])];

return orderedKeys.map((k, idx) => {
  const trips = (groups.get(k) ?? []).slice().sort((a, b) => {
    const A = isValidISODate(a.endDate) ? new Date(a.endDate!).getTime() : 0;
    const B = isValidISODate(b.endDate) ? new Date(b.endDate!).getTime() : 0;
    return B - A;
  });

  return {
    id: k,
    title: k === UNKNOWN_YEAR_ID ? "Sin año" : k,
    tone: toneForYear(k, idx),
    trips,
    droppable: false,
    count: trips.length, // ✅ viajes
  };
});
}, [boardMode, lanes, filteredTrips, continentStatsMap]);


  const openEditTrip = useCallback(
    async (tripId: number) => {
      try {
        const res = await api.get(`/trips/${tripId}`);
        const t = res.data;
        setEditTrip(t as TripEdit);
        setTripModalOpen(true);
      } catch (e) {
        console.error("❌ Error al cargar viaje para editar:", e);
        const local = trips.find((x) => x.id === tripId);
        if (local) {
          setEditTrip({
            id: local.id,
            name: local.name,
            destination: local.destination,
            emoji: local.emoji ?? null,
            color: local.color ?? null,
            startDate: local.startDate,
            endDate: local.endDate,
            cost: local.cost,
            continent: local.continent ?? null,
            year: local.year ?? null,
            status: local.lane,
          } as any);
          setTripModalOpen(true);
        }
      }
    },
    [trips]
  );

  const deleteTrip = useCallback(
    async (tripId: number) => {
      try {
        setDeleteBusy(tripId);
        await api.delete(`/trips/${tripId}`);
        await fetchTrips();
      } catch (e) {
        console.error("❌ Error al eliminar viaje:", e);
      } finally {
        setDeleteBusy(null);
      }
    },
    [fetchTrips]
  );

  const updateTripStatus = useCallback(
    async (tripId: number, toLane: TripLane) => {
      setTrips((prev) => prev.map((t) => (t.id === tripId ? { ...t, lane: toLane } : t)));
      try {
        await api.patch(`/trips/${tripId}`, { status: toLane });
      } catch (e) {
        console.error("❌ Error actualizando status:", e);
        fetchTrips();
      }
    },
    [fetchTrips]
  );

  const handleDragStartTrip = useCallback((tripId: number) => {
    draggingIdRef.current = tripId > 0 ? tripId : null;
  }, []);

const handleDropTrip = useCallback(
  (tripId: number, columnId: string) => {
    if (boardMode !== "status") return;

    const toLane = columnId as TripLane;
    const current = trips.find((t) => t.id === tripId);
    if (!current) return;
    if (current.lane === toLane) return;
    updateTripStatus(tripId, toLane);
  },
  [boardMode, trips, updateTripStatus]
);

useEffect(() => {
  setDragOverId(null);
  draggingIdRef.current = null;
}, [boardMode]);


  return (
  <SafeAreaView style={{ flex: 1, backgroundColor: "#F6F8FC" }}>
    <View
      style={{
        flex: 1,
        paddingHorizontal: px(22),
        paddingTop: px(18),
        paddingBottom: px(18),
        maxWidth: px(1440),
        width: "100%",
        alignSelf: "center",
      }}
    >
        {/* ===== Title + KPIs ===== */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: px(14),
            marginBottom: px(14),
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={[textStyles.h1, { fontSize: fs(22), fontWeight: "700", color: "#0F172A" }]}>Viajes</Text>
            <Text style={[textStyles.bodyMuted, { marginTop: px(4), fontSize: fs(12), color: "#64748B", fontWeight: "700" }]}>
              Organiza y gestiona todos tus viajes en un solo lugar.
            </Text>
          </View>
        </View>

<View style={{ flexDirection: "row", flexWrap: "wrap", gap: px(14) }}>
  {/* KPI destacado */}
  <KpiCard
    title="PRÓXIMO VIAJE"
    value={summaryLoading ? "—" : (summary?.daysToNextTrip ?? null) === null ? "—" : `${summary!.daysToNextTrip} días`}
    icon="calendar-number-outline"
    tone="info"
    variant="premium"
    subtitle={
      <Text style={[textStyles.caption, { fontSize: fs(12), color: "#94A3B8" }]} numberOfLines={1}>
        {summaryLoading ? "—" : (summary?.daysToNextTrip ?? null) === null ? "Sin viajes próximos" : `${summary?.nextTrip.name}`}
      </Text>
    }
    px={px}
    fs={fs}
  />

  <KpiCard
    title="PAÍSES VISITADOS"
    value={summaryLoading ? "—" : `${summary?.visitedCountries ?? 0}`}
    icon="checkmark-circle-outline"
    tone="success"
    px={px}
    fs={fs}
  />

  <KpiCard
    title="PENDIENTES"
    value={summaryLoading ? "—" : `${summary?.pendingCountries ?? 0}`}
    icon="time-outline"
    tone="neutral"
    px={px}
    fs={fs}
  />

  <KpiCard
    title="% VISITADOS"
    value={summaryLoading ? "—" : `${summary?.visitedPct ?? 0}%`}
    icon="pie-chart-outline"
    tone="danger"
    px={px}
    fs={fs}
  />
</View>

        {/* ===== Toolbar ===== */}
        <View
          style={{
            marginTop: px(14),
            flexDirection: WIDE ? "row" : "column",
            alignItems: WIDE ? "center" : "stretch",
            justifyContent: "space-between",
            gap: px(10),
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: px(10), flex: 1 }}>
            <BoardSearchBar q={q} setQ={setQ} px={px} fs={fs} />

            <View style={{ flexDirection: "row", alignItems: "center", gap: px(10) }}>
              <Pressable
                style={{
                  height: px(36),
                  paddingHorizontal: px(12),
                  borderRadius: px(14),
                  backgroundColor: "white",
                  borderWidth: 1,
                  borderColor: "rgba(148,163,184,0.22)",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: px(8),
                }}
              >
                <Ionicons name="funnel-outline" size={px(16)} color="#475569" />
                <Text style={{ fontSize: fs(12), fontWeight: "700", color: "#0F172A" }}>Filtres</Text>
                <View
                  style={{
                    width: px(22),
                    height: px(22),
                    borderRadius: px(10),
                    backgroundColor: "rgba(15,23,42,0.06)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: fs(12), fontWeight: "900", color: "#0F172A" }}>+</Text>
                </View>
              </Pressable>
<BoardModeSelector value={boardMode} onChange={setBoardMode} px={px} fs={fs} />

            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: px(10), justifyContent: "flex-end" }}>
            <IconButton icon="refresh-outline" onPress={fetchTrips} px={px} />

            <PrimaryButton
              label="Afegir viatge"
              onPress={() => {
                setEditTrip(null);
                setTripModalOpen(true);
              }}
              px={px}
              fs={fs}
            />
          </View>
        </View>

        {/* ===== Kanban ===== */}
        <View style={{ marginTop: px(14), flex: 1 }}>
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    style={{ flex: 1 }}
    contentContainerStyle={{ gap: px(14), paddingBottom: px(6) }}
  >
{columns.map((col) => (
  <KanbanColumnLikeShot
    key={col.id}
    title={col.title}
    tone={col.tone}
    columnId={col.id}
    count={col.count}
    subcount={col.subcount}
    loading={loading}
    px={px}
    fs={fs}
    droppable={col.droppable}
    onDropTrip={handleDropTrip}
    isDragOver={dragOverId === col.id}
    onDragOverColumn={(id) => setDragOverId(id)}
    onDragLeaveColumn={() => setDragOverId(null)}
  >
    {col.trips.length === 0 ? (
      <View style={{ borderRadius: px(12), backgroundColor: "rgba(15,23,42,0.04)", padding: px(12) }}>
        <Text style={{ fontSize: fs(12), fontWeight: "700", color: "#94A3B8" }}>No hay viajes aquí.</Text>
      </View>
    ) : (
      col.trips.map((trip) => (
        <TripKanbanCard
          key={trip.id}
          trip={trip}
          px={px}
          fs={fs}
          onOpenDetail={() => navigation.navigate("TripDetailDesktop", { tripId: trip.id })}
          onEdit={() => openEditTrip(trip.id)}
          onDelete={() => deleteTrip(trip.id)}
          onDragStartTrip={boardMode === "status" ? handleDragStartTrip : undefined}
        />
      ))
    )}
  </KanbanColumnLikeShot>
))}
          </ScrollView>

          {!!deleteBusy && (
            <Text style={{ marginTop: px(10), fontSize: fs(12), fontWeight: "700", color: "#94A3B8" }}>
              Eliminando viaje…
            </Text>
          )}
        </View>
      </View>

      <DesktopTripModal
        visible={tripModalOpen}
        editTrip={editTrip}
        onClose={() => setTripModalOpen(false)}
        onSaved={() => fetchTrips()}
      />
    </SafeAreaView>
  );
}
