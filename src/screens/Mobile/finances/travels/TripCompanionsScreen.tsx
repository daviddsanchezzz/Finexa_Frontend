import React from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { colors } from "../../../../theme/theme";
import { useAuth } from "../../../../context/AuthContext";
import { appAlert } from "../../../../utils/appAlert";
import { useTripMembers, TripMemberUser, TripInviteCandidate } from "../../../../hooks/useTripMembers";
import { avatarColorForId, initialsFromName } from "../../../../utils/avatarColor";

function Avatar({ user, size = 40 }: { user: { id: number; name: string }; size?: number }) {
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
      <Text style={{ color: "white", fontWeight: "800", fontSize: size * 0.36 }}>{initialsFromName(user.name)}</Text>
    </View>
  );
}

export default function TripCompanionsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { tripId, tripName } = route.params || {};
  const { user: me } = useAuth();

  const { owner, members, candidates, isLoading, invite, isInviting, removeMember } = useTripMembers(tripId);

  const handleInvite = async (candidate: TripInviteCandidate) => {
    try {
      await invite(candidate.id);
    } catch (err: any) {
      appAlert("No se pudo invitar", err?.response?.data?.message ?? "Inténtalo de nuevo más tarde");
    }
  };

  const handleRemove = (member: TripMemberUser) => {
    appAlert(member.name, "¿Eliminar del viaje?", [
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => removeMember(member.id).catch(() => appAlert("Error", "No se pudo eliminar")),
      },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const isOwner = owner?.id === me?.id;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F6F8FC" }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8, gap: 8 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: "900", color: "#0F172A" }} numberOfLines={1}>
          Compañeros{tripName ? ` · ${tripName}` : ""}
        </Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, gap: 24 }}
        >
          <View>
            <Text style={sectionTitleStyle}>Ya viajan contigo · {1 + members.length}</Text>
            <View style={{ backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: "#F3F4F6", overflow: "hidden" }}>
              {owner && (
                <View style={rowStyle(members.length > 0)}>
                  <Avatar user={owner} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#0F172A" }}>
                      {owner.id === me?.id ? `${owner.name} (tú)` : owner.name}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#9CA3AF" }}>Organizador</Text>
                </View>
              )}
              {members.map((member, idx) => (
                <TouchableOpacity
                  key={member.id}
                  onPress={() => isOwner && handleRemove(member)}
                  activeOpacity={isOwner ? 0.7 : 1}
                  style={rowStyle(idx !== members.length - 1)}
                >
                  <Avatar user={member} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#0F172A" }}>
                      {member.id === me?.id ? `${member.name} (tú)` : member.name}
                    </Text>
                  </View>
                  {isOwner && <Ionicons name="ellipsis-vertical" size={16} color="#CBD5E1" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View>
            <Text style={sectionTitleStyle}>Invitar de tus amigos</Text>
            {candidates.length === 0 ? (
              <View style={{ backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: "#F3F4F6", padding: 24, alignItems: "center" }}>
                <Ionicons name="people-outline" size={28} color="#CBD5E1" />
                <Text style={{ color: "#94A3B8", fontSize: 13, marginTop: 8, textAlign: "center" }}>
                  No tienes amigos disponibles para invitar todavía.
                </Text>
              </View>
            ) : (
              <View style={{ backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: "#F3F4F6", overflow: "hidden" }}>
                {candidates.map((candidate, idx) => (
                  <View key={candidate.id} style={rowStyle(idx !== candidates.length - 1)}>
                    <Avatar user={candidate} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "700", color: "#0F172A" }}>{candidate.name}</Text>
                    </View>
                    {candidate.inviteStatus === "pending" ? (
                      <View style={{ backgroundColor: colors.primary, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Ionicons name="checkmark" size={13} color="white" />
                        <Text style={{ color: "white", fontWeight: "700", fontSize: 12 }}>Invitada</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleInvite(candidate)}
                        disabled={isInviting}
                        activeOpacity={0.8}
                        style={{ borderWidth: 1.5, borderColor: colors.primary, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999 }}
                      >
                        <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 12 }}>Invitar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const sectionTitleStyle = {
  fontSize: 12,
  fontWeight: "700" as const,
  color: "#9CA3AF",
  textTransform: "uppercase" as const,
  letterSpacing: 0.6,
  marginBottom: 8,
};

function rowStyle(showBorder: boolean) {
  return {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    padding: 14,
    gap: 12,
    borderBottomWidth: showBorder ? 1 : 0,
    borderBottomColor: "#F3F4F6",
  };
}
