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
