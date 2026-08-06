import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { colors } from "../../../../theme/theme";
import {
  getDestinationInfo,
  EU_COUNTRIES,
  SCHENGEN_COUNTRIES,
  timezoneLabel,
  drivingSideLabel,
  tapWaterLabel,
  DESTINATION_INFO_DISCLAIMER,
  type EntryRequirement,
  type RequirementStatus,
} from "../../../../utils/destinationInfo";
import CurrencyConverterModal from "./components/CurrencyConverterModal";

function flagEmoji(code: string) {
  const c = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return "🌍";
  return String.fromCodePoint(...[...c].map((ch) => 127397 + ch.charCodeAt(0)));
}

const STATUS_META: Record<RequirementStatus, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  ok: { icon: "checkmark-circle", color: "#16A34A", bg: "#DCFCE7" },
  info: { icon: "information-circle", color: "#D97706", bg: "#FEF3C7" },
  required: { icon: "alert-circle", color: "#DC2626", bg: "#FEE2E2" },
};

export default function DestinationInfoScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { destination, countryStays, tripName } = route.params || {};

  const stays: string[] = useMemo(() => {
    const fromStays = Array.isArray(countryStays)
      ? countryStays.map((s: any) => (typeof s === "string" ? s : s?.country)).filter(Boolean)
      : [];
    const list = fromStays.length ? fromStays : destination ? [destination] : [];
    // Sin duplicados, conservando el orden
    return Array.from(new Set(list.map((c: string) => c.toUpperCase())));
  }, [countryStays, destination]);

  const [selected, setSelected] = useState(stays[0] ?? null);
  const info = getDestinationInfo(selected);
  const [showCurrencyConverter, setShowCurrencyConverter] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, gap: 8 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "900", color: "#0F172A" }}>{"Información del Destino"}</Text>
      </View>

      {stays.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, marginBottom: 12 }}
        >
          {stays.map((code) => {
            const active = code === selected;
            const label = getDestinationInfo(code)?.name || code;
            return (
              <TouchableOpacity
                key={code}
                onPress={() => setSelected(code)}
                style={{
                  height: 36,
                  paddingHorizontal: 14,
                  borderRadius: 999,
                  backgroundColor: active ? colors.primary : "#F8FAFC",
                  borderWidth: 1,
                  borderColor: active ? colors.primary : "#EEF2F7",
                  justifyContent: "center",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Text style={{ fontSize: 14 }}>{flagEmoji(code)}</Text>
                <Text style={{ fontSize: 12, fontWeight: "700", color: active ? "white" : "#6B7280" }}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {!info ? (
          <View style={{ alignItems: "center", paddingVertical: 60, gap: 8 }}>
            <Ionicons name="earth-outline" size={32} color="#CBD5E1" />
            <Text style={{ fontSize: 13, color: "#94A3B8", textAlign: "center", paddingHorizontal: 20 }}>
              Todavía no tenemos información curada de este destino.
            </Text>
          </View>
        ) : (
          <>
            <DestinationCard info={info} tripName={tripName} />

            <SectionLabel>El país</SectionLabel>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
              <StatTile icon="business-outline" label="Capital" value={info.capital} />
              <StatTile icon="people-outline" label="Habitantes" value={info.population} />
              <StatTile icon="resize-outline" label="Superficie" value={info.area} />
            </View>

            <SectionLabel>Entrada al país</SectionLabel>
            <View style={{ backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: "#F3F4F6", marginBottom: 20 }}>
              {info.entryRequirements.map((req, idx) => (
                <RequirementRow key={req.key} req={req} isLast={idx === info.entryRequirements.length - 1} />
              ))}
            </View>

            <SectionLabel>Práctico</SectionLabel>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
              <PracticalTile icon="flash-outline" label="Enchufe" value={`Tipo ${info.plugType} · ${info.voltage}`} />
              <PracticalTile
                icon="cash-outline"
                label="Moneda"
                value={`${info.currencyName} (${info.currencyCode})`}
                hint="Toca para convertir"
                onPress={() => setShowCurrencyConverter(true)}
              />
              <PracticalTile
                icon="chatbubble-ellipses-outline"
                label="Idioma"
                value={info.language}
                hint={info.phraseLanguage ? "Toca para frases básicas" : undefined}
                onPress={
                  info.phraseLanguage
                    ? () => navigation.navigate("PhraseBook", { phraseLanguage: info.phraseLanguage, destinationName: info.name })
                    : undefined
                }
              />
              <PracticalTile
                icon="time-outline"
                label="Zona horaria"
                value={timezoneLabel(info)}
                hint={info.timezoneNote}
              />
              <PracticalTile icon="water-outline" label="Agua del grifo" value={tapWaterLabel(info.tapWater)} />
              <PracticalTile icon="car-outline" label="Conducción" value={drivingSideLabel(info.drivingSide)} />
            </View>

            <Text style={{ fontSize: 11, color: "#9CA3AF", lineHeight: 16 }}>{DESTINATION_INFO_DISCLAIMER}</Text>
          </>
        )}
      </ScrollView>

      {!!info && (
        <CurrencyConverterModal
          visible={showCurrencyConverter}
          onClose={() => setShowCurrencyConverter(false)}
          currencyCode={info.currencyCode}
          currencyName={info.currencyName}
        />
      )}
    </SafeAreaView>
  );
}

function DestinationCard({ info, tripName }: { info: NonNullable<ReturnType<typeof getDestinationInfo>>; tripName?: string | null }) {
  const isEu = EU_COUNTRIES.has(info.code);
  const isSchengen = SCHENGEN_COUNTRIES.has(info.code);
  const subtitleParts = [tripName, isEu ? "UE" : "No UE", isSchengen ? "Schengen" : "No Schengen"].filter(Boolean);
  const allOk = info.entryRequirements.every((r) => r.status !== "required");

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: "white",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#F3F4F6",
        padding: 14,
        marginBottom: 20,
      }}
    >
      <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 20 }}>{flagEmoji(info.code)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: "900", color: "#0F172A" }}>{info.name}</Text>
        <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8", marginTop: 2 }} numberOfLines={1}>
          {subtitleParts.join(" · ")}
        </Text>
      </View>
      {allOk && (
        <View style={{ backgroundColor: "#DCFCE7", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
          <Text style={{ fontSize: 11, fontWeight: "800", color: "#16A34A" }}>Todo en orden</Text>
        </View>
      )}
    </View>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ fontSize: 12, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>
      {children}
    </Text>
  );
}

