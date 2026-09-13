import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { colors } from "../theme/theme";
import WalletIcon from "./WalletIcon";

// Tarjeta reutilizada por los pickers de preajustes (bancos en carteras,
// criptomonedas en inversiones): logo + nombre, resaltada cuando es la
// opción actualmente elegida.
export default function PresetPickerCard({ logoUrl, label, selected, onPress }: { logoUrl: string; label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={{ width: 66, alignItems: "center" }}>
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          backgroundColor: "#F9FAFB",
          borderWidth: selected ? 2 : 1,
          borderColor: selected ? colors.primary : "#E5E7EB",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 5,
        }}
      >
        <WalletIcon emoji={logoUrl} size={26} />
      </View>
      <Text
        style={{ fontSize: 10.5, color: selected ? colors.primary : "#6B7280", fontWeight: selected ? "700" : "500", textAlign: "center" }}
        numberOfLines={2}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
