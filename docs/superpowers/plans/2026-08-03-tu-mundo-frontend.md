# Tu Mundo (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the 4 new "Tu mundo" screens (world overview, country checklist, world wonders list, wonder detail) reachable by tapping the "19%" badge in `TravelsScreen`, consuming the new `/world/*` backend endpoints.

**Architecture:** 4 new screens in `src/screens/Mobile/finances/travels/`, following that folder's existing flat-file-per-screen convention exactly (mirroring `MaletaScreen.tsx`/`ReservasScreen.tsx`). One new data hook (`useWonders`, mirroring `useTripChecklist.ts`). One new photo-upload helper added to the existing `uploadTripCover.ts` utility. 4 new routes registered in `MobileNavigator.tsx`. **Requires the backend plan (`spendly-backend/docs/superpowers/plans/2026-08-03-world-module-backend.md`) to be implemented and running first** — every task here calls a `/world/*` endpoint that must already exist.

**Tech Stack:** React Native / Expo, `@tanstack/react-query`, `axios` (via the shared `api` instance), `@react-native-picker/picker`, `react-native-modal-datetime-picker` (via the existing `CrossPlatformDateTimePicker` wrapper), Supabase Storage (via the existing `uploadTripCover.ts` pattern).

## Global Constraints

- This frontend has **no automated test suite** (confirmed: zero `.test`/`.spec` files anywhere in `spendly/src`). Do not introduce a new test framework as part of this feature — verification is `npx tsc --noEmit` (typecheck) + manual check in the browser (`npm run web`), matching how every other screen in this codebase is verified.
- Navigation: `useNavigation<any>()` / `useRoute<any>()`, params read via `route.params || {}` — this feature folder does **not** use the typed `NativeStackNavigationProp<RootStackParamList>` pattern (that pattern exists in one unrelated, broken file only — do not copy it).
- Routes are registered lazily via `getComponent={() => require("...").default}` in `MobileNavigator.tsx` — **never** register a route pointing at a screen file that doesn't exist yet in the same task; Metro resolves `require()` paths at bundle time and will fail to build the whole app, not just that screen.
- All API calls go through the shared `api` default export from `src/api/api.ts` — never construct a new axios instance, never manually attach the auth token (the interceptor does it).
- Styling: inline `style={{...}}` objects (not `StyleSheet.create`), hand-rolled header row (`chevron-back` Ionicons + bold `Text`) — no shared `Header`/`Card`/`EmptyState` component exists in this feature folder, don't introduce one.
- Colors: `colors.primary` from `src/theme/theme.ts` for interactive elements; `#0F172A` headings, `#94A3B8`/`#6B7280`/`#9CA3AF` muted text, `#F3F4F6`/`#E5E7EB` borders, `#16A34A` for "visited/checked" green — matches `MaletaScreen.tsx`/`TravelsScreen.tsx`.
- `expo-image-picker` is **not installed**; the existing photo-upload pattern (`uploadTripCover.ts`) uses `document.createElement("input")`, which only works on web (React Native Web) and will throw on native iOS/Android. This is a pre-existing limitation of the pattern being mirrored, not a regression introduced here — do not attempt to fix it as part of this plan.

---

### Task 1: `WorldOverviewScreen` — "Tu mundo" summary

**Files:**
- Create: `src/screens/Mobile/finances/travels/WorldOverviewScreen.tsx`
- Modify: `src/navigation/MobileNavigator.tsx`
- Modify: `src/screens/Mobile/finances/travels/TravelsScreen.tsx`

**Interfaces:**
- Consumes: `GET /world/overview` → `{ visitedPct, visitedCountries, totalCountries, continents: {continent, visited, total, pct}[], wondersVisited, wondersTotal }` (backend plan Task 4).
- Produces: route `WorldOverview` in `RootStackParamList`, navigated to from `TravelsScreen`'s badge. Later tasks (2, 3) add `navigation.navigate("CountryChecklist", ...)` / `navigation.navigate("Wonders")` targets that this screen already calls (those routes just aren't registered yet until their own tasks — tapping them before Task 2/3 land is expected to no-op/warn, not crash).

- [ ] **Step 1: Create the screen**

Create `src/screens/Mobile/finances/travels/WorldOverviewScreen.tsx`:

