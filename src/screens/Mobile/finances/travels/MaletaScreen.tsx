import React, { useState } from "react";
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

const CATEGORY_META: Record<
  ChecklistCategory,
  { label: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  ropa: { label: "Ropa", icon: "shirt-outline" },
  documentos: { label: "Documentos", icon: "document-text-outline" },
  electronica: { label: "Electrónica", icon: "phone-portrait-outline" },
  otros: { label: "Otros", icon: "briefcase-outline" },
};

const CATEGORIES: ChecklistCategory[] = ["ropa", "documentos", "electronica", "otros"];

interface SyntheticItem {
  key: string;
  label: string;
  checked: boolean;
}

interface ChecklistRowItem {
  id: number;
  label: string;
  checked: boolean;
}

export default function MaletaScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { tripId, destination, tripName } = route.params || {};

  const {
    items,
    isLoading,
    toggleItem,
    createItem,
    updateItem,
    deleteItem,
    isSaving,
    errorMessage,
  } = useTripChecklist(tripId);
  const { documentsByType: userDocsByType } = useUserDocuments();
  const { documentsByType: tripDocsByType } = useTripDocuments(tripId);
  const weatherQuery = useTripWeather(destination, tripName);

  const [activeTab, setActiveTab] = useState<ChecklistCategory | "all">("all");
  const [newItemLabel, setNewItemLabel] = useState("");
  const [actionError, setActionError] = useState("");

  const syntheticDocs: SyntheticItem[] = [
    { key: "doc-passport", label: "Pasaporte", checked: userDocsByType.has("passport") },
    { key: "doc-insurance", label: "Seguro de viaje", checked: tripDocsByType.has("travel_insurance") },
  ];

  const totalCount = items.length + syntheticDocs.length;
  const checkedCount = items.filter((item) => item.checked).length + syntheticDocs.filter((item) => item.checked).length;
  const progress = totalCount > 0 ? checkedCount / totalCount : 0;

  const categoryCount = (category: ChecklistCategory) =>
    items.filter((item) => item.category === category).length +
    (category === "documentos" ? syntheticDocs.length : 0);

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
          <View
            style={{
              height: 6,
              borderRadius: 999,
              backgroundColor: "#16A34A",
              width: `${Math.round(progress * 100)}%`,
            }}
          />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, minHeight: 52 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          gap: 8,
          paddingTop: 4,
          paddingBottom: 14,
          alignItems: "center",
        }}
      >
        <TabChip label={`Todo · ${totalCount}`} active={activeTab === "all"} onPress={() => setActiveTab("all")} />
        {CATEGORIES.map((category) => (
          <TabChip
            key={category}
            label={`${CATEGORY_META[category].label} · ${categoryCount(category)}`}
            active={activeTab === category}
            onPress={() => setActiveTab(category)}
          />
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        ) : (
          visibleCategories.map((category) => (
            <CategorySection
              key={category}
              category={category}
              items={items.filter((item) => item.category === category)}
              synthetic={category === "documentos" ? syntheticDocs : []}
              isSaving={isSaving}
              onToggle={(id, checked) => toggleItem(id, checked)}
              onUpdate={(id, label) => updateItem(id, label)}
              onDelete={(id) => deleteItem(id)}
              onError={setActionError}
            />
          ))
        )}

        {!!(actionError || errorMessage) && (
          <View
            style={{
              marginTop: 4,
              marginBottom: 16,
              borderRadius: 12,
              backgroundColor: "#FEF2F2",
              borderWidth: 1,
              borderColor: "#FECACA",
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#B91C1C" }}>
              {actionError || errorMessage}
            </Text>
          </View>
        )}

        {activeTab !== "all" && (
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8, marginBottom: 20 }}>
            <TextInput
              value={newItemLabel}
              onChangeText={(value) => {
                setNewItemLabel(value);
                if (actionError) setActionError("");
              }}
              placeholder="Añadir un artículo..."
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: "#E5E7EB",
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
                fontSize: 13,
                color: "#0F172A",
                backgroundColor: "white",
              }}
            />
            <TouchableOpacity
              disabled={!newItemLabel.trim() || isSaving}
              onPress={async () => {
                try {
                  setActionError("");
                  await createItem(activeTab as ChecklistCategory, newItemLabel.trim());
                  setNewItemLabel("");
                } catch (error: any) {
                  setActionError(error?.response?.data?.message || error?.message || "No se pudo añadir el artículo.");
                }
              }}
              style={{
                width: 52,
                borderRadius: 12,
                backgroundColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
                opacity: !newItemLabel.trim() || isSaving ? 0.5 : 1,
              }}
            >
              <Ionicons name="add" size={20} color="white" />
            </TouchableOpacity>
          </View>
        )}

        {suggestions.length > 0 && (
          <View style={{ flexDirection: "row", gap: 8, backgroundColor: "#EFF6FF", borderRadius: 14, padding: 12 }}>
            <Ionicons name="bulb-outline" size={16} color="#2563EB" style={{ marginTop: 1 }} />
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
      style={{
        height: 38,
        paddingHorizontal: 14,
        borderRadius: 999,
        backgroundColor: active ? colors.primary : "#F8FAFC",
        borderWidth: 1,
        borderColor: active ? colors.primary : "#EEF2F7",
        alignSelf: "flex-start",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: "700", color: active ? "white" : "#6B7280" }}>{label}</Text>
    </TouchableOpacity>
  );
}

