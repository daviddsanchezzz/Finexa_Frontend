import React from "react";
import { ActivityIndicator, View } from "react-native";
import MobileNavigator from "./MobileNavigator";
import DesktopNavigator from "./DesktopNavigator";
import { useLayoutMode } from "../hooks/useLayoutMode";
import { readQuickAddFromUrl, saveQuickAddToSession } from "../utils/quickAdd";

// Lee los params síncronamente al cargar el módulo, antes de que
// React Navigation pueda modificar la URL.
if (typeof window !== 'undefined') {
  const _quickAddParams = readQuickAddFromUrl();
  if (_quickAddParams) {
    saveQuickAddToSession(_quickAddParams);
    window.history.replaceState({}, '', '/');
  }
}

export default function AppNavigator() {
  const { loaded, mode } = useLayoutMode();

  if (!loaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "white" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return mode === "desktop" ? <DesktopNavigator /> : <MobileNavigator />;
}
