import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../../theme/theme";
import EditCategoryModal from "../../../components/EditCategoryModal";
import api from "../../../api/api";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Subcategory = {
  id: number;
  name: string;
  emoji: string;
  active: boolean;
  position: number;
};

type Category = {
  id: number;
  name: string;
  emoji: string;
  color: string;
  type: "expense" | "income";
  subcategories?: Subcategory[];
};

const moveItem = <T,>(arr: T[], fromIndex: number, toIndex: number): T[] => {
  const newArr = [...arr];
  const item = newArr.splice(fromIndex, 1)[0];
  newArr.splice(toIndex, 0, item);
  return newArr;
};

export default function CategoriesScreen({ navigation }: any) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<"expense" | "income">("expense");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  const [reorderMode, setReorderMode] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  const [subReorderCatId, setSubReorderCatId] = useState<number | null>(null);
  const [savingSubOrder, setSavingSubOrder] = useState(false);
  const [showArchivedForCat, setShowArchivedForCat] = useState<Set<number>>(new Set());

  // 🔹 Cargar categorías desde el backend
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get("/categories");
      const normalized = res.data.map((cat: any) => ({
        ...cat,
        type: cat.type.toLowerCase(), // nos aseguramos de 'expense' / 'income'
      }));
      setCategories(normalized || []);
    } catch (error: any) {
      console.error("❌ Error al cargar categorías:", error.response?.data || error.message);
      Alert.alert("Error", "No se pudieron cargar las categorías.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const toggleExpand = (id: number) => {
    if (reorderMode) return; // en modo reordenar no expandimos
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  // 🧠 Lógica modal (crear / editar categoría o subcategoría)
  const openModal = (item?: any, isSub = false, parentCategoryId?: number) => {
    if (reorderMode) return; // en modo reordenar no editamos
    if (item) {
      // ✏️ Editar categoría o subcategoría
      setEditingItem({
        ...item,
        isSub,
        type: item.type?.toLowerCase() || selectedType,
        color: item.color || colors.primary,
        emoji: item.emoji || "💸",
        categoryId: parentCategoryId || expandedId || null, // para subcategorías
      });
    } else {
      // ➕ Crear nueva
      setEditingItem({
        isSub,
        type: selectedType,
        color: colors.primary,
        emoji: "💸",
        categoryId: parentCategoryId || expandedId || null, // para subcategorías nuevas
      });
    }
    setModalVisible(true);
  };

  const handleSave = () => {
    fetchCategories();
    setModalVisible(false);
  };

  const filteredCategories = categories.filter((c) => c.type === selectedType);

  // 🔼🔽 Mover categorías hacia arriba / abajo (sólo dentro del tipo seleccionado)
  const moveUp = (index: number) => {
    if (index === 0) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    setCategories((prev) => {
      const sameType = prev.filter((c) => c.type === selectedType);
      const otherType = prev.filter((c) => c.type !== selectedType);

      const newSameType = moveItem(sameType, index, index - 1);

      // 💡 Reconstruimos el array: primero las de este tipo (ya reordenadas),
      // luego el resto. El orden relativo entre tipos no es importante.
      return [...newSameType, ...otherType] as Category[];
    });
  };

  const moveDown = (index: number) => {
    if (index === filteredCategories.length - 1) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    setCategories((prev) => {
      const sameType = prev.filter((c) => c.type === selectedType);
      const otherType = prev.filter((c) => c.type !== selectedType);

      const newSameType = moveItem(sameType, index, index + 1);

      return [...newSameType, ...otherType] as Category[];
    });
  };

  // 💾 Guardar orden en backend
  const handleSaveOrder = async () => {
    try {
      setSavingOrder(true);

      const current = categories.filter((c) => c.type === selectedType);
      const order = current.map((c) => c.id);

      console.log("🔢 Orden categorías enviado:", selectedType, order);

      // Ajusta el body si tu back espera otra cosa (por ejemplo, sin type)
      await api.patch("/categories/reorder", { order, type: selectedType });

      Alert.alert("Orden guardado");
      setReorderMode(false);
      await fetchCategories();
    } catch (error: any) {
      console.error("❌ Error al reordenar categorías:", error.response?.data || error.message);
      Alert.alert("Error", "No se pudo guardar el orden de categorías.");
    } finally {
      setSavingOrder(false);
    }
  };

  const handleCancelReorder = async () => {
    setReorderMode(false);
    await fetchCategories();
  };

  const moveSubUp = (catId: number, index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== catId) return cat;
        const active = (cat.subcategories ?? []).filter((s) => s.active);
        const inactive = (cat.subcategories ?? []).filter((s) => !s.active);
        return { ...cat, subcategories: [...moveItem(active, index, index - 1), ...inactive] };
      })
    );
  };

  const moveSubDown = (catId: number, index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== catId) return cat;
        const active = (cat.subcategories ?? []).filter((s) => s.active);
        const inactive = (cat.subcategories ?? []).filter((s) => !s.active);
        return { ...cat, subcategories: [...moveItem(active, index, index + 1), ...inactive] };
      })
    );
  };

  const handleSaveSubOrder = async (catId: number) => {
    try {
      setSavingSubOrder(true);
      const cat = categories.find((c) => c.id === catId);
      if (!cat) return;
      const order = (cat.subcategories ?? []).filter((s) => s.active).map((s) => s.id);
      await api.patch(`/categories/${catId}/subcategories/reorder`, { order });
      setSubReorderCatId(null);
      await fetchCategories();
    } catch (e: any) {
      Alert.alert("Error", "No se pudo guardar el orden.");
    } finally {
      setSavingSubOrder(false);
    }
  };

  const handleArchiveSub = async (catId: number, subId: number) => {
    try {
      await api.patch(`/categories/${catId}/subcategories/${subId}`, { active: false });
      await fetchCategories();
    } catch {
      Alert.alert("Error", "No se pudo archivar la subcategoría.");
    }
  };

  const handleRestoreSub = async (catId: number, subId: number) => {
    try {
      await api.patch(`/categories/${catId}/subcategories/${subId}`, { active: true });
      await fetchCategories();
    } catch {
      Alert.alert("Error", "No se pudo restaurar la subcategoría.");
    }
  };

  const toggleShowArchived = (catId: number) => {
    setShowArchivedForCat((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row justify-between items-center px-6 py-5">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            className="mr-3"
          >
            <Ionicons name="chevron-back-outline" size={26} color={colors.text} />
          </TouchableOpacity>
          <Text className="text-[20px] font-bold text-text">Categorías</Text>
        </View>

        <View className="flex-row items-center">
          {!reorderMode && (
            <TouchableOpacity
              activeOpacity={0.8}
              className="bg-primary/10 rounded-full p-2.5 mr-2"
              onPress={() => openModal(null, false)}
            >
              <Ionicons name="add-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
          )}

          {!reorderMode ? (
            <TouchableOpacity
              activeOpacity={0.8}
              className="rounded-full p-2.5"
              onPress={() => setReorderMode(true)}
            >
              <Ionicons name="reorder-three-outline" size={22} color={colors.text} />
            </TouchableOpacity>
          ) : (
            <View className="flex-row items-center">
              <TouchableOpacity
                activeOpacity={0.8}
                className="rounded-full p-2.5 mr-1"
                onPress={handleCancelReorder}
                disabled={savingOrder}
              >
                <Ionicons name="close-outline" size={24} color="#9CA3AF" />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                className="bg-primary/10 rounded-full p-2.5"
                onPress={handleSaveOrder}
                disabled={savingOrder}
              >
                {savingOrder ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="checkmark-outline" size={22} color={colors.primary} />
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Selector tipo */}
      <View className="flex-row bg-gray-100 mx-6 p-1.5 rounded-full mb-5">
        <TouchableOpacity
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setSelectedType("expense");
            setExpandedId(null);
          }}
          className={`flex-1 py-2 rounded-full items-center ${
            selectedType === "expense" ? "bg-white" : ""
          }`}
        >
          <Text
            className={`text-[16px] font-semibold ${
              selectedType === "expense" ? "text-text" : "text-gray-500"
            }`}
          >
            Gastos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setSelectedType("income");
            setExpandedId(null);
          }}
          className={`flex-1 py-2 rounded-full items-center ${
            selectedType === "income" ? "bg-white" : ""
          }`}
        >
          <Text
            className={`text-[16px] font-semibold ${
              selectedType === "income" ? "text-text" : "text-gray-500"
            }`}
          >
            Ingresos
          </Text>
        </TouchableOpacity>
      </View>

      {/* Lista */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="px-6"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
        ) : filteredCategories.length === 0 ? (
          <Text className="text-center text-gray-400 mt-10">No hay categorías aún.</Text>
        ) : (
          filteredCategories.map((cat, index) => {
            const expanded = expandedId === cat.id;

            return (
              <View
                key={cat.id}
                className="bg-white rounded-2xl mb-3 px-4 py-3"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 3,
                }}
              >
                <View className="flex-row justify-between items-center">
                  {/* Editar categoría */}
                  <TouchableOpacity
                    onPress={() => openModal(cat, false)}
                    activeOpacity={0.7}
                    className="flex-row items-center flex-1"
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    disabled={reorderMode}
                  >
                    <View
                      style={{
                        backgroundColor: cat.color + "22",
                        padding: 8,
                        borderRadius: 10,
                        marginRight: 12,
                      }}
                    >
                      <Text style={{ fontSize: 22 }}>{cat.emoji}</Text>
                    </View>
                    <Text className="text-[17px] font-semibold text-text">{cat.name}</Text>
                  </TouchableOpacity>

                  {/* Controles derecha */}
                  <View className="flex-row items-center">
                    {reorderMode ? (
                      <View className="flex-col mr-1">
                        <TouchableOpacity
                          onPress={() => moveUp(index)}
                          disabled={index === 0}
                          style={{ opacity: index === 0 ? 0.3 : 1, paddingVertical: 2 }}
                        >
                          <Ionicons name="arrow-up-outline" size={18} color="#6b7280" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => moveDown(index)}
                          disabled={index === filteredCategories.length - 1}
                          style={{
                            opacity:
                              index === filteredCategories.length - 1 ? 0.3 : 1,
                            paddingVertical: 2,
                          }}
                        >
                          <Ionicons name="arrow-down-outline" size={18} color="#6b7280" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={() => toggleExpand(cat.id)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                      >
                        <Ionicons
                          name={expanded ? "chevron-up-outline" : "chevron-down-outline"}
                          size={21}
                          color="#9CA3AF"
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Subcategorías */}
                {expanded && !reorderMode && (() => {
                  const activeSubs = (cat.subcategories ?? []).filter((s) => s.active);
                  const inactiveSubs = (cat.subcategories ?? []).filter((s) => !s.active);
                  const isSubReorder = subReorderCatId === cat.id;
                  const showArchived = showArchivedForCat.has(cat.id);

                  return (
                    <View className="mt-3 border-t border-gray-100 pt-3">
                      {isSubReorder ? (
                        <>
                          {activeSubs.map((sub, idx) => (
                            <View key={sub.id} className="flex-row items-center py-2">
                              <Text className="text-[20px] mr-3">{sub.emoji}</Text>
                              <Text className="text-[15px] text-gray-700 flex-1">{sub.name}</Text>
                              <View style={{ flexDirection: "column", marginRight: 4 }}>
                                <TouchableOpacity
                                  onPress={() => moveSubUp(cat.id, idx)}
                                  disabled={idx === 0}
                                  style={{ opacity: idx === 0 ? 0.3 : 1, paddingVertical: 2 }}
                                >
                                  <Ionicons name="arrow-up-outline" size={16} color="#6b7280" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() => moveSubDown(cat.id, idx)}
                                  disabled={idx === activeSubs.length - 1}
                                  style={{ opacity: idx === activeSubs.length - 1 ? 0.3 : 1, paddingVertical: 2 }}
                                >
                                  <Ionicons name="arrow-down-outline" size={16} color="#6b7280" />
                                </TouchableOpacity>
                              </View>
                            </View>
                          ))}
                          <View className="flex-row justify-end mt-3" style={{ gap: 8 }}>
                            <TouchableOpacity
                              onPress={() => { setSubReorderCatId(null); fetchCategories(); }}
                              className="rounded-full p-2 bg-gray-100"
                            >
                              <Ionicons name="close-outline" size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleSaveSubOrder(cat.id)}
                              disabled={savingSubOrder}
                              className="rounded-full p-2 bg-primary/10"
                            >
                              {savingSubOrder ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                              ) : (
                                <Ionicons name="checkmark-outline" size={20} color={colors.primary} />
                              )}
                            </TouchableOpacity>
                          </View>
                        </>
                      ) : (
                        <>
                          {activeSubs.map((sub) => (
                            <View key={sub.id} className="flex-row items-center justify-between py-2">
                              <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() => openModal(sub, true, cat.id)}
                                className="flex-row items-center flex-1"
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                              >
                                <Text className="text-[20px] mr-4">{sub.emoji}</Text>
                                <Text className="text-[16px] text-gray-700">{sub.name}</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => handleArchiveSub(cat.id, sub.id)}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                style={{ padding: 4 }}
                              >
                                <Ionicons name="archive-outline" size={17} color="#D1D5DB" />
                              </TouchableOpacity>
                            </View>
                          ))}

                          {inactiveSubs.length > 0 && (
                            <>
                              <TouchableOpacity
                                onPress={() => toggleShowArchived(cat.id)}
                                className="flex-row items-center mt-2 mb-1"
                                activeOpacity={0.7}
                              >
                                <Ionicons
                                  name={showArchived ? "chevron-up-outline" : "chevron-down-outline"}
                                  size={14}
                                  color="#9CA3AF"
                                  style={{ marginRight: 4 }}
                                />
                                <Text className="text-[12px] text-gray-400">
                                  {inactiveSubs.length} archivada{inactiveSubs.length !== 1 ? "s" : ""}
                                </Text>
                              </TouchableOpacity>
                              {showArchived && inactiveSubs.map((sub) => (
                                <View key={sub.id} className="flex-row items-center justify-between py-1.5">
                                  <View className="flex-row items-center flex-1">
                                    <Text className="text-[18px] mr-4" style={{ opacity: 0.4 }}>{sub.emoji}</Text>
                                    <Text className="text-[15px] text-gray-400">{sub.name}</Text>
                                  </View>
                                  <TouchableOpacity
                                    onPress={() => handleRestoreSub(cat.id, sub.id)}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    style={{ padding: 4 }}
                                  >
                                    <Ionicons name="arrow-undo-outline" size={17} color="#9CA3AF" />
                                  </TouchableOpacity>
                                </View>
                              ))}
                            </>
                          )}

                          <View className="flex-row items-center justify-between mt-2">
                            <TouchableOpacity
                              activeOpacity={0.7}
                              className="flex-row items-center"
                              onPress={() => openModal(null, true, cat.id)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Ionicons name="add-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                              <Text className="text-[15px] text-primary font-semibold">Crear subcategoría</Text>
                            </TouchableOpacity>
                            {activeSubs.length > 1 && (
                              <TouchableOpacity
                                onPress={() => setSubReorderCatId(cat.id)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                style={{ padding: 4 }}
                              >
                                <Ionicons name="reorder-three-outline" size={20} color="#9CA3AF" />
                              </TouchableOpacity>
                            )}
                          </View>
                        </>
                      )}
                    </View>
                  );
                })()}
              </View>
            );
          })
        )}
      </ScrollView>

      <EditCategoryModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        editingItem={editingItem}
        onSave={handleSave}
      />
    </SafeAreaView>
  );
}
