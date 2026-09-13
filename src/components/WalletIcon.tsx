import React, { useState } from "react";
import { View, Text, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { isLogoUrl } from "../constants/bankPresets";

// Icono de una cartera: si `emoji` es en realidad la URL de un logo de banco
// (elegido desde un preset) se muestra como imagen; si es un emoji normal se
// muestra como texto, igual que siempre. Si la imagen falla al cargar, cae a
// un icono neutro en vez de romper el layout.
export default function WalletIcon({ emoji, size = 24 }: { emoji?: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);

  if (isLogoUrl(emoji) && !failed) {
    return (
      <Image
        source={{ uri: emoji }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        onError={() => setFailed(true)}
      />
    );
  }

  if (isLogoUrl(emoji) && failed) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: "#E5E7EB",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="business-outline" size={size * 0.6} color="#6B7280" />
      </View>
    );
  }

  return <Text style={{ fontSize: size }}>{emoji || "💰"}</Text>;
}
