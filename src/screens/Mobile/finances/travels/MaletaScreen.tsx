import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { colors } from "../../../../theme/theme";
import { useTripChecklist, ChecklistCategory } from "../../../../hooks/useTripChecklist";
import { useUserDocuments } from "../../../../hooks/useUserDocuments";
import { useTripDocuments } from "../../../../hooks/useTripDocuments";
import { useTripWeather } from "../../../../hooks/useTripWeather";
import { getClimateChecklistSuggestions } from "../../../../utils/tripWeather";

const CATEGORY_META: Record<ChecklistCategory, { label: string; emoji: string }> = {
  ropa: { label: "Ropa", emoji: "👕" },
  documentos: { label: "Documentos", emoji: "📄" },
  electronica: { label: "Electrónica", emoji: "🔌" },
  otros: { label: "Otros", emoji: "🎒" },
};
const CATEGORIES: ChecklistCategory[] = ["ropa", "documentos", "electronica", "otros"];

interface SyntheticItem {
  key: string;
  label: string;
  checked: boolean;
}

export default function MaletaScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { tripId, destination, tripName } = route.params || {};

  const { items, isLoading, toggleItem, createItem, deleteItem, isSaving } = useTripChecklist(tripId);
  const { documentsByType: userDocsByType } = useUserDocuments();
  const { documentsByType: tripDocsByType } = useTripDocuments(tripId);
  const weatherQuery = useTripWeather(destination, tripName);

  const [activeTab, setActiveTab] = useState<ChecklistCategory | "all">("all");
  const [newItemLabel, setNewItemLabel] = useState("");

  const syntheticDocs: SyntheticItem[] = [
    { key: "doc-passport", label: "Pasaporte", checked: userDocsByType.has("passport") },
    { key: "doc-insurance", label: "Seguro de viaje", checked: tripDocsByType.has("travel_insurance") },
  ];

  const totalCount = items.length + syntheticDocs.length;
  const checkedCount = items.filter((i) => i.checked).length + syntheticDocs.filter((i) => i.checked).length;
  const progress = totalCount > 0 ? checkedCount / totalCount : 0;

  const categoryCount = (cat: ChecklistCategory) =>
    items.filter((i) => i.category === cat).length + (cat === "documentos" ? syntheticDocs.length : 0);

  const visibleCategories = activeTab === "all" ? CATEGORIES : [activeTab];

  const suggestions = getClimateChecklistSuggestions(weatherQuery.data?.days ?? []);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: "900", color: "#0F172A" }}>Maleta</Text>
        </View>

        <Text style={{ fontSize: 12, fontWeight: "700", color: "#6B7280", marginBottom: 6 }}>
          {checkedCount} de {totalCount} preparados
        </Text>
        <View style={{ height: 6, borderRadius: 999, backgroundColor: "#F3F4F6" }}>
          <View style={{ height: 6, borderRadius: 999, backgroundColor: "#16A34A", width: `${Math.round(progress * 100)}%` }} />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 12 }}>
        <TabChip label={`Todo · ${totalCount}`} active={activeTab === "all"} onPress={() => setActiveTab("all")} />
        {CATEGORIES.map((cat) => (
          <TabChip
            key={cat}
            label={`${CATEGORY_META[cat].label} · ${categoryCount(cat)}`}
            active={activeTab === cat}
            onPress={() => setActiveTab(cat)}
          />
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        ) : (
          visibleCategories.map((cat) => (
            <CategorySection
              key={cat}
              category={cat}
              items={items.filter((i) => i.category === cat)}
              synthetic={cat === "documentos" ? syntheticDocs : []}
              onToggle={(id, checked) => toggleItem(id, checked)}
              onDelete={(id) => deleteItem(id)}
            />
          ))
        )}

        {activeTab !== "all" && (
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8, marginBottom: 20 }}>
            <TextInput
              value={newItemLabel}
              onChangeText={setNewItemLabel}
              placeholder="Añadir un artículo..."
              style={{ flex: 1, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, color: "#0F172A" }}
            />
            <TouchableOpacity
              disabled={!newItemLabel.trim() || isSaving}
              onPress={async () => {
                await createItem(activeTab as ChecklistCategory, newItemLabel.trim());
                setNewItemLabel("");
              }}
              style={{ backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 16, alignItems: "center", justifyContent: "center", opacity: !newItemLabel.trim() || isSaving ? 0.5 : 1 }}
            >
              <Ionicons name="add" size={20} color="white" />
            </TouchableOpacity>
          </View>
        )}

        {suggestions.length > 0 && (
          <View style={{ flexDirection: "row", gap: 8, backgroundColor: "#EFF6FF", borderRadius: 14, padding: 12 }}>
            <Text style={{ fontSize: 14 }}>💡</Text>
            <Text style={{ flex: 1, fontSize: 12, color: "#1E3A8A", lineHeight: 17 }}>
              <Text style={{ fontWeight: "700" }}>Sugerido según destino y clima: </Text>
              {suggestions.join(", ")}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TabChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: active ? colors.primary : "#F3F4F6" }}
    >
      <Text style={{ fontSize: 12, fontWeight: "700", color: active ? "white" : "#6B7280" }}>{label}</Text>
    </TouchableOpacity>
  );
}

function CategorySection({
  category,
  items,
  synthetic,
  onToggle,
  onDelete,
}: {
  category: ChecklistCategory;
  items: { id: number; label: string; checked: boolean }[];
  synthetic: SyntheticItem[];
  onToggle: (id: number, checked: boolean) => void;
  onDelete: (id: number) => void;
}) {
  const meta = CATEGORY_META[category];
  const total = items.length + synthetic.length;
  if (total === 0) return null;

  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={{ fontSize: 12, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
        {meta.emoji} {meta.label} · {items.filter((i) => i.checked).length + synthetic.filter((i) => i.checked).length}/{total}
      </Text>

      <View style={{ backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: "#F3F4F6", overflow: "hidden" }}>
        {synthetic.map((s, i) => (
          <View
            key={s.key}
            style={{
              flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12,
              borderBottomWidth: (i < synthetic.length - 1 || items.length > 0) ? 1 : 0, borderBottomColor: "#F3F4F6",
            }}
          >
            <Ionicons name={s.checked ? "checkmark-circle" : "ellipse-outline"} size={20} color={s.checked ? "#16A34A" : "#D1D5DB"} />
            <Text
              style={{
                marginLeft: 10, fontSize: 13, fontWeight: "600",
                color: s.checked ? "#9CA3AF" : "#1F2937",
                textDecorationLine: s.checked ? "line-through" : "none",
              }}
            >
              {s.label}
            </Text>
          </View>
        ))}

        {items.map((it, i) => (
          <TouchableOpacity
            key={it.id}
            onPress={() => onToggle(it.id, !it.checked)}
            onLongPress={() => onDelete(it.id)}
            activeOpacity={0.7}
            style={{
              flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12,
              borderBottomWidth: i === items.length - 1 ? 0 : 1, borderBottomColor: "#F3F4F6",
            }}
          >
            <Ionicons name={it.checked ? "checkmark-circle" : "ellipse-outline"} size={20} color={it.checked ? "#16A34A" : "#D1D5DB"} />
            <Text
              style={{
                marginLeft: 10, fontSize: 13, fontWeight: "600",
                color: it.checked ? "#9CA3AF" : "#1F2937",
                textDecorationLine: it.checked ? "line-through" : "none",
              }}
            >
              {it.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