```tsx
import React, { useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import api from "../../../../api/api";
import { colors } from "../../../../theme/theme";

type WorldContinent = "europe" | "asia" | "america" | "africa" | "oceania";

interface WorldOverviewDto {
  visitedPct: number;
  visitedCountries: number;
  totalCountries: number;
  continents: { continent: WorldContinent; visited: number; total: number; pct: number }[];
  wondersVisited: number;
  wondersTotal: number;
}

const CONTINENT_LABELS: Record<WorldContinent, string> = {
  europe: "Europa",
  asia: "Asia",
  america: "América",
  africa: "África",
  oceania: "Oceanía",
};

export default function WorldOverviewScreen() {
  const navigation = useNavigation<any>();

  const overviewQuery = useQuery({
    queryKey: ["worldOverview"],
    queryFn: async () => (await api.get("/world/overview")).data as WorldOverviewDto,
    staleTime: 1000 * 30,
  });

  useFocusEffect(
    useCallback(() => {
      overviewQuery.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const overview = overviewQuery.data;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F6F8FC" }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8, gap: 8 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 22, fontWeight: "900", color: "#0F172A" }}>Tu mundo</Text>
      </View>

      {overviewQuery.isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}>
          <View
            style={{
              backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: "#F3F4F6",
              padding: 20, alignItems: "center", marginBottom: 16,
            }}
          >
            <Ionicons name="earth" size={64} color="#CBD5E1" />
            <Text style={{ fontSize: 12, color: "#94A3B8", marginTop: 8, textAlign: "center" }}>
              Mapa detallado próximamente
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
            <Text style={{ fontSize: 34, fontWeight: "900", color: "#0F172A" }}>
              {overview?.visitedPct ?? 0}%
            </Text>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#6B7280" }}>Mundo</Text>
          </View>
          <Text style={{ fontSize: 13, color: "#94A3B8", fontWeight: "600", marginBottom: 20 }}>
            {overview?.visitedCountries ?? 0} de {overview?.totalCountries ?? 195} países reconocidos por la ONU
          </Text>

          <Text style={{ fontSize: 13, fontWeight: "800", color: "#0F172A", marginBottom: 10 }}>
            Por continente
          </Text>
          <View style={{ backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: "#F3F4F6", overflow: "hidden", marginBottom: 20 }}>
            {(overview?.continents ?? []).map((c, index) => (
              <TouchableOpacity
                key={c.continent}
                onPress={() => navigation.navigate("CountryChecklist", { continent: c.continent })}
                activeOpacity={0.7}
                style={{
                  paddingHorizontal: 16, paddingVertical: 14,
                  borderTopWidth: index === 0 ? 0 : 1, borderTopColor: "#F3F4F6",
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#0F172A" }}>
                    {CONTINENT_LABELS[c.continent]}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={{ fontSize: 12, color: "#94A3B8", fontWeight: "600" }}>
                      {c.visited}/{c.total} · {c.pct}%
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color="#CBD5E1" />
                  </View>
                </View>
                <View style={{ height: 6, borderRadius: 999, backgroundColor: "#F3F4F6" }}>
                  <View style={{ height: 6, borderRadius: 999, backgroundColor: colors.primary, width: `${c.pct}%` }} />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate("Wonders")}
            activeOpacity={0.85}
            style={{
              flexDirection: "row", alignItems: "center", justifyContent: "space-between",
              backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: "#F3F4F6",
              padding: 16,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons name="ribbon-outline" size={22} color={colors.primary} />
              <View>
                <Text style={{ fontSize: 14, fontWeight: "800", color: "#0F172A" }}>Maravillas del mundo</Text>
                <Text style={{ fontSize: 12, color: "#94A3B8", fontWeight: "600" }}>
                  {overview?.wondersVisited ?? 0} de {overview?.wondersTotal ?? 14} visitadas
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Register the `WorldOverview` route**

In `src/navigation/MobileNavigator.tsx`, add to `RootStackParamList` (right after the line `Maleta: undefined;`):

```ts
  WorldOverview: undefined;
```

Then add this block right after the existing `<Stack.Screen name="Maleta" .../>` registration:

```tsx
        <Stack.Screen
          name="WorldOverview"
          getComponent={() =>
            require("../screens/Mobile/finances/travels/WorldOverviewScreen").default
          }
        />
