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
  const { user, loading } = useAuth();

  // Loader coherente con mobile
  if (loading) {
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
