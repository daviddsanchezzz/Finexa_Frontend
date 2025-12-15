import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import api from "../../api/api";
import { colors } from "../../theme/theme";
import { storage } from "../../utils/storage";

// En web NO hay WebView. En iOS/Android sí.
const WebViewNative =
  Platform.OS === "web" ? null : require("react-native-webview").WebView;

export default function ReportsPdfViewerScreen({ navigation, route }: any) {
  const { path, title } = route.params as { path: string; title: string };

  const [token, setToken] = useState<string | null>(null);
  const [loadingToken, setLoadingToken] = useState(true);

  // Web: URL del blob para mostrar en iframe
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);

  const url = useMemo(() => {
    const baseURL = (api as any)?.defaults?.baseURL;
    if (!baseURL) return null;
    return `${String(baseURL).replace(/\/$/, "")}${path}`;
  }, [path]);

  useEffect(() => {
    const loadToken = async () => {
      try {
        const t = await storage.getItem("access_token");
        setToken(t || null);
      } catch (e: any) {
        Alert.alert("Error", e?.message || "No se pudo leer el token");
      } finally {
        setLoadingToken(false);
      }
    };
    loadToken();
  }, []);

  // Web: descargar PDF con Authorization y convertirlo a blob URL
  useEffect(() => {
    const run = async () => {
      if (Platform.OS !== "web") return;
      if (!url || !token) return;

      try {
        setLoadingPdf(true);

        const res = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status} ${res.statusText}${text ? `: ${text}` : ""}`);
        }

        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);

        // Limpieza si ya había uno anterior
        setBlobUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return objectUrl;
        });
      } catch (e: any) {
        Alert.alert("Error", e?.message || "No se pudo cargar el PDF");
      } finally {
        setLoadingPdf(false);
      }
    };

    run();

    return () => {
      if (Platform.OS === "web") {
        setBlobUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, token]);

  const Header = (
    <View className="px-5 pt-2 pb-3 flex-row items-center justify-between">
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
        className="w-10 h-10 rounded-full bg-white border border-gray-200 items-center justify-center"
      >
        <Ionicons name="arrow-back-outline" size={20} color={colors.text} />
      </TouchableOpacity>

      <Text className="text-[16px] font-extrabold text-text">
        {title || "Informe"}
      </Text>

      <View className="w-10 h-10" />
    </View>
  );

  if (!url) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        {Header}
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-text font-extrabold text-[16px] text-center">
            Falta configuración
          </Text>
          <Text className="text-gray-500 font-semibold text-[13px] text-center mt-2">
            No encuentro api.defaults.baseURL.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loadingToken) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        {Header}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
          <Text className="mt-3 text-gray-500 font-semibold">Cargando…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!token) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        {Header}
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-text font-extrabold text-[16px] text-center">
            Sesión no válida
          </Text>
          <Text className="text-gray-500 font-semibold text-[13px] text-center mt-2">
            No se encontró access_token. Inicia sesión de nuevo.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ✅ WEB: iframe con blobUrl
  if (Platform.OS === "web") {
    return (
      <SafeAreaView className="flex-1 bg-background">
        {Header}

        {loadingPdf && (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator />
            <Text className="mt-3 text-gray-500 font-semibold">
              Descargando PDF…
            </Text>
          </View>
        )}

        {!loadingPdf && !blobUrl && (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-text font-extrabold text-[16px] text-center">
              No se pudo mostrar el PDF
            </Text>
            <Text className="text-gray-500 font-semibold text-[13px] text-center mt-2">
              Revisa permisos o el endpoint.
            </Text>
          </View>
        )}

        {!loadingPdf && blobUrl && (
          <View style={{ flex: 1 }}>
            <iframe
              src={blobUrl}
              style={{ width: "100%", height: "100%", border: "none" }}
              title={title || "PDF"}
            />
          </View>
        )}
      </SafeAreaView>
    );
  }

  // ✅ iOS/Android: WebView con Authorization header
  return (
    <SafeAreaView className="flex-1 bg-background">
      {Header}
      <WebViewNative
        source={{
          uri: url,
          headers: { Authorization: `Bearer ${token}` },
        }}
      />
    </SafeAreaView>
  );
}
