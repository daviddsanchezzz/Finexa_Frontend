// src/components/CrossPlatformDateTimePicker.tsx
import React, { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { colors } from "../theme/theme";

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

  useEffect(() => {
    if (Platform.OS === "web" && isVisible) {
      setWebValue(null);
    }
  }, [isVisible, date, mode]);

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

    const handleConfirmClick = () => {
      if (!value) return;
      const newDate = parseValueToDate(value);
      onConfirm(newDate);
    };

    const previewDate = value ? parseValueToDate(value) : safeDate;

    return (
      <View className="fixed inset-0 z-[9999] flex items-end justify-center">
        {/* Backdrop clickable => cancel */}
        {/* @ts-ignore */}
        <div
          className="absolute inset-0 bg-black/40"
          onClick={onCancel}
        />

        {/* Sheet */}
        {/* @ts-ignore */}
        <div className="relative w-full max-w-md mx-auto px-4 pb-6">
          {/* @ts-ignore */}
          <div
            className="
              bg-white rounded-3xl border border-gray-200 shadow-xl 
              overflow-hidden transition-transform duration-200
            "
          >
            {/* Handle */}
            {/* @ts-ignore */}
            <div className="pt-3 pb-2 flex justify-center">
              <div className="h-1 w-10 rounded-full bg-gray-300" />
            </div>

            {/* Content */}
            {/* @ts-ignore */}
            <div className="px-4 pb-4">
              {/* Title + preview */}
              {/* @ts-ignore */}
              <div className="mb-4 text-center">
                <p className="text-xs font-semibold text-gray-500 tracking-wide uppercase">
                  {getTitle()}
                </p>
              </div>

              {/* Input */}
              {/* @ts-ignore */}
              <div className="px-1">
                {/* @ts-ignore */}
                <input
                  type={inputType}
                  value={value}
                  onChange={(e: any) => setWebValue(e.target.value)}
                  className="
                    w-full h-11 rounded-xl border border-gray-300 
                    bg-gray-50 text-center text-lg text-gray-900 
                    outline-none shadow-sm
                    focus:bg-white focus:border-blue-500 
                    focus:ring-2 focus:ring-blue-500/40
                    transition
                  "
                />
              </div>

              {/* Confirm button */}
              {/* @ts-ignore */}
              <button
                type="button"
                onClick={handleConfirmClick}
                className="
                  mt-5 w-full py-3 rounded-full 
                  bg-blue-500 text-white text-[15px] font-semibold 
                  cursor-pointer active:scale-[0.98] 
                  transition transform shadow-sm
                "
                style={{
                  backgroundColor: colors.primary,
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      </View>
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
