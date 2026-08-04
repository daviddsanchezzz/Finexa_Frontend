// src/screens/Trips/TravelFormScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../../../theme/theme";
import api from "../../../../api/api";
import { pickAndUploadTripCover } from "../../../../utils/uploadTripCover";
import { Image } from "react-native";
import CrossPlatformDateTimePicker from "../../../../components/CrossPlatformDateTimePicker";
import { CountrySelect } from "../../../../components/CountrySelect";
import { appAlert } from "../../../../utils/appAlert";

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

/* â”€â”€â”€ Helpers â”€â”€â”€ */
function isValidISODate(iso?: string | null) {
  if (!iso) return false;
  return !Number.isNaN(new Date(iso).getTime());
}
function parseMoney(text: string): number {
  const t = (text || "").trim();
  if (!t) return 0;
  const n = Number(t.replace(/\./g, "").replace(",", ".").replace("â‚¬", "").trim());
  return Number.isFinite(n) ? n : 0;
}
function looksLikeCca2(v?: string | null) {
  return /^[A-Za-z]{2}$/.test(String(v || "").trim());
}
function flagEmojiFromISO2(code?: string | null) {
  const c = (code || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return "ðŸŒ";
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
  return d ? formatShortDate(d) : "â€”";
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
const COMPANION_OPTIONS = [
  { id: "solo",   label: "Solo",    icon: "person-outline" as const },
  { id: "pareja", label: "Pareja",  icon: "heart-outline" as const },
  { id: "familia",label: "Familia", icon: "people-outline" as const },
  { id: "amigos", label: "Amigos",  icon: "people-circle-outline" as const },
];

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

    if (startDate && !endDate) endDate = startDate;
    if (endDate && !startDate) startDate = endDate;
    if (startDate && endDate && endDate < startDate) [startDate, endDate] = [endDate, startDate];

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

  for (let index = 0; index < sorted.length; index += 1) {
    const current = sorted[index];
    if (!hasFullRange(current) || !current.startDate || !current.endDate) continue;

    for (let nextIndex = index + 1; nextIndex < sorted.length; nextIndex += 1) {
      const next = sorted[nextIndex];
      if (!hasFullRange(next) || !next.startDate || !next.endDate) continue;
      if (current.startDate <= next.endDate && current.endDate >= next.startDate) {
        return {
          error: `Las fechas de ${countryNameEs(next.countryCode) || next.countryName} se solapan con otro paÃ­s.`,
        };
      }
    }
  }

  return { stays: sorted };
}

/* â”€â”€â”€ Edit form (pantalla completa Ãºnica) â”€â”€â”€ */
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
 * dot + connecting line, own DESDE/HASTA dates) â€” there's no special
 * treatment for the first one, matching how the user actually thinks about
 * a multi-country trip (it's not "1 main country + extras", it's a route).
 */
