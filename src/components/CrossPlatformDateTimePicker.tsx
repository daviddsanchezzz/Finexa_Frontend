// src/components/CrossPlatformDateTimePicker.tsx
import React from "react";
import { Platform, View, Text, StyleSheet } from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";

interface Props {
  isVisible: boolean;
  date: Date;
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
  if (Platform.OS === "web") {
    const value = new Date(date);

    const toLocalInput = (d: Date) =>
      new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16); // "YYYY-MM-DDTHH:mm"

    const handleChange = (e: any) => {
      const v = e.target.value; // "2025-12-05T19:30"
      if (!v) return;
      const newDate = new Date(v);
      onConfirm(newDate);
    };

    if (!isVisible) return null;

    return (
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <Text style={styles.title}>Selecciona fecha y hora</Text>

          {/* @ts-ignore: HTML input solo en web */}
          <input
            type={
              mode === "time"
                ? "time"
                : mode === "date"
                ? "date"
                : "datetime-local"
            }
            defaultValue={toLocalInput(value)}
            onChange={handleChange}
            style={{ width: "100%", padding: 8, fontSize: 16 }}
          />

          {/* @ts-ignore: HTML button solo en web */}
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

  // iOS / Android → el modal que ya usas
  return (
    <DateTimePickerModal
      isVisible={isVisible}
      mode={mode}
      date={date}
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
    ...StyleSheet.absoluteFillObject, // = { position:"absolute", top:0, right:0, bottom:0, left:0 }
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
