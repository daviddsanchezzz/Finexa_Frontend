// theme.ts
import { StyleSheet } from 'react-native';

export const colors = {
  primary: "#003cc5",
  secondary: "#27AE60",
  accent: "#F2C94C",
  purple: "#9B51E0",
  background: "#F9FAFB",
  text: "#1A1A1A",
  textSecondary: "#6B7280",
  border: "#E5E7EB",
  white: "#FFFFFF",
  error: "#DC2626",
  card: "#F2F4F7",

  // Tokens de la unificación visual de mobile (2026-09): un único verde/rojo
  // de dinero, un único "casi negro" de énfasis, y los dos grises de fondo
  // permitidos — sustituyen a los hex sueltos que cada pantalla inventaba.
  success: "#16A34A",
  danger: "#DC2626",
  ink: "#0F172A",
  surfaceMuted: "#F3F4F6",
  surfaceSubtle: "#F9FAFB",
};

// Radios compartidos — evita que cada pantalla invente su propio valor.
export const radii = {
  card: 16,
  input: 14,
  chip: 10,
  full: 999,
};

// Tipografía centralizada
export const typography = StyleSheet.create({
  h1: { fontFamily: 'Poppins', fontSize: 28, fontWeight: '700', lineHeight: 34 },
  h2: { fontFamily: 'Poppins', fontSize: 22, fontWeight: '600', lineHeight: 28 },
  h3: { fontFamily: 'Poppins', fontSize: 18, fontWeight: '600' },
  body: { fontFamily: 'Poppins', fontSize: 16, fontWeight: '400', lineHeight: 22 },
  caption: { fontFamily: 'Poppins', fontSize: 14, color: colors.textSecondary },
});
