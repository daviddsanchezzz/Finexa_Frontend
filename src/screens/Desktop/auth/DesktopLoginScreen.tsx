import React from "react";
import DesktopAuthScreen from "./DesktopAuthScreen";

export default function DesktopLoginScreen({ navigation }: any) {
  return <DesktopAuthScreen mode="login" navigation={navigation} />;
}
