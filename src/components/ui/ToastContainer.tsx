import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useUIStore, Toast, ToastType } from "../../store/uiStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ICONS: Record<ToastType, { name: any; color: string; bg: string }> = {
  success: { name: "checkmark-circle", color: "#16A34A", bg: "#F0FDF4" },
  error: { name: "close-circle", color: "#DC2626", bg: "#FEF2F2" },
  warning: { name: "warning", color: "#D97706", bg: "#FFFBEB" },
  info: { name: "information-circle", color: "#2563EB", bg: "#EFF6FF" },
};

function ToastItem({ toast }: { toast: Toast }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;
  const dismiss = useUIStore((s) => s.dismissToast);
  const cfg = ICONS[toast.type];

  useEffect(() => {
    Animated.parallel([
      Animated.spring(opacity, { toValue: 1, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -12, duration: 200, useNativeDriver: true }),
    ]).start(() => dismiss(toast.id));
  };

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: cfg.bg, opacity, transform: [{ translateY }] },
      ]}
    >
      <Ionicons name={cfg.name} size={20} color={cfg.color} />
      <Text style={[styles.message, { color: cfg.color }]}>{toast.message}</Text>
      <TouchableOpacity onPress={handleDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="close" size={16} color={cfg.color} />
      </TouchableOpacity>
    </Animated.View>
  );
}

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts);
  const insets = useSafeAreaInsets();

  if (toasts.length === 0) return null;

  return (
    <View
      style={[
        styles.container,
        { top: insets.top + (Platform.OS === "android" ? 12 : 8) },
      ]}
      pointerEvents="box-none"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 9999,
    gap: 8,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
});