```

- [ ] **Step 3: Wire the badge in `TravelsScreen.tsx`**

In `src/screens/Mobile/finances/travels/TravelsScreen.tsx`, find the "Badge % mundo" block:

```tsx
            {heroStats.visitedPct > 0 && (
              <View style={{
                alignSelf: "flex-end",
                paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
                backgroundColor: "rgba(255,255,255,0.18)",
                flexDirection: "row", alignItems: "center", gap: 4,
                marginBottom: 6,
              }}>
                <Ionicons name="earth-outline" size={10} color="rgba(255,255,255,0.85)" />
                <Text style={{ fontSize: 10, fontWeight: "800", color: "white" }}>
                  {Math.round(heroStats.visitedPct)}%
                </Text>
              </View>
            )}
```

Replace it with (`View` → `TouchableOpacity`, `TouchableOpacity` is already imported in this file):

```tsx
            {heroStats.visitedPct > 0 && (
              <TouchableOpacity
                onPress={() => navigation.navigate("WorldOverview")}
                activeOpacity={0.7}
                style={{
                  alignSelf: "flex-end",
                  paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
                  backgroundColor: "rgba(255,255,255,0.18)",
                  flexDirection: "row", alignItems: "center", gap: 4,
                  marginBottom: 6,
                }}
              >
                <Ionicons name="earth-outline" size={10} color="rgba(255,255,255,0.85)" />
                <Text style={{ fontSize: 10, fontWeight: "800", color: "white" }}>
                  {Math.round(heroStats.visitedPct)}%
                </Text>
              </TouchableOpacity>
            )}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors introduced by these 3 files.

- [ ] **Step 5: Manual verification**

Run: `npm run web`. Log in, navigate to Viajes (Trips), confirm the "19%"-style badge (top-right of the blue hero card) is tappable and opens "Tu mundo" showing the real `%`, país count, and continent breakdown bars with real data from the backend. Tapping a continent row or the "Maravillas del mundo" card is expected to do nothing yet (built in Tasks 2-3).

- [ ] **Step 6: Commit**

```bash
git add src/screens/Mobile/finances/travels/WorldOverviewScreen.tsx src/navigation/MobileNavigator.tsx src/screens/Mobile/finances/travels/TravelsScreen.tsx
git commit -m "feat(world): add Tu mundo overview screen, reachable from the % badge"
```

---

### Task 2: `CountryChecklistScreen` — "Mis países"

**Files:**
- Create: `src/screens/Mobile/finances/travels/CountryChecklistScreen.tsx`
- Modify: `src/navigation/MobileNavigator.tsx`

**Interfaces:**
- Consumes: `GET /world/countries` → `{continent, countries: {code,nameEs,visited}[], visited, total, pct}[]` (backend plan Task 4); route param `{ continent?: WorldContinent }` from `WorldOverviewScreen` (Task 1).
- Produces: route `CountryChecklist`.

- [ ] **Step 1: Create the screen**

Create `src/screens/Mobile/finances/travels/CountryChecklistScreen.tsx`:

