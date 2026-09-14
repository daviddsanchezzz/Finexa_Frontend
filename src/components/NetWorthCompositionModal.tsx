import React from "react";
import { Modal, ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NetWorthWallet } from "../hooks/useNetWorthTrend";
import { colors } from "../theme/theme";
import { formatEuro } from "../utils/currency";
import IconCircleButton from "./IconCircleButton";
import WalletIcon from "./WalletIcon";

interface Props {
  visible: boolean;
  onClose: () => void;
  onOpenDetails: () => void;
  current: number;
  wallets: NetWorthWallet[];
}

export default function NetWorthCompositionModal({ visible, onClose, onOpenDetails, current, wallets }: Props) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const sortedWallets = [...wallets].sort(
    (a, b) => Number(b.balance || 0) - Number(a.balance || 0)
  );
  const bottomPadding = Math.max(insets.bottom, 16) + 8;
  const sheetHeight = Math.min(
    windowHeight * 0.92,
    226 + bottomPadding + Math.max(sortedWallets.length, 1) * 55
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" }}
      >
        <TouchableOpacity activeOpacity={1} onPress={() => {}} style={{ height: sheetHeight }}>
          <View
            style={{
              flex: 1,
              backgroundColor: "white",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: 20,
              paddingTop: 18,
              paddingBottom: bottomPadding,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ fontSize: 19, fontWeight: "800", color: "#0F172A" }}>Composición del patrimonio</Text>
                <Text style={{ fontSize: 12.5, color: "#64748B", marginTop: 3 }}>Así se compone tu patrimonio actual.</Text>
              </View>
              <IconCircleButton icon="close" onPress={onClose} size={30} iconSize={16} />
            </View>

            <View style={{ alignItems: "center", backgroundColor: "#F8FAFC", borderRadius: 16, paddingVertical: 12, marginBottom: 14 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8", letterSpacing: 0.6 }}>PATRIMONIO ACTUAL</Text>
              <Text style={{ fontSize: 24, fontWeight: "900", color: "#0F172A", marginTop: 2, fontVariant: ["tabular-nums"] }}>
                {formatEuro(current)} €
              </Text>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ flex: 1 }}
            >
              {sortedWallets.length === 0 ? (
                <Text style={{ color: "#94A3B8", fontSize: 13, textAlign: "center", paddingVertical: 20 }}>No hay carteras creadas.</Text>
              ) : (
                sortedWallets.map((wallet, index) => (
                  <View
                    key={wallet.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 10,
                      borderBottomWidth: index === sortedWallets.length - 1 ? 0 : 1,
                      borderBottomColor: "#EEF2F7",
                    }}
                  >
                    <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                      <WalletIcon emoji={wallet.emoji ?? "💳"} size={17} />
                    </View>
                    <Text style={{ flex: 1, fontSize: 13.5, fontWeight: "700", color: "#0F172A" }} numberOfLines={1}>
                      {wallet.name}
                    </Text>
                    <Text style={{ marginLeft: 12, fontSize: 14, fontWeight: "800", color: "#0F172A", fontVariant: ["tabular-nums"] }}>
                      {formatEuro(Number(wallet.balance || 0))} €
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              onPress={onOpenDetails}
              activeOpacity={0.8}
              style={{ marginTop: 18, height: 44, borderRadius: 13, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              <Text style={{ color: "white", fontSize: 13.5, fontWeight: "700" }}>Ver patrimonio neto</Text>
              <Ionicons name="arrow-forward" size={15} color="white" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
