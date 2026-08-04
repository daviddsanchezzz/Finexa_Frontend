// src/components/AppHeader.tsx
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/theme";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useAuth } from "../context/AuthContext";
import { avatarColorForId, initialsFromName } from "../utils/avatarColor";

interface Props {
  onOpenDateModal?: () => void;
  dateLabel?: string;

  showProfile?: boolean;
  showBack?: boolean;
  title?: string;
  showDatePicker?: boolean;
  rightElement?: React.ReactNode;

  showNotificationsBell?: boolean;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
}

export default function AppHeader({
  onOpenDateModal,
  dateLabel,
  showProfile = true,
  showBack = false,
  showDatePicker = true,
  title,
  rightElement,
  showNotificationsBell = false,
  onOpenNotifications,
  unreadNotificationsCount = 0,
}: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();

  const formattedLabel = dateLabel
    ? dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)
    : "";

  return (
    <View className="flex-row justify-between items-center mt-3 mb-4 px-0">

      {/* ------------------------------------- */}
      {/*      IZQUIERDA: BACK + PROFILE + TITLE */}
      {/* ------------------------------------- */}
      <View className="flex-row items-center" style={{ flex: 1, marginRight: 8 }}>

        {/* 🔙 Flecha atrás */}
        {showBack && (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            style={{ paddingRight: 8, paddingLeft: 4 }}
          >
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </TouchableOpacity>
        )}

        {/* 👤 Perfil */}
        {showProfile && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate("Profile")}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: user ? avatarColorForId(user.id) : "#F3F4F6",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 6,
            }}
          >
            {user ? (
              <Text style={{ color: "white", fontSize: 13, fontWeight: "800" }}>
                {initialsFromName(user.name)}
              </Text>
            ) : (
              <Ionicons name="person-outline" size={18} color={colors.text} />
            )}
          </TouchableOpacity>
        )}

        {/* 🔔 Notificaciones */}
        {showNotificationsBell && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onOpenNotifications}
            style={{
              width: 36,
              height: 36,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 4,
            }}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.primary} />
            {unreadNotificationsCount > 0 && (
              <View
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  backgroundColor: "#EF4444",
                  borderRadius: 100,
                  minWidth: 16,
                  height: 16,
                  paddingHorizontal: 3,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1.5,
                  borderColor: "white",
                }}
              >
                <Text style={{ color: "white", fontSize: 9, fontWeight: "800" }}>
                  {unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* 🏷️ Título */}
        {title && (
          <Text
            className="text-[22px] font-bold text-text"
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{ flex: 1 }}
          >
            {title}
          </Text>
        )}
      </View>

      {/* ------------------------------------- */}
      {/*      DERECHA: DATE PICKER             */}
      {/* ------------------------------------- */}
      {rightElement ? rightElement : showDatePicker && (
        <TouchableOpacity
          onPress={onOpenDateModal}
          activeOpacity={0.75}
          className="flex-row items-center bg-gray-100 px-3 py-1.5 rounded-full"
        >
          <Ionicons name="calendar-outline" size={18} color={colors.text} />
          <Text className="ml-1.5 text-[15px] text-text font-semibold capitalize">
            {formattedLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
