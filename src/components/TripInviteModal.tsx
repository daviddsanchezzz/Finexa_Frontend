import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Image } from "react-native";
import Modal from "react-native-modal";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/theme";
import { useTripInviteDetail } from "../hooks/useTripInvites";

function flagEmojiFromISO2(code: string) {
  const c = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return "";
  return String.fromCodePoint(...[...c].map((ch) => 127397 + ch.charCodeAt(0)));
}

function formatDateRange(startISO: string | null, endISO: string | null) {
  if (!startISO || !endISO) return null;
  const start = new Date(startISO);
  const end = new Date(endISO);
  const fmt = (d: Date) => d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
  const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  return `${fmt(start)} - ${fmt(end)} · ${days} día${days !== 1 ? "s" : ""}`;
}

interface Props {
  visible: boolean;
  memberId: number | null;
  onClose: () => void;
  onAccept: () => void;
  onReject: () => void;
  loading?: boolean;
}

export default function TripInviteModal({ visible, memberId, onClose, onAccept, onReject, loading }: Props) {
  const { data, isLoading } = useTripInviteDetail(memberId);

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      backdropOpacity={0.4}
      style={{ justifyContent: "flex-end", margin: 0 }}
    >
      <View className="bg-white rounded-t-3xl pb-8 overflow-hidden">
        {isLoading || !data ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 40 }} />
        ) : (
          <>
            <View style={{ height: 120, backgroundColor: "#1E293B" }}>
              {data.trip.coverImageUrl ? (
                <Image source={{ uri: data.trip.coverImageUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
              ) : (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="image-outline" size={28} color="rgba(255,255,255,0.5)" />
                </View>
              )}
            </View>

            <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: "#0F172A" }}>
                {data.trip.countryStays?.[0]?.country ? `${flagEmojiFromISO2(data.trip.countryStays[0].country)} ` : ""}
                {data.trip.name}
              </Text>
              {formatDateRange(data.trip.startDate, data.trip.endDate) && (
                <Text style={{ fontSize: 13, color: "#9CA3AF", marginTop: 2 }}>
                  {formatDateRange(data.trip.startDate, data.trip.endDate)}
                </Text>
              )}

              <Text style={{ fontSize: 13, color: "#374151", marginTop: 14 }}>
                {data.inviter?.name ?? "Alguien"} te invitó como acompañante
              </Text>

              <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
                <TouchableOpacity
                  onPress={onAccept}
                  disabled={loading}
                  activeOpacity={0.85}
                  style={{ flex: 1, backgroundColor: colors.primary, paddingVertical: 13, borderRadius: 14, alignItems: "center" }}
                >
                  {loading ? (
                    <ActivityIndicator size={16} color="white" />
                  ) : (
                    <Text style={{ color: "white", fontWeight: "700", fontSize: 14 }}>Aceptar viaje</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onReject}
                  disabled={loading}
                  activeOpacity={0.85}
                  style={{ flex: 1, backgroundColor: "#F3F4F6", paddingVertical: 13, borderRadius: 14, alignItems: "center" }}
                >
                  <Text style={{ color: "#6B7280", fontWeight: "700", fontSize: 14 }}>Rechazar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}
