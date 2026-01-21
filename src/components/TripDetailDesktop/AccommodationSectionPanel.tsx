import React, { useMemo, useRef, useState } from "react";
import { View, Text, Pressable, Platform, Image, Linking, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UI } from "./ui";
import { BathroomType, RoomType } from "../../types/enums/travel";

/** =====================
 * Helpers
 * ===================== */
function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function openWebsite(url?: string | null) {
  const raw = String(url ?? "").trim();
  if (!raw) return;
  const safe = raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;
  Linking.openURL(safe);
}

function toISODateKey(input?: string | null) {
  if (!input) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function fmtShortRange(a?: string | null, b?: string | null) {
  const ia = toISODateKey(a);
  const ib = toISODateKey(b);
  if (!ia && !ib) return "";
  const da = ia ? new Date(`${ia}T00:00:00`) : null;
  const db = ib ? new Date(`${ib}T00:00:00`) : null;

  const fmt = (d: Date) =>
    d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" }).replace(".", "");

  const left = da ? fmt(da) : "—";
  const right = db ? fmt(db) : "—";
  return `${left} - ${right}`;
}

function nightsBetween(a?: string | null, b?: string | null) {
  const ia = toISODateKey(a);
  const ib = toISODateKey(b);
  if (!ia || !ib) return null;
  const da = new Date(`${ia}T00:00:00`);
  const db = new Date(`${ib}T00:00:00`);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return null;
  const diff = Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24));
  return Number.isFinite(diff) ? diff : null;
}

function clampStr(v: any) {
  return String(v ?? "").trim();
}

function moneyLabel(cost: any, currency?: string | null) {
  const c = currency || "";
  if (cost == null || cost === "") return "";
  const n = typeof cost === "number" ? cost : Number(String(cost).replace(",", "."));
  if (!Number.isFinite(n)) return "";
  try {
    if (c && c.length === 3) {
      return new Intl.NumberFormat("es-ES", { style: "currency", currency: c }).format(n);
    }
  } catch {}
  return `${n.toFixed(2)} ${c || ""}`.trim();
}

const ROOM_LABEL: Record<RoomType, string> = {
  single: "Individual",
  double: "Doble",
  twin: "Twin (2 camas)",
  triple: "Triple",
  family: "Familiar",
  suite: "Suite",
  apartment: "Apartamento",
  dorm: "Dormitorio compartido",
};

const BATHROOM_LABEL: Record<BathroomType, string> = {
  private: "con baño",
  shared: "sin baño",
};

/** =====================
 * Extract from your shape
 * ===================== */
function getAccFields(it: any) {
  const ad = it?.accommodationDetails ?? null;

  const title = clampStr(ad?.name) || clampStr(it?.title) || "Alojamiento";
  const address = clampStr(ad?.address) || clampStr(it?.location) || "";

  const startAt = it?.startAt ?? null;
  const endAt = it?.endAt ?? null;

  const checkInAt = ad?.checkInAt ?? startAt ?? null;
  const checkOutAt = ad?.checkOutAt ?? endAt ?? null;

  const guests = clampStr(ad?.guests);
  const city = clampStr(ad?.city);
  const country = clampStr(ad?.country);
  const phone = clampStr(ad?.phone);
  const website = clampStr(ad?.website);
  const bookingRef = clampStr(ad?.bookingRef);

  const cost = it?.cost ?? null;
  const currency = it?.currency ?? null;

  const imageUrl = ad?.metadata?.imageUrl ?? it?.metadata?.imageUrl ?? null;

  const roomType = (ad?.roomType as RoomType) ?? null;
  const bathroom = (ad?.bathroomType as BathroomType) ?? null;

  const roomLabel =
    roomType === "double" && bathroom
      ? `Doble ${BATHROOM_LABEL[bathroom]}`
      : roomType
      ? ROOM_LABEL[roomType]
      : "—";

  return {
    title,
    address,
    city,
    country,
    checkInAt,
    checkOutAt,
    phone,
    website,
    bookingRef,
    cost,
    guests,
    currency,
    imageUrl: imageUrl ? String(imageUrl) : null,
    roomLabel,
  };
}

