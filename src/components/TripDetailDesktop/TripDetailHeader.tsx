import React, { useMemo, useState } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/theme";
import { textStyles } from "../../theme/typography";
import { UI, cca2ToFlagEmoji, fmtContinent, fmtHeaderDateLine } from "./ui";
import { CountryFlag } from "../CountryFlag";

function HeaderButton({
  icon,
  label,
  primary,
  onPress,
  px,
  fs,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  primary?: boolean;
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
        paddingHorizontal: px(14),
        borderRadius: px(12),
        backgroundColor: primary ? (hover ? "rgba(15,23,42,0.94)" : "#0B1220") : hover ? UI.hover : "white",
        borderWidth: primary ? 0 : 1,
        borderColor: primary ? "transparent" : "rgba(148,163,184,0.35)",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: px(10),
      }}
    >
      <Ionicons name={icon} size={px(16)} color={primary ? "white" : UI.text} />
      <Text style={[textStyles.button, { fontSize: fs(13), fontWeight: "600", color: primary ? "white" : UI.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function Breadcrumb({
  loading,
  tripName,
  onBack,
  px,
  fs,
}: {
  loading: boolean;
  tripName?: string | null;
  onBack: () => void;
  px: (n: number) => number;
  fs: (n: number) => number;
}) {
  const [hover, setHover] = useState(false);

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: px(8), flexWrap: "wrap" }}>
      <Pressable
        onPress={onBack}
        onHoverIn={Platform.OS === "web" ? () => setHover(true) : undefined}
        onHoverOut={Platform.OS === "web" ? () => setHover(false) : undefined}
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
      >
        <Text
          style={{
            fontSize: fs(14),
            fontWeight: "600",
            color:  UI.muted,
            textDecorationLine: hover ? "underline" : "none",
          }}
        >
          Viajes
        </Text>
      </Pressable>

      <Text style={{ fontSize: fs(14), fontWeight: "600", color: UI.muted2 }}>›</Text>

      <Text style={{ fontSize: fs(14), fontWeight: "600", color: UI.muted }}>
        {tripName || (loading ? "Cargando…" : "Detalle")}
      </Text>
    </View>
  );
}

export function TripDetailHeader({
  loading,
  trip,
  px,
  fs,
  onBack,
  onShare,
  onAddActivity,
}: {
  loading: boolean;
  trip: any | null;
  px: (n: number) => number;
  fs: (n: number) => number;
  onBack: () => void; // 👈 lo usamos para breadcrumb
  onShare: () => void;
  onAddActivity: () => void;
}) {
  // ✅ bandera desde cca2 (IT -> 🇮🇹)
  const flag = useMemo(() => cca2ToFlagEmoji(trip?.destination), [trip?.destination]);

  const dateLine = useMemo(
    () => fmtHeaderDateLine(trip?.startDate, trip?.endDate),
    [trip?.startDate, trip?.endDate]
  );
const continentLabel = useMemo(() => fmtContinent(trip?.continent), [trip?.continent]);

  return (
    <View>
      {/* ✅ Breadcrumb clicable */}
      <Breadcrumb loading={loading} tripName={trip?.name} onBack={onBack} px={px} fs={fs} />

      {/* Title + Actions */}
      <View
        style={{
          marginTop: px(8),
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: px(14),
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: px(10), flexWrap: "wrap" }}>
            <Text style={{ fontSize: fs(32), fontWeight: "900", color: UI.text }} numberOfLines={1}>
              {trip?.name || (loading ? "Cargando…" : "Sin nombre")}
            </Text>

            {/* ✅ Bandera (no “IT”) */}
<CountryFlag cca2={trip?.destination} size={px(26)} radius={px(7)} />
          </View>

<View style={{ marginTop: px(6), flexDirection: "row", alignItems: "center", gap: px(10), flexWrap: "wrap" }}>
  <Ionicons name="calendar-outline" size={px(16)} color={UI.muted} />
  <Text style={{ fontSize: fs(13), fontWeight: "600", color: UI.muted }}>
    {dateLine}
    {continentLabel ? ` • ${continentLabel}` : ""}
  </Text>
</View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: px(10) }}>
          <HeaderButton icon="share-outline" label="Compartir" onPress={onShare} px={px} fs={fs} />
<HeaderButton icon="add" label="Añadir" primary onPress={onAddActivity} px={px} fs={fs} />
        </View>
      </View>

      <View style={{ marginTop: px(12), height: 1, backgroundColor: "rgba(226,232,240,0.9)" }} />
    </View>
  );
}
