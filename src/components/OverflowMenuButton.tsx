import React, { useState } from "react";
import {
  Modal,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/theme";

export type OverflowMenuAction = {
  label: string;
  onPress: () => void;
  style?: "default" | "destructive";
  disabled?: boolean;
};

type Props = {
  title: string;
  actions: OverflowMenuAction[];
  iconColor?: string;
  iconSize?: number;
  buttonStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  cancelLabel?: string;
};

export default function OverflowMenuButton({
  title,
  actions,
  iconColor = "#64748B",
  iconSize = 18,
  buttonStyle,
  accessibilityLabel = "Más acciones",
  cancelLabel = "Cancelar",
}: Props) {
  const [visible, setVisible] = useState(false);
  const insets = useSafeAreaInsets();

  const close = () => setVisible(false);

  const runAction = (action: OverflowMenuAction) => {
    if (action.disabled) return;
    close();
    requestAnimationFrame(action.onPress);
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setVisible(true)}
        activeOpacity={0.72}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
        style={[
          {
            width: 34,
            height: 34,
            borderRadius: 17,
            alignItems: "center",
            justifyContent: "center",
          },
          buttonStyle,
        ]}
      >
        <Ionicons name="ellipsis-horizontal" size={iconSize} color={iconColor} />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={close}
      >
        <View style={styles.overlay}>
          <TouchableOpacity
            activeOpacity={1}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={StyleSheet.absoluteFill}
            onPress={close}
          />

          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 18) + 10 }]}>
            <Text style={styles.title} numberOfLines={2}>{title}</Text>

            <View style={styles.actions}>
              {actions.map((action) => (
                <TouchableOpacity
                  key={action.label}
                  onPress={() => runAction(action)}
                  activeOpacity={0.72}
                  disabled={action.disabled}
                  accessibilityRole="button"
                  style={[styles.action, action.disabled && styles.disabled]}
                >
                  <Text
                    style={[
                      styles.actionText,
                      action.style === "destructive" && styles.destructiveText,
                    ]}
                  >
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={close}
              activeOpacity={0.72}
              accessibilityRole="button"
              style={styles.cancel}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.42)",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  title: {
    color: "#0F172A",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 18,
  },
  actions: {
    gap: 8,
  },
  action: {
    minHeight: 54,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  actionText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  destructiveText: {
    color: "#EF4444",
  },
  disabled: {
    opacity: 0.45,
  },
  cancel: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    marginTop: 10,
  },
  cancelText: {
    color: "#94A3B8",
    fontSize: 16,
    fontWeight: "800",
  },
});
