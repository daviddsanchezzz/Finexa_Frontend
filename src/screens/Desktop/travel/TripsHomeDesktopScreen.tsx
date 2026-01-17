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
  if (v === "america" || v === "north_america") return "América";
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
  tone?: "neutral" | "blue" | "green" | "red";
  px: (n: number) => number;
  fs: (n: number) => number;
  leftIcon?: keyof typeof Ionicons.glyphMap;
}) {
  const map = {
    neutral: { bg: "rgba(15,23,42,0.06)", fg: "#0F172A" },
    blue: { bg: "rgba(37,99,235,0.10)", fg: "#2563EB" },
    green: { bg: "rgba(16,185,129,0.12)", fg: "#059669" },
    red: { bg: "rgba(239,68,68,0.12)", fg: "#DC2626" },
  } as const;

  const c = map[tone];
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
        {/* date pill (only if some date exists) */}
        
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
            <Text style={{ fontSize: fs(12), fontWeight: "700", color: "#0F172A" }}>{dateLabel}</Text>
          </View>
        

        <View style={{ flexDirection: "row", alignItems: "center", gap: px(6) }}>
          {!!contLabel && (
            <HoverIcon icon="earth-outline" tooltip={contLabel} px={px} fs={fs} onOpenChange={setMetaOpen} />
          )}

          {!!yearLabel && (
            <HoverIcon icon="calendar-clear-outline" tooltip={`${yearLabel}`} px={px} fs={fs} onOpenChange={setMetaOpen} />
          )}

          {trip.lane === "seen" && (trip.cost || 0) > 0 && (
            <HoverIcon icon="cash-outline" tooltip={`${formatEuro(trip.cost || 0)}`} px={px} fs={fs} onOpenChange={setMetaOpen} />
          )}

          <CountryHoverFlag code={trip.destination} px={px} fs={fs} onOpenChange={setMetaOpen} />
        </View>
      </View>
    </Pressable>
  </Draggable>
  );
}

