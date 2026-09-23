import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../context/ThemeContext";
import AppHeader from "../../../components/AppHeader";
import { appAlert } from "../../../utils/appAlert";
import { useFriends, FriendUser, FriendRequest } from "../../../hooks/useFriends";
import { avatarColorForId, initialsFromName } from "../../../utils/avatarColor";

function Avatar({ user, size = 44 }: { user: FriendUser; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: avatarColorForId(user.id),
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: "white", fontWeight: "800", fontSize: size * 0.36 }}>
        {initialsFromName(user.name)}
      </Text>
    </View>
  );
}

export default function FriendsScreen() {
  const { colors } = useTheme();
  const {
    friends,
    incomingRequests,
    outgoingRequests,
    isLoading,
    sendRequest,
    isSendingRequest,
    acceptRequest,
    rejectRequest,
    cancelRequest,
    removeFriend,
    getErrorMessage,
  } = useFriends();

  const [email, setEmail] = useState("");

  const handleAdd = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    try {
      await sendRequest(trimmed);
      setEmail("");
      appAlert("Solicitud enviada", `Se ha enviado una solicitud de amistad a ${trimmed}`);
    } catch (err) {
      appAlert("No se pudo enviar", getErrorMessage(err, "Inténtalo de nuevo más tarde"));
    }
  };

  const handleRemoveFriend = (friend: FriendUser) => {
    appAlert(friend.name, "¿Qué quieres hacer?", [
      {
        text: "Eliminar amigo",
        style: "destructive",
        onPress: () => removeFriend(friend.id).catch(() => appAlert("Error", "No se pudo eliminar")),
      },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pb-2">
        <AppHeader title="Amigos" showBack showProfile={false} showDatePicker={false} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: colors.textMuted,
              textTransform: "uppercase",
              letterSpacing: 0.6,
              marginBottom: 8,
            }}
          >
            Añadir amigo
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.surface,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
              paddingLeft: 14,
              paddingRight: 6,
            }}
          >
            <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Nombre, email o usuario"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              onSubmitEditing={handleAdd}
              style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 10, fontSize: 14, color: colors.text }}
            />
            <TouchableOpacity
              onPress={handleAdd}
              disabled={isSendingRequest || !email.trim()}
              activeOpacity={0.8}
              style={{
                backgroundColor: email.trim() ? colors.primary : colors.card,
                paddingVertical: 9,
                paddingHorizontal: 16,
                borderRadius: 10,
              }}
            >
              {isSendingRequest ? (
                <ActivityIndicator size={14} color="white" />
              ) : (
                <Text style={{ color: email.trim() ? "white" : colors.textMuted, fontWeight: "700", fontSize: 13 }}>
                  Añadir
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100, gap: 24 }}
          >
            {incomingRequests.length > 0 && (
              <View>
                <SectionTitle>Solicitudes recibidas · {incomingRequests.length}</SectionTitle>
                <View style={{ gap: 8 }}>
                  {incomingRequests.map((req: FriendRequest) => (
                    <View
                      key={req.id}
                      style={{
                        backgroundColor: colors.surface,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: colors.border,
                        padding: 14,
                        gap: 12,
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <Avatar user={req.user} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>{req.user.name}</Text>
                          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>quiere ser tu amigo</Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <TouchableOpacity
                          onPress={() => acceptRequest(req.id)}
                          activeOpacity={0.85}
                          style={{ flex: 1, backgroundColor: colors.primary, paddingVertical: 9, borderRadius: 10, alignItems: "center" }}
                        >
                          <Text style={{ color: "white", fontWeight: "700", fontSize: 13 }}>Aceptar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => rejectRequest(req.id)}
                          activeOpacity={0.85}
                          style={{ flex: 1, backgroundColor: colors.card, paddingVertical: 9, borderRadius: 10, alignItems: "center" }}
                        >
                          <Text style={{ color: colors.textSecondary, fontWeight: "700", fontSize: 13 }}>Rechazar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {outgoingRequests.length > 0 && (
              <View>
                <SectionTitle>Solicitudes enviadas</SectionTitle>
                <View style={{ gap: 8 }}>
                  {outgoingRequests.map((req: FriendRequest) => (
                    <View
                      key={req.id}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: colors.surface,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: colors.border,
                        padding: 14,
                        gap: 12,
                      }}
                    >
                      <Avatar user={req.user} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>{req.user.name}</Text>
                        <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>Pendiente</Text>
                      </View>
                      <TouchableOpacity onPress={() => cancelRequest(req.id)} activeOpacity={0.7} style={{ padding: 6 }}>
                        <Text style={{ color: "#EF4444", fontWeight: "700", fontSize: 13 }}>Cancelar</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View>
              <SectionTitle>Tus amigos · {friends.length}</SectionTitle>
              {friends.length === 0 ? (
                <View
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: colors.border,
                    padding: 24,
                    alignItems: "center",
                  }}
                >
                  <Ionicons name="people-outline" size={28} color={colors.textMuted} />
                  <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 8, textAlign: "center" }}>
                    Aún no tienes amigos. Añade a alguien por su email para empezar.
                  </Text>
                </View>
              ) : (
                <View style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: "hidden" }}>
                  {friends.map((friend, idx) => (
                    <TouchableOpacity
                      key={friend.id}
                      onPress={() => handleRemoveFriend(friend)}
                      activeOpacity={0.7}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        padding: 14,
                        gap: 12,
                        borderBottomWidth: idx !== friends.length - 1 ? 1 : 0,
                        borderBottomColor: colors.border,
                      }}
                    >
                      <Avatar user={friend} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>{friend.name}</Text>
                        <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{friend.email}</Text>
                      </View>
                      <Ionicons name="ellipsis-vertical" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <Text
      style={{
        fontSize: 12,
        fontWeight: "700",
        color: colors.textMuted,
        textTransform: "uppercase",
        letterSpacing: 0.6,
        marginBottom: 8,
      }}
    >
      {children}
    </Text>
  );
}
