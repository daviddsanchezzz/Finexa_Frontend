// src/theme/typography.ts
// Tipografía “finanzas” para toda la app (menús, cards, tablas, botones, etc.)
// EXCEPCIÓN: el texto "Finexa" (branding) NO lo pases por estos estilos.

import { Platform, TextStyle } from "react-native";

const isWeb = Platform.OS === "web";

/**
 * Stack serio y moderno (estilo finanzas).
 * - En web: intenta Inter primero y cae a system-ui/SF/Segoe/Roboto.
 * - En iOS/Android: RN usará la tipografía del sistema si no cargas fuentes.
 *   (Si más adelante cargas Inter, bastará con cambiar base.family).
 */
const families = {
  base: isWeb
    ? 'Inter, system-ui, -apple-system, "SF Pro Text", "Segoe UI", Roboto, Arial, sans-serif'
    : undefined,
  mono: isWeb
    ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
    : undefined,
};

/** Utilidad: números alineados (muy “finanzas”) */
const tabularNums: TextStyle = isWeb
  ? ({
      // @ts-ignore (en RN Web funciona; en native simplemente se ignora)
      fontVariantNumeric: "tabular-nums",
    } as any)
  : {};

export const typography = {
  family: families,
  tabularNums,
};

/**
 * Sistema de estilos de texto (usa esto en <Text style={[textStyles.body, ...]}>)
 * Recomendación:
 * - Evita fontWeight 900 en casi todo. 700–800 es más “serio”.
 * - Usa tabularNums en KPIs, importes y porcentajes.
 */
export const textStyles = {
  // Headings
  h1: {
    fontFamily: families.base,
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: isWeb ? -0.2 : 0,
  } as TextStyle,

  h2: {
    fontFamily: families.base,
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: isWeb ? -0.15 : 0,
  } as TextStyle,

  h3: {
    fontFamily: families.base,
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  } as TextStyle,

  // Labels / captions
  label: {
    fontFamily: families.base,
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  } as TextStyle,

  labelMuted: {
    fontFamily: families.base,
    fontSize: 26,
    fontWeight: "700",
    color: "#94A3B8",
  } as TextStyle,

    labelMuted2 : {
    fontFamily: families.base,
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
  } as TextStyle,

  caption: {
    fontFamily: families.base,
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  } as TextStyle,

  // Body
  body: {
    fontFamily: families.base,
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  } as TextStyle,

  bodyMuted: {
    fontFamily: families.base,
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  } as TextStyle,

  // Buttons
  button: {
    fontFamily: families.base,
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
  } as TextStyle,

  // Numbers (KPIs, importes, %)
  numberXL: {
    fontFamily: families.base,
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    ...tabularNums,
  } as TextStyle,

  numberLG: {
    fontFamily: families.base,
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    ...tabularNums,
  } as TextStyle,

  number: {
    fontFamily: families.base,
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    ...tabularNums,
  } as TextStyle,

  numberMuted: {
    fontFamily: families.base,
    fontSize: 11,
    fontWeight: "800",
    color: "#94A3B8",
    ...tabularNums,
  } as TextStyle,

  // Optional: monospace para IDs / símbolos / ticks
  mono: {
    fontFamily: families.mono,
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
    ...tabularNums,
  } as TextStyle,
};
