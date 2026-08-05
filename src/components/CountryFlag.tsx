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
  width,
  height,
  radius = 6,
}: {
  cca2?: string | null;
  size?: number;
  /** Overrides `size` for a non-square flag (real flags are wider than tall). */
  width?: number;
  height?: number;
  radius?: number;
}) {
  const cc = useMemo(() => normCca2(cca2), [cca2]);
  const uri = useMemo(() => (cc ? `https://flagcdn.com/${cc}.svg` : ""), [cc]);

  if (!cc) return null;

  const w = width ?? size;
  const h = height ?? size;

  return (
    <View style={{ width: w, height: h, borderRadius: radius, overflow: "hidden" }}>
      <SvgUri width={w} height={h} uri={uri} />
    </View>
  );
}