```tsx
import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import api from "../../../../api/api";
import { colors } from "../../../../theme/theme";

type WorldContinent = "europe" | "asia" | "america" | "africa" | "oceania";

interface CountryRow {
  code: string;
  nameEs: string;
  visited: boolean;
}
interface ContinentCountries {
  continent: WorldContinent;
  countries: CountryRow[];
  visited: number;
  total: number;
  pct: number;
}

const CONTINENT_LABELS: Record<WorldContinent, string> = {
  europe: "Europa",
  asia: "Asia",
  america: "América",
  africa: "África",
  oceania: "Oceanía",
};
const CONTINENT_ORDER: WorldContinent[] = ["europe", "asia", "america", "africa", "oceania"];

export default function CountryChecklistScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { continent: initialContinent } = route.params || {};

  const [activeTab, setActiveTab] = useState<WorldContinent>(initialContinent || "europe");

  const countriesQuery = useQuery({
    queryKey: ["worldCountries"],
    queryFn: async () => (await api.get("/world/countries")).data as ContinentCountries[],
    staleTime: 1000 * 30,
  });

  const activeGroup = (countriesQuery.data ?? []).find((g) => g.continent === activeTab);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F6F8FC" }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8, gap: 8 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "900", color: "#0F172A" }}>Mis países</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 12 }}
      >
        {CONTINENT_ORDER.map((c) => (
          <TouchableOpacity
            key={c}
            onPress={() => setActiveTab(c)}
            style={{
              paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
              backgroundColor: activeTab === c ? colors.primary : "white",
              borderWidth: 1, borderColor: activeTab === c ? colors.primary : "#E5E7EB",
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "700", color: activeTab === c ? "white" : "#374151" }}>
              {CONTINENT_LABELS[c]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {countriesQuery.isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}>
          {activeGroup && (
            <Text style={{ fontSize: 12, color: "#94A3B8", fontWeight: "700", marginBottom: 10 }}>
              {CONTINENT_LABELS[activeTab].toUpperCase()} · {activeGroup.visited}/{activeGroup.total}
            </Text>
          )}
          <View style={{ backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: "#F3F4F6", overflow: "hidden" }}>
            {(activeGroup?.countries ?? []).map((country, index) => (
              <View
                key={country.code}
                style={{
                  flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12,
                  borderTopWidth: index === 0 ? 0 : 1, borderTopColor: "#F3F4F6",
                }}
              >
                <Ionicons
                  name={country.visited ? "checkmark-circle" : "ellipse-outline"}
                  size={20}
                  color={country.visited ? "#16A34A" : "#D1D5DB"}
                />
                <Text
                  style={{
                    marginLeft: 10, fontSize: 14, fontWeight: "600",
                    color: country.visited ? "#0F172A" : "#6B7280",
                  }}
                >
                  {country.nameEs}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Register the `CountryChecklist` route**

In `src/navigation/MobileNavigator.tsx`, add to `RootStackParamList` (right after `WorldOverview: undefined;`):

```ts
  CountryChecklist: { continent?: "europe" | "asia" | "america" | "africa" | "oceania" } | undefined;
```

Add the Stack.Screen block right after the `WorldOverview` registration added in Task 1:

```tsx
        <Stack.Screen
          name="CountryChecklist"
          getComponent={() =>
            require("../screens/Mobile/finances/travels/CountryChecklistScreen").default
          }
        />
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Manual verification**

In the running app, go to Tu mundo → tap a continent row (e.g. "Europa") → confirm it opens "Mis países" with that continent's tab pre-selected, showing every country in that continent with a green filled checkmark for visited ones and an empty grey circle for the rest, matching the count shown on the overview screen. Switch tabs and confirm the list updates.

- [ ] **Step 5: Commit**

```bash
git add src/screens/Mobile/finances/travels/CountryChecklistScreen.tsx src/navigation/MobileNavigator.tsx
git commit -m "feat(world): add Mis países checklist screen"
```

---

### Task 3: `useWonders` hook + `WondersScreen` — "Maravillas del mundo"

**Files:**
- Create: `src/hooks/useWonders.ts`
- Create: `src/screens/Mobile/finances/travels/WondersScreen.tsx`
- Modify: `src/navigation/MobileNavigator.tsx`

**Interfaces:**
- Consumes: `GET /world/wonders`, `PATCH /world/wonders/:key` (backend plan Task 4-5).
- Produces: `useWonders(): { wonders: Wonder[], isLoading: boolean, refetch: () => void, updateWonder: (key: string, input: UpdateWonderVisitInput) => Promise<Wonder>, isSaving: boolean, errorMessage: string }` and `export interface Wonder { key, name, country, era, visited, visitedAt, photoUrl, tripId }` / `export type WonderEra = "modern" | "ancient"` — consumed by `WondersScreen` (this task) and `WonderDetailScreen` (Task 4). Route `Wonders`.

- [ ] **Step 1: Create `useWonders`**

