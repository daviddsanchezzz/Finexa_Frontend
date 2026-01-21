import React, { useMemo, useRef, useState } from "react";
import { View, Text, Pressable, Platform, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/theme";
import { UI } from "./ui";
import { textStyles } from "../../theme/typography";

/** ===== helpers ===== */
function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function toISODateKey(input?: string | null) {
  if (!input) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function fmtDateLabel(isoDate: string) {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  const weekday = d.toLocaleDateString("es-ES", { weekday: "short" });
  const dd = d.toLocaleDateString("es-ES", { day: "2-digit" });
  const mon = d.toLocaleDateString("es-ES", { month: "short" });
  return `${weekday.toUpperCase()} ${dd} ${mon}`;
}
function fmtTime(iso?: string | null) {
  if (!iso) return "";
  if (/^\d{2}:\d{2}$/.test(iso)) return iso;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function normalizeCost(x: any): number | null {
  if (x == null) return null;
  if (typeof x === "number") return Number.isFinite(x) ? x : null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}
function formatMoney(n: number, currency?: string | null) {
  const cur = currency || "EUR";
  try {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: cur }).format(n);
  } catch {
    return `${n.toFixed(2)} ${cur}`;
  }
}
function minutesBetween(a?: string | null, b?: string | null) {
  if (!a || !b) return null;
  const da = new Date(a);
  const db = new Date(b);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return null;
  const m = Math.round((db.getTime() - da.getTime()) / 60000);
  return Number.isFinite(m) ? m : null;
}
function fmtDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h ${pad2(m)}m`;
}

/**
 * Icono/badge/subtitle:
 * - flight: usa flightDetails
 * - transport_destination: usa destinationTransport
 * - transport_local: usa localTransport (si existe) o fallback genérico
 */
function iconForTransport(it: any): keyof typeof Ionicons.glyphMap {
  if (it.type === "flight") return "airplane-outline";

  if (it.type === "transport_destination") {
    const m = it?.destinationTransport?.mode;
    if (m === "train") return "train-outline";
    if (m === "bus") return "bus-outline";
    if (m === "car") return "car-outline";
    if (m === "flight") return "airplane-outline";
    return "swap-horizontal-outline";
  }

  if (it.type === "transport_local") {
    const m = it?.localTransport?.mode || it?.transportLocal?.mode || it?.mode; // tolerante
    if (m === "metro" || m === "subway") return "subway-outline";
    if (m === "tram") return "trail-sign-outline";
    if (m === "bus") return "bus-outline";
    if (m === "train") return "train-outline";
    if (m === "taxi" || m === "uber") return "car-outline";
    if (m === "walk") return "walk-outline";
    return "bus-outline";
  }

  return "swap-horizontal-outline";
}

function badgeForTransport(it: any) {
  if (it.type === "flight") return "VUELO";
  if (it.type === "transport_destination") return String(it?.destinationTransport?.mode || "transporte").toUpperCase();
  if (it.type === "transport_local") return String(it?.localTransport?.mode || "local").toUpperCase();
  return "TRANSPORTE";
}

function subtitleForTransport(it: any) {
  if (it.type === "transport_destination") {
    const td = it.destinationTransport;
    const route =
      (td?.fromName || "") && (td?.toName || "") ? `${td.fromName} → ${td.toName}` : "";
    return route || td?.company || "";
  }

  if (it.type === "transport_local") {
    const lt = it.localTransport || it.transportLocal || {};
    const route =
      (lt?.fromName || "") && (lt?.toName || "") ? `${lt.fromName} → ${lt.toName}` : "";
    return route || lt?.company || lt?.line || "";
  }

  return "";
}

/** ===== UI atoms ===== */
function SectionHeader({
  icon,
  title,
  px,
  fs,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  px: (n: number) => number;
  fs: (n: number) => number;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: px(10) }}>
      <Ionicons name={icon} size={px(18)} color={UI.muted2} />
      <Text style={{ fontSize: fs(16), fontWeight: "700", color: UI.text }}>{title}</Text>
    </View>
  );
}

function Pill({
  label,
  px,
  fs,
}: {
  label: string;
  px: (n: number) => number;
  fs: (n: number) => number;
}) {
  return (
    <View
      style={{
        paddingHorizontal: px(8),
        paddingVertical: px(4),
        borderRadius: 999,
        backgroundColor: "rgba(148,163,184,0.18)",
        borderWidth: 1,
        borderColor: "rgba(148,163,184,0.22)",
      }}
    >
      <Text style={{ fontSize: fs(10), fontWeight: "700", color: UI.muted2 }}>{label}</Text>
    </View>
  );
}

function KebabMenu({
  px,
  fs,
  onEdit,
  onDelete,
}: {
  px: (n: number) => number;
  fs: (n: number) => number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const anchorRef = useRef<View>(null);

  const openMenu = () => {
    if (Platform.OS === "web") {
      anchorRef.current?.measureInWindow?.((x, y, w, h) => {
        setPos({ x, y, w, h });
        setOpen(true);
      });
    } else {
      setPos({ x: 0, y: 0, w: 0, h: 0 });
      setOpen(true);
    }
  };

  const closeMenu = () => setOpen(false);

  return (
    <View ref={anchorRef} collapsable={false} style={{ position: "relative" }}>
      {/* Botón 3 puntos SUTIL (sin fondo) */}
      <Pressable
        onPress={(e: any) => {
          e?.stopPropagation?.();
          openMenu();
        }}
        style={({ pressed, hovered }) => [
          {
            width: px(28),
            height: px(28),
            borderRadius: px(10),
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.55 : 0.85, // sutil
          },
          Platform.OS === "web" && hovered ? { opacity: 1 } : null,
        ]}
        hitSlop={10}
      >
        <Ionicons name="ellipsis-horizontal" size={px(16)} color={UI.muted2} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={closeMenu}>
        {/* backdrop */}
        <Pressable
          onPress={(e: any) => {
            e?.stopPropagation?.();
            closeMenu();
          }}
          style={{ flex: 1, backgroundColor: "transparent" }}
        >
          {/* Popover */}
          <View
            pointerEvents="box-none"
            style={{
              position: "absolute",
              ...(Platform.OS === "web" && pos
                ? ({
                    left: pos.x + pos.w - px(140),
                    top: pos.y + pos.h + px(8),
                  } as any)
                : ({
                    right: px(22),
                    top: px(120),
                  } as any)),
              width: px(140),
              borderRadius: px(14),
              backgroundColor: "white",
              borderWidth: 1,
              borderColor: "rgba(226,232,240,0.95)",
              shadowColor: "#000",
              shadowOpacity: 0.12,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 12 },
              overflow: "hidden",
              zIndex: 999999,
              elevation: 30,
            }}
          >
            <Pressable
              onPress={(e: any) => {
                e?.stopPropagation?.();
                closeMenu();
                onEdit();
              }}
              style={({ pressed, hovered }) => [
                {
                  paddingVertical: px(10),
                  paddingHorizontal: px(12),
                  opacity: pressed ? 0.9 : 1,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: px(8),
                },
                Platform.OS === "web" && hovered ? { backgroundColor: "rgba(241,245,249,1)" } : null,
              ]}
            >
              <Ionicons name="create-outline" size={px(16)} color={UI.text} />
              <Text style={{ fontSize: fs(13), fontWeight: "600", color: UI.text }}>Editar</Text>
            </Pressable>

            <View style={{ height: 1, backgroundColor: "rgba(226,232,240,0.9)" }} />

            <Pressable
              onPress={(e: any) => {
                e?.stopPropagation?.();
                closeMenu();
                onDelete();
              }}
              style={({ pressed, hovered }) => [
                {
                  paddingVertical: px(10),
                  paddingHorizontal: px(12),
                  opacity: pressed ? 0.9 : 1,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: px(8),
                },
                Platform.OS === "web" && hovered ? { backgroundColor: "rgba(254,242,242,1)" } : null,
              ]}
            >
              <Ionicons name="trash-outline" size={px(16)} color={"rgba(239,68,68,1)"} />
              <Text style={{ fontSize: fs(13), fontWeight: "600", color: "rgba(239,68,68,1)" }}>
                Eliminar
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}


/** ===== Flight hero card (estilo “boarding pass”) ===== */
function FlightHeroCard({
  flight,
  px,
  fs,
  onPress,
}: {
  flight: any;
  px: (n: number) => number;
  fs: (n: number) => number;
  onPress: () => void;
}) {
  const fd = flight?.flightDetails || {};
  const from = String(fd?.fromIata || "—").toUpperCase();
  const to = String(fd?.toIata || "—").toUpperCase();

  const start = flight.startAt ?? flight.startTime ?? null;
  const end = flight.endAt ?? flight.endTime ?? null;

  const dayKey = toISODateKey(flight.day ?? flight.date ?? start);
  const dateLabel = dayKey ? fmtDateLabel(dayKey) : "";

  const t1 = fmtTime(start);
  const t2 = fmtTime(end);

  const durMin = minutesBetween(start, end);
  const durLabel = durMin != null && durMin > 0 ? fmtDuration(durMin) : "";

  const airline = fd?.airlineName ? String(fd.airlineName) : "";
  const num = fd?.flightNumberRaw || fd?.flightNumberIata || "";
  const code = [airline, num].filter(Boolean).join(" • ");

  const fromName = fd?.fromName || fd?.fromAirportName || "";
  const toName = fd?.toName || fd?.toAirportName || "";
  const fromTerminal = fd?.depTerminal ? `T${fd.depTerminal}` : "";
  const toTerminal = fd?.arrTerminal ? `T${fd.arrTerminal}` : "";

  return (
    <Pressable
      onPress={onPress}
      style={({ hovered, pressed }) => [
        {
          borderRadius: px(22),
          overflow: "hidden",
          backgroundColor: "#0B1220",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.08)",
          opacity: pressed ? 0.98 : 1,
          shadowColor: "#000",
          shadowOpacity: 0.12,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
        },
        Platform.OS === "web" && hovered ? { transform: [{ translateY: -1 }] } : null,
      ]}
    >
      {/* Top */}
      <View style={{ padding: px(18) }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: px(14) }}>
          {/* From */}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: fs(10), fontWeight: "700", color: "rgba(148,163,184,0.9)" }}>
              SALIDA
            </Text>
            <Text style={{ fontSize: fs(38), fontWeight: "700", color: "white", letterSpacing: 1 }}>
              {from}
            </Text>
            <Text
              style={{
                marginTop: px(2),
                fontSize: fs(12),
                fontWeight: "600",
                color: "rgba(226,232,240,0.75)",
              }}
            >
              {fromName}
              {fromTerminal ? `, ${fromTerminal}` : ""}
            </Text>
            <Text style={{ marginTop: px(10), fontSize: fs(18), fontWeight: "700", color: "white" }}>
              {t1 || "—"}
            </Text>
            {!!dateLabel && (
              <Text
                style={{
                  marginTop: px(2),
                  fontSize: fs(11),
                  fontWeight: "600",
                  color: "rgba(148,163,184,0.9)",
                }}
              >
                {dateLabel}
              </Text>
            )}
          </View>

          {/* Middle */}
          <View style={{ alignItems: "center", gap: px(8) }}>
            {!!durLabel && (
              <Text style={{ fontSize: fs(12), fontWeight: "700", color: "rgba(59,130,246,0.95)" }}>
                Duración: {durLabel}
              </Text>
            )}
            <View style={{ flexDirection: "row", alignItems: "center", gap: px(10), width: px(180) }}>
              <View style={{ height: 1, flex: 1, backgroundColor: "rgba(255,255,255,0.16)" }} />
              <Ionicons name="airplane" size={px(18)} color="rgba(59,130,246,0.95)" />
              <View style={{ height: 1, flex: 1, backgroundColor: "rgba(255,255,255,0.16)" }} />
            </View>
            {!!code && (
              <View
                style={{
                  paddingHorizontal: px(10),
                  paddingVertical: px(6),
                  borderRadius: 999,
                  backgroundColor: "rgba(255,255,255,0.08)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.10)",
                }}
              >
                <Text style={{ fontSize: fs(11), fontWeight: "600", color: "rgba(226,232,240,0.95)" }}>
                  {code}
                </Text>
              </View>
            )}
          </View>

          {/* To */}
          <View style={{ flex: 1, minWidth: 0, alignItems: "flex-end" }}>
            <Text style={{ fontSize: fs(10), fontWeight: "700", color: "rgba(148,163,184,0.9)" }}>
              LLEGADA
            </Text>
            <Text style={{ fontSize: fs(38), fontWeight: "700", color: "white", letterSpacing: 1 }}>
              {to}
            </Text>
            <Text
              style={{
                marginTop: px(2),
                fontSize: fs(12),
                fontWeight: "600",
                color: "rgba(226,232,240,0.75)",
              }}
            >
              {toName}
              {toTerminal ? `, ${toTerminal}` : ""}
            </Text>
            <Text style={{ marginTop: px(10), fontSize: fs(18), fontWeight: "700", color: "white" }}>
              {t2 || "—"}
            </Text>
            {!!dateLabel && (
              <Text style={{ marginTop: px(2), fontSize: fs(11), fontWeight: "700", color: "rgba(148,163,184,0.9)" }}>
                {dateLabel}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Bottom strip */}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: "rgba(255,255,255,0.08)",
          backgroundColor: "rgba(255,255,255,0.04)",
          paddingHorizontal: px(18),
          paddingVertical: px(12),
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: px(12),
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: px(18), flexWrap: "wrap" }}>
          {!!(fromTerminal || toTerminal) && (
            <View>
              <Text style={{ fontSize: fs(10), fontWeight: "700", color: "rgba(148,163,184,0.9)" }}>TERMINAL</Text>
              <Text style={{ fontSize: fs(12), fontWeight: "700", color: "white" }}>
                {fromTerminal || "—"} → {toTerminal || "—"}
              </Text>
            </View>
          )}
          {!!fd?.seat && (
            <View>
              <Text style={{ fontSize: fs(9), fontWeight: "700", color: "rgba(148,163,184,0.9)" }}>ASIENTO</Text>
              <Text style={{ fontSize: fs(12), fontWeight: "700", color: "white" }}>{String(fd.seat)}</Text>
            </View>
          )}
          {!!fd?.gate && (
            <View>
              <Text style={{ fontSize: fs(9), fontWeight: "700", color: "rgba(148,163,184,0.9)" }}>PUERTA</Text>
              <Text style={{ fontSize: fs(12), fontWeight: "700", color: "white" }}>{String(fd.gate)}</Text>
            </View>
          )}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: px(10) }}>
          <View
            style={{
              paddingHorizontal: px(12),
              paddingVertical: px(10),
              borderRadius: px(12),
              backgroundColor: "rgba(59,130,246,0.95)",
              flexDirection: "row",
              alignItems: "center",
              gap: px(8),
            }}
          >
            <Ionicons name="qr-code-outline" size={px(16)} color="white" />
            <Text style={{ fontSize: fs(12), fontWeight: "700", color: "white" }}>Tarjeta</Text>
          </View>

          <View
            style={{
              width: px(40),
              height: px(40),
              borderRadius: px(12),
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.14)",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255,255,255,0.06)",
            }}
          >
            <Ionicons name="ellipsis-horizontal" size={px(18)} color="rgba(226,232,240,0.9)" />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function TransportCard({
  item,
  px,
  fs,
  onPress,
  onOpenMenu,
}: {
  item: any;
  px: (n: number) => number;
  fs: (n: number) => number;
  onPress: () => void;
  onOpenMenu?: (it: any) => void;
}) {
  const icon = iconForTransport(item);
  const badge = badgeForTransport(item);
  const subtitle = subtitleForTransport(item);

  const start = item.startAt ?? item.startTime ?? null;
  const end = item.endAt ?? item.endTime ?? null;

  const t1 = fmtTime(start);
  const t2 = fmtTime(end);
  const timeRange = t1 ? (t2 ? `${t1} - ${t2}` : t1) : "";

  const dayKey = toISODateKey(item.day ?? item.date ?? start);
  const dayLabel = dayKey ? fmtDateLabel(dayKey) : "";

  const timeLabel = dayLabel && timeRange ? `${dayLabel} · ${timeRange}` : dayLabel || timeRange;

  const ref =
    item?.destinationTransport?.bookingRef ||
    item?.destinationTransport?.ticketNumber ||
    item?.localTransport?.bookingRef ||
    item?.localTransport?.ticketNumber ||
    item?.transactionId ||
    "";

  const mode =
    String(item?.destinationTransport?.mode || item?.localTransport?.mode || item?.transportLocal?.mode || "")
      .toLowerCase();

  const tileBg =
    mode === "train"
      ? "rgba(239,68,68,0.10)"
      : mode === "bus"
      ? "rgba(59,130,246,0.10)"
      : mode === "car" || mode === "taxi" || mode === "uber"
      ? "rgba(16,185,129,0.10)"
      : "rgba(148,163,184,0.12)";

  const tileBorder =
    mode === "train"
      ? "rgba(239,68,68,0.22)"
      : mode === "bus"
      ? "rgba(59,130,246,0.22)"
      : mode === "car" || mode === "taxi" || mode === "uber"
      ? "rgba(16,185,129,0.22)"
      : "rgba(148,163,184,0.22)";

  const tileIcon =
    mode === "train"
      ? "rgba(239,68,68,0.95)"
      : mode === "bus"
      ? "rgba(59,130,246,0.95)"
      : colors.primary;

  return (
    <Pressable
      onPress={onPress}
      style={({ hovered, pressed }) => [
        {
          backgroundColor: "white",
          borderRadius: px(22),
          borderWidth: 1,
          borderColor: "rgba(226,232,240,0.95)",
          padding: px(16),
          flexDirection: "row",
          alignItems: "center",
          gap: px(14),
          opacity: pressed ? 0.98 : 1,
        },
        Platform.OS === "web" && hovered ? { backgroundColor: "rgba(248,250,252,1)" } : null,
      ]}
    >
      {/* Icon tile */}
      <View
        style={{
          width: px(56),
          height: px(56),
          borderRadius: px(18),
          backgroundColor: tileBg,
          borderWidth: 1,
          borderColor: tileBorder,
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Ionicons name={icon} size={px(26)} color={tileIcon} />
      </View>

      {/* Body */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: px(10), flexWrap: "wrap" }}>
          <Text style={{ fontSize: fs(15), fontWeight: "700", color: UI.text }} numberOfLines={1}>
            {item.title}
          </Text>
          <Pill label={badge} px={px} fs={fs} />
        </View>

        {!!subtitle && (
          <Text style={{ marginTop: px(4), fontSize: fs(12.5), fontWeight: "700", color: UI.muted }} numberOfLines={2}>
            {subtitle}
          </Text>
        )}

        {/* meta row */}
        <View style={{ marginTop: px(8), flexDirection: "row", alignItems: "center", gap: px(14), flexWrap: "wrap" }}>
          {!!timeLabel && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: px(6) }}>
              <Ionicons name="calendar-outline" size={px(14)} color={UI.muted2} />
              <Text style={{ fontSize: fs(11.5), fontWeight: "600", color: UI.muted2 }}>{timeLabel}</Text>
            </View>
          )}
          {!!ref && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: px(6) }}>
              <Ionicons name="ticket-outline" size={px(14)} color={UI.muted2} />
              <Text style={{ fontSize: fs(11.5), fontWeight: "700", color: UI.muted2 }} numberOfLines={1}>
                {String(ref)}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Right (acciones) */}
      <View style={{ alignItems: "flex-end", gap: px(10), paddingLeft: px(10) }}>
        <Text style={{ fontSize: fs(12), fontWeight: "700", color: "rgba(59,130,246,0.95)" }}>
          Ver billete
        </Text>

<KebabMenu
  px={px}
  fs={fs}
  onEdit={() => onPress()}              // editar = abrir el mismo item
  onDelete={() => onOpenMenu?.(item)}   // reutilizamos tu callback para borrar (o menú externo)
/>

      </View>
    </Pressable>
  );
}

/** ===== Panel final ===== */
export function TransportSectionPanel({
  trip,
  items,
  px,
  fs,
  onPressItem,
  onOpenTransportMenu,
}: {
  trip: any;
  items: any[];
  px: (n: number) => number;
  fs: (n: number) => number;
  onPressItem: (it: any) => void;
  onOpenTransportMenu?: (it: any) => void;
}) {
  const all = useMemo(() => (items || []).filter(Boolean), [items]);

  const flights = useMemo(() => {
    return all
      .filter((it) => it.type === "flight")
      .sort((a, b) => String(a.startAt ?? a.startTime ?? "").localeCompare(String(b.startAt ?? b.startTime ?? "")));
  }, [all]);

  const destination = useMemo(() => {
    return all
      .filter((it) => it.type === "transport_destination")
      .sort((a, b) => String(a.startAt ?? a.startTime ?? "").localeCompare(String(b.startAt ?? b.startTime ?? "")));
  }, [all]);

  const local = useMemo(() => {
    return all
      .filter((it) => it.type === "transport_local")
      .sort((a, b) => String(a.startAt ?? a.startTime ?? "").localeCompare(String(b.startAt ?? b.startTime ?? "")));
  }, [all]);

  const mainTransports = useMemo(() => {
    const merged = [...flights, ...destination];
    merged.sort((a, b) => String(a.startAt ?? a.startTime ?? "").localeCompare(String(b.startAt ?? b.startTime ?? "")));
    return merged;
  }, [flights, destination]);

  // si lo quieres pintar luego, ya lo tienes
  const totalCost = useMemo(() => {
    return [...mainTransports, ...local].reduce((acc, it) => acc + (normalizeCost(it.cost) ?? 0), 0);
  }, [mainTransports, local]);

  return (
    <View style={{ gap: px(18) }}>
      {/* ===== Transportes principales (flight + transport_destination) ===== */}
      <View style={{ gap: px(12) }}>
        <SectionHeader icon="airplane-outline" title="Transportes principales" px={px} fs={fs} />

        {mainTransports.length === 0 ? (
          <View
            style={{
              borderRadius: px(18),
              borderWidth: 1,
              borderStyle: "dashed",
              borderColor: "rgba(148,163,184,0.55)",
              padding: px(14),
              backgroundColor: "rgba(2,6,23,0.02)",
            }}
          >
            <Text style={{ fontSize: fs(12.5), fontWeight: "700", color: UI.muted }}>
              No tienes transportes principales guardados (vuelos / tren / bus / coche).
            </Text>
          </View>
        ) : (
          <View style={{ gap: px(12) }}>
            {/* Hero SOLO si existe al menos un vuelo */}
            {flights.length > 0 ? (
              <>
                <FlightHeroCard flight={flights[0]} px={px} fs={fs} onPress={() => onPressItem(flights[0])} />

                {/* resto de principales sin duplicar el hero */}
                {mainTransports
                  .filter((it) => it.id !== flights[0].id)
                  .map((it) => (
                    <TransportCard key={it.id} item={it} px={px} fs={fs} onPress={() => onPressItem(it)} />
                  ))}
              </>
            ) : (
              /* si no hay vuelos, todo como cards */
              mainTransports.map((it) => (
                <TransportCard key={it.id} item={it} px={px} fs={fs} onPress={() => onPressItem(it)} onOpenMenu={onOpenTransportMenu} />
              ))
            )}
          </View>
        )}
      </View>

      {/* ===== Transporte local (transport_local) ===== */}
      <View style={{ gap: px(12) }}>
        <SectionHeader icon="bus-outline" title="Transporte y traslados" px={px} fs={fs} />

        {local.length === 0 ? (
          <View
            style={{
              borderRadius: px(18),
              borderWidth: 1,
              borderStyle: "dashed",
              borderColor: "rgba(148,163,184,0.55)",
              padding: px(14),
              backgroundColor: "rgba(2,6,23,0.02)",
            }}
          >
            <Text style={{ fontSize: fs(12.5), fontWeight: "700", color: UI.muted }}>
              No tienes transportes locales todavía (metro / bus urbano / taxi / etc.).
            </Text>
          </View>
        ) : (
          <View style={{ gap: px(12) }}>
            {local.map((it) => (
              <TransportCard key={it.id} item={it} px={px} fs={fs} onPress={() => onPressItem(it)} onOpenMenu={onOpenTransportMenu} />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
