import React from "react";
import { ActivityIndicator, View } from "react-native";
import MobileNavigator from "./MobileNavigator";
import DesktopNavigator from "./DesktopNavigator";
import { useLayoutMode } from "../hooks/useLayoutMode";

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
