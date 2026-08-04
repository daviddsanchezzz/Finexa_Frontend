import React from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../../../theme/theme";
import AppHeader from "../../../components/AppHeader";
import FriendRequestModal from "../../../components/FriendRequestModal";
import { useNotificationsFeed } from "../../../hooks/useNotificationsFeed";
import { useFriendRequestFromNotification } from "../../../hooks/useFriendRequestFromNotification";

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

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const { notifications, isLoading, unreadCount, markRead, markAllRead } = useNotificationsFeed();
  const { selectedRequest, actionLoading, handlePress, closeDetail, handleAccept, handleReject } =
    useFriendRequestFromNotification(markRead);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pb-2">
        <AppHeader
          title="Notificaciones"
          showProfile={false}
          showDatePicker={false}
          showBack={true}
          rightElement={
            <TouchableOpacity
              onPress={() => navigation.navigate("NotificationSettings")}
              activeOpacity={0.7}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: "#F3F4F6",
                borderWidth: 1.2,
                borderColor: "#E5E7EB",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="settings-outline" size={18} color={colors.text} />
            </TouchableOpacity>
          }
        />
      </View>

      {unreadCount > 0 && (
        <View style={{ paddingHorizontal: 20, alignItems: "flex-end", marginBottom: 4 }}>
          <TouchableOpacity onPress={() => markAllRead()} activeOpacity={0.7}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primary }}>
              Marcar todas como leídas
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : notifications.length === 0 ? (
        <View style={{ alignItems: "center", paddingVertical: 60 }}>
          <Ionicons name="notifications-outline" size={32} color="#CBD5E1" />
          <Text style={{ color: "#94A3B8", fontSize: 13, marginTop: 8 }}>No tienes notificaciones</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 }}
        >
          {notifications.map((n, idx) => {
            const icon = iconForType(n.type);
            return (
              <TouchableOpacity
                key={n.id}
                onPress={() => handlePress(n)}
                activeOpacity={0.7}
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  paddingVertical: 14,
                  gap: 12,
                  borderBottomWidth: idx !== notifications.length - 1 ? 1 : 0,
                  borderBottomColor: "#F3F4F6",
                  opacity: n.read ? 0.6 : 1,
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
                  <Text style={{ fontSize: 14, fontWeight: n.read ? "600" : "800", color: "#0F172A" }}>
                    {n.title}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>
                    {n.message} · {timeAgo(n.createdAt)}
                  </Text>
                </View>
                {!n.read && (
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: colors.primary,
                      marginTop: 6,
                    }}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <FriendRequestModal
        visible={!!selectedRequest}
        request={selectedRequest}
        onClose={closeDetail}
        onAccept={handleAccept}
        onReject={handleReject}
        loading={actionLoading}
      />
    </SafeAreaView>
  );
}
