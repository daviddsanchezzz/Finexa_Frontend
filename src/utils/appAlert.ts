// src/utils/appAlert.ts
import { Alert, Platform } from "react-native";
import { useUIStore } from "../store/uiStore";

export type AppAlertButton = {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
};

export function appAlert(
  title: string,
  message?: string,
  buttons?: AppAlertButton[]
) {
  // Nativo → usamos Alert.alert normal
  if (Platform.OS === "ios" || Platform.OS === "android") {
    Alert.alert(title, message, buttons);
    return;
  }

  // WEB
  if (!buttons || buttons.length === 0) {
    // Caso simple sin botones personalizados
    window.alert(`${title}\n\n${message ?? ""}`);
    return;
  }

  // Si solo hay 1 botón
  if (buttons.length === 1) {
    window.alert(`${title}\n\n${message ?? ""}`);
    buttons[0].onPress && buttons[0].onPress();
    return;
  }

  // Si hay 2 botones → confirm (OK / Cancel)
  if (buttons.length === 2) {
    const primary =
      buttons.find((b) => b.style !== "cancel") ?? buttons[0];
    const cancel =
      buttons.find((b) => b.style === "cancel") ?? buttons[1];

    const ok = window.confirm(`${title}\n\n${message ?? ""}`);
    if (ok) {
      primary.onPress && primary.onPress();
    } else {
      cancel.onPress && cancel.onPress();
    }
    return;
  }

  // Más de 2 botones → hoja de acciones real (nunca un prompt numerado)
  useUIStore.getState().showActionSheet(title, message, buttons);
}
