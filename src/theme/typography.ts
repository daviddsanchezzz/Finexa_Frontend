// src/theme/typography.ts
import { Platform, TextStyle } from "react-native";

const isWeb = Platform.OS === "web";

const families = {
  base: isWeb
    ? 'Inter, system-ui, -apple-system, "SF Pro Text", "Segoe UI", Roboto, Arial, sans-serif'
    : undefined,
  mono: isWeb
    ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
    : undefined,
};

const tabularNums: TextStyle = isWeb
  ? ({ fontVariantNumeric: "tabular-nums" } as any)
  : {};

export const typography = {
  family: families,
  tabularNums,
};

/**
 * Reglas:
 * - Base weight: 500/600
 * - Emphasis: 600/700
 * - Display numbers: 700 (y 800 solo si hace falta)
 * - Evitar 900 salvo branding puntual
 */
export const textStyles = {
  // Headings
  h1: {
    fontFamily: families.base,
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: isWeb ? -0.3 : 0,
  } as TextStyle,

  h2: {
    fontFamily: families.base,
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: isWeb ? -0.15 : 0,
  } as TextStyle,

  h3: {
    fontFamily: families.base,
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  } as TextStyle,

  // Labels / captions
  label: {
    fontFamily: families.base,
    fontSize: 12,
    fontWeight: "600",
    color: "#0F172A",
  } as TextStyle,

  labelMuted: {
    fontFamily: families.base,
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    letterSpacing: isWeb ? 0.2 : 0,
    textTransform: isWeb ? ("uppercase" as any) : undefined,
  } as TextStyle,

  caption: {
    fontFamily: families.base,
    fontSize: 11,
    fontWeight: "500",
    color: "#64748B",
  } as TextStyle,

  // Body
  body: {
    fontFamily: families.base,
    fontSize: 13,
    fontWeight: "500",
    color: "#0F172A",
  } as TextStyle,

  bodyMuted: {
    fontFamily: families.base,
    fontSize: 12,
    fontWeight: "500",
    color: "#64748B",
  } as TextStyle,

  // Buttons
  button: {
    fontFamily: families.base,
    fontSize: 12,
    fontWeight: "600",
    color: "#0F172A",
  } as TextStyle,

  // Numbers
  numberXL: {
    fontFamily: families.base,
    fontSize: 24,
    fontWeight: "700",
    color: "#0F172A",
    ...tabularNums,
  } as TextStyle,

  numberLG: {
    fontFamily: families.base,
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    ...tabularNums,
  } as TextStyle,

  number: {
    fontFamily: families.base,
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
    ...tabularNums,
  } as TextStyle,

  numberMuted: {
    fontFamily: families.base,
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
    ...tabularNums,
  } as TextStyle,

  mono: {
    fontFamily: families.mono,
    fontSize: 12,
    fontWeight: "600",
    color: "#0F172A",
    ...tabularNums,
  } as TextStyle,
};
