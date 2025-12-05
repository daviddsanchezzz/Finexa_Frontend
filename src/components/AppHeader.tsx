// src/components/AppHeader.tsx
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/theme";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";

interface Props {
  onOpenDateModal?: () => void;
  dateLabel?: string;

  showProfile?: boolean;   // Muestra icono de perfil (default true)
  showBack?: boolean;      // Muestra flecha atrás (default false)
  title?: string;          // Texto del header
  showDatePicker?: boolean; // Muestra selector de fecha (default true)
}

export default function AppHeader({
  onOpenDateModal,
  dateLabel,
  showProfile = true,
  showBack = false,
  showDatePicker = true,
  title,
}: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const formattedLabel = dateLabel
    ? dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)
    : "";

  return (
    <View className="flex-row justify-between items-center mt-3 mb-4 px-0">

      {/* ------------------------------------- */}
      {/*      IZQUIERDA: BACK + PROFILE + TITLE */}
      {/* ------------------------------------- */}
      <View className="flex-row items-center">

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
              backgroundColor: "#F3F4F6",
              borderWidth: 1.2,
              borderColor: "#E5E7EB",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}
          >
            <Ionicons name="person-outline" size={18} color={colors.text} />
          </TouchableOpacity>
        )}

        {/* 🏷️ Título */}
        {title && (
          <Text className="text-[22px] font-bold text-text">
            {title}
          </Text>
        )}
      </View>

      {/* ------------------------------------- */}
      {/*      DERECHA: DATE PICKER             */}
      {/* ------------------------------------- */}
      {showDatePicker && (
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
