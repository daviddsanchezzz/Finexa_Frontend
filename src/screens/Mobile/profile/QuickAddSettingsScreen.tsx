import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import AppHeader from "../../../components/AppHeader";
import { colors } from "../../../theme/theme";
import { useQuickAddToken } from "../../../hooks/useQuickAddToken";
import { appAlert } from "../../../utils/appAlert";

const BASE_URL = "https://appfinexa.com/";

// Contenido reutilizable: lo usa esta pantalla (standalone) y también la
// pestaña "Atajo NFC" de Cuenta, sin el SafeAreaView/AppHeader propios.
export function QuickAddSettingsContent() {
  const { token, isLoading, regenerate, isRegenerating } = useQuickAddToken();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const tokenParam = token ? `&token=${token}` : "";
  const exampleUrl = `${BASE_URL}?qa=1&amount=IMPORTE&merchant=COMERCIO&card=TARJETA&currency=DIVISA${tokenParam}`;

  const copy = async (key: string, value: string) => {
    await Clipboard.setStringAsync(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500);
  };

  const handleRegenerate = () => {
    appAlert(
      "Regenerar token",
      "El enlace que tengas guardado en tu automatización de Shortcuts dejará de funcionar hasta que lo actualices con el nuevo token. ¿Seguro?",
      [
        { text: "Regenerar", style: "destructive", onPress: () => regenerate() },
        { text: "Cancelar", style: "cancel" },
      ]
    );
  };

  return (
    <>
      <View style={{ backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 16 }}>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#9CA3AF", marginBottom: 8 }}>Tu URL</Text>
            <Text style={{ fontSize: 12, fontFamily: "monospace", color: "#0F172A", lineHeight: 18 }} selectable>
              {exampleUrl}
            </Text>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                onPress={() => copy("url", exampleUrl)}
                style={{ flex: 1, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", paddingVertical: 11 }}
              >
                <Ionicons name={copiedKey === "url" ? "checkmark" : "copy-outline"} size={16} color="#0F172A" />
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#0F172A" }}>
                  {copiedKey === "url" ? "Copiada" : "Copiar URL"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleRegenerate}
                disabled={isRegenerating}
                style={{ flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", borderRadius: 12, paddingVertical: 11, paddingHorizontal: 14, opacity: isRegenerating ? 0.6 : 1 }}
              >
                {isRegenerating ? (
                  <ActivityIndicator size="small" color="#DC2626" />
                ) : (
                  <>
                    <Ionicons name="refresh-outline" size={16} color="#DC2626" />
                    <Text style={{ fontSize: 13, fontWeight: "700", color: "#DC2626" }}>Regenerar</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      <Text style={{ fontSize: 12, color: "#94A3B8", lineHeight: 18 }}>
        Esto sirve para crear avisos de "nuevo gasto" automáticamente desde Shortcuts — por ejemplo, al acercar una
        tarjeta por NFC. Tu automatización abre esta URL (sustituyendo IMPORTE/COMERCIO/TARJETA por sus campos
        dinámicos); como ya lleva tu token, la app te identifica aunque no tengas sesión iniciada en el navegador que
        la abre. DIVISA es opcional: solo hace falta si el importe usa un símbolo ambiguo como "$" o "¥" (rellénalo con
        la propiedad "Código de divisa" de la tarjeta en Wallet, p. ej. CHF); si el importe ya trae el símbolo del euro
        u otro no ambiguo, puedes quitar ese parámetro. Si crees que se ha filtrado, pulsa "Regenerar" y actualiza la
        URL guardada en tu automatización.
      </Text>
    </>
  );
}

export default function QuickAddSettingsScreen(_: any) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pb-2">
        <AppHeader title="Gasto rápido (NFC)" showProfile={false} showDatePicker={false} showBack={true} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <QuickAddSettingsContent />
      </ScrollView>
    </SafeAreaView>
  );
}
