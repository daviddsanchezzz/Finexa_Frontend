// src/components/CrossPlatformDateTimePicker.tsx
import React, { useEffect, useRef } from "react";
import { Platform } from "react-native";
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
  const webInputRef = useRef<any>(null);

  const toLocalDate = (d: Date) =>
    new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  const toLocalTime = (d: Date) => d.toTimeString().slice(0, 5);

  const toLocalDateTime = (d: Date) =>
    new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  // WEB: en cuanto se abre, disparamos directamente el selector nativo del
  // navegador con showPicker() — sin hoja intermedia propia con botón
  // "Confirmar". Si el navegador no soporta showPicker(), caemos a un click
  // programático (abre el mismo picker nativo al enfocar el input).
  useEffect(() => {
    if (Platform.OS !== "web" || !isVisible) return;
    const id = requestAnimationFrame(() => {
      const el = webInputRef.current;
      if (!el) return;
      if (typeof el.showPicker === "function") {
        try {
          el.showPicker();
          return;
        } catch {
          // sigue al fallback de abajo
        }
      }
      el.click?.();
    });
    return () => cancelAnimationFrame(id);
  }, [isVisible]);

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

  // WEB VERSION — input nativo invisible: el propio navegador dibuja el
  // calendario/reloj, seleccionar un valor confirma al instante.
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

    return (
      // @ts-ignore
      <input
        ref={webInputRef}
        type={inputType}
        defaultValue={defaultValue}
        onChange={(e: any) => {
          if (!e.target.value) return;
          onConfirm(parseValueToDate(e.target.value));
        }}
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
