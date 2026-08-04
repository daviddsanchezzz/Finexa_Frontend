import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import Modal from "react-native-modal";
import { useUIStore } from "../../store/uiStore";
import { colors } from "../../theme/theme";

export function ActionSheetHost() {
  const actionSheet = useUIStore((s) => s.actionSheet);
  const hideActionSheet = useUIStore((s) => s.hideActionSheet);

  const buttons = actionSheet?.buttons ?? [];
  const cancelButton = buttons.find((b) => b.style === "cancel");
  const otherButtons = buttons.filter((b) => b.style !== "cancel");

  const handlePress = (btn: { onPress?: () => void }) => {
    hideActionSheet();
    btn.onPress?.();
  };

  return (
    <Modal
      isVisible={!!actionSheet}
      onBackdropPress={() => handlePress(cancelButton ?? {})}
      backdropOpacity={0.4}
      style={{ justifyContent: "flex-end", margin: 0 }}
    >
      <View className="bg-white rounded-t-3xl px-5 pt-5 pb-8">
        <Text style={{ fontSize: 16, fontWeight: "800", color: "#0F172A", marginBottom: actionSheet?.message ? 4 : 14 }}>
          {actionSheet?.title}
        </Text>
        {!!actionSheet?.message && (
          <Text style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 14 }}>{actionSheet.message}</Text>
        )}

        <View style={{ gap: 8 }}>
          {otherButtons.map((btn, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => handlePress(btn)}
              activeOpacity={0.7}
              style={{
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: "center",
                backgroundColor: "#F9FAFB",
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "700",
                  color: btn.style === "destructive" ? "#EF4444" : colors.text,
                }}
              >
                {btn.text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {cancelButton && (
          <TouchableOpacity
            onPress={() => handlePress(cancelButton)}
            activeOpacity={0.7}
            style={{ paddingVertical: 14, borderRadius: 14, alignItems: "center", marginTop: 8 }}
          >
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#9CA3AF" }}>{cancelButton.text}</Text>
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
}
