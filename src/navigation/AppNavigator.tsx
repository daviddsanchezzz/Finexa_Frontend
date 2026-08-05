import React from "react";
import { ActivityIndicator, View } from "react-native";
import MobileNavigator from "./MobileNavigator";
import DesktopNavigator from "./DesktopNavigator";
import { useLayoutMode } from "../hooks/useLayoutMode";
import { readQuickAddFromUrl, saveQuickAddToSession, sendQuickAddNotification } from "../utils/quickAdd";

// Lee los params síncronamente al cargar el módulo, antes de que
// React Navigation pueda modificar la URL.
if (typeof window !== 'undefined') {
  const _quickAdd = readQuickAddFromUrl();
  if (_quickAdd) {
    saveQuickAddToSession(_quickAdd.params);
    // Solo la apertura "en caliente" (pago con tarjeta) crea la notificación
    // pendiente; si se abrió tocando esa misma notificación, ya existe.
    if (!_quickAdd.fromNotification) {
      sendQuickAddNotification(_quickAdd.params);
    }
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
