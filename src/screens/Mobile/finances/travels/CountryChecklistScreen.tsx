import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import api from "../../../../api/api";
import { colors } from "../../../../theme/theme";

type WorldContinent = "europe" | "asia" | "north_america" | "south_america" | "africa" | "oceania";
type TabKey = WorldContinent | "all";
type StatusFilter = "all" | "visited" | "not_visited";

interface CountryRow {
  code: string;
  nameEs: string;
  visited: boolean;
  visitedAt: string | null;
}
interface ContinentCountries {
  continent: WorldContinent;
  countries: CountryRow[];
  visited: number;
  total: number;
  pct: number;
}

const TAB_ORDER: TabKey[] = ["all", "europe", "asia", "north_america", "south_america", "africa", "oceania"];
const TAB_LABELS: Record<TabKey, string> = {
  all: "Todos",
  europe: "Europa",
  asia: "Asia",
  north_america: "Norteamérica",
  south_america: "Sudamérica",
  africa: "África",
  oceania: "Oceanía",
};

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "visited", label: "Visitados" },
  { key: "not_visited", label: "No visitados" },
];

function flagEmojiFromISO2(code: string) {
  const c = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return "🌍";
  return String.fromCodePoint(...[...c].map((ch) => 127397 + ch.charCodeAt(0)));
}

function formatMonthYearEs(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  const label = d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function CountryChecklistScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { continent: initialContinent } = route.params || {};

  const [activeTab, setActiveTab] = useState<TabKey>(initialContinent || "all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const countriesQuery = useQuery({
    queryKey: ["worldCountries"],
    queryFn: async () => (await api.get("/world/countries")).data as ContinentCountries[],
    staleTime: 1000 * 30,
  });

  const groups = countriesQuery.data ?? [];

  const { headerVisited, headerTotal, listCountries } = useMemo(() => {
    if (activeTab === "all") {
      const all = groups.flatMap((g) => g.countries);
      const sorted = [...all].sort((a, b) => a.nameEs.localeCompare(b.nameEs, "es"));
      return {
        headerVisited: all.filter((c) => c.visited).length,
        headerTotal: all.length,
        listCountries: sorted,
      };
    }
    const group = groups.find((g) => g.continent === activeTab);
    return {
      headerVisited: group?.visited ?? 0,
      headerTotal: group?.total ?? 0,
      listCountries: group?.countries ?? [],
    };
  }, [groups, activeTab]);

  const visibleCountries = listCountries.filter((c) => {
    if (statusFilter === "visited") return c.visited;
    if (statusFilter === "not_visited") return !c.visited;
    return true;
  });

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
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ flexDirection: "row", paddingHorizontal: 20, paddingBottom: 10 }}
      >
        {TAB_ORDER.map((tab, index) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={{
              paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
              backgroundColor: activeTab === tab ? colors.primary : "white",
              borderWidth: 1, borderColor: activeTab === tab ? colors.primary : "#E5E7EB",
              marginRight: index === TAB_ORDER.length - 1 ? 0 : 8,
            }}
          >
            <Text
              style={{ fontSize: 12, fontWeight: "700", color: activeTab === tab ? "white" : "#374151" }}
              numberOfLines={1}
            >
              {TAB_LABELS[tab]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={{ flexDirection: "row", paddingHorizontal: 20, gap: 8, marginBottom: 10 }}>
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            onPress={() => setStatusFilter(f.key)}
            style={{
              flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center",
              backgroundColor: statusFilter === f.key ? "#EEF2FF" : "white",
              borderWidth: 1, borderColor: statusFilter === f.key ? colors.primary : "#E5E7EB",
            }}
          >
            <Text
              style={{
                fontSize: 12, fontWeight: "700",
                color: statusFilter === f.key ? colors.primary : "#6B7280",
              }}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {countriesQuery.isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}>
          <Text style={{ fontSize: 12, color: "#94A3B8", fontWeight: "700", marginBottom: 10 }}>
            {TAB_LABELS[activeTab].toUpperCase()} · {headerVisited}/{headerTotal}
          </Text>
          <View style={{ backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: "#F3F4F6", overflow: "hidden" }}>
            {visibleCountries.map((country, index) => {
              const visitedLabel = formatMonthYearEs(country.visitedAt);
              return (
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
                  <Text style={{ fontSize: 16, marginLeft: 10 }}>{flagEmojiFromISO2(country.code)}</Text>
                  <View style={{ marginLeft: 8, flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 14, fontWeight: "600",
                        color: country.visited ? "#0F172A" : "#6B7280",
                      }}
                    >
                      {country.nameEs}
                    </Text>
                    {country.visited && visitedLabel && (
                      <Text style={{ fontSize: 11, color: "#94A3B8", fontWeight: "600", marginTop: 2 }}>
                        {visitedLabel}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
