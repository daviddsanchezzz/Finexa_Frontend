// src/components/CrossPlatformDateTimePicker.tsx
import React, { useLayoutEffect, useRef } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";

interface Props {
  isVisible: boolean;
  date?: Date;
  mode?: "date" | "time" | "datetime";
  onConfirm: (d: Date) => void;
  onCancel: () => void;
}

const supportsShowPicker =
  Platform.OS === "web" &&
  typeof window !== "undefined" &&
  typeof (window as any).HTMLInputElement !== "undefined" &&
  typeof (window as any).HTMLInputElement.prototype.showPicker === "function";

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
  const webInputRef = useRef<any>(null);

  const toLocalDate = (d: Date) =>
    new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  const toLocalTime = (d: Date) => d.toTimeString().slice(0, 5);

  const toLocalDateTime = (d: Date) =>
    new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  const getTitle = () => {
    if (mode === "time") return "Selecciona la hora";
    if (mode === "date") return "Selecciona la fecha";
    return "Selecciona fecha y hora";
  };

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

  // WEB con showPicker() soportado: abrimos el selector nativo del
  // navegador de forma SÍNCRONA en cuanto el input se monta (useLayoutEffect,
  // sin requestAnimationFrame de por medio) para que siga contando como
  // parte del mismo gesto del usuario que abrió la pantalla — si se difiere
  // al siguiente frame, algunos navegadores lo bloquean silenciosamente y no
  // pasa nada al tocar "Fecha y hora".
  useLayoutEffect(() => {
    if (!supportsShowPicker || !isVisible) return;
    try {
      webInputRef.current?.showPicker?.();
    } catch {
      // el input sigue montado y se puede tocar directamente como respaldo
    }
  }, [isVisible]);

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

    const handleChange = (e: any) => {
      if (!e.target.value) return;
      onConfirm(parseValueToDate(e.target.value));
    };

    // Navegador con showPicker(): el input no necesita ser visible, se abre
    // directamente el calendario/reloj nativo del sistema — nada de hoja
    // intermedia propia.
    if (supportsShowPicker) {
      return (
        // @ts-ignore
        <input
          ref={webInputRef}
          type={inputType}
          defaultValue={defaultValue}
          onChange={handleChange}
          onBlur={onCancel}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: 1,
            height: 1,
            opacity: 0,
            border: "none",
            pointerEvents: "none",
          }}
        />
      );
    }

    // Fallback (navegador sin showPicker()): hoja con el input visible,
    // que el usuario toca directamente para abrir el picker nativo.
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
            <View style={s.handle} />
            <Text style={s.title}>{getTitle()}</Text>
            {/* @ts-ignore */}
            <input
              type={inputType}
              defaultValue={defaultValue}
              onChange={handleChange}
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
});
