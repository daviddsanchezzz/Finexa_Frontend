import React from "react";
import { View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/theme";

export default function BottomNav({ state, descriptors, navigation }: any) {
  return (
    <View
      className="flex-row justify-between items-center bg-white px-6 py-3.5"
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        borderTopWidth: 1,
        borderColor: "#E5E7EB",
        paddingBottom: 25,
      }}
    >
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        // 🔹 Iconos
        let iconName: keyof typeof Ionicons.glyphMap = "ellipse-outline";
        if (route.name === "Home") iconName = "home-outline";
        if (route.name === "Stats") iconName = "podium-outline";
        if (route.name === "Add") iconName = "add-outline";
        if (route.name === "Finances") iconName = "folder-outline";
        if (route.name === "AIChat") iconName = "chatbubble-ellipses-outline";

        const isAddButton = route.name === "Add";

        // 🔹 Separación especial para extremos
        const extraStyle =
          route.name === "Home"
            ? { marginLeft: 0 }
            : route.name === "AIChat"
            ? { marginRight: 0 }
            : { marginHorizontal: 20 };

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            activeOpacity={0.85}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            className="items-center justify-center"
            style={{
              flex: 1,
              ...extraStyle,
            }}
          >
            {isAddButton ? (
              <View
                className="w-14 h-14 rounded-full items-center justify-center"
                style={{
                  backgroundColor: colors.primary,
                  marginBottom: 0,
                }}
              >
                <Ionicons name={iconName} size={30} color="white" />
              </View>
            ) : (
              <Ionicons
                name={iconName}
                size={29}
                color={isFocused ? colors.primary : "#b6b6b6"}
              />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
