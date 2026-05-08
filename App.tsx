import "react-native-gesture-handler"; // 👈 OBLIGATORIO, siempre primero

import React, { useEffect, useRef, useState } from "react";
import { Platform, AppState, AppStateStatus, View, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Notifications from "expo-notifications";
import { QueryClientProvider } from "@tanstack/react-query";

import { AuthProvider, useAuth } from "./src/context/AuthContext";
import AppNavigator from "./src/navigation/AppNavigator";
import { colors } from "./src/theme/theme";
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

  // Registrar token push cuando el usuario inicia sesión
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

    // Escuchar cuando el usuario toca una notificación
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (_response) => {
        // Aquí puedes navegar a la pantalla relevante según response.notification.request.content.data
      }
    );

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [user?.id]);

  return <AppNavigator />;
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
    // ✅ Solo en web: mantener backend "caliente"
    if (Platform.OS !== "web") return;

    // Warm-up inmediato (no bloqueante)
    api.get("/health").catch(() => {});

    // Ping periódico
    const interval = setInterval(() => {
      api.get("/health").catch(() => {});
    }, 5 * 60 * 1000); // 5 minutos

    return () => clearInterval(interval);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <SafeAreaProvider>
              <BiometricGate>
                <NavigationContainer>
                  <AppContent />
                  <ToastContainer />
                </NavigationContainer>
              </BiometricGate>
            </SafeAreaProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
