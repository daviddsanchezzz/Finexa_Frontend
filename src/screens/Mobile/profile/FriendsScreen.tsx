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
import { useNavigation } from "@react-navigation/native";
import { colors } from "../../../theme/theme";
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
  const navigation = useNavigation<any>();
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
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F6F8FC" }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 8,
          gap: 8,
        }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "900", color: "#0F172A" }}>Amigos</Text>
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
              color: "#9CA3AF",
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
              backgroundColor: "white",
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "#E5E7EB",
              paddingLeft: 14,
              paddingRight: 6,
            }}
          >
            <Ionicons name="mail-outline" size={18} color="#9CA3AF" />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Nombre, email o usuario"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              keyboardType="email-address"
              onSubmitEditing={handleAdd}
              style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 10, fontSize: 14, color: "#0F172A" }}
            />
            <TouchableOpacity
              onPress={handleAdd}
              disabled={isSendingRequest || !email.trim()}
              activeOpacity={0.8}
              style={{
                backgroundColor: email.trim() ? colors.primary : "#E5E7EB",
                paddingVertical: 9,
                paddingHorizontal: 16,
                borderRadius: 10,
              }}
            >
              {isSendingRequest ? (
                <ActivityIndicator size={14} color="white" />
              ) : (
                <Text style={{ color: email.trim() ? "white" : "#9CA3AF", fontWeight: "700", fontSize: 13 }}>
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
                        backgroundColor: "white",
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: "#F3F4F6",
                        padding: 14,
                        gap: 12,
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <Avatar user={req.user} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: "700", color: "#0F172A" }}>{req.user.name}</Text>
                          <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>quiere ser tu amigo</Text>
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
                          style={{ flex: 1, backgroundColor: "#F3F4F6", paddingVertical: 9, borderRadius: 10, alignItems: "center" }}
                        >
                          <Text style={{ color: "#6B7280", fontWeight: "700", fontSize: 13 }}>Rechazar</Text>
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
                        backgroundColor: "white",
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: "#F3F4F6",
                        padding: 14,
                        gap: 12,
                      }}
                    >
                      <Avatar user={req.user} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: "700", color: "#0F172A" }}>{req.user.name}</Text>
                        <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>Pendiente</Text>
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
                    backgroundColor: "white",
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: "#F3F4F6",
                    padding: 24,
                    alignItems: "center",
                  }}
                >
                  <Ionicons name="people-outline" size={28} color="#CBD5E1" />
                  <Text style={{ color: "#94A3B8", fontSize: 13, marginTop: 8, textAlign: "center" }}>
                    Aún no tienes amigos. Añade a alguien por su email para empezar.
                  </Text>
                </View>
              ) : (
                <View style={{ backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: "#F3F4F6", overflow: "hidden" }}>
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
                        borderBottomColor: "#F3F4F6",
                      }}
                    >
                      <Avatar user={friend} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: "700", color: "#0F172A" }}>{friend.name}</Text>
                        <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{friend.email}</Text>
                      </View>
                      <Ionicons name="ellipsis-vertical" size={16} color="#CBD5E1" />
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
  return (
    <Text
      style={{
        fontSize: 12,
        fontWeight: "700",
        color: "#9CA3AF",
        textTransform: "uppercase",
        letterSpacing: 0.6,
        marginBottom: 8,
      }}
    >
      {children}
    </Text>
  );
}
