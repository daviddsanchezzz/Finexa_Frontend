import React, { useMemo } from "react";
import { View, Image } from "react-native";

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
  // PNG en vez de SVG: react-native-svg no soporta bien banderas con texto
  // vectorial complejo (p.ej. la caligrafía árabe de Arabia Saudí no se
  // llega a pintar y solo queda el fondo sólido). Un raster ya renderizado
  // siempre muestra el diseño completo.
  const uri = useMemo(() => (cc ? `https://flagcdn.com/w80/${cc}.png` : ""), [cc]);

  if (!cc) return null;

  const w = width ?? size;
  const h = height ?? size;

  return (
    <View style={{ width: w, height: h, borderRadius: radius, overflow: "hidden" }}>
      <Image source={{ uri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
    </View>
  );
}