function RequirementRow({ req, isLast }: { req: EntryRequirement; isLast: boolean }) {
  const meta = STATUS_META[req.status];
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: "#F3F4F6",
      }}
    >
      <Ionicons name={meta.icon} size={18} color={meta.color} />
      <Text style={{ fontSize: 13, fontWeight: "700", color: "#0F172A", width: 72 }}>{req.label}</Text>
      <Text style={{ flex: 1, fontSize: 12, fontWeight: "600", color: "#64748B", textAlign: "right" }} numberOfLines={2}>
        {req.value}
      </Text>
    </View>
  );
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "white",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#F3F4F6",
        paddingVertical: 12,
        paddingHorizontal: 8,
        alignItems: "center",
        gap: 4,
      }}
    >
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text style={{ fontSize: 9, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase" }} numberOfLines={1}>
        {label}
      </Text>
      <Text style={{ fontSize: 11, fontWeight: "800", color: "#0F172A", textAlign: "center" }} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function PracticalTile({
  icon,
  label,
  value,
  hint,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  hint?: string;
  onPress?: () => void;
}) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      {...(onPress ? { onPress, activeOpacity: 0.7 } : {})}
      style={{
        width: "47.5%",
        backgroundColor: "white",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#F3F4F6",
        padding: 12,
        gap: 6,
      }}
    >
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text style={{ fontSize: 10, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase" }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: "800", color: "#0F172A" }} numberOfLines={2}>{value}</Text>
      {!!hint && <Text style={{ fontSize: 9, fontWeight: "600", color: onPress ? colors.primary : "#94A3B8" }} numberOfLines={1}>{hint}</Text>}
    </Wrapper>
  );
}