Create `src/hooks/useWonders.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import api from "../api/api";

export type WonderEra = "modern" | "ancient";

export interface Wonder {
  key: string;
  name: string;
  country: string;
  era: WonderEra;
  visited: boolean;
  visitedAt: string | null;
  photoUrl: string | null;
  tripId: number | null;
}

export interface UpdateWonderVisitInput {
  visited: boolean;
  visitedAt?: string;
  photoUrl?: string;
  tripId?: number;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message[0] ?? fallback;
    if (typeof message === "string" && message.trim()) return message;
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

export function useWonders() {
  const queryClient = useQueryClient();
  const queryKey = ["worldWonders"];

  const query = useQuery({
    queryKey,
    queryFn: async () => (await api.get("/world/wonders")).data as Wonder[],
    staleTime: 1000 * 30,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ key, input }: { key: string; input: UpdateWonderVisitInput }) =>
      (await api.patch(`/world/wonders/${key}`, input)).data as Wonder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["worldOverview"] });
    },
  });

  return {
    wonders: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    updateWonder: (key: string, input: UpdateWonderVisitInput) =>
      updateMutation.mutateAsync({ key, input }),
    isSaving: updateMutation.isPending,
    errorMessage: getErrorMessage(query.error, "") || getErrorMessage(updateMutation.error, ""),
  };
}
```

- [ ] **Step 2: Create the screen**

Create `src/screens/Mobile/finances/travels/WondersScreen.tsx`:

```tsx
import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../../../../theme/theme";
import { useWonders, WonderEra } from "../../../../hooks/useWonders";

const ERA_LABELS: Record<WonderEra, string> = { modern: "Modernas", ancient: "Antiguas" };

function formatDateEs(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

export default function WondersScreen() {
  const navigation = useNavigation<any>();
  const { wonders, isLoading } = useWonders();
  const [activeEra, setActiveEra] = useState<WonderEra>("modern");

  const filtered = wonders.filter((w) => w.era === activeEra);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F6F8FC" }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8, gap: 8 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "900", color: "#0F172A" }}>Maravillas del mundo</Text>
      </View>

      <View style={{ flexDirection: "row", paddingHorizontal: 20, gap: 8, marginBottom: 4 }}>
        {(["modern", "ancient"] as WonderEra[]).map((era) => {
          const visitedInThisEra = wonders.filter((w) => w.era === era && w.visited).length;
          return (
            <TouchableOpacity
              key={era}
              onPress={() => setActiveEra(era)}
              style={{
                flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center",
                backgroundColor: activeEra === era ? colors.primary : "white",
                borderWidth: 1, borderColor: activeEra === era ? colors.primary : "#E5E7EB",
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: activeEra === era ? "white" : "#374151" }}>
                {ERA_LABELS[era]} · {visitedInThisEra}/7
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100, gap: 10 }}
        >
          {filtered.map((wonder) => (
            <TouchableOpacity
              key={wonder.key}
              onPress={() => navigation.navigate("WonderDetail", { wonderKey: wonder.key })}
              activeOpacity={0.85}
              style={{
                flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: "#F3F4F6",
                padding: 16,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "800", color: "#0F172A" }}>{wonder.name}</Text>
                <Text
                  style={{
                    fontSize: 12, fontWeight: "700", marginTop: 4,
                    color: wonder.visited ? "#16A34A" : "#94A3B8",
                  }}
                >
                  {wonder.visited ? `✓ Visitado · ${formatDateEs(wonder.visitedAt)}` : "Marcar como visitada"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
```

- [ ] **Step 3: Register the `Wonders` route**

In `src/navigation/MobileNavigator.tsx`, add to `RootStackParamList` (right after `CountryChecklist: ...;`):

```ts
  Wonders: undefined;
```

Add the Stack.Screen block right after the `CountryChecklist` registration added in Task 2:

```tsx
        <Stack.Screen
          name="Wonders"
          getComponent={() =>
            require("../screens/Mobile/finances/travels/WondersScreen").default
          }
        />
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Manual verification**

In the running app, go to Tu mundo → tap "Maravillas del mundo" → confirm it opens with the "Modernas"/"Antiguas" tabs each showing "X/7", and 7 cards per tab, all showing "Marcar como visitada" (grey) since none are visited yet. Tapping a card is expected to do nothing yet (built in Task 4).

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useWonders.ts src/screens/Mobile/finances/travels/WondersScreen.tsx src/navigation/MobileNavigator.tsx
git commit -m "feat(world): add useWonders hook and Maravillas del mundo list screen"
```

---

### Task 4: Wonder photo upload + `WonderDetailScreen`

**Files:**
- Modify: `src/utils/uploadTripCover.ts`
- Create: `src/screens/Mobile/finances/travels/WonderDetailScreen.tsx`
- Modify: `src/navigation/MobileNavigator.tsx`

