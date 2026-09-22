import React from "react";
import DesktopAuthScreen from "./DesktopAuthScreen";

export default function DesktopRegisterScreen({ navigation }: any) {
  return <DesktopAuthScreen mode="register" navigation={navigation} />;
}