/** =====================
 * Tiny kebab menu (kept)
 * ===================== */
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
      <Pressable
        onPress={(e: any) => {
          e?.stopPropagation?.();
          openMenu();
        }}
        style={({ pressed, hovered }) => [
          {
            width: px(38),
            height: px(38),
            borderRadius: px(14),
            backgroundColor: "transparent",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: "transparent",
            opacity: pressed ? 0.92 : 1,
          },
          Platform.OS === "web" && hovered ? { backgroundColor: "rgba(15,23,42,0.09)" } : null,
        ]}
      >
        <Ionicons name="ellipsis-horizontal" size={px(18)} color={UI.text} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={closeMenu}>
        <Pressable
          onPress={(e: any) => {
            e?.stopPropagation?.();
            closeMenu();
          }}
          style={{ flex: 1, backgroundColor: "transparent" }}
        >
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
                { paddingVertical: px(10), paddingHorizontal: px(12), opacity: pressed ? 0.9 : 1 },
                Platform.OS === "web" && hovered ? { backgroundColor: "rgba(241,245,249,1)" } : null,
              ]}
            >
              <Text style={{ fontSize: fs(13), fontWeight: "700", color: UI.text }}>Editar</Text>
            </Pressable>

            <View style={{ height: 1, backgroundColor: "rgba(226,232,240,0.9)" }} />

            <Pressable
              onPress={(e: any) => {
                e?.stopPropagation?.();
                closeMenu();
                onDelete();
              }}
              style={({ pressed, hovered }) => [
                { paddingVertical: px(10), paddingHorizontal: px(12), opacity: pressed ? 0.9 : 1 },
                Platform.OS === "web" && hovered ? { backgroundColor: "rgba(254,242,242,1)" } : null,
              ]}
            >
              <Text style={{ fontSize: fs(13), fontWeight: "800", color: "rgba(239,68,68,1)" }}>
                Eliminar
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

/** =====================
 * Small icon-only action
 * ===================== */
function IconAction({
  px,
  icon,
  onPress,
}: {
  px: (n: number) => number;
  icon: any;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed, hovered }) => [
        {
          width: px(38),
          height: px(38),
          borderRadius: px(14),
          backgroundColor: "rgba(15,23,42,0.06)",
          borderWidth: 1,
          borderColor: "rgba(15,23,42,0.06)",
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.92 : 1,
        },
        Platform.OS === "web" && hovered ? { backgroundColor: "rgba(15,23,42,0.09)" } : null,
      ]}
    >
      <Ionicons name={icon} size={px(18)} color={UI.text} />
    </Pressable>
  );
}

/** =====================
 * Mini field (NO gap)
 * ===================== */
