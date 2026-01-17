import React, { useMemo } from "react";
import { View, Text } from "react-native";
import { textStyles } from "../theme/typography";

type Props = {
  name?: string | null;
  email?: string | null;
  size?: number; // diámetro
  backgroundColor?: string;
  textColor?: string;
};

/**
 * Avatar con iniciales (ej: "David Sanchez" -> "DS")
 */
export default function InitialsAvatar({
  name,
  email,
  size = 32,
  backgroundColor = "#6366F1", // indigo-500 (muy SaaS)
  textColor = "white",
}: Props) {
  const initials = useMemo(() => {
    if (name && name.trim()) {
      const parts = name.trim().split(" ");
      if (parts.length === 1) return parts[0][0].toUpperCase();
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }

    if (email) {
      return email[0].toUpperCase();
    }

    return "?";
  }, [name, email]);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={[
          textStyles.body,
          {
            color: textColor,
            fontSize: Math.round(size * 0.42),
            fontWeight: "700",
            letterSpacing: 0.6,
          },
        ]}
      >
        {initials}
      </Text>
    </View>
  );
}
