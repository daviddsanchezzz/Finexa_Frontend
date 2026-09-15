// src/components/UserAvatar.tsx
// Avatar del usuario logueado: si tiene foto la muestra, si no cae en el
// círculo de color + iniciales — compartido por AppHeader, ProfileScreen y
// AccountScreen para que la foto se vea igual en todos lados.
import React from "react";
import { View, Text, Image, ViewStyle } from "react-native";
import { avatarColorForId, initialsFromName } from "../utils/avatarColor";

type UserLike = { id: number; name: string; avatar?: string | null } | null | undefined;

export default function UserAvatar({
  user,
  size = 36,
  fontSize,
  style,
}: {
  user: UserLike;
  size?: number;
  fontSize?: number;
  style?: ViewStyle;
}) {
  const resolvedFontSize = fontSize ?? Math.round(size * 0.36);

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: user ? avatarColorForId(user.id) : "#E5E7EB",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        },
        style,
      ]}
    >
      {user?.avatar ? (
        <Image source={{ uri: user.avatar }} style={{ width: size, height: size }} />
      ) : (
        <Text style={{ color: "white", fontSize: resolvedFontSize, fontWeight: "800" }}>
          {initialsFromName(user?.name || "Usuario")}
        </Text>
      )}
    </View>
  );
}