function MiniField({
  px,
  fs,
  label,
  value,
  icon,
}: {
  px: (n: number) => number;
  fs: (n: number) => number;
  label: string;
  value: string;
  icon?: any;
}) {
  return (
    <View style={{  marginRight: px(32), marginBottom: px(10) }}>
      <Text style={{ fontSize: fs(11), fontWeight: "700", color: "rgba(100,116,139,1)" }}>
        {label}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", marginTop: px(6) }}>
        {!!icon && <Ionicons name={icon} size={px(14)} color="rgba(100,116,139,1)" />}
        <Text
          style={{
            marginLeft: icon ? px(10) : 0,
            fontSize: fs(13),
            fontWeight: "600",
            color: UI.text,
            flexShrink: 1,
          }}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

/** =====================
 * Row
 * ===================== */
export function AccommodationRow({
  item,
  px,
  fs,
  onPress,
  onEdit,
  onDelete,
}: {
  item: any;
  px: (n: number) => number;
  fs: (n: number) => number;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const f = getAccFields(item);

  const datesLabel = fmtShortRange(f.checkInAt, f.checkOutAt) || "—";
  const nights = nightsBetween(f.checkInAt, f.checkOutAt);
  const stayLabel =
    f.roomLabel && f.roomLabel !== "—"
      ? `${f.roomLabel}${nights != null ? ` · ${nights} noche${nights === 1 ? "" : "s"}` : ""}`
      : nights != null
      ? `${nights} noche${nights === 1 ? "" : "s"}`
      : "—";

  const totalLabel = moneyLabel(f.cost, f.currency) || "—";
  const addressLine = f.address || [f.city, f.country].filter(Boolean).join(", ");


    const guestsN = (() => {
    const raw = (f as any)?.guests ?? item?.accommodationDetails?.guests;
    const n = typeof raw === "number" ? raw : Number(String(raw ?? "").trim());
    return Number.isFinite(n) && n > 0 ? n : null;
  })();

  const roomsN = (() => {
    const raw = item?.accommodationDetails?.rooms;
    const n = typeof raw === "number" ? raw : Number(String(raw ?? "").trim());
    return Number.isFinite(n) && n > 0 ? n : null;
  })();

  const detailsLabel = `${guestsN ?? "—"} Per ${roomsN ?? "—"} Hab`;

  return (
    <Pressable
      onPress={onPress}
      style={({ hovered, pressed }) => [
        {
          width: "100%",
          backgroundColor: "white",
          borderRadius: px(18),
          borderWidth: 1,
          borderColor: "rgba(226,232,240,0.95)",
          overflow: "hidden",
          opacity: pressed ? 0.98 : 1,
        },
        hovered ? { backgroundColor: "rgba(248,250,252,1)" } : null,
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "stretch" }}>
        {/* LEFT PANEL */}
        <View
          style={{
            width: px(120),
            backgroundColor: "rgba(241,245,249,1)",
            alignItems: "center",
            justifyContent: "center",
            padding: px(14),
          }}
        >
          {f.imageUrl ? (
            <Image
              source={{ uri: f.imageUrl }}
              style={{ width: px(78), height: px(78), borderRadius: px(14) }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                width: px(78),
                height: px(78),
                borderRadius: px(18),
                backgroundColor: "rgba(37,99,235,0.07)",
                borderWidth: 1,
                borderColor: "rgba(37,99,235,0.12)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="image-outline" size={px(24)} color="rgba(37,99,235,1)" />
            </View>
          )}
        </View>

        {/* divider */}
        <View style={{ width: 1, backgroundColor: "rgba(226,232,240,0.95)" }} />

        {/* RIGHT CONTENT */}
        <View style={{ flex: 1, paddingHorizontal: px(14), paddingVertical: px(12) }}>
          {/* Top row */}
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <View style={{ flex: 1, minWidth: 0, paddingRight: px(10) }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ fontSize: fs(15), fontWeight: "700" }} numberOfLines={1}>
                  {f.title}
                </Text>

                {!!f.city && (
                  <View
                    style={{
                      marginLeft: px(8),
                      paddingHorizontal: px(8),
                      paddingVertical: px(3),
                      borderRadius: px(999),
                      backgroundColor: "rgba(226,232,240,0.65)",
                      borderWidth: 1,
                      borderColor: "rgba(226,232,240,1)",
                      flexShrink: 0,
                    }}
                  >
                    <Text style={{ fontSize: fs(10), fontWeight: "700", color: "rgba(71,85,105,1)" }}>
                      {String(f.city).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>

              {!!addressLine && (
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: px(5) }}>
                  <Ionicons name="location-outline" size={px(13)} color={UI.muted} />
                  <Text
                    style={{
                      marginLeft: px(6),
                      fontSize: fs(11.5),
                      fontWeight: "600",
                      color: UI.muted,
                      flex: 1,
                    }}
                    numberOfLines={1}
                  >
                    {addressLine}
                  </Text>
                </View>
              )}
            </View>

            {/* Top actions (4) - simple */}
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {!!f.phone && (
                <TopIconButton
                  px={px}
                  icon="call-outline"
                  onPress={() => Linking.openURL(`tel:${f.phone}`)}
                />
              )}

              <TopIconButton
                px={px}
                icon="map-outline"
                onPress={() =>
                  Linking.openURL(
                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLine || "")}`
                  )
                }
              />

              {!!f.website && (
                <TopIconButton
                  px={px}
                  icon="globe-outline"
                  onPress={() => openWebsite(f.website)}
                />
              )}

              {/* 4º botón: kebab (lo dejas, pero sin fondo) */}
              <View style={{ marginLeft: px(2) }}>
                <KebabMenu px={px} fs={fs} onEdit={onEdit} onDelete={onDelete} />
              </View>
            </View>
          </View>

          {/* Mini fields + TOTAL */}
          <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: px(12) }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                <MiniField px={px} fs={fs} label="FECHAS" value={datesLabel} icon="calendar-outline" />
                <MiniField px={px} fs={fs} label="ESTANCIA" value={stayLabel} icon="bed-outline" />
                <MiniField px={px} fs={fs} label="DETALLES" value={detailsLabel} icon="people-outline" />
              </View>
            </View>

            <View style={{ alignItems: "flex-end", marginLeft: px(12) }}>
              <Text style={{ fontSize: fs(10), fontWeight: "700", color: UI.muted }}>TOTAL</Text>
              <Text style={{ fontSize: fs(18), fontWeight: "700", color: UI.text }}>
                {totalLabel}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

/** Top icon button: no background, simple */
function TopIconButton({
  px,
  icon,
  onPress,
}: {
  px: (n: number) => number;
  icon: any;
  onPress: () => void;
}) {
  const size = px(34);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed, hovered }) => [
        {
          width: size,
          height: size,
          borderRadius: px(10),
          alignItems: "center",
          justifyContent: "center",
          marginLeft: px(6),
          opacity: pressed ? 0.65 : 1,
        },
        Platform.OS === "web" && hovered ? { backgroundColor: "rgba(15,23,42,0.06)" } : null,
      ]}
      hitSlop={px(6)}
    >
      <Ionicons name={icon} size={px(18)} color={UI.text} />
    </Pressable>
  );
}
/** =====================
 * Panel
 * ===================== */
export function AccommodationSectionPanel({
  items,
  px,
  fs,
  onAddAccommodation,
  onPressItem,
  onEditItem,
  onDeleteItem,
}: {
  items: any[];
  px: (n: number) => number;
  fs: (n: number) => number;
  onAddAccommodation: () => void;
  onPressItem: (it: any) => void;
  onEditItem: (it: any) => void;
  onDeleteItem: (it: any) => void;
}) {
  const accommodations = useMemo(() => {
    return (items || [])
      .filter((it) => it?.type === "accommodation")
      .sort((a, b) => String(a?.startAt ?? a?.day ?? "").localeCompare(String(b?.startAt ?? b?.day ?? "")));
  }, [items]);

  return (
    <View>
      {accommodations.length === 0 ? (
        <View
          style={{
            width: "100%",
            borderRadius: px(18),
            borderWidth: 1,
            borderStyle: "dashed",
            borderColor: "rgba(203,213,225,0.9)",
            backgroundColor: "rgba(248,250,252,0.75)",
            padding: px(16),
          }}
        >
          <Text style={{ fontSize: fs(12.5), fontWeight: "700", color: UI.muted }}>
            Aún no tienes alojamientos. Pulsa “Añadir alojamiento”.
          </Text>

          <Pressable
            onPress={onAddAccommodation}
            style={({ pressed, hovered }) => [
              {
                marginTop: px(12),
                alignSelf: "flex-start",
                paddingHorizontal: px(14),
                paddingVertical: px(10),
                borderRadius: px(12),
                backgroundColor: "rgba(37,99,235,0.10)",
                borderWidth: 1,
                borderColor: "rgba(37,99,235,0.16)",
                opacity: pressed ? 0.92 : 1,
              },
              Platform.OS === "web" && hovered ? { backgroundColor: "rgba(37,99,235,0.14)" } : null,
            ]}
          >
            <Text style={{ fontSize: fs(12.5), fontWeight: "900", color: "rgba(37,99,235,1)" }}>
              Añadir alojamiento
            </Text>
          </Pressable>
        </View>
      ) : (
        <View>
          {accommodations.map((it, idx) => (
            <View key={it.id} style={{ marginBottom: idx === accommodations.length - 1 ? 0 : px(16) }}>
              <AccommodationRow
                item={it}
                px={px}
                fs={fs}
                onPress={() => onPressItem(it)}
                onEdit={() => onEditItem(it)}
                onDelete={() => onDeleteItem(it)}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}