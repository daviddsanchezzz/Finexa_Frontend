import React, { useMemo } from "react";
import { View } from "react-native";
import { SvgUri } from "react-native-svg";

function normCca2(cca2?: string | null) {
  const cc = String(cca2 || "").trim().toLowerCase();
  return cc.length === 2 ? cc : "";
}

export function CountryFlag({
  cca2,
  size = 26,
  radius = 6,
}: {
  cca2?: string | null;
  size?: number;
  radius?: number;
}) {
  const cc = useMemo(() => normCca2(cca2), [cca2]);
  const uri = useMemo(() => (cc ? `https://flagcdn.com/${cc}.svg` : ""), [cc]);

  if (!cc) return null;

  return (
    <View style={{ width: size, height: size, borderRadius: radius, overflow: "hidden" }}>
      <SvgUri width={size} height={size} uri={uri} />
    </View>
  );
}
