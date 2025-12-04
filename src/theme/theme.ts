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
  error: "#E63946",
  card: "#F2F4F7",

};

// Tipografía centralizada
export const typography = StyleSheet.create({
  h1: { fontFamily: 'Poppins', fontSize: 28, fontWeight: '700', lineHeight: 34 },
  h2: { fontFamily: 'Poppins', fontSize: 22, fontWeight: '600', lineHeight: 28 },
  h3: { fontFamily: 'Poppins', fontSize: 18, fontWeight: '600' },
  body: { fontFamily: 'Poppins', fontSize: 16, fontWeight: '400', lineHeight: 22 },
  caption: { fontFamily: 'Poppins', fontSize: 14, color: colors.textSecondary },
});
