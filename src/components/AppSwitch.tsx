import React, { useEffect, useRef, useState } from "react";
import { Animated, Platform, Pressable, View } from "react-native";
import { colors } from "../theme/theme";

type Props = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  accessibilityLabel: string;
};

export default function AppSwitch({ value, onValueChange, disabled = false, accessibilityLabel }: Props) {
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const animation = Animated.timing(progress, { toValue: value ? 1 : 0, duration: 140, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [value, progress]);

  return (
    <Pressable
      {...(Platform.OS === "web" ? {
        onKeyDown: (event: React.KeyboardEvent) => {
          if (event.key === " " || event.key === "Spacebar") {
            event.preventDefault();
            if (!disabled && !event.repeat) onValueChange(!value);
          }
        },
      } : {})}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => { if (!disabled) onValueChange(!value); }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => ({
        width: 52,
        minHeight: 44,
        flexShrink: 0,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 16,
        borderWidth: 2,
        borderColor: focused ? "#93B4FF" : "transparent",
        opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
      })}
    >
      <View style={{ width: 44, height: 26, borderRadius: 13, backgroundColor: value ? colors.primary : "#CBD5E1", padding: 3 }}>
        <Animated.View style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: "white",
          transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 18] }) }],
        }} />
      </View>
    </Pressable>
  );
}
