import "react-native-gesture-handler"; // ðŸ‘ˆ OBLIGATORIO, siempre primero

import React, { useEffect, useRef, useState } from "react";
import { Platform, AppState, AppStateStatus, View, StyleSheet } from "react-native";
import { NavigationContainer, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { useTheme } from "./src/context/ThemeContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Notifications from "expo-notifications";
import { QueryClientProvider } from "@tanstack/react-query";

import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { ThemeProvider } from "./src/context/ThemeContext";
import AppNavigator from "./src/navigation/AppNavigator";
import api from "./src/api/api";
import { registerPushToken } from "./src/services/notificationService";
import { queryClient } from "./src/lib/queryClient";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { ToastContainer } from "./src/components/ui/ToastContainer";
import {
  isBiometricEnabled,
  authenticateWithBiometric,
} from "./src/hooks/useBiometric";

function AppContent() {
  const { user } = useAuth();
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  // Registrar token push cuando el usuario inicia sesiÃ³n
  useEffect(() => {
    if (!user) return;
    if (Platform.OS === "web") return;

    registerPushToken().catch(() => {});

    // Escuchar notificaciones recibidas con la app en primer plano
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (_notification) => {
        // Las notificaciones en primer plano ya se muestran gracias a setNotificationHandler
      }
    );

    // Escuchar cuando el usuario toca una notificaciÃ³n
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (_response) => {
        // AquÃ­ puedes navegar a la pantalla relevante segÃºn response.notification.request.content.data
      }
    );

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [user?.id]);

  return <AppNavigator />;
}

function ThemedNavigationContainer({ children }: { children: React.ReactNode }) {
  const { isDark } = useTheme();
  return (
    <NavigationContainer theme={isDark ? DarkTheme : DefaultTheme}>
      {children}
    </NavigationContainer>
  );
}

function BiometricGate({ children }: { children: React.ReactNode }) {
  const [locked, setLocked] = useState(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = AppState.addEventListener("change", async (next) => {
      if (appState.current.match(/active/) && next === "background") {
        const enabled = await isBiometricEnabled();
        if (enabled) setLocked(true);
      }
      if (next === "active" && locked) {
        const ok = await authenticateWithBiometric();
        if (ok) setLocked(false);
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [locked]);

  if (locked) return <View style={StyleSheet.absoluteFill} />;
  return <>{children}</>;
}

export default function App() {
  useEffect(() => {
    // Solo en web: mantener backend "caliente"
    if (Platform.OS !== "web") return;

    document.title = "Finexa";
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    const setLink = (rel: string, href: string) => {
      let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
      if (!el) {
        el = document.createElement("link");
        el.setAttribute("rel", rel);
        document.head.appendChild(el);
      }
      el.setAttribute("href", href);
    };
    setMeta("apple-mobile-web-app-capable", "yes");
    setMeta("apple-mobile-web-app-status-bar-style", "default");
    setMeta("apple-mobile-web-app-title", "Finexa");
    setMeta("theme-color", "#3B82F6");
    setLink("apple-touch-icon", "/apple-touch-icon.png");
    setLink("manifest", "/manifest.json");

    // Warm-up inmediato (no bloqueante)
    api.get("/health").catch(() => {});

    // Ping periódico
    const interval = setInterval(() => {
      api.get("/health").catch(() => {});
    }, 5 * 60 * 1000); // 5 minutos

    return () => clearInterval(interval);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ThemeProvider>
              <SafeAreaProvider>
                <BiometricGate>
                  <ThemedNavigationContainer>
                    <AppContent />
                    <ToastContainer />
                  </ThemedNavigationContainer>
                </BiometricGate>
              </SafeAreaProvider>
            </ThemeProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
