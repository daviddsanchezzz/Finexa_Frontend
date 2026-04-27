import "react-native-gesture-handler"; // 👈 OBLIGATORIO, siempre primero

import React, { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Notifications from "expo-notifications";

import { AuthProvider, useAuth } from "./src/context/AuthContext";
import AppNavigator from "./src/navigation/AppNavigator";
import { colors } from "./src/theme/theme";
import api from "./src/api/api";
import { registerPushToken } from "./src/services/notificationService";

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
      <AuthProvider>
        <SafeAreaProvider>
          <NavigationContainer>
            <AppContent />
          </NavigationContainer>
        </SafeAreaProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
