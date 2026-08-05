// src/screens/Mobile/finances/travels/components/PdfPreviewModal.tsx
import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, Modal, Platform, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../../../../theme/theme";

const WebViewNative = Platform.OS === "web" ? null : require("react-native-webview").WebView;

function isMobileWeb() {
  if (Platform.OS !== "web") return false;
  const ua = typeof navigator !== "undefined" && navigator.userAgent ? navigator.userAgent : "";
  return /iPhone|iPad|iPod|Android/i.test(ua);
}

interface Props {
  visible: boolean;
  url: string | null;
  title?: string | null;
  onClose: () => void;
}

export default function PdfPreviewModal({ visible, url, title, onClose }: Props) {
  // Mobile Safari/Chrome no renderizan bien un PDF embebido en <iframe> (sale
  // recortado, sin controles ni compartir). Lo abrimos en pestaña nueva
  // (Linking.openURL ya hace window.open con target _blank) y cerramos este
  // modal — NUNCA navegar la propia pestaña (window.location.href) al PDF:
  // eso saca a la SPA de su propio historial y, al volver, la app queda en
  // un estado roto (se perdía el modal/pantalla desde el que se abrió).
  const autoOpenedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!visible || !url) return;
    if (Platform.OS !== "web" || !isMobileWeb()) return;
    if (autoOpenedFor.current === url) return;
    autoOpenedFor.current = url;
    Linking.openURL(url).finally(() => onClose());
  }, [visible, url]);

  if (!url) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: "#F3F4F6",
            gap: 10,
          }}
        >
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-outline" size={26} color="#555" />
          </TouchableOpacity>
          <Text style={{ flex: 1, fontSize: 14, fontWeight: "800", color: "#0F172A" }} numberOfLines={1}>
            {title || "Documento"}
          </Text>
        </View>

        {Platform.OS === "web" ? (
          isMobileWeb() ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
              <Ionicons name="document-text-outline" size={32} color="#94A3B8" />
              <Text style={{ marginTop: 10, fontSize: 13, color: "#64748B", textAlign: "center" }}>
                Abriendo el PDF…
              </Text>
              <TouchableOpacity onPress={() => Linking.openURL(url)} style={{ marginTop: 14 }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primary }}>¿No se ha abierto? Toca aquí</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <iframe src={url} style={{ flex: 1, width: "100%", height: "100%", border: "none" }} title={title || "PDF"} />
          )
        ) : (
          <WebViewNative source={{ uri: url }} style={{ flex: 1 }} />
        )}
      </SafeAreaView>
    </Modal>
  );
}
