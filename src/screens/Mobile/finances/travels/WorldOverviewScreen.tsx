import React, { useCallback, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import api from "../../../../api/api";
import { colors } from "../../../../theme/theme";
import WorldMapSvg from "./components/WorldMapSvg";

type WorldContinent = "europe" | "asia" | "north_america" | "south_america" | "africa" | "oceania";

interface WorldOverviewDto {
  visitedPct: number;
  visitedCountries: number;
  totalCountries: number;
  continents: { continent: WorldContinent; visited: number; total: number; pct: number }[];
  wondersVisited: number;
  wondersTotal: number;
}

interface ContinentCountries {
  continent: WorldContinent;
  countries: { code: string; nameEs: string; visited: boolean }[];
}

const CONTINENT_LABELS: Record<WorldContinent, string> = {
  europe: "Europa",
  asia: "Asia",
  north_america: "Norteamérica",
  south_america: "Sudamérica",
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

  const countriesQuery = useQuery({
    queryKey: ["worldCountries"],
    queryFn: async () => (await api.get("/world/countries")).data as ContinentCountries[],
    staleTime: 1000 * 30,
  });

  useFocusEffect(
    useCallback(() => {
      overviewQuery.refetch();
      countriesQuery.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const overview = overviewQuery.data;

  const visitedCodes = useMemo(() => {
    const codes = new Set<string>();
    for (const group of countriesQuery.data ?? []) {
      for (const c of group.countries) {
        if (c.visited) codes.add(c.code);
      }
    }
    return codes;
  }, [countriesQuery.data]);

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
          <View style={{ marginHorizontal: -20, marginBottom: 16, overflow: "hidden" }}>
            <WorldMapSvg visitedCodes={visitedCodes} height={320} visitedColor={colors.primary} />
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
                  {overview?.wondersVisited ?? 0} de {overview?.wondersTotal ?? 21} visitadas
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