function TripRouteEditor({ stays, onChangeStays }: { stays: StayDraft[]; onChangeStays: (next: StayDraft[]) => void }) {
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerTarget, setDatePickerTarget] = useState<{ index: number; field: "start" | "end" } | null>(null);

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
  const openStopActions = (index: number) => {
    const stop = stays[index];
    const label = countryNameEs(stop?.countryCode) || stop?.countryName || "Tramo";
    const actions: any[] = [];
    if (index > 0) actions.push({ text: "Mover arriba", onPress: () => moveStay(index, -1) });
    if (index < stays.length - 1) actions.push({ text: "Mover abajo", onPress: () => moveStay(index, 1) });
    if (stop?.startDate || stop?.endDate) actions.push({ text: "Borrar fechas", onPress: () => onChangeStays(stays.map((item, itemIndex) => itemIndex === index ? { ...item, startDate: null, endDate: null } : item)) });
    if (stays.length > 1) actions.push({ text: "Eliminar", style: "destructive", onPress: () => removeStay(index) });
    actions.push({ text: "Cancelar", style: "cancel" });
    appAlert(label, "¿Qué quieres hacer con este tramo?", actions);
  };

  const handleConfirmDate = (date: Date) => {
    if (!datePickerTarget) return;
    const { index, field } = datePickerTarget;
    onChangeStays(stays.map((s, i) => {
      if (i !== index) return s;
      if (field === "start") {
        const nextEnd = !s.endDate || s.endDate < date ? date : s.endDate;
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
                  <Text style={{ fontSize: 10, fontWeight: "700", color: "#94A3B8", marginBottom: 3 }}>DESDE</Text>
                  <Text style={{ fontSize: 13, fontWeight: "800", color: "#0F172A" }}>{formatOptionalShortDate(stay.startDate)}</Text>
                </Pressable>
                <Pressable
                  onPress={() => { setDatePickerTarget({ index, field: "end" }); setDatePickerVisible(true); }}
                  style={{ flex: 1, backgroundColor: "#F8FAFC", borderRadius: 12, padding: 10, borderWidth: 1, borderColor: "#E5E7EB" }}
                >
                  <Text style={{ fontSize: 10, fontWeight: "700", color: "#94A3B8", marginBottom: 3 }}>HASTA</Text>
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
            ? (datePickerTarget.field === "end" ? stays[datePickerTarget.index]?.endDate : stays[datePickerTarget.index]?.startDate) ?? new Date()
            : new Date()
        }
        onConfirm={handleConfirmDate}
        onCancel={() => { setDatePickerVisible(false); setDatePickerTarget(null); }}
      />
    </View>
  );
}

/** One shared start/end date range applied to every country stay â€” for when splitting dates per country isn't worth the bother. */
function SingleRangeEditor({ stays, onChangeStays }: { stays: StayDraft[]; onChangeStays: (next: StayDraft[]) => void }) {
  const overallStart = useMemo(() => {`r`n    const starts = stays.map((s) => s.startDate?.getTime()).filter((value): value is number => Number.isFinite(value));`r`n    return starts.length ? new Date(Math.min(...starts)) : null;`r`n  }, [stays]);
  const overallEnd = useMemo(() => {`r`n    const ends = stays.map((s) => s.endDate?.getTime()).filter((value): value is number => Number.isFinite(value));`r`n    return ends.length ? new Date(Math.max(...ends)) : null;`r`n  }, [stays]);

  const [rangeStart, setRangeStart] = useState<Date | null>(overallStart);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(overallEnd);
  const [calDate, setCalDate] = useState(() => overallStart ?? new Date());
  const calYear = calDate.getFullYear();
  const calMonth = calDate.getMonth();
  const calCells = useMemo(() => getCalCells(calYear, calMonth), [calYear, calMonth]);

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
          <Text style={{ fontSize: 15, fontWeight: "800", color: "#0F172A" }}>
            {capitalize(new Date(calYear, calMonth).toLocaleDateString("es-ES", { month: "long", year: "numeric" }))}
          </Text>
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
          <Text style={{ fontSize: 10, fontWeight: "700", color: "#94A3B8", marginBottom: 4 }}>INICIO</Text>
          <Text style={{ fontSize: 14, fontWeight: "800", color: "#0F172A" }}>{formatOptionalShortDate(rangeStart)}</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: "#F8FAFC", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#E5E7EB" }}>
          <Text style={{ fontSize: 10, fontWeight: "700", color: "#94A3B8", marginBottom: 4 }}>FIN</Text>
          <Text style={{ fontSize: 14, fontWeight: "800", color: "#0F172A" }}>{formatOptionalShortDate(rangeEnd)}</Text>
        </View>
      </View>
    </View>
  );
}

/** Toggle between per-country dates (route editor) and one shared start/end for the whole trip. */
function TripDatesEditor({ stays, onChangeStays }: { stays: StayDraft[]; onChangeStays: (next: StayDraft[]) => void }) {
  const [mode, setMode] = useState<TripDateMode>("per_country");

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", backgroundColor: "#F1F5F9", borderRadius: 12, padding: 3 }}>
        {([
          { id: "per_country" as const, label: "Por paÃ­s" },
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
  const initialStays = useMemo(() => initialStaysFromTrip(editTrip), [editTrip]);`r`n  const [stays, setStays]         = useState<StayDraft[]>(initialStays);`r`n  const [dateMode]                = useState<TripDateMode>(() => detectTripDateMode(initialStays));
  const [budgetText, setBudgetText] = useState(editTrip.budget != null ? String(editTrip.budget) : "");
  const [status, setStatus] = useState<TripStatus | null>((editTrip.status as TripStatus) ?? null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(editTrip.coverImageUrl ?? null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);

  const addCountryStay = (code: string, name: string) => {
    if (stays.some((s) => s.countryCode === code)) return;
    setStays((prev) => [...prev, nextStayDraft(code, name, prev)]);
  };

  const totalDays = useMemo(() => {
    const starts = stays.map((s) => s.startDate.getTime());
    const ends = stays.map((s) => s.endDate.getTime());
    if (!starts.length) return 1;
    const d = Math.round((Math.max(...ends) - Math.min(...starts)) / 86400000) + 1;
    return d > 0 ? d : 1;
  }, [stays]);

  const handleSave = async () => {
    if (!name.trim()) { appAlert("Falta el nombre", "AÃ±ade un nombre para el viaje."); return; }
    const validStays = stays.filter((s) => s.countryCode);
    if (validStays.length === 0) { appAlert("Falta el paÃ­s", "Selecciona al menos un paÃ­s."); return; }
    try {
      setSaving(true);
      await api.patch(`/trips/${editTrip.id}`, {
        name: name.trim(),
        countryStays: validStays.map((s) => ({
          country: s.countryCode,
          startDate: s.startDate.toISOString(),
          endDate: s.endDate.toISOString(),
        })),
        budget: budgetText.trim() ? parseMoney(budgetText) : null,
        status: status ?? undefined,
        coverImageUrl: coverImageUrl ?? null,
      });
      navigation.goBack();
    } catch { appAlert("Error", "No se pudo guardar el viaje."); }
    finally { setSaving(false); }
  };

  const handleDelete = () => {
    appAlert("Eliminar viaje", "Â¿Seguro? Esta acciÃ³n no se puede deshacer.", [
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
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F6F8FC" }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: "800", color: "#0F172A" }}>Editar viaje</Text>
        <TouchableOpacity
          onPress={handleDelete}
          disabled={deleting || saving}
          style={{ padding: 4 }}
        >
          {deleting
            ? <ActivityIndicator size="small" color="#EF4444" />
            : <Ionicons name="trash-outline" size={20} color="#EF4444" />
          }
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} showsVerticalScrollIndicator={false}>
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
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#64748B" }}>AÃ±adir foto de portada</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Nombre */}
        <View style={{ backgroundColor: "white", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#EEF2F7" }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8", marginBottom: 8 }}>NOMBRE DEL VIAJE</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ej. Navidad en Praga"
            placeholderTextColor="#94A3B8"
            style={{ fontSize: 18, fontWeight: "800", color: "#0F172A", paddingVertical: 0 }}
          />
        </View>

        {/* Ruta y fechas */}
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 2 }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8" }}>
              {stays.length > 1 ? "RUTA Y FECHAS" : "DESTINO Y FECHAS"}
            </Text>
            {stays.length > 1 && (
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8" }}>{totalDays} dÃ­as en total</Text>
            )}
          </View>

          <TripDatesEditor stays={stays} onChangeStays={updateStays} initialMode={dateMode} />

          <View style={{ backgroundColor: "white", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#EEF2F7" }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8", marginBottom: 10 }}>AÃ‘ADIR OTRO PAÃS</Text>
            <CountrySelect
              valueName=""
              valueCode={null}
              onChange={({ name: n, code }: any) => { if (code) addCountryStay(code, n); }}
            />
          </View>
        </View>

        {/* Estado */}
        <View style={{ backgroundColor: "white", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#EEF2F7" }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8", marginBottom: 10 }}>ESTADO</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {statusOptions.map(o => {
              const active = status === o.value;
              return (
                <TouchableOpacity
                  key={o.value}
                  onPress={() => setStatus(active ? null : o.value)}
                  style={{
                    flex: 1, paddingVertical: 8, borderRadius: 12, alignItems: "center",
                    backgroundColor: active ? colors.primary : "#F8FAFC",
                    borderWidth: 1, borderColor: active ? colors.primary : "#E5E7EB",
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "700", color: active ? "white" : "#64748B" }}>{o.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Presupuesto */}
        <View style={{ backgroundColor: "white", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#EEF2F7" }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8", marginBottom: 10 }}>PRESUPUESTO ESTIMADO</Text>
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC", borderRadius: 12, paddingHorizontal: 14, height: 48, borderWidth: 1, borderColor: "#E5E7EB" }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#94A3B8", marginRight: 6 }}>â‚¬</Text>
            <TextInput
              value={budgetText}
              onChangeText={setBudgetText}
              placeholder="0"
              placeholderTextColor="#CBD5E1"
              keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
              style={{ flex: 1, fontSize: 18, fontWeight: "800", color: "#0F172A", paddingVertical: 0 }}
            />
          </View>
        </View>

        {/* Guardar */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving || deleting}
          activeOpacity={0.9}
          style={{
            height: 52, borderRadius: 16, backgroundColor: colors.primary,
            alignItems: "center", justifyContent: "center",
            opacity: saving || deleting ? 0.7 : 1,
          }}
        >
          {saving
            ? <ActivityIndicator size="small" color="white" />
            : <Text style={{ fontSize: 15, fontWeight: "800", color: "white" }}>Guardar cambios</Text>
          }
        </TouchableOpacity>

        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* â”€â”€â”€ Create wizard â”€â”€â”€ */
export default function TripFormScreen({ route, navigation }: any) {
  const editTrip: TripFromApi | undefined = route?.params?.editTrip;
  if (editTrip) return <EditTripForm editTrip={editTrip} navigation={navigation} />;

  return <CreateTripWizard navigation={navigation} />;
}

function CreateTripWizard({ navigation }: { navigation: any }) {
  const [step, setStep]               = useState<1 | 2 | 3 | 4>(1);
  const [stays, setStays]             = useState<StayDraft[]>([]);
  const [searchQ, setSearchQ]         = useState("");
  const [travelers, setTravelers]     = useState(1);
  const [tripName, setTripName]       = useState("");
  const [companion, setCompanion]     = useState<string | null>(null);
  const [budgetText, setBudgetText]     = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [saving, setSaving]             = useState(false);
  const [createdTrip, setCreatedTrip] = useState<{ id: number; name: string } | null>(null);

  const totalDays = useMemo(() => {
    if (stays.length === 0) return null;
    const starts = stays.map((s) => s.startDate.getTime());
    const ends = stays.map((s) => s.endDate.getTime());
    const d = Math.round((Math.max(...ends) - Math.min(...starts)) / 86400000) + 1;
    return d > 0 ? d : 1;
  }, [stays]);

  const selectedCountryLabel = stays.length === 0
    ? ""
    : stays.length === 1
      ? countryNameEs(stays[0].countryCode) || stays[0].countryName
      : `${stays.length} paÃ­ses`;

  // A trip is a route, not "1 main country + extras" â€” every selected
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

  const handleCreate = async () => {
    if (!tripName.trim()) { appAlert("Falta el nombre", "AÃ±ade un nombre."); return; }
    if (stays.length === 0) { appAlert("Falta el destino", "Selecciona al menos un paÃ­s."); return; }
    try {
      setSaving(true);
      const res = await api.post("/trips", {
        name: tripName.trim(),
        countryStays: stays.map((s) => ({
          country: s.countryCode,
          startDate: s.startDate.toISOString(),
          endDate: s.endDate.toISOString(),
        })),
        budget: budgetText.trim() ? parseMoney(budgetText) : null,
        status: "planning",
        coverImageUrl: coverImageUrl ?? undefined,
      });
      setCreatedTrip({ id: res.data.id, name: res.data.name });
      setStep(4);
    } catch { appAlert("Error", "No se pudo crear el viaje."); }
    finally { setSaving(false); }
  };

  const progress = (step - 1) / 3;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
      {/* Progress bar */}
      <View style={{ height: 3, backgroundColor: "#EEF2FF" }}>
        <View style={{ height: 3, backgroundColor: colors.primary, width: `${progress * 100}%` }} />
      </View>

      {/* â”€â”€ PASO 1: Â¿A dÃ³nde vas? â”€â”€ */}
      {step === 1 && (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {[1,2,3].map(n => (
                <View key={n} style={{ width: n === step ? 20 : 6, height: 6, borderRadius: 3, backgroundColor: n === step ? colors.primary : "#E2E8F0" }} />
              ))}
            </View>
          </View>

          <Text style={{ fontSize: 26, fontWeight: "900", color: "#0F172A" }}>Â¿A dÃ³nde vas?</Text>
          <Text style={{ fontSize: 13, color: "#94A3B8", marginTop: -14 }}>
            Puedes elegir mÃ¡s de un paÃ­s si tu viaje pasa por varios.
          </Text>

          {/* PaÃ­ses seleccionados */}
          {stays.length > 0 && (
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: "800", color: "#94A3B8", letterSpacing: 0.8 }}>
                SELECCIONADOS Â· {stays.length}
              </Text>
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

          {/* Country select */}
          <View>
            <Text style={{ fontSize: 11, fontWeight: "800", color: "#94A3B8", letterSpacing: 0.8, marginBottom: 10 }}>
              {stays.length > 0 ? "AÃ‘ADIR OTRO PAÃS" : "PAÃS"}
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

          {/* Continuar */}
          <TouchableOpacity
            onPress={() => {
              if (stays.length === 0) {
                appAlert("Selecciona un destino", "Elige a dÃ³nde quieres viajar.");
                return;
              }
              setStep(2);
            }}
            activeOpacity={0.9}
            style={{
              height: 52, borderRadius: 16, backgroundColor: colors.primary,
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: "800", color: "white" }}>Continuar</Text>
          </TouchableOpacity>

          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      {/* â”€â”€ PASO 2: Ruta y fechas â”€â”€ */}
      {step === 2 && (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity onPress={() => setStep(1)} style={{ padding: 4, marginRight: 12 }}>
              <Ionicons name="chevron-back" size={22} color={colors.primary} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 22, fontWeight: "900", color: "#0F172A" }}>Ruta y fechas</Text>
              <Text style={{ fontSize: 12, color: "#94A3B8", fontWeight: "600" }}>
                {stays.length > 1 ? "Ordena los paÃ­ses y asigna fechas a cada tramo" : (selectedCountryLabel || "Tu destino")}
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {[1,2,3].map(n => (
                <View key={n} style={{ width: n === step ? 20 : 6, height: 6, borderRadius: 3, backgroundColor: n === step ? colors.primary : "#E2E8F0" }} />
              ))}
            </View>
          </View>

          {totalDays != null && stays.length > 1 && (
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#94A3B8" }}>{totalDays} dÃ­as en total</Text>
          )}

          <TripDatesEditor stays={stays} onChangeStays={updateStays} initialMode={dateMode} />

          {/* Viajeros */}
          <View style={{ backgroundColor: "white", borderRadius: 18, borderWidth: 1, borderColor: "#E5E7EB", padding: 14 }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8", marginBottom: 12 }}>VIAJEROS</Text>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#0F172A" }}>
                {travelers} {travelers === 1 ? "viajero" : "viajeros"}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <TouchableOpacity
                  onPress={() => setTravelers(t => Math.max(1, t - 1))}
                  style={{ width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB", alignItems: "center", justifyContent: "center" }}
                >
                  <Ionicons name="remove" size={18} color="#374151" />
                </TouchableOpacity>
                <Text style={{ fontSize: 18, fontWeight: "900", color: "#0F172A", minWidth: 22, textAlign: "center" }}>{travelers}</Text>
                <TouchableOpacity
                  onPress={() => setTravelers(t => t + 1)}
                  style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}
                >
                  <Ionicons name="add" size={18} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Continuar */}
          <TouchableOpacity
            onPress={() => setStep(3)}
            activeOpacity={0.9}
            style={{ height: 52, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ fontSize: 15, fontWeight: "800", color: "white" }}>Continuar</Text>
          </TouchableOpacity>

          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      {/* â”€â”€ PASO 3: Ãšltimos detalles â”€â”€ */}
      {step === 3 && (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity onPress={() => setStep(2)} style={{ padding: 4, marginRight: 12 }}>
              <Ionicons name="chevron-back" size={22} color={colors.primary} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 22, fontWeight: "900", color: "#0F172A" }}>Ãšltimos detalles</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {[1,2,3].map(n => (
                <View key={n} style={{ width: n === step ? 20 : 6, height: 6, borderRadius: 3, backgroundColor: n === step ? colors.primary : "#E2E8F0" }} />
              ))}
            </View>
          </View>

          {/* Foto de portada */}
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
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#64748B" }}>AÃ±adir foto de portada</Text>
                <Text style={{ fontSize: 12, color: "#94A3B8" }}>Toca para elegir de tu galerÃ­a</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Nombre */}
          <View style={{ backgroundColor: "white", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#EEF2F7" }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8", marginBottom: 8 }}>NOMBRE DEL VIAJE</Text>
            <TextInput
              value={tripName}
              onChangeText={setTripName}
              placeholder="Ej. Vacaciones en Sicilia"
              placeholderTextColor="#CBD5E1"
              style={{ fontSize: 18, fontWeight: "800", color: "#0F172A", paddingVertical: 0 }}
              autoFocus
            />
          </View>

          {/* Â¿Con quiÃ©n viajas? */}
          <View style={{ backgroundColor: "white", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#EEF2F7" }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8", marginBottom: 12 }}>Â¿CON QUIÃ‰N VIAJAS?</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {COMPANION_OPTIONS.map(o => {
                const active = companion === o.id;
                return (
                  <TouchableOpacity
                    key={o.id}
                    onPress={() => setCompanion(active ? null : o.id)}
                    activeOpacity={0.8}
                    style={{
                      flexDirection: "row", alignItems: "center", gap: 6,
                      paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12,
                      backgroundColor: active ? colors.primary : "#F8FAFC",
                      borderWidth: 1, borderColor: active ? colors.primary : "#E5E7EB",
                    }}
                  >
                    <Ionicons name={o.icon} size={14} color={active ? "white" : "#64748B"} />
                    <Text style={{ fontSize: 13, fontWeight: "700", color: active ? "white" : "#374151" }}>{o.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Presupuesto */}
          <View style={{ backgroundColor: "white", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#EEF2F7" }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8", marginBottom: 10 }}>PRESUPUESTO ESTIMADO</Text>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC", borderRadius: 12, paddingHorizontal: 14, height: 48, borderWidth: 1, borderColor: "#E5E7EB" }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: "#94A3B8", marginRight: 6 }}>â‚¬</Text>
              <TextInput
                value={budgetText}
                onChangeText={setBudgetText}
                placeholder="450"
                placeholderTextColor="#CBD5E1"
                keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
                style={{ flex: 1, fontSize: 18, fontWeight: "800", color: "#0F172A", paddingVertical: 0 }}
              />
            </View>
          </View>

          {/* Crear */}
          <TouchableOpacity
            onPress={handleCreate}
            disabled={saving}
            activeOpacity={0.9}
            style={{
              height: 54, borderRadius: 16, backgroundColor: colors.primary,
              alignItems: "center", justifyContent: "center",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving
              ? <ActivityIndicator size="small" color="white" />
              : <Text style={{ fontSize: 15, fontWeight: "800", color: "white" }}>Crear viaje</Text>
            }
          </TouchableOpacity>

          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      {/* â”€â”€ PASO 4: Â¡Viaje creado! â”€â”€ */}
      {step === 4 && (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 24 }}>
          {/* Check */}
          <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="checkmark" size={46} color="#16A34A" />
          </View>

          <View style={{ alignItems: "center", gap: 6 }}>
            <Text style={{ fontSize: 26, fontWeight: "900", color: "#0F172A" }}>Â¡Viaje creado!</Text>
            <Text style={{ fontSize: 14, color: "#64748B", textAlign: "center" }}>
              {createdTrip?.name ?? tripName} ya estÃ¡ en tu lista de viajes
            </Text>
          </View>

          {/* Preview card */}
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
                <Text style={{ fontSize: 16, fontWeight: "800", color: "#0F172A" }}>{createdTrip?.name ?? tripName}</Text>
                <Text style={{ fontSize: 13, color: "#94A3B8", marginTop: 3 }}>
                  {totalDays ? `${totalDays} dÃ­as` : "â€”"}
                  {travelers > 1 ? ` Â· ${travelers} viajeros` : ""}
                </Text>
              </View>
            </View>
          )}

          {/* Botones */}
          <View style={{ width: "100%", gap: 10 }}>
            <TouchableOpacity
              onPress={() => {
                if (createdTrip?.id) {
                  navigation.replace("TripDetail", { tripId: createdTrip.id });
                } else {
                  navigation.goBack();
                }
              }}
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
      )}
    </SafeAreaView>
  );
}