**Interfaces:**
- Consumes: `useWonders()` (Task 3), `GET /trips?country=<ISO2>` (backend plan Task 6), `CrossPlatformDateTimePicker` (existing component).
- Produces: `pickAndUploadWonderPhoto(): Promise<string | null>`, route `WonderDetail` with param `{ wonderKey: string }`.

- [ ] **Step 1: Add the photo upload helper**

In `src/utils/uploadTripCover.ts`, add this export at the end of the file (after `pickAndUploadAccommodationCover`):

```ts
export function pickAndUploadWonderPhoto(): Promise<string | null> {
  return pickAndUploadImage("wonder-photos");
}
```

- [ ] **Step 2: Create the screen**

Create `src/screens/Mobile/finances/travels/WonderDetailScreen.tsx`:

```tsx
import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import api from "../../../../api/api";
import { colors } from "../../../../theme/theme";
import { useWonders } from "../../../../hooks/useWonders";
import { pickAndUploadWonderPhoto } from "../../../../utils/uploadTripCover";
import CrossPlatformDateTimePicker from "../../../../components/CrossPlatformDateTimePicker";

interface TripOption {
  id: number;
  name: string;
}

function formatDateEs(d: Date) {
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
}

export default function WonderDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { wonderKey } = route.params || {};

  const { wonders, isLoading, updateWonder, isSaving } = useWonders();
  const wonder = wonders.find((w) => w.key === wonderKey);

  const [visited, setVisited] = useState(false);
  const [visitedAt, setVisitedAt] = useState<Date>(new Date());
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [tripId, setTripId] = useState<number | null>(null);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (!wonder) return;
    setVisited(wonder.visited);
    setVisitedAt(wonder.visitedAt ? new Date(wonder.visitedAt) : new Date());
    setPhotoUrl(wonder.photoUrl);
    setTripId(wonder.tripId);
  }, [wonder]);

  const tripsQuery = useQuery({
    queryKey: ["tripsByCountry", wonder?.country],
    queryFn: async () =>
      (await api.get("/trips", { params: { country: wonder!.country } })).data as TripOption[],
    enabled: !!wonder?.country,
    staleTime: 1000 * 30,
  });

  if (isLoading || !wonder) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F6F8FC" }}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  const handlePickPhoto = async () => {
    if (uploadingPhoto) return;
    setUploadingPhoto(true);
    try {
      const url = await pickAndUploadWonderPhoto();
      if (url) setPhotoUrl(url);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    await updateWonder(wonderKey, {
      visited,
      visitedAt: visited ? visitedAt.toISOString() : undefined,
      photoUrl: visited ? photoUrl ?? undefined : undefined,
      tripId: visited ? tripId ?? undefined : undefined,
    });
    navigation.goBack();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F6F8FC" }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8, gap: 8 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "900", color: "#0F172A" }}>{wonder.name}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100, gap: 16 }}>
        <TouchableOpacity
          onPress={handlePickPhoto}
          activeOpacity={0.85}
          style={{
            height: 180, borderRadius: 16, backgroundColor: "#F3F4F6",
            borderWidth: 1, borderColor: "#E5E7EB", borderStyle: "dashed",
            alignItems: "center", justifyContent: "center", overflow: "hidden",
          }}
        >
          {uploadingPhoto ? (
            <ActivityIndicator color={colors.primary} />
          ) : photoUrl ? (
            <Image source={{ uri: photoUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          ) : (
            <>
              <Ionicons name="image-outline" size={28} color="#9CA3AF" />
              <Text style={{ fontSize: 12, color: "#6B7280", fontWeight: "600", marginTop: 6 }}>
                Añadir tu foto en {wonder.name}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View
          style={{
            flexDirection: "row", alignItems: "center", justifyContent: "space-between",
            backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: "#F3F4F6",
            paddingHorizontal: 16, paddingVertical: 14,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#0F172A" }}>Marcar como visitada</Text>
          <Switch value={visited} onValueChange={setVisited} trackColor={{ false: "#E5E7EB", true: colors.primary }} />
        </View>

        {visited && (
          <>
            <TouchableOpacity
              onPress={() => setDatePickerVisible(true)}
              style={{ backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: "#F3F4F6", padding: 14 }}
            >
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8", marginBottom: 4 }}>FECHA DE LA VISITA</Text>
              <Text style={{ fontSize: 14, fontWeight: "800", color: "#0F172A" }}>{formatDateEs(visitedAt)}</Text>
            </TouchableOpacity>

            <View style={{ backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: "#F3F4F6", padding: 14 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8", marginBottom: 4 }}>
                VINCULAR A UN VIAJE (OPCIONAL)
              </Text>
              <Picker
                selectedValue={tripId ?? -1}
                onValueChange={(v) => setTripId(v === -1 ? null : (v as number))}
              >
                <Picker.Item label="Ninguno seleccionado" value={-1} />
                {(tripsQuery.data ?? []).map((t) => (
                  <Picker.Item key={t.id} label={t.name} value={t.id} />
                ))}
              </Picker>
            </View>
          </>
        )}

        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.85}
          style={{
            backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 14,
            alignItems: "center", opacity: isSaving ? 0.6 : 1,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: "800", color: "white" }}>
            {isSaving ? "Guardando..." : "Guardar"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <CrossPlatformDateTimePicker
        isVisible={datePickerVisible}
        mode="date"
        date={visitedAt}
        onConfirm={(d) => {
          setVisitedAt(d);
          setDatePickerVisible(false);
        }}
        onCancel={() => setDatePickerVisible(false)}
      />
    </SafeAreaView>
  );
}
```

