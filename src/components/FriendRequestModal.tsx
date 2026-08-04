import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import Modal from "react-native-modal";
import { colors } from "../theme/theme";
import { FriendRequest } from "../hooks/useFriends";
import { avatarColorForId, initialsFromName } from "../utils/avatarColor";

interface Props {
  visible: boolean;
  request: FriendRequest | null;
  onClose: () => void;
  onAccept: () => void;
  onReject: () => void;
  loading?: boolean;
}

export default function FriendRequestModal({ visible, request, onClose, onAccept, onReject, loading }: Props) {
  if (!request) return null;
  const { user, mutualFriends = [] } = request;

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      backdropOpacity={0.4}
      style={{ justifyContent: "flex-end", margin: 0 }}
    >
      <View className="bg-white rounded-t-3xl px-6 pt-8 pb-8 items-center">
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: avatarColorForId(user.id),
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 14,
          }}
        >
          <Text style={{ color: "white", fontWeight: "800", fontSize: 26 }}>{initialsFromName(user.name)}</Text>
        </View>

        <Text style={{ fontSize: 18, fontWeight: "800", color: "#0F172A" }}>{user.name}</Text>
        <Text style={{ fontSize: 13, color: "#9CA3AF", marginTop: 2 }}>quiere ser tu amigo</Text>

        {mutualFriends.length > 0 && (
          <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 10, textAlign: "center" }}>
            {mutualFriends.length} amigo{mutualFriends.length !== 1 ? "s" : ""} en común ·{" "}
            {mutualFriends.map((f) => f.name).join(", ")}
          </Text>
        )}

        <View style={{ flexDirection: "row", gap: 10, marginTop: 22, width: "100%" }}>
          <TouchableOpacity
            onPress={onAccept}
            disabled={loading}
            activeOpacity={0.85}
            style={{
              flex: 1,
              backgroundColor: colors.primary,
              paddingVertical: 13,
              borderRadius: 14,
              alignItems: "center",
            }}
          >
            {loading ? (
              <ActivityIndicator size={16} color="white" />
            ) : (
              <Text style={{ color: "white", fontWeight: "700", fontSize: 14 }}>Aceptar solicitud</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onReject}
            disabled={loading}
            activeOpacity={0.85}
            style={{
              flex: 1,
              backgroundColor: "#F3F4F6",
              paddingVertical: 13,
              borderRadius: 14,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#6B7280", fontWeight: "700", fontSize: 14 }}>Rechazar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
