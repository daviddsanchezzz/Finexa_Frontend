// src/screens/Trips/TravelFormScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Pressable,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../../../theme/theme";
import api from "../../../../api/api";
import { pickAndUploadTripCover } from "../../../../utils/uploadTripCover";
import { Image } from "react-native";
import CrossPlatformDateTimePicker from "../../../../components/CrossPlatformDateTimePicker";
import { CountrySelect } from "../../../../components/CountrySelect";
import { appAlert } from "../../../../utils/appAlert";
import { continentFromCountryCode } from "../../../../utils/countryContinent";
import { useAuth } from "../../../../context/AuthContext";
import {
  CreationFlow,
  EditingActionRow,
  EditingForm,
  FormCurrencyPicker,
  FormMoneyField,
  FormSection,
  FormSegmentedControl,
  FormTextField,
} from "../../../../components/creation";

type TripStatus = "seen" | "planning" | "wishlist";

interface CountryStayFromApi {
  country: string;
  continent?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

interface TripFromApi {
  id: number;
  userId: number;
  name: string;
  destination?: string | null;
  startDate: string;
  endDate: string;
  companions: string[];
  emoji?: string | null;
  budget?: number | null;
  status?: TripStatus | null;
  statusManuallySet?: boolean;
  continent?: string | null;
  year?: number | null;
  cost?: number | null;
  coverImageUrl?: string | null;
  countryStays?: CountryStayFromApi[] | null;
}

interface StayDraft {
  countryCode: string | null;
  countryName: string;
  startDate: Date | null;
  endDate: Date | null;
}

/* ─── Helpers ─── */
function isValidISODate(iso?: string | null) {
  if (!iso) return false;
  return !Number.isNaN(new Date(iso).getTime());
}
function parseMoney(text: string): number {
  const t = (text || "").trim();
  if (!t) return 0;
  const n = Number(t.replace(/\./g, "").replace(",", ".").replace("€", "").trim());
  return Number.isFinite(n) ? n : 0;
}
function looksLikeCca2(v?: string | null) {
  return /^[A-Za-z]{2}$/.test(String(v || "").trim());
}
function flagEmojiFromISO2(code?: string | null) {
  const c = (code || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return "🌍";
  return String.fromCodePoint(...[...c].map(ch => 127397 + ch.charCodeAt(0)));
}
function countryNameEs(code?: string | null) {
  const c = (code || "").trim().toUpperCase();
  if (!c || !/^[A-Z]{2}$/.test(c)) return code || "";
  try { return new Intl.DisplayNames(["es-ES"], { type: "region" }).of(c) || c; }
  catch { return c; }
}
function formatShortDate(d: Date) {
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}
function formatOptionalShortDate(d?: Date | null) {
  return d ? formatShortDate(d) : "—";
}
function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}
function areSameDay(a?: Date | null, b?: Date | null) {
  if (!a || !b) return false;
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}
function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
function hasFullRange(stay: StayDraft) {
  return !!stay.startDate && !!stay.endDate;
}
function getStayKey(stay: StayDraft, index: number) {
  return stay.countryCode || `${stay.countryName}-${index}`;
}
function sortStaysByDate(stays: StayDraft[], previousOrder?: string[]) {
  const orderMap = new Map((previousOrder || []).map((key, index) => [key, index]));
  return [...stays].sort((a, b) => {
    const aTime = a.startDate ? startOfDay(a.startDate).getTime() : Number.POSITIVE_INFINITY;
    const bTime = b.startDate ? startOfDay(b.startDate).getTime() : Number.POSITIVE_INFINITY;
    if (aTime !== bTime) return aTime - bTime;
    const aOrder = orderMap.get(getStayKey(a, 0)) ?? Number.MAX_SAFE_INTEGER;
    const bOrder = orderMap.get(getStayKey(b, 0)) ?? Number.MAX_SAFE_INTEGER;
    return aOrder - bOrder;
  });
}
function getTotalDays(stays: StayDraft[]) {
  const starts = stays.map((s) => s.startDate?.getTime()).filter((value): value is number => Number.isFinite(value));
  const ends = stays.map((s) => s.endDate?.getTime()).filter((value): value is number => Number.isFinite(value));
  if (!starts.length || !ends.length) return null;
  const days = Math.round((Math.max(...ends) - Math.min(...starts)) / 86400000) + 1;
  return days > 0 ? days : 1;
}
function getCalCells(year: number, month: number): (number | null)[] {
  const first = new Date(year, month, 1).getDay();
  const offset = first === 0 ? 6 : first - 1;
  const numDays = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= numDays; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
type TripDateMode = "per_country" | "single_range";

function detectTripDateMode(stays: StayDraft[]): TripDateMode {
  const ranged = stays.filter(hasFullRange);
  if (!ranged.length) return "per_country";
  const first = ranged[0];
  const sameRange = stays.every(
    (stay) => areSameDay(stay.startDate, first.startDate) && areSameDay(stay.endDate, first.endDate),
  );
  return sameRange ? "single_range" : "per_country";
}

function buildSmartStays(prev: StayDraft[], incoming: StayDraft[]) {
  const previousOrder = prev.map((stay, index) => getStayKey(stay, index));
  const prevByKey = new Map(prev.map((stay, index) => [getStayKey(stay, index), stay]));

  const normalized = incoming.map((stay) => {
    let startDate = stay.startDate ? startOfDay(stay.startDate) : null;
    let endDate = stay.endDate ? startOfDay(stay.endDate) : null;

    if (endDate && !startDate) startDate = endDate;
    if (startDate && endDate && endDate < startDate) endDate = null;

    return { ...stay, startDate, endDate };
  });

  let sorted = sortStaysByDate(normalized, previousOrder);

  for (let index = 0; index < sorted.length - 1; index += 1) {
    const current = sorted[index];
    const next = sorted[index + 1];
    if (!current.endDate || next.startDate || next.endDate) continue;

    const nextKey = getStayKey(next, index + 1);
    const previousNext = prevByKey.get(nextKey);
    const nextWasEmpty = !previousNext || (!previousNext.startDate && !previousNext.endDate);
    if (!nextWasEmpty) continue;

    const autoDate = addDays(current.endDate, 1);
    sorted[index + 1] = { ...next, startDate: autoDate, endDate: autoDate };
  }

  sorted = sortStaysByDate(sorted, previousOrder);

  const rangedStays = sorted.filter((stay) => hasFullRange(stay) && stay.startDate && stay.endDate);
  if (rangedStays.length > 1) {
    const firstRange = rangedStays[0];
    const allSameRange = rangedStays.every(
      (stay) =>
        stay.startDate?.getTime() === firstRange.startDate?.getTime() &&
        stay.endDate?.getTime() === firstRange.endDate?.getTime(),
    );
    if (allSameRange) {
      return { stays: sorted };
    }
  }

  for (let index = 0; index < sorted.length; index += 1) {
    const current = sorted[index];
    if (!hasFullRange(current) || !current.startDate || !current.endDate) continue;

    for (let nextIndex = index + 1; nextIndex < sorted.length; nextIndex += 1) {
      const next = sorted[nextIndex];
      if (!hasFullRange(next) || !next.startDate || !next.endDate) continue;
      if (current.startDate <= next.endDate && current.endDate >= next.startDate) {
        return {
          error: `Las fechas de ${countryNameEs(next.countryCode) || next.countryName} se solapan con otro país.`,
        };
      }
    }
  }

  return { stays: sorted };
}

/* ─── Edit form (pantalla completa única) ─── */
function initialStaysFromTrip(editTrip: TripFromApi): StayDraft[] {
  if (editTrip.countryStays && editTrip.countryStays.length > 0) {
    return editTrip.countryStays.map((s) => ({
      countryCode: looksLikeCca2(s.country) ? s.country.toUpperCase() : null,
      countryName: looksLikeCca2(s.country) ? "" : s.country || "",
      startDate: isValidISODate(s.startDate) ? new Date(s.startDate!) : null,
      endDate: isValidISODate(s.endDate) ? new Date(s.endDate!) : null,
    }));
  }
  const dest = editTrip.destination ?? null;
  return [{
    countryCode: looksLikeCca2(dest) ? String(dest).toUpperCase() : null,
    countryName: looksLikeCca2(dest) ? "" : String(dest || ""),
    startDate: isValidISODate(editTrip.startDate) ? new Date(editTrip.startDate) : null,
    endDate: isValidISODate(editTrip.endDate) ? new Date(editTrip.endDate) : null,
  }];
}

// New stays start without dates; the editor fills them intelligently when needed.
function nextStayDraft(code: string, name: string, previous: StayDraft[]): StayDraft {
  return { countryCode: code, countryName: name, startDate: null, endDate: null };
}

const ROUTE_STOP_COLORS = ["#2563EB", "#0D9488", "#EA580C", "#7C3AED", "#DB2777", "#059669"];

/**
 * Shared "route" editor used by both the create wizard and the edit form:
 * every country a trip touches is shown as an equal-standing stop (colored
 * dot + connecting line, own DESDE/HASTA dates) — there's no special
 * treatment for the first one, matching how the user actually thinks about
 * a multi-country trip (it's not "1 main country + extras", it's a route).
 */
function TripRouteEditor({ stays, onChangeStays }: { stays: StayDraft[]; onChangeStays: (next: StayDraft[]) => void }) {
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerTarget, setDatePickerTarget] = useState<{ index: number; field: "start" | "end" } | null>(null);
  const [actionsIndex, setActionsIndex] = useState<number | null>(null);

  const moveStay = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= stays.length) return;
    const next = [...stays];
    [next[index], next[target]] = [next[target], next[index]];
    onChangeStays(next);
  };
  const removeStay = (index: number) => {
    if (stays.length <= 1) return;
    onChangeStays(stays.filter((_, i) => i !== index));
  };
  const openStopActions = (index: number) => setActionsIndex(index);
  const closeStopActions = () => setActionsIndex(null);

  const handleConfirmDate = (date: Date) => {
    if (!datePickerTarget) return;
    const { index, field } = datePickerTarget;
    onChangeStays(stays.map((s, i) => {
      if (i !== index) return s;
      if (field === "start") {
        const nextEnd = s.endDate && s.endDate >= date ? s.endDate : null;
        return { ...s, startDate: date, endDate: nextEnd };
      }
      const nextStart = !s.startDate || date < s.startDate ? date : s.startDate;
      return { ...s, endDate: date, startDate: nextStart };
    }));
    setDatePickerVisible(false);
    setDatePickerTarget(null);
  };

  return (
    <View>
      {stays.map((stay, index) => {
        const color = ROUTE_STOP_COLORS[index % ROUTE_STOP_COLORS.length];
        const isLast = index === stays.length - 1;
        return (
          <View key={index} style={{ flexDirection: "row" }}>
            <View style={{ width: 18, alignItems: "center" }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color, marginTop: 20 }} />
              {!isLast && <View style={{ width: 2, flex: 1, backgroundColor: "#E2E8F0", marginVertical: 2 }} />}
            </View>
            <View
              style={{
                flex: 1, marginLeft: 8, marginBottom: isLast ? 0 : 10,
                backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: "#EEF2F7", padding: 14,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={{ fontSize: 16 }}>{flagEmojiFromISO2(stay.countryCode)}</Text>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8" }}>{(stay.countryCode || "").toUpperCase()}</Text>
                  <Text style={{ fontSize: 15, fontWeight: "800", color: "#0F172A" }}>
                    {countryNameEs(stay.countryCode) || stay.countryName || "Sin país"}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => openStopActions(index)} style={{ padding: 4 }}>
                  <Ionicons name="ellipsis-vertical" size={16} color="#94A3B8" />
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  onPress={() => { setDatePickerTarget({ index, field: "start" }); setDatePickerVisible(true); }}
                  style={{ flex: 1, backgroundColor: "#F8FAFC", borderRadius: 12, padding: 10, borderWidth: 1, borderColor: "#E5E7EB" }}
                >
                  <Text style={{ fontSize: 10, fontWeight: "700", color: "#94A3B8", marginBottom: 3 }}>Desde</Text>
                  <Text style={{ fontSize: 13, fontWeight: "800", color: "#0F172A" }}>{formatOptionalShortDate(stay.startDate)}</Text>
                </Pressable>
                <Pressable
                  onPress={() => { setDatePickerTarget({ index, field: "end" }); setDatePickerVisible(true); }}
                  style={{ flex: 1, backgroundColor: "#F8FAFC", borderRadius: 12, padding: 10, borderWidth: 1, borderColor: "#E5E7EB" }}
                >
                  <Text style={{ fontSize: 10, fontWeight: "700", color: "#94A3B8", marginBottom: 3 }}>Hasta</Text>
                  <Text style={{ fontSize: 13, fontWeight: "800", color: "#0F172A" }}>{formatOptionalShortDate(stay.endDate)}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        );
      })}

      <CrossPlatformDateTimePicker
        isVisible={datePickerVisible}
        mode="date"
        date={
          datePickerTarget
            ? ((datePickerTarget.field === "end"
              ? stays[datePickerTarget.index]?.endDate
              : stays[datePickerTarget.index]?.startDate) ?? new Date())
            : new Date()
        }
        onConfirm={handleConfirmDate}
        onCancel={() => { setDatePickerVisible(false); setDatePickerTarget(null); }}
      />

      <Modal
        visible={actionsIndex != null}
        transparent
        animationType="fade"
        onRequestClose={closeStopActions}
      >
        <Pressable
          onPress={closeStopActions}
          style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.42)", justifyContent: "center", padding: 20 }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{ backgroundColor: "white", borderRadius: 24, padding: 20, gap: 10 }}
          >
            {actionsIndex != null ? (
              <>
                <Text style={{ fontSize: 24, fontWeight: "300", color: "#0F172A" }}>
                  {countryNameEs(stays[actionsIndex]?.countryCode) || stays[actionsIndex]?.countryName || "Tramo"}
                </Text>
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#64748B", marginBottom: 4 }}>
                  ¿Qué quieres hacer con este tramo?
                </Text>

                {actionsIndex > 0 && (
                  <TouchableOpacity
                    onPress={() => { moveStay(actionsIndex, -1); closeStopActions(); }}
                    style={{ borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", paddingVertical: 14, paddingHorizontal: 14 }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: "700", color: "#0F172A" }}>Mover arriba</Text>
                  </TouchableOpacity>
                )}

                {actionsIndex < stays.length - 1 && (
                  <TouchableOpacity
                    onPress={() => { moveStay(actionsIndex, 1); closeStopActions(); }}
                    style={{ borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", paddingVertical: 14, paddingHorizontal: 14 }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: "700", color: "#0F172A" }}>Mover abajo</Text>
                  </TouchableOpacity>
                )}

                {(stays[actionsIndex]?.startDate || stays[actionsIndex]?.endDate) && (
                  <TouchableOpacity
                    onPress={() => {
                      onChangeStays(stays.map((item, itemIndex) => itemIndex === actionsIndex ? { ...item, startDate: null, endDate: null } : item));
                      closeStopActions();
                    }}
                    style={{ borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", paddingVertical: 14, paddingHorizontal: 14 }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: "700", color: "#0F172A" }}>Borrar fechas</Text>
                  </TouchableOpacity>
                )}

                {stays.length > 1 && (
                  <TouchableOpacity
                    onPress={() => { removeStay(actionsIndex); closeStopActions(); }}
                    style={{ borderRadius: 14, backgroundColor: "#FEF2F2", paddingVertical: 14, paddingHorizontal: 14 }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: "700", color: "#DC2626" }}>Eliminar</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={closeStopActions}
                  style={{ alignItems: "center", paddingTop: 6, paddingBottom: 2 }}
                >
                  <Text style={{ fontSize: 16, fontWeight: "700", color: "#64748B" }}>Cancelar</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const WHEEL_ITEM_HEIGHT = 44;
const MONTH_WHEEL_VALUES = Array.from({ length: 12 }, (_, month) =>
  capitalize(new Date(2020, month, 1).toLocaleDateString("es-ES", { month: "long" }))
);
const YEAR_WHEEL_VALUES = Array.from({ length: 201 }, (_, index) => String(1900 + index));

function DateWheelColumn({
  label,
  values,
  selectedIndex,
  visible,
  onSelect,
}: {
  label: string;
  values: string[];
  selectedIndex: number;
  visible: boolean;
  onSelect: (index: number) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!visible) return;
    const frame = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: selectedIndex * WHEEL_ITEM_HEIGHT, animated: false });
    });
    return () => cancelAnimationFrame(frame);
  }, [selectedIndex, visible]);

  const selectNearest = (offsetY: number) => {
    const nextIndex = Math.max(0, Math.min(values.length - 1, Math.round(offsetY / WHEEL_ITEM_HEIGHT)));
    onSelect(nextIndex);
  };

  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 10.5, fontWeight: "800", color: "#94A3B8", letterSpacing: 0.6, marginBottom: 7 }}>
        {label}
      </Text>
      <View style={{ height: WHEEL_ITEM_HEIGHT * 3, overflow: "hidden", borderRadius: 14, backgroundColor: "#F8FAFC" }}>
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: WHEEL_ITEM_HEIGHT,
            left: 5,
            right: 5,
            height: WHEEL_ITEM_HEIGHT,
            borderRadius: 11,
            backgroundColor: "#E8EEFF",
            borderWidth: 1,
            borderColor: "#D8E2FF",
          }}
        />
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={WHEEL_ITEM_HEIGHT}
          decelerationRate="fast"
          nestedScrollEnabled
          contentContainerStyle={{ paddingVertical: WHEEL_ITEM_HEIGHT }}
          onMomentumScrollEnd={(event) => selectNearest(event.nativeEvent.contentOffset.y)}
          onScrollEndDrag={(event) => selectNearest(event.nativeEvent.contentOffset.y)}
        >
          {values.map((value, index) => (
            <TouchableOpacity
              key={`${label}-${value}`}
              onPress={() => {
                onSelect(index);
                scrollRef.current?.scrollTo({ y: index * WHEEL_ITEM_HEIGHT, animated: true });
              }}
              activeOpacity={0.7}
              style={{ height: WHEEL_ITEM_HEIGHT, alignItems: "center", justifyContent: "center" }}
            >
              <Text
                style={{
                  fontSize: index === selectedIndex ? 15 : 14,
                  fontWeight: index === selectedIndex ? "900" : "600",
                  color: index === selectedIndex ? colors.primary : "#94A3B8",
                }}
              >
                {value}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

/** One shared start/end date range applied to every country stay — for when splitting dates per country isn't worth the bother. */
function SingleRangeEditor({ stays, onChangeStays }: { stays: StayDraft[]; onChangeStays: (next: StayDraft[]) => void }) {
  const overallStart = useMemo(() => {
    const starts = stays
      .map((s) => s.startDate?.getTime())
      .filter((value): value is number => Number.isFinite(value));
    return starts.length ? new Date(Math.min(...starts)) : null;
  }, [stays]);
  const overallEnd = useMemo(() => {
    const ends = stays
      .map((s) => s.endDate?.getTime())
      .filter((value): value is number => Number.isFinite(value));
    return ends.length ? new Date(Math.max(...ends)) : null;
  }, [stays]);

  const [rangeStart, setRangeStart] = useState<Date | null>(overallStart);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(overallEnd);
  const [calDate, setCalDate] = useState(() => overallStart ?? new Date());
  const [monthYearPickerVisible, setMonthYearPickerVisible] = useState(false);
  const [jumpMonth, setJumpMonth] = useState(() => (overallStart ?? new Date()).getMonth());
  const [jumpYear, setJumpYear] = useState(() => (overallStart ?? new Date()).getFullYear());
  const calYear = calDate.getFullYear();
  const calMonth = calDate.getMonth();
  const calCells = useMemo(() => getCalCells(calYear, calMonth), [calYear, calMonth]);

  const openMonthYearPicker = () => {
    setJumpMonth(calMonth);
    setJumpYear(calYear);
    setMonthYearPickerVisible(true);
  };

  const jumpToMonth = () => {
    setCalDate(new Date(jumpYear, jumpMonth, 1));
    setMonthYearPickerVisible(false);
  };

  const handleCalDay = (day: number) => {
    const date = new Date(calYear, calMonth, day);
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(date);
      setRangeEnd(null);
    } else if (date < rangeStart) {
      setRangeStart(date);
      setRangeEnd(null);
    } else {
      setRangeEnd(date);
      onChangeStays(stays.map((s) => ({ ...s, startDate: rangeStart, endDate: date })));
    }
  };

  const isDaySelected = (day: number) => {
    const date = new Date(calYear, calMonth, day);
    if (!rangeStart) return false;
    if (!rangeEnd) return date.toDateString() === rangeStart.toDateString();
    return date >= rangeStart && date <= rangeEnd;
  };
  const isDayStart = (day: number) => rangeStart && new Date(calYear, calMonth, day).toDateString() === rangeStart.toDateString();
  const isDayEnd   = (day: number) => rangeEnd   && new Date(calYear, calMonth, day).toDateString() === rangeEnd.toDateString();
  const isDayInRange = (day: number) => {
    if (!rangeStart || !rangeEnd) return false;
    const date = new Date(calYear, calMonth, day);
    return date > rangeStart && date < rangeEnd;
  };

  return (
    <View style={{ gap: 12 }}>
      {stays.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {stays.map((s) => (
            <View
              key={s.countryCode}
              style={{
                flexDirection: "row", alignItems: "center", gap: 4,
                backgroundColor: "#EEF2FF", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5,
              }}
            >
              <Text style={{ fontSize: 12 }}>{flagEmojiFromISO2(s.countryCode)}</Text>
              <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary }}>
                {countryNameEs(s.countryCode) || s.countryName}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ backgroundColor: "white", borderRadius: 18, borderWidth: 1, borderColor: "#E5E7EB", padding: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <TouchableOpacity
            onPress={() => setCalDate(new Date(calYear, calMonth - 1, 1))}
            style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="chevron-back" size={16} color="#374151" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={openMonthYearPicker}
            activeOpacity={0.65}
            accessibilityRole="button"
            accessibilityLabel="Elegir mes y año"
            style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 5 }}
          >
            <Text style={{ fontSize: 15, fontWeight: "800", color: "#0F172A" }}>
              {capitalize(new Date(calYear, calMonth).toLocaleDateString("es-ES", { month: "long", year: "numeric" }))}
            </Text>
            <Ionicons name="chevron-down" size={14} color="#64748B" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setCalDate(new Date(calYear, calMonth + 1, 1))}
            style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="chevron-forward" size={16} color="#374151" />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: "row", marginBottom: 4 }}>
          {["L","M","X","J","V","S","D"].map(d => (
            <View key={d} style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8" }}>{d}</Text>
            </View>
          ))}
        </View>

        {Array.from({ length: calCells.length / 7 }, (_, wi) => (
          <View key={wi} style={{ flexDirection: "row" }}>
            {calCells.slice(wi * 7, wi * 7 + 7).map((day, di) => {
              const inRange = day != null && isDayInRange(day);
              const isStart = day != null && isDayStart(day);
              const isEnd   = day != null && isDayEnd(day);
              const isSel   = day != null && isDaySelected(day);
              const showLeftRange = !!day && (inRange || isEnd);
              const showRightRange = !!day && (inRange || isStart);
              return (
                <TouchableOpacity
                  key={di}
                  onPress={() => day && handleCalDay(day)}
                  disabled={!day}
                  style={{ flex: 1, height: 40, alignItems: "center", justifyContent: "center", position: "relative" }}
                >
                  {day != null ? (
                    <>
                      {showLeftRange ? (
                        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: "50%", top: 4, bottom: 4, backgroundColor: "#EEF2FF" }} />
                      ) : null}
                      {showRightRange ? (
                        <View pointerEvents="none" style={{ position: "absolute", left: "50%", right: 0, top: 4, bottom: 4, backgroundColor: "#EEF2FF" }} />
                      ) : null}
                    </>
                  ) : null}
                  {day != null ? (
                    <View style={{
                      width: 34, height: 34, borderRadius: 17,
                      backgroundColor: isSel && !inRange ? colors.primary : "transparent",
                      alignItems: "center", justifyContent: "center",
                    }}>
                      <Text style={{
                        fontSize: 13,
                        fontWeight: isSel ? "800" : "500",
                        color: (isSel && !inRange) ? "white" : inRange ? colors.primary : "#0F172A",
                      }}>
                        {day}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1, backgroundColor: "#F8FAFC", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#E5E7EB" }}>
          <Text style={{ fontSize: 10, fontWeight: "700", color: "#94A3B8", marginBottom: 4 }}>Inicio</Text>
          <Text style={{ fontSize: 14, fontWeight: "800", color: "#0F172A" }}>{formatOptionalShortDate(rangeStart)}</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: "#F8FAFC", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#E5E7EB" }}>
          <Text style={{ fontSize: 10, fontWeight: "700", color: "#94A3B8", marginBottom: 4 }}>Fin</Text>
          <Text style={{ fontSize: 14, fontWeight: "800", color: "#0F172A" }}>{formatOptionalShortDate(rangeEnd)}</Text>
        </View>
      </View>

      <Modal
        visible={monthYearPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMonthYearPickerVisible(false)}
      >
        <Pressable
          onPress={() => setMonthYearPickerVisible(false)}
          style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.42)", justifyContent: "center", paddingHorizontal: 24 }}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={{ backgroundColor: "white", borderRadius: 24, padding: 20 }}
          >
            <Text style={{ fontSize: 19, fontWeight: "900", color: "#0F172A" }}>Ir a mes y año</Text>
            <Text style={{ fontSize: 12.5, fontWeight: "600", color: "#64748B", marginTop: 4, marginBottom: 16 }}>
              Desliza para elegir el mes y el año.
            </Text>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <DateWheelColumn
                label="Mes"
                values={MONTH_WHEEL_VALUES}
                selectedIndex={jumpMonth}
                visible={monthYearPickerVisible}
                onSelect={setJumpMonth}
              />
              <DateWheelColumn
                label="Año"
                values={YEAR_WHEEL_VALUES}
                selectedIndex={jumpYear - 1900}
                visible={monthYearPickerVisible}
                onSelect={(index) => setJumpYear(1900 + index)}
              />
            </View>

            <TouchableOpacity
              onPress={jumpToMonth}
              activeOpacity={0.75}
              style={{
                height: 46,
                borderRadius: 14,
                backgroundColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
                marginTop: 18,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: "900", color: "white" }}>Ir a la fecha</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setMonthYearPickerVisible(false)}
              activeOpacity={0.7}
              style={{ alignItems: "center", paddingTop: 12, paddingBottom: 2 }}
            >
              <Text style={{ fontSize: 14, fontWeight: "800", color: "#94A3B8" }}>Cancelar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/** Toggle between per-country dates (route editor) and one shared start/end for the whole trip. */
function TripDatesEditor({
  stays,
  onChangeStays,
  initialMode = "per_country",
}: {
  stays: StayDraft[];
  onChangeStays: (next: StayDraft[]) => void;
  initialMode?: TripDateMode;
}) {
  const singleCountry = stays.length <= 1;
  const effectiveInitialMode: TripDateMode = singleCountry ? "single_range" : initialMode;
  const [mode, setMode] = useState<TripDateMode>(effectiveInitialMode);

  useEffect(() => {
    setMode(singleCountry ? "single_range" : initialMode);
  }, [initialMode, singleCountry]);

  return (
    <View style={{ gap: 12 }}>
      {!singleCountry && (
        <View style={{ flexDirection: "row", backgroundColor: "#F1F5F9", borderRadius: 12, padding: 3 }}>
          {([
            { id: "per_country" as const, label: "Por país" },
            { id: "single_range" as const, label: "Inicio y fin" },
          ]).map((opt) => {
            const active = mode === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                onPress={() => setMode(opt.id)}
                style={{
                  flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: "center",
                  backgroundColor: active ? "white" : "transparent",
                  shadowColor: active ? "#000" : "transparent", shadowOpacity: active ? 0.06 : 0,
                  shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "700", color: active ? "#0F172A" : "#94A3B8" }}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {mode === "per_country" ? (
        <TripRouteEditor stays={stays} onChangeStays={onChangeStays} />
      ) : (
        <SingleRangeEditor stays={stays} onChangeStays={onChangeStays} />
      )}
    </View>
  );
}

function EditTripForm({ editTrip, navigation }: { editTrip: TripFromApi; navigation: any }) {
  const [name, setName]           = useState(editTrip.name ?? "");
  const initialStays = useMemo(() => initialStaysFromTrip(editTrip), [editTrip]);
  const [stays, setStays]         = useState<StayDraft[]>(initialStays);
  const [dateMode]                = useState<TripDateMode>(() => detectTripDateMode(initialStays));
  const [budgetText, setBudgetText] = useState(editTrip.budget != null ? String(editTrip.budget) : "");
  const [status, setStatus] = useState<TripStatus | null>((editTrip.status as TripStatus) ?? null);
  const [statusManuallyChanged, setStatusManuallyChanged] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(editTrip.coverImageUrl ?? null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);

  const addCountryStay = (code: string, name: string) => {
    if (stays.some((s) => s.countryCode === code)) return;
    setStays((prev) => [...prev, nextStayDraft(code, name, prev)]);
  };

  const totalDays = useMemo(() => getTotalDays(stays), [stays]);

  const updateStays = (next: StayDraft[]) => {
    const result = buildSmartStays(stays, next);
    if (result.error) {
      appAlert("Fechas solapadas", result.error);
      return;
    }
    setStays(result.stays);
  };

  const handleSave = async () => {
    if (!name.trim()) { appAlert("Falta el nombre", "Añade un nombre para el viaje."); return; }
    const validStays = stays.filter((s) => s.countryCode);
    if (validStays.length === 0) { appAlert("Falta el país", "Selecciona al menos un país."); return; }
    try {
      setSaving(true);
      await api.patch(`/trips/${editTrip.id}`, {
        name: name.trim(),
        countryStays: validStays.map((s) => ({
          country: s.countryCode,
          continent: continentFromCountryCode(s.countryCode),
          startDate: s.startDate ? s.startDate.toISOString() : undefined,
          endDate: s.endDate ? s.endDate.toISOString() : undefined,
        })),
        budget: budgetText.trim() ? parseMoney(budgetText) : null,
        ...(statusManuallyChanged && status ? { status } : {}),
        coverImageUrl: coverImageUrl ?? null,
      });
      navigation.goBack();
    } catch { appAlert("Error", "No se pudo guardar el viaje."); }
    finally { setSaving(false); }
  };

  const handleDelete = () => {
    appAlert("Eliminar viaje", "¿Seguro? Esta acción no se puede deshacer.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: async () => {
        try {
          setDeleting(true);
          await api.delete(`/trips/${editTrip.id}`);
          navigation.goBack();
        } catch { appAlert("Error", "No se pudo eliminar."); }
        finally { setDeleting(false); }
      }},
    ]);
  };

  const statusOptions: { value: TripStatus; label: string }[] = [
    { value: "planning", label: "Organizando" },
    { value: "seen",     label: "Visitado" },
    { value: "wishlist", label: "Por visitar" },
  ];

  return (
    <EditingForm
      title="Editar viaje"
      onClose={() => navigation.goBack()}
      onSubmit={handleSave}
      isSubmitting={saving}
      isValid={!!name.trim()}
    >
      <View style={{ gap: 20 }}>
        {/* Foto de portada */}
        <TouchableOpacity
          onPress={async () => {
            if (uploadingCover) return;
            setUploadingCover(true);
            try {
              const url = await pickAndUploadTripCover();
              if (url) setCoverImageUrl(url);
            } finally { setUploadingCover(false); }
          }}
          activeOpacity={0.85}
          style={{ height: 140, borderRadius: 18, overflow: "hidden", borderWidth: coverImageUrl ? 0 : 2, borderStyle: "dashed", borderColor: "#CBD5E1", backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center" }}
        >
          {coverImageUrl ? (
            <>
              {Platform.OS === "web"
                // @ts-ignore
                ? <img src={coverImageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <Image source={{ uri: coverImageUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
              }
              <View style={{ position: "absolute", bottom: 8, right: 8, backgroundColor: "rgba(0,0,0,0.4)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="camera-outline" size={12} color="white" />
                <Text style={{ fontSize: 11, fontWeight: "700", color: "white" }}>Cambiar</Text>
              </View>
            </>
          ) : uploadingCover ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <View style={{ alignItems: "center", gap: 6 }}>
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="camera-outline" size={22} color={colors.primary} />
              </View>
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#64748B" }}>Añadir foto de portada</Text>
            </View>
          )}
        </TouchableOpacity>

        <FormSection>
          <FormTextField
            label="Nombre del viaje"
            required
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            error={!name.trim() ? "Añade un nombre para el viaje." : null}
          />
        </FormSection>

        <View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={sectionLabelStyle}>{stays.length > 1 ? "Ruta y fechas" : "Destino y fechas"}</Text>
            {stays.length > 1 && <Text style={sectionLabelStyle}>{totalDays} días en total</Text>}
          </View>
          <View style={{ marginTop: 8 }}>
            <TripDatesEditor stays={stays} onChangeStays={updateStays} initialMode={dateMode} />
          </View>
        </View>

        <View>
          <Text style={{ ...sectionLabelStyle, marginBottom: 8 }}>Añadir otro país</Text>
          <CountrySelect
            valueName=""
            valueCode={null}
            onChange={({ name: n, code }: any) => { if (code) addCountryStay(code, n); }}
          />
        </View>

        <FormSection>
          <FormSegmentedControl<TripStatus>
            label="Estado"
            value={status}
            options={statusOptions.map((o) => ({ value: o.value, label: o.label }))}
            onChange={(next) => { setStatus(next); setStatusManuallyChanged(true); }}
          />
        </FormSection>

        <FormSection>
          <FormMoneyField
            label="Presupuesto estimado"
            currency="€"
            value={budgetText}
            onChangeText={setBudgetText}
            keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
          />
        </FormSection>

        <FormSection title="Otras acciones">
          <View style={{ borderTopWidth: 1, borderTopColor: "#E8EDF3" }}>
            <EditingActionRow label="Eliminar viaje" onPress={handleDelete} disabled={saving || deleting} destructive />
          </View>
        </FormSection>
      </View>
    </EditingForm>
  );
}

/* ─── Create wizard ─── */
export default function TripFormScreen({ route, navigation }: any) {
  const editTrip: TripFromApi | undefined = route?.params?.editTrip;
  if (editTrip) return <EditTripForm editTrip={editTrip} navigation={navigation} />;

  return <CreateTripWizard navigation={navigation} />;
}

const sectionLabelStyle = { fontSize: 12, fontWeight: "700" as const, color: "#64748B" };

function CreateTripWizard({ navigation }: { navigation: any }) {
  const { user } = useAuth();
  const [stays, setStays]             = useState<StayDraft[]>([]);
  const [tripName, setTripName]       = useState("");
  const [budgetText, setBudgetText]     = useState("");
  const [currency, setCurrency]       = useState(user?.currency ?? "EUR");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [saving, setSaving]             = useState(false);
  const [createdTrip, setCreatedTrip] = useState<{ id: number; name: string } | null>(null);

  const totalDays = useMemo(() => getTotalDays(stays), [stays]);

  const selectedCountryLabel = stays.length === 0
    ? ""
    : stays.length === 1
      ? countryNameEs(stays[0].countryCode) || stays[0].countryName
      : `${stays.length} países`;

  // A trip is a route, not "1 main country + extras" — every selected
  // country is an equal-standing stop. Toggling adds/removes it from the
  // selection; a newly added one starts right where the last one ends.
  const toggleCountry = (code: string, name: string) => {
    setStays((prev) => {
      const exists = prev.some((s) => s.countryCode === code);
      if (exists) return prev.filter((s) => s.countryCode !== code);
      return [...prev, nextStayDraft(code, name, prev)];
    });
  };
  const addCountry = (code: string, name: string) => {
    if (stays.some((s) => s.countryCode === code)) return;
    toggleCountry(code, name);
  };
  const removeCountryAt = (index: number) => {
    setStays((prev) => prev.filter((_, i) => i !== index));
  };

  const updateStays = (next: StayDraft[]) => {
    const result = buildSmartStays(stays, next);
    if (result.error) {
      appAlert("Fechas solapadas", result.error);
      return;
    }
    setStays(result.stays);
  };

  const handleCreate = async () => {
    if (!tripName.trim()) { appAlert("Falta el nombre", "Añade un nombre."); return; }
    if (stays.length === 0) { appAlert("Falta el destino", "Selecciona al menos un país."); return; }
    try {
      setSaving(true);
      const res = await api.post("/trips", {
        name: tripName.trim(),
        countryStays: stays.map((s) => ({
          country: s.countryCode,
          continent: continentFromCountryCode(s.countryCode),
          startDate: s.startDate ? s.startDate.toISOString() : undefined,
          endDate: s.endDate ? s.endDate.toISOString() : undefined,
        })),
        budget: budgetText.trim() ? parseMoney(budgetText) : null,
        currency,
        coverImageUrl: coverImageUrl ?? undefined,
      });
      setCreatedTrip({ id: res.data.id, name: res.data.name });
    } catch { appAlert("Error", "No se pudo crear el viaje."); }
    finally { setSaving(false); }
  };

  // Pantalla de éxito tras crear: no es un paso más del formulario, así que
  // se muestra aparte en cuanto el viaje queda creado.
  if (createdTrip) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 24 }}>
          <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="checkmark" size={46} color="#16A34A" />
          </View>

          <View style={{ alignItems: "center", gap: 6 }}>
            <Text style={{ fontSize: 26, fontWeight: "900", color: "#0F172A" }}>¡Viaje creado!</Text>
            <Text style={{ fontSize: 14, color: "#64748B", textAlign: "center" }}>
              {createdTrip.name} ya está en tu lista de viajes
            </Text>
          </View>

          {stays.length > 0 && (
            <View style={{
              width: "100%", backgroundColor: "#F8FAFC", borderRadius: 20, padding: 16,
              flexDirection: "row", alignItems: "center", gap: 14,
              borderWidth: 1, borderColor: "#EEF2F7",
            }}>
              <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center", flexDirection: "row" }}>
                {stays.slice(0, 2).map((s) => (
                  <Text key={s.countryCode} style={{ fontSize: stays.length > 1 ? 26 : 36 }}>{flagEmojiFromISO2(s.countryCode)}</Text>
                ))}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: "800", color: "#0F172A" }}>{createdTrip.name}</Text>
                <Text style={{ fontSize: 13, color: "#94A3B8", marginTop: 3 }}>
                  {totalDays ? `${totalDays} días` : "—"}
                </Text>
              </View>
            </View>
          )}

          <View style={{ width: "100%", gap: 10 }}>
            <TouchableOpacity
              onPress={() => navigation.replace("TripDetail", { tripId: createdTrip.id })}
              activeOpacity={0.9}
              style={{ height: 52, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ fontSize: 15, fontWeight: "800", color: "white" }}>Ver mi viaje</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.goBack()}
              activeOpacity={0.85}
              style={{ height: 52, borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#64748B" }}>Volver a viajes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <CreationFlow
      title="Nuevo viaje"
      submitLabel="Crear viaje"
      onClose={() => navigation.goBack()}
      onSubmit={handleCreate}
      isSubmitting={saving}
      steps={[
        {
          id: "destination",
          title: "¿A dónde vas?",
          description: "Puedes elegir más de un país si tu viaje pasa por varios.",
          isValid: stays.length > 0,
          content: () => (
            <View style={{ gap: 20 }}>
              {stays.length > 0 && (
                <View style={{ gap: 8 }}>
                  <Text style={sectionLabelStyle}>Seleccionados · {stays.length}</Text>
                  {stays.map((s, index) => (
                    <View
                      key={s.countryCode}
                      style={{
                        flexDirection: "row", alignItems: "center", gap: 10,
                        backgroundColor: "white", borderRadius: 14, borderWidth: 1, borderColor: "#EEF2F7",
                        paddingHorizontal: 14, paddingVertical: 12,
                      }}
                    >
                      <Text style={{ fontSize: 20 }}>{flagEmojiFromISO2(s.countryCode)}</Text>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8" }}>{(s.countryCode || "").toUpperCase()}</Text>
                      <Text style={{ fontSize: 15, fontWeight: "800", color: "#0F172A", flex: 1 }}>
                        {countryNameEs(s.countryCode) || s.countryName}
                      </Text>
                      <TouchableOpacity onPress={() => removeCountryAt(index)} style={{ padding: 4 }}>
                        <Ionicons name="close" size={18} color="#94A3B8" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <View>
                <Text style={{ ...sectionLabelStyle, marginBottom: 10 }}>
                  {stays.length > 0 ? "Añadir otro país" : "País"}
                </Text>
                <CountrySelect
                  valueName=""
                  valueCode={null}
                  onChange={({ name: n, code }: any) => {
                    if (!code) return;
                    addCountry(code, n);
                    if (!tripName) setTripName(n);
                  }}
                />
              </View>
            </View>
          ),
        },
        {
          id: "route",
          title: "Ruta y fechas",
          description: stays.length > 1 ? "Ordena los países y asigna fechas a cada tramo" : (selectedCountryLabel || "Tu destino"),
          content: () => (
            <View style={{ gap: 16 }}>
              {totalDays != null && stays.length > 1 && (
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#94A3B8" }}>{totalDays} días en total</Text>
              )}
              <TripDatesEditor stays={stays} onChangeStays={updateStays} />
            </View>
          ),
        },
        {
          id: "details",
          title: "Últimos detalles",
          isValid: !!tripName.trim(),
          content: ({ showErrors }) => (
            <View style={{ gap: 18 }}>
              <TouchableOpacity
                onPress={async () => {
                  if (uploadingCover) return;
                  setUploadingCover(true);
                  try {
                    const url = await pickAndUploadTripCover();
                    if (url) setCoverImageUrl(url);
                  } finally {
                    setUploadingCover(false);
                  }
                }}
                activeOpacity={0.85}
                style={{
                  height: 160, borderRadius: 20, overflow: "hidden",
                  borderWidth: coverImageUrl ? 0 : 2, borderStyle: "dashed",
                  borderColor: "#CBD5E1", backgroundColor: "#F8FAFC",
                  alignItems: "center", justifyContent: "center",
                }}
              >
                {coverImageUrl ? (
                  <>
                    <Image source={{ uri: coverImageUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                    <View style={{ position: "absolute", bottom: 10, right: 10, backgroundColor: "rgba(0,0,0,0.4)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Ionicons name="camera-outline" size={12} color="white" />
                      <Text style={{ fontSize: 11, fontWeight: "700", color: "white" }}>Cambiar</Text>
                    </View>
                  </>
                ) : uploadingCover ? (
                  <ActivityIndicator size="large" color={colors.primary} />
                ) : (
                  <View style={{ alignItems: "center", gap: 8 }}>
                    <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="camera-outline" size={24} color={colors.primary} />
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#64748B" }}>Añadir foto de portada</Text>
                    <Text style={{ fontSize: 12, color: "#94A3B8" }}>Toca para elegir de tu galería</Text>
                  </View>
                )}
              </TouchableOpacity>

              <FormSection>
                <FormTextField
                  label="Nombre del viaje"
                  required
                  value={tripName}
                  onChangeText={setTripName}
                  autoCapitalize="words"
                  error={!tripName.trim() ? "Añade un nombre para el viaje." : null}
                  showError={showErrors}
                />
                <FormMoneyField
                  label="Presupuesto estimado"
                  currency={currency === "EUR" ? "€" : currency}
                  value={budgetText}
                  onChangeText={setBudgetText}
                  keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
                />
                <FormCurrencyPicker value={currency} onChange={setCurrency} />
              </FormSection>
            </View>
          ),
        },
      ]}
    />
  );
}





