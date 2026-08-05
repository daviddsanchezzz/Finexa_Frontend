import React from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import Modal from "react-native-modal";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../theme/theme";
import { useNotificationsFeed, FeedNotification } from "../hooks/useNotificationsFeed";
import { useFriendRequestFromNotification } from "../hooks/useFriendRequestFromNotification";
import { useTripInviteFromNotification } from "../hooks/useTripInviteFromNotification";
import FriendRequestModal from "./FriendRequestModal";
import TripInviteModal from "./TripInviteModal";

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days}d`;
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

function iconForType(type: string | null) {
  switch (type) {
    case "friend_request":
      return { name: "person-add-outline" as const, bg: "#F3E8FF", color: "#8B5CF6" };
    case "friend_accepted":
      return { name: "checkmark-circle-outline" as const, bg: "#DCFCE7", color: "#16A34A" };
    case "recurring_transaction":
      return { name: "repeat-outline" as const, bg: "#F3E8FF", color: "#A855F7" };
    case "trip_invite":
      return { name: "airplane-outline" as const, bg: "#DBEAFE", color: "#2563EB" };
    case "trip_invite_accepted":
      return { name: "checkmark-circle-outline" as const, bg: "#DCFCE7", color: "#16A34A" };
    case "trip_reminder_transport":
      return { name: "car-outline" as const, bg: "#DBEAFE", color: "#2563EB" };
    case "trip_reminder_checkin":
    case "trip_reminder_checkout":
      return { name: "bed-outline" as const, bg: "#DCFCE7", color: "#16A34A" };
    case "trip_expense_added":
      return { name: "receipt-outline" as const, bg: "#FEF3C7", color: "#D97706" };
    case "quick_transaction":
      return { name: "card-outline" as const, bg: "#DBEAFE", color: "#2563EB" };
    default:
      return { name: "notifications-outline" as const, bg: "#F3F4F6", color: "#6B7280" };
  }
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function NotificationsSheet({ visible, onClose }: Props) {
  const navigation = useNavigation<any>();
  const { notifications, isLoading, markRead } = useNotificationsFeed();
  const friendReq = useFriendRequestFromNotification();
  const tripInv = useTripInviteFromNotification();

  const unread = notifications.filter((n) => !n.read);

  const handlePress = (n: FeedNotification) => {
    if (n.type === "friend_request") friendReq.handlePress(n);
    else if (n.type === "trip_invite") tripInv.handlePress(n);
    else if (n.type === "quick_transaction") {
      const d = (n.data ?? {}) as { amount?: number; merchant?: string; cardName?: string; qid?: string };
      onClose();
      navigation.navigate("MainTabs", {
        screen: "Add",
        params: {
          prefillData: {
            type: "expense",
            amount: d.amount,
            description: d.merchant,
            cardName: d.cardName,
            quickAddId: d.qid,
            date: new Date().toISOString(),
          },
        },
      });
      // No se marca como leída aquí: solo se resuelve cuando el gasto
      // realmente se guarda.
    }
    // El resto no hace nada especial al tocarlas — marcarlas como leídas es
    // una acción explícita (X), no un efecto secundario del tap.
  };

  return (
    <>
      <Modal
        isVisible={visible && !friendReq.selectedRequest && !tripInv.selectedMemberId}
        onBackdropPress={onClose}
        backdropOpacity={0.4}
        style={{ justifyContent: "flex-end", margin: 0 }}
      >
        <View className="bg-white rounded-t-3xl p-5 pb-8" style={{ maxHeight: "75%" }}>
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-[17px] font-semibold text-text">Notificaciones</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  navigation.navigate("Notifications");
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: "500", color: colors.primary }}>Ver todas</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose}>
                <Text className="text-[14px] text-gray-500 font-medium">Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>

          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
          ) : unread.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 32 }}>
              <Ionicons name="notifications-outline" size={28} color="#CBD5E1" />
              <Text style={{ color: "#94A3B8", fontSize: 13, marginTop: 8 }}>No tienes notificaciones nuevas</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {unread.map((n) => {
                const icon = iconForType(n.type);
                return (
                  <TouchableOpacity
                    key={n.id}
                    onPress={() => handlePress(n)}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                      paddingVertical: 12,
                      gap: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        backgroundColor: icon.bg,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name={icon.name} size={19} color={icon.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "800", color: "#0F172A" }}>{n.title}</Text>
                      <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }} numberOfLines={2}>
                        {n.message} · {timeAgo(n.createdAt)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={(e: any) => {
                        e?.stopPropagation?.();
                        markRead(n.id);
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      activeOpacity={0.6}
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        alignItems: "center",
                        justifyContent: "center",
                        marginTop: 2,
                      }}
                    >
                      <Ionicons name="close" size={16} color="#9CA3AF" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      </Modal>

      <FriendRequestModal
        visible={!!friendReq.selectedRequest}
        request={friendReq.selectedRequest}
        onClose={friendReq.closeDetail}
        onAccept={friendReq.handleAccept}
        onReject={friendReq.handleReject}
        loading={friendReq.actionLoading}
      />

      <TripInviteModal
        visible={!!tripInv.selectedMemberId}
        memberId={tripInv.selectedMemberId}
        onClose={tripInv.closeDetail}
        onAccept={tripInv.handleAccept}
        onReject={tripInv.handleReject}
        loading={tripInv.actionLoading}
      />
    </>
  );
}