function DropZone({
  lane,
  children,
  onDropTrip,
  onDragOverLane,
  onDragLeaveLane,
  style,
}: {
  lane: TripLane;
  children: React.ReactNode;
  onDropTrip: (tripId: number, lane: TripLane) => void;
  onDragOverLane: (lane: TripLane) => void;
  onDragLeaveLane: () => void;
  style: any;
}) {
  if (Platform.OS === "web") {
    // @ts-ignore
    return (
      <div
        onDragOver={(e) => {
          e.preventDefault();
          onDragOverLane(lane);
        }}
        onDragLeave={() => onDragLeaveLane()}
        onDrop={(e) => {
          e.preventDefault();
          const raw = e.dataTransfer?.getData("text/plain");
          const tripId = Number(raw);
          if (Number.isFinite(tripId) && tripId > 0) onDropTrip(tripId, lane);
          onDragLeaveLane();
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
  lane,
  count,
  children,
  loading,
  px,
  fs,
  onDropTrip,
  isDragOver,
  onDragOverLane,
  onDragLeaveLane,
}: {
  title: string;
  tone: "neutral" | "blue" | "green";
  lane: TripLane;
  count: number;
  children: React.ReactNode;
  loading: boolean;
  px: (n: number) => number;
  fs: (n: number) => number;
  onDropTrip?: (tripId: number, lane: TripLane) => void;
  isDragOver?: boolean;
  onDragOverLane?: (lane: TripLane) => void;
  onDragLeaveLane?: (lane: TripLane) => void;
}) {
  const headerPill = useMemo(() => {
    if (tone === "blue") return <Pill label={title} tone="blue" leftIcon="radio-button-on-outline" px={px} fs={fs} />;
    if (tone === "green") return <Pill label={title} tone="green" leftIcon="checkmark-circle-outline" px={px} fs={fs} />;
    return <Pill label={title} tone="neutral" leftIcon="time-outline" px={px} fs={fs} />;
  }, [tone, title, px, fs]);

return (
  <DropZone
    lane={lane}
    onDropTrip={onDropTrip!}
    onDragOverLane={(l) => onDragOverLane?.(l)}
    onDragLeaveLane={() => onDragLeaveLane?.(lane)}
    style={{
      width: px(360),
      borderRadius: px(14),
      backgroundColor: "rgba(255,255,255,0.60)",
      borderWidth: 1,
      borderColor: isDragOver ? "rgba(37,99,235,0.55)" : "rgba(148,163,184,0.18)",
      padding: px(12),
    }}
  >
      {/* header row */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: px(10) }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: px(10) }}>
          {headerPill}
          <Text style={{ fontSize: fs(12), fontWeight: "700", color: "#64748B" }}>{count}</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          style={{
            width: px(30),
            height: px(30),
            borderRadius: px(10),
            alignItems: "center",
            justifyContent: "center",
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
        <View style={{ gap: px(10) }}>{children}</View>
      )}
    </DropZone>
  );
}

/** ===== Screen ===== */
export default function TripsBoardScreen({ navigation }: any) {
  const { px, fs, width } = useUiScale();
  const WIDE = width >= 1200;

  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<TripUI[]>([]);
  const [q, setQ] = useState("");

  const [tripModalOpen, setTripModalOpen] = useState(false);
  const [editTrip, setEditTrip] = useState<TripEdit | null>(null);

  const [deleteBusy, setDeleteBusy] = useState<number | null>(null);

  const draggingIdRef = useRef<number | null>(null);
  const [dragOverLane, setDragOverLane] = useState<TripLane | null>(null);

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
    }, [fetchTrips])
  );

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

  const summary = useMemo(() => {
    const totalCost = filteredTrips.reduce((s, t) => s + (t.cost || 0), 0);
    const seenCount = filteredTrips.filter((t) => t.lane === "seen").length;
    const planningCount = filteredTrips.filter((t) => t.lane === "planning").length;
    const wishlistCount = filteredTrips.filter((t) => t.lane === "wishlist").length;

    return { totalCost, seenCount, planningCount, wishlistCount, totalCount: filteredTrips.length };
  }, [filteredTrips]);

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
    (tripId: number, toLane: TripLane) => {
      const current = trips.find((t) => t.id === tripId);
      if (!current) return;
      if (current.lane === toLane) return;
      updateTripStatus(tripId, toLane);
    },
    [trips, updateTripStatus]
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F6F8FC" }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: px(22),
          paddingTop: px(18),
          paddingBottom: px(90),
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
          <KpiCard
            title="TOTAL GASTADO"
            value={loading ? "—" : formatEuro(summary.totalCost)}
            icon="cash-outline"
            tone="info"
            variant="premium"
            subtitle={
              <Text style={[textStyles.caption, { fontSize: fs(12), color: "#94A3B8" }]} numberOfLines={1}>
                En {summary.totalCount} viajes
              </Text>
            }
            px={px}
            fs={fs}
          />

          <KpiCard title="ORGANIZANDO" value={loading ? "—" : `${summary.planningCount}`} icon="calendar-outline" tone="success" px={px} fs={fs} />

          <KpiCard title="POR VISITAR" value={loading ? "—" : `${summary.wishlistCount}`} icon="bookmark-outline" tone="neutral" px={px} fs={fs} />

          <KpiCard title="VISTOS" value={loading ? "—" : `${summary.seenCount}`} icon="checkmark-done-outline" tone="danger" px={px} fs={fs} />
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

              <View
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
                <Ionicons name="person-circle-outline" size={px(18)} color="#0F172A" />
                <Text style={{ fontSize: fs(12), fontWeight: "700", color: "#0F172A" }}>Mis viajes</Text>
              </View>
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
        <View style={{ marginTop: px(14) }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: px(14), paddingBottom: px(6) }}>
            <KanbanColumnLikeShot
              title="Por visitar"
              tone="neutral"
              lane="wishlist"
              count={lanes.wishlist.length}
              loading={loading}
              px={px}
              fs={fs}
              onDropTrip={handleDropTrip}
              isDragOver={dragOverLane === "wishlist"}
              onDragOverLane={(l) => setDragOverLane(l)}
              onDragLeaveLane={() => setDragOverLane(null)}
            >
              {lanes.wishlist.length === 0 ? (
                <View style={{ borderRadius: px(12), backgroundColor: "rgba(15,23,42,0.04)", padding: px(12) }}>
                  <Text style={{ fontSize: fs(12), fontWeight: "900", color: "#94A3B8" }}>No hay viajes aquí.</Text>
                </View>
              ) : (
                lanes.wishlist.map((trip) => (
                  <TripKanbanCard
                    key={trip.id}
                    trip={trip}
                    px={px}
                    fs={fs}
                    onOpenDetail={() => navigation.navigate("TripDetailDesktop", { tripId: trip.id })}
                    onEdit={() => openEditTrip(trip.id)}
                    onDelete={() => deleteTrip(trip.id)}
                    onDragStartTrip={handleDragStartTrip}
                  />
                ))
              )}
            </KanbanColumnLikeShot>

            <KanbanColumnLikeShot
              title="Organizando"
              tone="blue"
              lane="planning"
              count={lanes.planning.length}
              loading={loading}
              px={px}
              fs={fs}
              onDropTrip={handleDropTrip}
              isDragOver={dragOverLane === "planning"}
              onDragOverLane={(l) => setDragOverLane(l)}
              onDragLeaveLane={() => setDragOverLane(null)}
            >
              {lanes.planning.length === 0 ? (
                <View style={{ borderRadius: px(12), backgroundColor: "rgba(15,23,42,0.04)", padding: px(12) }}>
                  <Text style={{ fontSize: fs(12), fontWeight: "700", color: "#94A3B8" }}>No hay viajes aquí.</Text>
                </View>
              ) : (
                lanes.planning.map((trip) => (
                  <TripKanbanCard
                    key={trip.id}
                    trip={trip}
                    px={px}
                    fs={fs}
                    onOpenDetail={() => navigation.navigate("TripDetail", { tripId: trip.id })}
                    onEdit={() => openEditTrip(trip.id)}
                    onDelete={() => deleteTrip(trip.id)}
                    onDragStartTrip={handleDragStartTrip}
                  />
                ))
              )}
            </KanbanColumnLikeShot>

            <KanbanColumnLikeShot
              title="Vistos"
              tone="green"
              lane="seen"
              count={lanes.seen.length}
              loading={loading}
              px={px}
              fs={fs}
              onDropTrip={handleDropTrip}
              isDragOver={dragOverLane === "seen"}
              onDragOverLane={(l) => setDragOverLane(l)}
              onDragLeaveLane={() => setDragOverLane(null)}
            >
              {lanes.seen.length === 0 ? (
                <View style={{ borderRadius: px(12), backgroundColor: "rgba(15,23,42,0.04)", padding: px(12) }}>
                  <Text style={{ fontSize: fs(12), fontWeight: "700", color: "#94A3B8" }}>No hay viajes aquí.</Text>
                </View>
              ) : (
                lanes.seen.map((trip) => (
                  <TripKanbanCard
                    key={trip.id}
                    trip={trip}
                    px={px}
                    fs={fs}
                    onOpenDetail={() => navigation.navigate("TripDetail", { tripId: trip.id })}
                    onEdit={() => openEditTrip(trip.id)}
                    onDelete={() => deleteTrip(trip.id)}
                    onDragStartTrip={handleDragStartTrip}
                  />
                ))
              )}
            </KanbanColumnLikeShot>
          </ScrollView>

          {!!deleteBusy && (
            <Text style={{ marginTop: px(10), fontSize: fs(12), fontWeight: "700", color: "#94A3B8" }}>
              Eliminando viaje…
            </Text>
          )}
        </View>
      </ScrollView>

      <DesktopTripModal
        visible={tripModalOpen}
        editTrip={editTrip}
        onClose={() => setTripModalOpen(false)}
        onSaved={() => fetchTrips()}
      />
    </SafeAreaView>
  );
}
