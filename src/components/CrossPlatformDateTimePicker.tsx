// src/components/CrossPlatformDateTimePicker.tsx
import React, { useEffect, useState } from "react";
import { Platform, View, Text, StyleSheet } from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";

interface Props {
  isVisible: boolean;
  date?: Date;
  mode?: "date" | "time" | "datetime";
  onConfirm: (d: Date) => void;
  onCancel: () => void;
}

export default function CrossPlatformDateTimePicker({
  isVisible,
  date,
  mode = "datetime",
  onConfirm,
  onCancel,
}: Props) {
  const safeDate = date ?? new Date();

  // Estado solo para web, para poder confirmar con botón
  const [webValue, setWebValue] = useState<string | null>(null);

  const toLocalDate = (d: Date) =>
    new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10); // YYYY-MM-DD

  const toLocalTime = (d: Date) =>
    d
      .toTimeString() // "HH:MM:SS GMT..."
      .slice(0, 5); // "HH:MM"

  const toLocalDateTime = (d: Date) =>
    new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16); // "YYYY-MM-DDTHH:MM"

  useEffect(() => {
    if (Platform.OS === "web" && isVisible) {
      setWebValue(null);
    }
  }, [isVisible, date, mode]);

  if (Platform.OS === "web") {
    if (!isVisible) return null;

    const inputType =
      mode === "time"
        ? "time"
        : mode === "date"
        ? "date"
        : "datetime-local";

    const defaultValue =
      mode === "time"
        ? toLocalTime(safeDate)
        : mode === "date"
        ? toLocalDate(safeDate)
        : toLocalDateTime(safeDate);

    const value = webValue ?? defaultValue;

    const parseValueToDate = (v: string): Date => {
      let newDate: Date;

      if (mode === "time") {
        const [h, m] = v.split(":").map((n: string) => parseInt(n, 10));
        newDate = new Date(safeDate);
        newDate.setHours(h, m, 0, 0);
      } else if (mode === "date") {
        newDate = new Date(v + "T00:00");
      } else {
        newDate = new Date(v);
      }

      return newDate;
    };

    const handleConfirmClick = () => {
      if (!value) return;
      const newDate = parseValueToDate(value);
      onConfirm(newDate);
    };

    return (
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* “Picker” central tipo iOS wheel (simulado con input centrado) */}
          <View style={styles.pickerContainer}>
            {/* @ts-ignore: HTML input solo existe en web */}
            <input
              type={inputType}
              value={value}
              onChange={(e: any) => setWebValue(e.target.value)}
              style={{
                width: "100%",
                height: 44,
                borderRadius: 12,
                border: "none",
                backgroundColor: "#F3F4F6",
                fontSize: 18,
                textAlign: "center",
                outline: "none",
                color: "#111827",
                boxShadow: "0 0 0 1px rgba(209,213,219,1)",
                boxSizing: "border-box",
              }}
            />
          </View>

          {/* Botón Confirm (azul, como en iOS) */}
          {/* @ts-ignore */}
          <button
            type="button"
            onClick={handleConfirmClick}
            style={{
              marginTop: 12,
              width: "100%",
              padding: 11,
              borderRadius: 999,
              border: "none",
              backgroundColor: "#007AFF",
              color: "#FFFFFF",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Confirm
          </button>

          {/* Botón Cancel debajo, estilo iOS */}
          {/* @ts-ignore */}
          <button
            type="button"
            onClick={onCancel}
            style={{
              marginTop: 8,
              width: "100%",
              padding: 11,
              borderRadius: 999,
              border: "none",
              backgroundColor: "#FFFFFF",
              color: "#007AFF",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 0 0 1px rgba(209,213,219,1)",
            }}
          >
            Cancel
          </button>
        </View>
      </View>
    );
  }

  // iOS / Android: picker nativo
  return (
    <DateTimePickerModal
      isVisible={isVisible}
      mode={mode}
      date={safeDate}
      locale="es_ES"
      is24Hour
      themeVariant="light"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end", // sheet abajo como en iOS
    alignItems: "stretch",
    zIndex: 9999,
  },
  sheet: {
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderColor: "rgba(209,213,219,1)",
    borderTopWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
  },
  pickerContainer: {
    paddingHorizontal: 4,
  },
});
