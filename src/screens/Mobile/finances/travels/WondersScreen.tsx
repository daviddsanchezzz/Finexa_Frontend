import React, { useState } from "react";
import { View, Text, Image, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../../../../theme/theme";
import { useWonders, WonderEra } from "../../../../hooks/useWonders";

const ERA_ORDER: WonderEra[] = ["modern", "ancient", "natural"];
const ERA_LABELS: Record<WonderEra, string> = { modern: "Modernas", ancient: "Antiguas", natural: "Naturales" };

function formatMonthYearEs(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
}

function flagEmojiFromISO2(code: string) {
  const c = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return "🌍";
  return String.fromCodePoint(...[...c].map((ch) => 127397 + ch.charCodeAt(0)));
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

      <View style={{ flexDirection: "row", paddingHorizontal: 20, gap: 6, marginBottom: 4 }}>
        {ERA_ORDER.map((era) => {
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
              <Text
                style={{ fontSize: 12, fontWeight: "700", color: activeEra === era ? "white" : "#374151" }}
                numberOfLines={1}
              >
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
                padding: 16, gap: 12,
              }}
            >
              {wonder.photoUrl && (
                <Image
                  source={{ uri: wonder.photoUrl }}
                  style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: "#F3F4F6" }}
                  resizeMode="cover"
                />
              )}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={{ fontSize: 15 }}>{flagEmojiFromISO2(wonder.country)}</Text>
                  <Text style={{ fontSize: 14, fontWeight: "800", color: "#0F172A" }}>{wonder.name}</Text>
                </View>
                <Text
                  style={{
                    fontSize: 12, fontWeight: "700", marginTop: 4,
                    color: wonder.visited ? "#16A34A" : "#94A3B8",
                  }}
                >
                  {wonder.visited ? `✓ Visitado · ${formatMonthYearEs(wonder.visitedAt)}` : "Marcar como visitada"}
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
