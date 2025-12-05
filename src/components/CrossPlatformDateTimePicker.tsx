// src/components/CrossPlatformDateTimePicker.tsx
import React from "react";
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

  if (Platform.OS === "web") {
    if (!isVisible) return null;

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

    const handleChange = (e: any) => {
      const v = e.target.value;
      if (!v) return;

      let newDate: Date;

      if (mode === "time") {
        // v = "HH:MM"
        const [h, m] = v.split(":").map((n: string) => parseInt(n, 10));
        newDate = new Date(safeDate);
        newDate.setHours(h, m, 0, 0);
      } else if (mode === "date") {
        // v = "YYYY-MM-DD"
        newDate = new Date(v + "T00:00");
      } else {
        // datetime-local: "YYYY-MM-DDTHH:MM"
        newDate = new Date(v);
      }

      onConfirm(newDate);
    };

    return (
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <Text style={styles.title}>Selecciona fecha y hora</Text>

          {/* @ts-ignore: HTML input solo existe en web */}
          <input
            type={inputType}
            defaultValue={defaultValue}
            onChange={handleChange}
            style={{ width: "100%", padding: 8, fontSize: 16 }}
          />

          {/* @ts-ignore */}
          <button
            style={{ marginTop: 12, padding: 8, width: "100%" }}
            onClick={onCancel}
          >
            Cancelar
          </button>
        </View>
      </View>
    );
  }

  // iOS / Android: el picker original
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
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  modal: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 16,
    minWidth: 260,
  },
  title: {
    fontSize: 16,
    marginBottom: 8,
  },
});