- [ ] **Step 3: Register the `WonderDetail` route**

In `src/navigation/MobileNavigator.tsx`, add to `RootStackParamList` (right after `Wonders: undefined;`):

```ts
  WonderDetail: { wonderKey: string };
```

Add the Stack.Screen block right after the `Wonders` registration added in Task 3:

```tsx
        <Stack.Screen
          name="WonderDetail"
          getComponent={() =>
            require("../screens/Mobile/finances/travels/WonderDetailScreen").default
          }
        />
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Manual verification (full end-to-end flow)**

In the running app (`npm run web`): Tu mundo → Maravillas del mundo → tap "Machu Picchu" → confirm the detail screen shows the photo tile, the "Marcar como visitada" toggle (off), no date/trip fields visible. Turn the toggle on → date field and trip selector appear, defaulting to today's date. Tap the photo tile, pick an image file → confirm it uploads and renders in the tile. Tap the date field → confirm `CrossPlatformDateTimePicker` opens and setting a date updates the displayed text. Tap "Guardar" → confirm it navigates back to "Maravillas del mundo" and Machu Picchu's card now shows "✓ Visitado · <date>" in green, and the tab counter increments to "1/7". Go back to "Tu mundo" and confirm "Maravillas del mundo · 1 de 14 visitadas" updated. Re-open Machu Picchu, turn the toggle off, save, and confirm it reverts to "Marcar como visitada" and the counters go back down.

- [ ] **Step 6: Commit**

```bash
git add src/utils/uploadTripCover.ts src/screens/Mobile/finances/travels/WonderDetailScreen.tsx src/navigation/MobileNavigator.tsx
git commit -m "feat(world): add wonder detail screen with photo, date and trip link"
```

---

## Plan Self-Review

**Spec coverage:** `WorldOverviewScreen` (Task 1) ✓; badge wired (Task 1) ✓; `CountryChecklistScreen` read-only per-continent list (Task 2) ✓; `WondersScreen` with era tabs (Task 3) ✓; `WonderDetailScreen` with photo/toggle/date/trip-link (Task 4) ✓; map placeholder, not real SVG map, matching the "deferred to Entrega 2" decision in the spec (Task 1's static placeholder card) ✓.

**Placeholder scan:** no TBD/TODO; every step has complete, real code.

**Type consistency:** `Wonder`/`WonderEra`/`UpdateWonderVisitInput` defined once in `useWonders.ts` (Task 3) and imported with matching names in `WondersScreen.tsx` (Task 3) and `WonderDetailScreen.tsx` (Task 4). `WorldContinent` and `CONTINENT_LABELS` are defined locally per-screen (Task 1 and Task 2 each declare their own copy) since there's no shared `src/types/world.ts` in this codebase's convention (types are typically declared inline per-screen, e.g. `TripsSummaryDto` is duplicated in both `TravelsScreen.tsx` and `TripsHomeDesktopScreen.tsx` per the existing pattern) — both copies use identical continent keys (`europe`/`asia`/`america`/`africa`/`oceania`) so they stay interchangeable with the backend response.
