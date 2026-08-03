// src/components/CrossPlatformDateTimePicker.tsx
import React, { useEffect, useRef, useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
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
  const safeDateRef = useRef(date ?? new Date());
  if (date) safeDateRef.current = date;
  const safeDate = safeDateRef.current;
  const [webValue, setWebValue] = useState<string | null>(null);

  const toLocalDate = (d: Date) =>
    new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);

  const toLocalTime = (d: Date) => d.toTimeString().slice(0, 5);

  const toLocalDateTime = (d: Date) =>
    new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);

  // Only reset internal webValue when picker OPENS (not on every render)
  const wasVisible = useRef(false);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (isVisible && !wasVisible.current) {
      setWebValue(null);
    }
    wasVisible.current = isVisible;
  }, [isVisible]);

  const formatPreview = (d: Date) => {
    if (mode === "time") {
      return d.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    if (mode === "date") {
      return d.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
    return d.toLocaleString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTitle = () => {
    if (mode === "time") return "Selecciona la hora";
    if (mode === "date") return "Selecciona la fecha";
    return "Selecciona fecha y hora";
  };

  // WEB VERSION
  if (Platform.OS === "web") {
    if (!isVisible) return null;

    const inputType =
      mode === "time" ? "time" : mode === "date" ? "date" : "datetime-local";

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

    const handleConfirmClick = (e?: any) => {
      if (e?.stopPropagation) e.stopPropagation();
      if (!value) return;
      const newDate = parseValueToDate(value);
      onConfirm(newDate);
    };

    const previewDate = value ? parseValueToDate(value) : safeDate;

    return (
      <Modal
        visible={isVisible}
        transparent
        animationType="slide"
        onRequestClose={onCancel}
        statusBarTranslucent
      >
        <View style={s.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
          <View style={s.sheet}>
            {/* Handle */}
            <View style={s.handle} />

            {/* Title */}
            <Text style={s.title}>{getTitle()}</Text>

            {/* Native date/time input */}
            {/* @ts-ignore */}
            <input
              type={inputType}
              value={value}
              onChange={(e: any) => setWebValue(e.target.value)}
              style={{
                width: "100%",
                height: 44,
                borderRadius: 12,
                border: "1px solid #D1D5DB",
                backgroundColor: "#F9FAFB",
                textAlign: "center",
                fontSize: 16,
                color: "#111827",
                outline: "none",
                boxSizing: "border-box",
              }}
            />

            {/* Confirm */}
            <Pressable
              onPress={handleConfirmClick}
              style={({ pressed }) => [s.confirmBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={s.confirmText}>Confirmar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  // MOBILE VERSION
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

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 16,
  },
  confirmBtn: {
    marginTop: 20,
    backgroundColor: "#2563EB",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  confirmText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