function CategorySection({
  category,
  items,
  synthetic,
  isSaving,
  onToggle,
  onUpdate,
  onDelete,
  onError,
}: {
  category: ChecklistCategory;
  items: ChecklistRowItem[];
  synthetic: SyntheticItem[];
  isSaving: boolean;
  onToggle: (id: number, checked: boolean) => void;
  onUpdate: (id: number, label: string) => Promise<unknown>;
  onDelete: (id: number) => Promise<unknown>;
  onError: (message: string) => void;
}) {
  const meta = CATEGORY_META[category];
  const checked = items.filter((item) => item.checked).length + synthetic.filter((item) => item.checked).length;
  const total = items.length + synthetic.length;

  if (total === 0) return null;

  return (
    <View style={{ marginBottom: 18 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <Ionicons name={meta.icon} size={12} color="#9CA3AF" />
        <Text style={{ fontSize: 12, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.8 }}>
          {meta.label} · {checked}/{total}
        </Text>
      </View>

      <View style={{ backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: "#F3F4F6", overflow: "hidden" }}>
        {synthetic.map((item, index) => (
          <View
            key={item.key}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 14,
              paddingVertical: 14,
              borderBottomWidth: index < synthetic.length - 1 || items.length > 0 ? 1 : 0,
              borderBottomColor: "#F3F4F6",
            }}
          >
            <Ionicons
              name={item.checked ? "checkmark-circle" : "ellipse-outline"}
              size={20}
              color={item.checked ? "#16A34A" : "#D1D5DB"}
            />
            <Text
              style={{
                marginLeft: 10,
                fontSize: 13,
                fontWeight: "600",
                color: item.checked ? "#9CA3AF" : "#1F2937",
                textDecorationLine: item.checked ? "line-through" : "none",
              }}
            >
              {item.label}
            </Text>
          </View>
        ))}

        {items.map((item, index) => (
          <EditableChecklistRow
            key={item.id}
            item={item}
            isLast={index === items.length - 1}
            isSaving={isSaving}
            onToggle={onToggle}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onError={onError}
          />
        ))}
      </View>
    </View>
  );
}

function EditableChecklistRow({
  item,
  isLast,
  isSaving,
  onToggle,
  onUpdate,
  onDelete,
  onError,
}: {
  item: ChecklistRowItem;
  isLast: boolean;
  isSaving: boolean;
  onToggle: (id: number, checked: boolean) => void;
  onUpdate: (id: number, label: string) => Promise<unknown>;
  onDelete: (id: number) => Promise<unknown>;
  onError: (message: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState(item.label);

  const saveEdit = async () => {
    const nextLabel = draftLabel.trim();
    if (!nextLabel) {
      onError("El artículo no puede estar vacío.");
      return;
    }

    if (nextLabel === item.label) {
      setIsEditing(false);
      return;
    }

    try {
      await onUpdate(item.id, nextLabel);
      setIsEditing(false);
    } catch (error: any) {
      onError(error?.response?.data?.message || error?.message || "No se pudo editar el artículo.");
    }
  };

  const removeItem = async () => {
    try {
      await onDelete(item.id);
    } catch (error: any) {
      onError(error?.response?.data?.message || error?.message || "No se pudo eliminar el artículo.");
    }
  };

  return (
    <View
      style={{
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: "#F3F4F6",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <TouchableOpacity onPress={() => onToggle(item.id, !item.checked)} activeOpacity={0.7}>
          <Ionicons
            name={item.checked ? "checkmark-circle" : "ellipse-outline"}
            size={20}
            color={item.checked ? "#16A34A" : "#D1D5DB"}
          />
        </TouchableOpacity>

        {isEditing ? (
          <TextInput
            value={draftLabel}
            onChangeText={setDraftLabel}
            autoFocus
            placeholder="Editar artículo"
            style={{
              flex: 1,
              marginLeft: 10,
              marginRight: 10,
              borderWidth: 1,
              borderColor: "#DBE3F0",
              borderRadius: 10,
              paddingHorizontal: 10,
              paddingVertical: 8,
              fontSize: 13,
              color: "#1F2937",
              backgroundColor: "#F8FAFC",
            }}
          />
        ) : (
          <Text
            style={{
              flex: 1,
              marginLeft: 10,
              marginRight: 10,
              fontSize: 13,
              fontWeight: "600",
              color: item.checked ? "#9CA3AF" : "#1F2937",
              textDecorationLine: item.checked ? "line-through" : "none",
            }}
          >
            {item.label}
          </Text>
        )}

        {isEditing ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <ActionIconButton tone="primary" icon="checkmark" onPress={saveEdit} disabled={isSaving} />
            <ActionIconButton
              tone="neutral"
              icon="close"
              onPress={() => {
                setDraftLabel(item.label);
                setIsEditing(false);
              }}
              disabled={isSaving}
            />
          </View>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <ActionIconButton tone="neutral" icon="create-outline" onPress={() => setIsEditing(true)} disabled={isSaving} />
            <ActionIconButton tone="danger" icon="trash-outline" onPress={removeItem} disabled={isSaving} />
          </View>
        )}
      </View>
    </View>
  );
}

function ActionIconButton({
  icon,
  onPress,
  disabled,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  tone: "neutral" | "danger" | "primary";
}) {
  const bg =
    tone === "danger" ? "rgba(239,68,68,0.10)" :
    tone === "primary" ? "rgba(37,99,235,0.10)" :
    "#F8FAFC";

  const color =
    tone === "danger" ? "#DC2626" :
    tone === "primary" ? colors.primary :
    "#64748B";

  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={onPress}
      style={{
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: bg,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <Ionicons name={icon} size={15} color={color} />
    </TouchableOpacity>
  );
}
