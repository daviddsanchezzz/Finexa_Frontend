import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, Platform, Alert } from "react-native";
import Modal from "react-native-modal";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/theme";

interface DateFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (range: { from: string; to: string; label: string; type: string }) => void;
  showCustomRange?: boolean;
  showTotalRange?: boolean;
  showDayRange?: boolean;
}

export default function DateFilterModal({
  visible,
  onClose,
  onSelect,
  showCustomRange = true,
  showTotalRange = true,
  showDayRange = false,
}: DateFilterModalProps) {
  const today = new Date();

  const [dayDate, setDayDate] = useState(new Date(today));
  const [monthDate, setMonthDate] = useState(new Date(today));
  const [weekStart, setWeekStart] = useState(getWeekStart(today));
  const [year, setYear] = useState(today.getFullYear());
  const [activeFilter, setActiveFilter] = useState<
    "day" | "month" | "week" | "year" | "all" | "custom" | null
  >(null);

  const [showPicker, setShowPicker] = useState<"from" | "to" | null>(null);
  const [pickerDraft, setPickerDraft] = useState<Date>(new Date());
  const [tempFrom, setTempFrom] = useState<Date | null>(null);
  const [tempTo, setTempTo] = useState<Date | null>(null);

  const hasInitialized = useRef(false);

  /* ---------------------- Utils -------------------------------- */

  function getWeekStart(date: Date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

  const formatWeekRange = (start: Date) => {
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const fmt = (d: Date) =>
      d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
    return `${fmt(start)} - ${fmt(end)}`;
  };

  /* ---------------------- Emit range --------------------------- */

  const emitRange = (
    type: "day" | "month" | "week" | "year" | "all",
    baseDate?: Date,
    reset = false,
    autoClose = false
  ) => {
    if (reset) {
      const now = new Date();
      setDayDate(now);
      setMonthDate(now);
      setWeekStart(getWeekStart(now));
      setYear(now.getFullYear());
    }

    setTempFrom(null);
    setTempTo(null);
    setShowPicker(null);

    let from, to, label;

    if (type === "day") {
      const d = baseDate || dayDate;
      from = new Date(d);
      to = new Date(d);
      label = d.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
      setActiveFilter("day");
    }

    else if (type === "month") {
      const d = baseDate || monthDate;
      from = new Date(d.getFullYear(), d.getMonth(), 1);
      to = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      label = capitalize(
        d.toLocaleString("es-ES", { month: "long", year: "numeric" }).replace("de ", "")
      );
      setActiveFilter("month");
    }

    else if (type === "week") {
      const start = baseDate || weekStart;
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      from = start;
      to = end;
      label = `Semana ${formatWeekRange(start)}`;
      setActiveFilter("week");
    }

    else if (type === "year") {
      const y = baseDate ? baseDate.getFullYear() : year;
      from = new Date(y, 0, 1);
      to = new Date(y, 11, 31);
      label = `${y}`;
      setActiveFilter("year");
    }

    else if (type === "all") {
      from = new Date(1970, 0, 1);
      to = today;
      label = "Todas";
      setActiveFilter("all");
    }

    onSelect({
      from: from.toISOString(),
      to: to.toISOString(),
      label,
      type
    });

    if (autoClose) onClose();
  };

  /* ---------------------- Init --------------------------- */

  useEffect(() => {
    if (visible && !hasInitialized.current) {
      emitRange("month", today, false, false);
      hasInitialized.current = true;
    }
  }, [visible]);

  useEffect(() => {
    if (visible && hasInitialized.current) {
      if (activeFilter === "day") emitRange("day", dayDate, false, false);
      if (activeFilter === "week") emitRange("week", weekStart, false, false);
      if (activeFilter === "month") emitRange("month", monthDate, false, false);
      if (activeFilter === "year") emitRange("year", new Date(year, 0, 1), false, false);
    }
  }, [visible]);


  /* ---------------------- Change Day/Month/Week/Year ----- */

  const changeDay = (dir: "prev" | "next") => {
    const newDate = new Date(dayDate);
    newDate.setDate(dayDate.getDate() + (dir === "next" ? 1 : -1));
    setDayDate(newDate);
    emitRange("day", newDate);
  };

  const changeMonth = (dir: "prev" | "next") => {
    const newDate = new Date(monthDate);
    newDate.setMonth(monthDate.getMonth() + (dir === "next" ? 1 : -1));
    setMonthDate(newDate);
    emitRange("month", newDate);
  };

  const changeWeek = (dir: "prev" | "next") => {
    const newStart = new Date(weekStart);
    newStart.setDate(weekStart.getDate() + (dir === "next" ? 7 : -7));
    setWeekStart(newStart);
    emitRange("week", newStart);
  };

  const changeYear = (dir: "prev" | "next") => {
    const newYear = year + (dir === "next" ? 1 : -1);
    setYear(newYear);
    emitRange("year", new Date(newYear, 0, 1));
  };

  /* ---------------------- Custom Range ------------------- */

  const openPicker = (which: "from" | "to") => {
    setShowPicker(which);
    setPickerDraft(which === "from" ? tempFrom || new Date() : tempTo || new Date());
    setActiveFilter("custom");
  };

  const applySingle = () => {
    if (!showPicker) return;
    if (showPicker === "from") setTempFrom(pickerDraft);
    else setTempTo(pickerDraft);
    setShowPicker(null);
  };

  const handleApplyCustom = () => {
    if (!tempFrom || !tempTo) return;
    if (tempFrom > tempTo) {
      Alert.alert("Rango inválido", "La fecha 'Desde' no puede ser posterior a 'Hasta'.");
      return;
    }
    onSelect({
      from: tempFrom.toISOString(),
      to: tempTo.toISOString(),
      label: `${tempFrom.toLocaleDateString()} - ${tempTo.toLocaleDateString()}`,
      type: "custom"
    });
    setActiveFilter("custom");
    onClose();
  };

  const getBlockStyle = (type: "day" | "month" | "week" | "year" | "all") => {
    const active = activeFilter === type;
    return `rounded-xl px-4 py-3 mb-2 border ${
      active ? "bg-primary/10 border-primary" : "bg-gray-50 border-transparent"
    }`;
  };

  /* ---------------------- UI ------------------- */

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      backdropOpacity={0.4}
      style={{ justifyContent: "flex-end", margin: 0 }}
      avoidKeyboard
    >
      <View className="bg-white rounded-t-3xl p-5 pb-8 max-h-[80%]">

        {/* HEADER */}
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-[17px] font-semibold text-text">Seleccionar periodo</Text>

          <View className="flex-row items-center">

            {/* HOY → SIEMPRE MES ACTUAL */}
            <TouchableOpacity
              onPress={() => {
                const now = new Date();
                const first = new Date(now.getFullYear(), now.getMonth(), 1);
                const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);

                onSelect({
                  from: first.toISOString(),
                  to: last.toISOString(),
                  label: now
                    .toLocaleString("es-ES", { month: "long", year: "numeric" })
                    .replace("de ", ""),
                  type: "month",
                });

                // Estado interno reseteado al mes actual
                setDayDate(now);
                setMonthDate(now);
                setWeekStart(getWeekStart(now));
                setYear(now.getFullYear());

                setActiveFilter("month");
              }}
              style={{ marginRight: 15 }}
            >
              <Text className="text-[14px] font-semibold text-primary">Hoy</Text>
            </TouchableOpacity>

            {/* CERRAR */}
            <TouchableOpacity onPress={onClose}>
              <Text className="text-[14px] text-gray-500 font-medium">Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text className="text-[13px] text-gray-400 mb-2">Rangos rápidos</Text>

        {/* --------- DAY --------- */}
        {showDayRange && (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => emitRange("day", undefined, true)}
            className={getBlockStyle("day")}
          >
            <View className="flex-row justify-between items-center">
              <TouchableOpacity onPress={() => changeDay("prev")}>
                <Ionicons name="chevron-back-outline" size={18} color={colors.text} />
              </TouchableOpacity>

              <Text
                className={`text-[15px] font-medium ${
                  activeFilter === "day" ? "text-primary" : "text-text"
                }`}
              >
                {dayDate.toLocaleDateString("es-ES", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}

              </Text>

              <TouchableOpacity onPress={() => changeDay("next")}>
                <Ionicons name="chevron-forward-outline" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}

        {/* --------- WEEK --------- */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => emitRange("week", undefined, true)}
          className={getBlockStyle("week")}
        >
          <View className="flex-row justify-between items-center">
            <TouchableOpacity onPress={() => changeWeek("prev")}>
              <Ionicons name="chevron-back-outline" size={18} color={colors.text} />
            </TouchableOpacity>

            <Text
              className={`text-[15px] font-medium ${
                activeFilter === "week" ? "text-primary" : "text-text"
              }`}
            >
              {formatWeekRange(weekStart)}
            </Text>

            <TouchableOpacity onPress={() => changeWeek("next")}>
              <Ionicons name="chevron-forward-outline" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* --------- MONTH --------- */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => emitRange("month", undefined, true)}
          className={getBlockStyle("month")}
        >
          <View className="flex-row justify-between items-center">
            <TouchableOpacity onPress={() => changeMonth("prev")}>
              <Ionicons name="chevron-back-outline" size={18} color={colors.text} />
            </TouchableOpacity>

            <Text
              className={`text-[15px] font-medium ${
                activeFilter === "month" ? "text-primary" : "text-text"
              }`}
            >
              {capitalize(
                monthDate
                  .toLocaleString("es-ES", { month: "long", year: "numeric" })
                  .replace("de ", "")
              )}
            </Text>

            <TouchableOpacity onPress={() => changeMonth("next")}>
              <Ionicons name="chevron-forward-outline" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* --------- YEAR --------- */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => emitRange("year", undefined, true)}
          className={getBlockStyle("year")}
        >
          <View className="flex-row justify-between items-center">
            <TouchableOpacity onPress={() => changeYear("prev")}>
              <Ionicons name="chevron-back-outline" size={18} color={colors.text} />
            </TouchableOpacity>

            <Text
              className={`text-[15px] font-medium ${
                activeFilter === "year" ? "text-primary" : "text-text"
              }`}
            >
              {year}
            </Text>

            <TouchableOpacity onPress={() => changeYear("next")}>
              <Ionicons name="chevron-forward-outline" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* --------- ALL --------- */}
        {showTotalRange && (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => emitRange("all", undefined, true)}
            className={getBlockStyle("all")}
          >
            <View className="items-center">
              <Text
                className={`text-[15px] font-medium ${
                  activeFilter === "all" ? "text-primary" : "text-text"
                }`}
              >
                Todas las transacciones
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* CUSTOM RANGE */}
        {showCustomRange && (
          <>
            <Text className="text-[13px] text-gray-400 mb-2 mt-3">
              Rango personalizado
            </Text>

            <View className="flex-row justify-between mb-2">
              <TouchableOpacity
                onPress={() => openPicker("from")}
                className="flex-1 bg-gray-50 rounded-xl px-4 py-3 mr-2"
              >
                <Text className="text-[14px] text-gray-500">Desde</Text>
                <Text className="text-[15px] text-text font-semibold mt-1">
                  {tempFrom ? tempFrom.toLocaleDateString() : "Seleccionar"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => openPicker("to")}
                className="flex-1 bg-gray-50 rounded-xl px-4 py-3 ml-2"
              >
                <Text className="text-[14px] text-gray-500">Hasta</Text>
                <Text className="text-[15px] text-text font-semibold mt-1">
                  {tempTo ? tempTo.toLocaleDateString() : "Seleccionar"}
                </Text>
              </TouchableOpacity>
            </View>

            {showPicker && (
              <View className="bg-white rounded-xl mt-2 pb-2">
                <DateTimePicker
                  value={pickerDraft}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  themeVariant="light"
                  onChange={(e, selected) => {
                    if (selected) setPickerDraft(selected);
                  }}
                />

                <TouchableOpacity
                  onPress={applySingle}
                  className="mt-2 py-2.5 mx-3 rounded-xl items-center bg-primary"
                  activeOpacity={0.85}
                >
                  <Text className="text-white font-semibold text-[15px]">
                    {showPicker === "from" ? "Aplicar desde" : "Aplicar hasta"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              disabled={!tempFrom || !tempTo}
              onPress={handleApplyCustom}
              className={`mt-3 py-3 rounded-xl items-center ${
                tempFrom && tempTo ? "bg-primary" : "bg-gray-300"
              }`}
            >
              <Text className="text-white font-semibold text-[15px]">
                Aplicar rango
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </Modal>
  );
}
