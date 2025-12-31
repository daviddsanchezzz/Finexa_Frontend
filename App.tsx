import "react-native-gesture-handler"; // 👈 OBLIGATORIO, siempre primero

import React, { useEffect } from "react";
import { Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AuthProvider } from "./src/context/AuthContext";
import AppNavigator from "./src/navigation/AppNavigator";
import { colors } from "./src/theme/theme";
import api from "./src/api/api"; // <-- tu instancia axios

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
            <AppNavigator />
          </NavigationContainer>
        </SafeAreaProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
