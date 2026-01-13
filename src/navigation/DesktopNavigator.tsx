import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../context/AuthContext";

// Desktop auth screens
import DesktopLoginScreen from "../screens/Desktop/auth/DesktopLoginScreen";
import DesktopRegisterScreen from "../screens/Desktop/auth/DesktopRegisterScreen";

// Desktop shell (layout principal)
import DesktopShellNavigator from "./DesktopShellNavigator";

export type DesktopStackParamList = {
  DesktopLogin: undefined;
  DesktopRegister: undefined;
  DesktopShell: undefined;
};

const Stack = createNativeStackNavigator<DesktopStackParamList>();

export default function DesktopNavigator() {
  // ✅ Igual que en Mobile: hydrated + checkingSession
  const { user, hydrated, checkingSession } = useAuth();

  // 1) Espera a hidratar storage
  if (!hydrated) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "white" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // 2) Espera a restaurar sesión (refresh + /auth/me)
  if (checkingSession) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "white" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        // 🔒 Rutas privadas desktop
        <Stack.Screen name="DesktopShell" component={DesktopShellNavigator} />
      ) : (
        // 🔓 Rutas públicas desktop
        <>
          <Stack.Screen name="DesktopLogin" component={DesktopLoginScreen} />
          <Stack.Screen name="DesktopRegister" component={DesktopRegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
