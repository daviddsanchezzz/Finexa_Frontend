// src/screens/Reports/ReportsPdfViewerScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import api from "../../../api/api";
import { colors } from "../../../theme/theme";
import { storage } from "../../../utils/storage";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

const WebViewNative = Platform.OS === "web" ? null : require("react-native-webview").WebView;

function isMobileWeb() {
  if (Platform.OS !== "web") return false;
  const ua = (typeof navigator !== "undefined" && navigator.userAgent) ? navigator.userAgent : "";
  return /iPhone|iPad|iPod|Android/i.test(ua);
}

function base64ToBlobUrl(base64: string) {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: "application/pdf" });
  return URL.createObjectURL(blob);
}

export default function ReportsPdfViewerScreen({ navigation, route }: any) {
  const { path, title, base64, fileName } = route.params as {
    path?: string;
    title?: string;
    base64?: string;
    fileName?: string;
  };

  const [token, setToken] = useState<string | null>(null);
  const [loadingToken, setLoadingToken] = useState(true);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [sharing, setSharing] = useState(false);
  const autoOpenedRef = useRef(false);

  const safePdfName = useMemo(() => {
    const raw = (fileName || title || "documento").replace(/\.pdf$/i, "");
    return raw.replace(/\s+/g, "_") + ".pdf";
  }, [fileName, title]);

  const url = useMemo(() => {
    const baseURL = (api as any)?.defaults?.baseURL;
    if (!baseURL || !path) return null;
    return `${String(baseURL).replace(/\/$/, "")}${path}`;
  }, [path]);

  const handleShare = async () => {
    if (!url && !base64) return;
    try {
      setSharing(true);
      const localUri = FileSystem.cacheDirectory + safePdfName;

      if (base64) {
        await FileSystem.writeAsStringAsync(localUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } else {
        if (!url || !token) return;
        const res = await FileSystem.downloadAsync(url, localUri, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status !== 200) throw new Error(`Error ${res.status}`);
      }

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert("Compartir no disponible", "Tu dispositivo no soporta esta función.");
        return;
      }
      await Sharing.shareAsync(localUri, { mimeType: "application/pdf", dialogTitle: title || "PDF" });
    } catch (e: any) {
      Alert.alert("Error", e?.message || "No se pudo abrir el PDF");
    } finally {
      setSharing(false);
    }
  };

  // Web: usa la Web Share API (funciona en Safari/Chrome móvil) cuando está
  // disponible; si no, cae a una descarga normal.
  const handleShareWeb = async () => {
    if (!pdfBlob) return;
    try {
      setSharing(true);
      const file = new File([pdfBlob], safePdfName, { type: "application/pdf" });
      const nav: any = typeof navigator !== "undefined" ? navigator : null;
      if (nav?.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: title || "PDF" });
        return;
      }
      const a = document.createElement("a");
      a.href = blobUrl || URL.createObjectURL(pdfBlob);
      a.download = safePdfName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e: any) {
      // AbortError = el usuario cerró el share sheet, no es un error real
      if (e?.name !== "AbortError") {
        Alert.alert("Error", e?.message || "No se pudo compartir el PDF");
      }
    } finally {
      setSharing(false);
    }
  };

  const openPdf = () => {
    if (blobUrl && typeof window !== "undefined") window.location.href = blobUrl;
  };

  useEffect(() => {
    if (base64) {
      setLoadingToken(false);
      return;
    }
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
  }, [base64]);

  useEffect(() => {
    const run = async () => {
      if (Platform.OS !== "web") return;
      try {
        setLoadingPdf(true);

        let blob: Blob;
        if (base64) {
          const byteCharacters = atob(base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
          blob = new Blob([new Uint8Array(byteNumbers)], { type: "application/pdf" });
        } else {
          if (!url || !token) return;
          const res = await fetch(url, { method: "GET", headers: { Authorization: `Bearer ${token}` } });
          if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(`HTTP ${res.status} ${res.statusText}${text ? `: ${text}` : ""}`);
          }
          blob = await res.blob();
        }

        const objectUrl = URL.createObjectURL(blob);
        setPdfBlob(blob);
        setBlobUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return objectUrl;
        });

        // Mobile Safari/Chrome no renderizan bien un PDF embebido en
        // <iframe> (sale con un zoom fijo, recortado, sin controles reales
        // ni botón de compartir), y abrir una pestaña nueva desde código
        // async suele ser bloqueado como pop-up. Navegar la misma pestaña
        // al blob es lo único fiable: Safari lo abre directo en su propio
        // visor con zoom y compartir nativos, sin pasos intermedios.
        if (isMobileWeb() && !autoOpenedRef.current) {
          autoOpenedRef.current = true;
          window.location.href = objectUrl;
        }
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
  }, [url, token, base64]);

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
        {title || "PDF"}
      </Text>

      {Platform.OS !== "web" ? (
        <TouchableOpacity
          onPress={handleShare}
          disabled={sharing}
          activeOpacity={0.7}
          className="w-10 h-10 rounded-full bg-white border border-gray-200 items-center justify-center"
        >
          {sharing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="share-outline" size={20} color={colors.primary} />
          )}
        </TouchableOpacity>
      ) : pdfBlob ? (
        <TouchableOpacity
          onPress={handleShareWeb}
          disabled={sharing}
          activeOpacity={0.7}
          className="w-10 h-10 rounded-full bg-white border border-gray-200 items-center justify-center"
        >
          {sharing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="share-outline" size={20} color={colors.primary} />
          )}
        </TouchableOpacity>
      ) : (
        <View className="w-10 h-10" />
      )}
    </View>
  );

  if (!url && !base64) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        {Header}
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-text font-extrabold text-[16px] text-center">Falta configuración</Text>
          <Text className="text-gray-500 font-semibold text-[13px] text-center mt-2">No se recibió el PDF.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!base64 && loadingToken) {
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

  if (!base64 && !token) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        {Header}
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-text font-extrabold text-[16px] text-center">Sesión no válida</Text>
          <Text className="text-gray-500 font-semibold text-[13px] text-center mt-2">No se encontró access_token. Inicia sesión de nuevo.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (Platform.OS === "web") {
    const mobileWeb = isMobileWeb();

    return (
      <SafeAreaView className="flex-1 bg-background">
        {Header}

        {loadingPdf && (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator />
            <Text className="mt-3 text-gray-500 font-semibold">Cargando PDF…</Text>
          </View>
        )}

        {!loadingPdf && !blobUrl && (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-text font-extrabold text-[16px] text-center">No se pudo mostrar el PDF</Text>
            <Text className="text-gray-500 font-semibold text-[13px] text-center mt-2">Revisa permisos o el endpoint.</Text>
          </View>
        )}

        {!loadingPdf && blobUrl && mobileWeb && (
          <View className="flex-1 items-center justify-center px-6">
            <ActivityIndicator />
            <Text className="mt-3 text-gray-500 font-semibold">Abriendo PDF…</Text>
            <TouchableOpacity onPress={openPdf} activeOpacity={0.7} className="mt-6">
              <Text className="font-bold text-[13px]" style={{ color: colors.primary }}>¿No se ha abierto? Toca aquí</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loadingPdf && blobUrl && !mobileWeb && (
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

  return (
    <SafeAreaView className="flex-1 bg-background">
      {Header}
      <WebViewNative
        source={{
          uri: base64 ? `data:application/pdf;base64,${base64}` : url,
          headers: base64 ? undefined : { Authorization: `Bearer ${token}` },
        }}
      />
    </SafeAreaView>
  );
}
