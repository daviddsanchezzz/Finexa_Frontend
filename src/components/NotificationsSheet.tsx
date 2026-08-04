import React from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import Modal from "react-native-modal";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/theme";
import { useNotificationsFeed } from "../hooks/useNotificationsFeed";
import { useFriendRequestFromNotification } from "../hooks/useFriendRequestFromNotification";
import FriendRequestModal from "./FriendRequestModal";

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
    default:
      return { name: "notifications-outline" as const, bg: "#F3F4F6", color: "#6B7280" };
  }
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function NotificationsSheet({ visible, onClose }: Props) {
  const { notifications, isLoading, markRead } = useNotificationsFeed();
  const { selectedRequest, actionLoading, handlePress, closeDetail, handleAccept, handleReject } =
    useFriendRequestFromNotification(markRead);

  const unread = notifications.filter((n) => !n.read);

  return (
    <>
      <Modal
        isVisible={visible && !selectedRequest}
        onBackdropPress={onClose}
        backdropOpacity={0.4}
        style={{ justifyContent: "flex-end", margin: 0 }}
      >
        <View className="bg-white rounded-t-3xl p-5 pb-8" style={{ maxHeight: "75%" }}>
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-[17px] font-semibold text-text">Notificaciones</Text>
            <TouchableOpacity onPress={onClose}>
              <Text className="text-[14px] text-gray-500 font-medium">Cerrar</Text>
            </TouchableOpacity>
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
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: colors.primary,
                        marginTop: 6,
                      }}
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      </Modal>

      <FriendRequestModal
        visible={!!selectedRequest}
        request={selectedRequest}
        onClose={closeDetail}
        onAccept={handleAccept}
        onReject={handleReject}
        loading={actionLoading}
      />
    </>
  );
}
