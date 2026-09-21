// src/components/CurrencyPickerModal.tsx
// Selector de divisa (bottom sheet) reutilizable. Misma lista y aspecto que
// FormCurrencyPicker, pero controlado desde fuera para poder abrirlo tocando
// el símbolo de moneda junto al importe.
import React from "react";
import { FlatList, Modal, Pressable, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/theme";
import { COMMON_CURRENCIES } from "../utils/exchangeRate";

export function currencySymbol(code: string): string {
  return COMMON_CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
}

export default function CurrencyPickerModal({
  visible,
  value,
  onSelect,
  onClose,
}: {
  visible: boolean;
  value: string;
  onSelect: (code: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.38)" }} />
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: "72%",
          backgroundColor: "white",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingBottom: 24,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 17, borderBottomWidth: 1, borderBottomColor: "#EEF1F5" }}>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: "900", color: colors.ink }}>Seleccionar divisa</Text>
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={22} color="#64748B" />
          </TouchableOpacity>
        </View>
        <FlatList
          data={COMMON_CURRENCIES}
          keyExtractor={(c) => c.code}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const active = item.code === value;
            return (
              <TouchableOpacity
                onPress={() => {
                  onSelect(item.code);
                  onClose();
                }}
                activeOpacity={0.72}
                style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, minHeight: 54 }}
              >
                <Text style={{ width: 48, fontSize: 14, fontWeight: "800", color: colors.ink }}>{item.code}</Text>
                <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: "#64748B" }}>{item.label}</Text>
                {active ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </Modal>
  );
}
