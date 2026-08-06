import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import AppHeader from "../../../components/AppHeader";
import { colors } from "../../../theme/theme";
import { useQuickAddToken } from "../../../hooks/useQuickAddToken";
import { appAlert } from "../../../utils/appAlert";

const BASE_URL = "https://finexa-david.netlify.app/";

export default function QuickAddSettingsScreen(_: any) {
  const { token, isLoading, regenerate, isRegenerating } = useQuickAddToken();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const tokenParam = token ? `&token=${token}` : "";
  const exampleUrl = `${BASE_URL}?qa=1&amount=IMPORTE&merchant=COMERCIO&card=TARJETA${tokenParam}`;

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
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pb-2">
        <AppHeader title="Gasto rápido (NFC)" showProfile={false} showDatePicker={false} showBack={true} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 13, color: "#6B7280", lineHeight: 19, marginBottom: 20 }}>
          Tu automatización de Shortcuts (al acercar una tarjeta por NFC) abre una URL con el importe, comercio y
          tarjeta. Añadiendo tu token a esa URL, la app puede identificarte y crear el aviso de "nuevo gasto" aunque
          no tengas sesión iniciada en el navegador que la abre.
        </Text>

        <Text style={{ fontSize: 12, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>
          Tu token
        </Text>

        <View style={{ backgroundColor: "white", borderRadius: 18, borderWidth: 1, borderColor: "#F3F4F6", padding: 16, marginBottom: 20 }}>
          {isLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <Text style={{ fontSize: 13, fontFamily: "monospace", color: "#0F172A", marginBottom: 14 }} selectable>
                {token}
              </Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity
                  onPress={() => token && copy("token", token)}
                  style={{ flex: 1, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", paddingVertical: 11 }}
                >
                  <Ionicons name={copiedKey === "token" ? "checkmark" : "copy-outline"} size={16} color="#0F172A" />
                  <Text style={{ fontSize: 13, fontWeight: "700", color: "#0F172A" }}>
                    {copiedKey === "token" ? "Copiado" : "Copiar token"}
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

        <Text style={{ fontSize: 12, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>
          Cómo configurarlo
        </Text>

        <View style={{ backgroundColor: "white", borderRadius: 18, borderWidth: 1, borderColor: "#F3F4F6", padding: 16, marginBottom: 20, gap: 10 }}>
          <Text style={{ fontSize: 13, color: "#374151", lineHeight: 19 }}>
            En la app Atajos, abre tu automatización de "Abrir URL" y añade esto al final, después de{" "}
            <Text style={{ fontFamily: "monospace" }}>&card=[Tarjeta o pase]</Text>:
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#F8FAFC", borderRadius: 12, padding: 12 }}>
            <Text style={{ flex: 1, fontSize: 13, fontFamily: "monospace", color: "#0F172A" }} selectable>
              {tokenParam || "&token=..."}
            </Text>
            <TouchableOpacity onPress={() => tokenParam && copy("param", tokenParam)} style={{ padding: 4 }}>
              <Ionicons name={copiedKey === "param" ? "checkmark" : "copy-outline"} size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 11, color: "#9CA3AF", lineHeight: 16, marginTop: 4 }}>
            Ejemplo completo (sustituye IMPORTE/COMERCIO/TARJETA por los campos dinámicos de tu automatización):
          </Text>
          <View style={{ backgroundColor: "#F8FAFC", borderRadius: 12, padding: 12 }}>
            <Text style={{ fontSize: 11, fontFamily: "monospace", color: "#64748B", lineHeight: 16 }} selectable>
              {exampleUrl}
            </Text>
          </View>
        </View>

        <Text style={{ fontSize: 11, color: "#9CA3AF", lineHeight: 16 }}>
          Este token identifica solo a tu cuenta para crear avisos de gasto — no des acceso a nada más. Si crees que
          se ha filtrado, regenéralo y actualiza tu automatización.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
