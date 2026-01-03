// src/components/DesktopDateTimeFilterModal.tsx
// - NO aplica en cada click: todo queda en "draft"
// - Botón "Aplicar filtros" es el único que llama a onSelect (y por tanto hace carga)

import React, { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, View, Text, TouchableOpacity, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/theme";

type FilterType = "day" | "week" | "month" | "year" | "all" | "custom";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (range: { from: string; to: string; label: string; type: string }) => void;
  showCustomRange?: boolean;
  showTotalRange?: boolean;
  showDayRange?: boolean;
  autoClose?: boolean; // si true, cierra al aplicar
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
function monthLabel(d: Date) {
  return capitalize(d.toLocaleString("es-ES", { month: "long", year: "numeric" }).replace("de ", ""));
}

function getWeekStartFromISOWeek(weekValue: string) {
  const [yStr, wStr] = weekValue.split("-W");
  const y = Number(yStr);
  const w = Number(wStr);

  const jan4 = new Date(y, 0, 4);
  const day = jan4.getDay() || 7; // 1..7
  const mondayWeek1 = new Date(jan4);
  mondayWeek1.setDate(jan4.getDate() - (day - 1));
  mondayWeek1.setHours(0, 0, 0, 0);

  const monday = new Date(mondayWeek1);
  monday.setDate(mondayWeek1.getDate() + (w - 1) * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function toISOWeekValue(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  const tmp = new Date(d);
  tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7)); // jueves
  const week1 = new Date(tmp.getFullYear(), 0, 4);
  const weekNo =
    1 +
    Math.round(
      ((tmp.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
    );

  const yyyy = tmp.getFullYear();
  return `${yyyy}-W${pad2(weekNo)}`;
}

function toMonthValue(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}
function fromMonthValue(v: string) {
  const [y, m] = v.split("-").map(Number);
  return new Date(y, (m || 1) - 1, 1);
}

function toDateValue(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function fromDateValue(v: string) {
  const [y, m, dd] = v.split("-").map(Number);
  return new Date(y, (m || 1) - 1, dd || 1);
}

function weekLabelFromStart(start: Date) {
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const a = start.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
  const b = end.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
  return `Semana ${a} - ${b}`;
}

export default function DesktopDateTimeFilterModal({
  visible,
  onClose,
  onSelect,
  showCustomRange = true,
  showTotalRange = true,
  showDayRange = false,
  autoClose = false,
}: Props) {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  // ---------------- Draft state (NO side effects) ----------------
  const [type, setType] = useState<FilterType>("month");
  const [weekValue, setWeekValue] = useState<string>(toISOWeekValue(today));
  const [monthValue, setMonthValue] = useState<string>(toMonthValue(today));
  const [yearValue, setYearValue] = useState<number>(today.getFullYear());
  const [dayValue, setDayValue] = useState<string>(toDateValue(today));

  const [customFrom, setCustomFrom] = useState<Date | null>(null);
  const [customTo, setCustomTo] = useState<Date | null>(null);

  useEffect(() => {
    if (!visible) return;

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    setType("month");
    setWeekValue(toISOWeekValue(now));
    setMonthValue(toMonthValue(now));
    setYearValue(now.getFullYear());
    setDayValue(toDateValue(now));

    // No aplicamos nada aquí. Solo preseleccionamos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // ---------------- Compute preview range ----------------
  const preview = useMemo(() => {
    let from: Date | null = null;
    let to: Date | null = null;
    let label = "";

    if (type === "all") {
      from = new Date(1970, 0, 1);
      to = endOfDay(new Date());
      label = "Todas";
    } else if (type === "day") {
      const d = fromDateValue(dayValue);
      d.setHours(0, 0, 0, 0);
      from = d;
      to = endOfDay(d);
      label = d.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
    } else if (type === "week") {
      const start = getWeekStartFromISOWeek(weekValue);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      from = start;
      to = endOfDay(end);
      label = weekLabelFromStart(start);
    } else if (type === "month") {
      const d = fromMonthValue(monthValue);
      from = new Date(d.getFullYear(), d.getMonth(), 1);
      to = endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0));
      label = monthLabel(d);
    } else if (type === "year") {
      from = new Date(yearValue, 0, 1);
      to = endOfDay(new Date(yearValue, 11, 31));
      label = `${yearValue}`;
    } else if (type === "custom") {
      if (customFrom && customTo) {
        const f = new Date(customFrom);
        f.setHours(0, 0, 0, 0);
        const t = endOfDay(customTo);
        from = f;
        to = t;
        label = `${f.toLocaleDateString("es-ES")} - ${customTo.toLocaleDateString("es-ES")}`;
      } else {
        label = "Selecciona un rango";
      }
    }

    const invalid = !!(type === "custom" && customFrom && customTo && customFrom > customTo);

    return {
      from,
      to,
      label,
      invalid,
      ready: !!from && !!to && !invalid,
    };
  }, [type, dayValue, weekValue, monthValue, yearValue, customFrom, customTo]);

  const applyFilters = () => {
    if (!preview.ready || !preview.from || !preview.to) return;

    onSelect({
      from: preview.from.toISOString(),
      to: preview.to.toISOString(),
      label: preview.label,
      type,
    });

    if (autoClose) onClose();
  };

  const resetToThisMonth = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    setType("month");
    setMonthValue(toMonthValue(now));
    setWeekValue(toISOWeekValue(now));
    setYearValue(now.getFullYear());
    setDayValue(toDateValue(now));
    setCustomFrom(null);
    setCustomTo(null);
  };

  const SegBtn = ({ t, label }: { t: FilterType; label: string }) => {
    const active = type === t;
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setType(t)}
        style={{
          paddingVertical: 9,
          paddingHorizontal: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: active ? colors.primary : "#E5E7EB",
          backgroundColor: active ? "rgba(37,99,235,0.12)" : "#F8FAFC",
          marginRight: 8,
          marginBottom: 8,
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: "900", color: active ? colors.primary : "#0F172A" }}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const years = useMemo(() => {
    const now = new Date().getFullYear();
    const out: number[] = [];
    for (let y = now; y >= now - 10; y--) out.push(y);
    return out;
  }, []);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(15, 23, 42, 0.45)",
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            width: "min(720px, 96vw)" as any,
            backgroundColor: "white",
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#E5E7EB",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <View
            style={{
              padding: 14,
              borderBottomWidth: 1,
              borderBottomColor: "#E5E7EB",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View>
              <Text style={{ fontSize: 15, fontWeight: "900", color: "#0F172A" }}>Filtrar por fecha</Text>
              <Text style={{ marginTop: 2, fontSize: 12, color: "#64748B" }}>{preview.label}</Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={onClose}
              style={{
                width: 38,
                height: 38,
                borderRadius: 14,
                backgroundColor: "#F8FAFC",
                borderWidth: 1,
                borderColor: "#E5E7EB",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="close" size={18} color="#0F172A" />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <View style={{ padding: 14 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center" }}>
              {showDayRange && <SegBtn t="day" label="Día" />}
              <SegBtn t="week" label="Semana" />
              <SegBtn t="month" label="Mes" />
              <SegBtn t="year" label="Año" />
              {showTotalRange && <SegBtn t="all" label="Todas" />}
              {showCustomRange && <SegBtn t="custom" label="Personalizado" />}
            </View>

            {/* Selector del tipo activo */}
            {Platform.OS === "web" && type !== "all" && (
              <View
                style={{
                  marginTop: 6,
                  padding: 12,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  backgroundColor: "#F8FAFC",
                }}
              >
                {type === "day" && (
                  <>
                    <Text style={{ fontSize: 12, color: "#64748B", marginBottom: 6 }}>Elige un día</Text>
                    {/* @ts-ignore */}
                    <input
                      type="date"
                      value={dayValue}
                      onChange={(e: any) => setDayValue(e?.target?.value as string)}
                      style={{
                        width: "100%",
                        height: 42,
                        borderRadius: 12,
                        border: "1px solid #E5E7EB",
                        padding: "0 12px",
                        fontSize: 14,
                        background: "white",
                        outline: "none",
                      }}
                    />
                  </>
                )}

                {type === "week" && (
                  <>
                    <Text style={{ fontSize: 12, color: "#64748B", marginBottom: 6 }}>Elige una semana</Text>
                    {/* @ts-ignore */}
                    <input
                      type="week"
                      value={weekValue}
                      onChange={(e: any) => setWeekValue(e?.target?.value as string)}
                      style={{
                        width: "100%",
                        height: 42,
                        borderRadius: 12,
                        border: "1px solid #E5E7EB",
                        padding: "0 12px",
                        fontSize: 14,
                        background: "white",
                        outline: "none",
                      }}
                    />
                  </>
                )}

                {type === "month" && (
                  <>
                    <Text style={{ fontSize: 12, color: "#64748B", marginBottom: 6 }}>Elige un mes</Text>
                    {/* @ts-ignore */}
                    <input
                      type="month"
                      value={monthValue}
                      onChange={(e: any) => setMonthValue(e?.target?.value as string)}
                      style={{
                        width: "100%",
                        height: 42,
                        borderRadius: 12,
                        border: "1px solid #E5E7EB",
                        padding: "0 12px",
                        fontSize: 14,
                        background: "white",
                        outline: "none",
                      }}
                    />
                  </>
                )}

                {type === "year" && (
                  <>
                    <Text style={{ fontSize: 12, color: "#64748B", marginBottom: 6 }}>Elige un año</Text>
                    {/* @ts-ignore */}
                    <select
                      value={String(yearValue)}
                      onChange={(e: any) => setYearValue(Number(e?.target?.value))}
                      style={{
                        width: "100%",
                        height: 42,
                        borderRadius: 12,
                        border: "1px solid #E5E7EB",
                        padding: "0 12px",
                        fontSize: 14,
                        background: "white",
                        outline: "none",
                      }}
                    >
                      {years.map((y) => (
                        <option key={y} value={String(y)}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </>
                )}

                {type === "custom" && (
                  <>
                    <Text style={{ fontSize: 12, color: "#64748B", marginBottom: 8 }}>Rango</Text>

                    <View style={{ flexDirection: "row", gap: 10 as any }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12, color: "#64748B", marginBottom: 6 }}>Desde</Text>
                        {/* @ts-ignore */}
                        <input
                          type="date"
                          value={customFrom ? toDateValue(customFrom) : ""}
                          onChange={(e: any) => {
                            const v = e?.target?.value as string;
                            setCustomFrom(v ? fromDateValue(v) : null);
                          }}
                          style={{
                            width: "100%",
                            height: 42,
                            borderRadius: 12,
                            border: "1px solid #E5E7EB",
                            padding: "0 12px",
                            fontSize: 14,
                            background: "white",
                            outline: "none",
                          }}
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12, color: "#64748B", marginBottom: 6 }}>Hasta</Text>
                        {/* @ts-ignore */}
                        <input
                          type="date"
                          value={customTo ? toDateValue(customTo) : ""}
                          onChange={(e: any) => {
                            const v = e?.target?.value as string;
                            setCustomTo(v ? fromDateValue(v) : null);
                          }}
                          style={{
                            width: "100%",
                            height: 42,
                            borderRadius: 12,
                            border: "1px solid #E5E7EB",
                            padding: "0 12px",
                            fontSize: 14,
                            background: "white",
                            outline: "none",
                          }}
                        />
                      </View>
                    </View>

                    {preview.invalid && (
                      <Text style={{ marginTop: 8, fontSize: 12, color: "#DC2626", fontWeight: "800" }}>
                        Rango inválido
                      </Text>
                    )}
                  </>
                )}
              </View>
            )}

            {Platform.OS !== "web" && (
              <Text style={{ marginTop: 10, color: "#64748B" }}>
                Este modal está pensado para web (inputs week/month/date).
              </Text>
            )}
          </View>

          {/* Footer actions */}
          <View
            style={{
              padding: 14,
              borderTopWidth: 1,
              borderTopColor: "#E5E7EB",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: "white",
            }}
          >
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={resetToThisMonth}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 12,
                backgroundColor: "#F1F5F9",
                borderWidth: 1,
                borderColor: "#E2E8F0",
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "900", color: "#0F172A" }}>Restablecer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              disabled={!preview.ready}
              onPress={applyFilters}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 12,
                backgroundColor: preview.ready ? colors.primary : "#CBD5E1",
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "900", color: "white" }}>Aplicar filtros</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
