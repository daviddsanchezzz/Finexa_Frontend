import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Dimensions,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import Modal from "react-native-modal";
import { colors } from "../theme/theme";
import EmojiModal from "react-native-emoji-modal";
import { useAuth } from "../context/AuthContext";
import api from "../api/api";

const screenHeight = Dimensions.get("window").height;

interface EditCategoryModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  editingItem?: {
    id?: number;
    name?: string;
    emoji?: string;
    color?: string;
    type?: "expense" | "income";
    isSub?: boolean;
    categoryId?: number;
  };
}

export default function EditCategoryModal({
  visible,
  onClose,
  onSave,
  editingItem,
}: EditCategoryModalProps) {
  const { user } = useAuth();

  const [emoji, setEmoji] = useState("💸");
  const [name, setName] = useState("");
  const [color, setColor] = useState(colors.primary);
  const [type, setType] = useState<"expense" | "income">("expense");
  const [showPalette, setShowPalette] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  // 🔁 Sincronizar los valores al abrir el modal o cambiar de item
  useEffect(() => {
    if (editingItem) {
      setEmoji(editingItem.emoji || "💸");
      setName(editingItem.name || "");
      setColor(editingItem.color || colors.primary);
      setType(editingItem.type || "expense");
    } else {
      setEmoji("💸");
      setName("");
      setColor(colors.primary);
      setType("expense");
    }
  }, [editingItem, visible]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "El nombre de la categoría es obligatorio");
      return;
    }

    const payloadCategory = {
      name,
      type,
      emoji,
      color,
      userId: user?.id,
    };

    const payloadSub = {
      name,
      emoji,
      color,
      categoryId: editingItem?.categoryId,
      userId: user?.id,
    };

    try {
      setLoading(true);
      let res;

      if (editingItem?.isSub) {
        if (!editingItem?.categoryId) {
          throw new Error("Falta el categoryId para la subcategoría");
        }

        res = editingItem?.id
          ? await api.patch(
              `/categories/${editingItem.categoryId}/subcategories/${editingItem.id}`,
              payloadSub
            )
          : await api.post(
              `/categories/${editingItem.categoryId}/subcategories`,
              payloadSub
            );
      } else {
        res = editingItem?.id
          ? await api.patch(`/categories/${editingItem.id}`, payloadCategory)
          : await api.post("/categories", payloadCategory);
      }

      onSave({
        ...res.data,
        isSub: editingItem?.isSub,
        categoryId: editingItem?.categoryId,
      });
      onClose();
    } catch (error: any) {
      console.error("❌ Error al guardar categoría:", error.response?.data || error.message);
      Alert.alert(
        "Error",
        error.response?.data?.message || "No se pudo guardar la categoría"
      );
    } finally {
      setLoading(false);
    }
  };

  // 🗑️ ELIMINAR ABAJO AL ESTILO iOS
  const handleDelete = () => {
    if (!editingItem?.id) return;

    Alert.alert(
  "Eliminar categoría",
  "¿Qué deseas hacer?",
  [
    {
      text: "Cancelar",
      style: "cancel",
    },

    // 🟥 SOLO ELIMINAR LA CATEGORÍA (manteniendo transacciones)
    {
      text: "Eliminar solo la categoría",
      style: "destructive",
      onPress: async () => {
        try {
          setLoading(true);

          if (editingItem.isSub) {
            // Subcategoría
            await api.delete(
              `/categories/${editingItem.categoryId}/subcategories/${editingItem.id}?deleteTransactions=false`
            );
          } else {
            // Categoría
            await api.delete(
              `/categories/${editingItem.id}?deleteTransactions=false`
            );
          }

          onSave({ deleted: true });
          onClose();
        } catch (error: any) {
          console.error("❌ Error:", error.response?.data || error.message);
          Alert.alert("Error", "No se pudo eliminar solo la categoría");
        } finally {
          setLoading(false);
        }
      },
    },

    // 🔥 ELIMINAR TODO: categoría + transacciones asociadas
    {
      text: "Eliminar categoría y transacciones",
      style: "destructive",
      onPress: async () => {
        try {
          setLoading(true);

          if (editingItem.isSub) {
            await api.delete(
              `/categories/${editingItem.categoryId}/subcategories/${editingItem.id}?deleteTransactions=true`
            );
          } else {
            await api.delete(
              `/categories/${editingItem.id}?deleteTransactions=true`
            );
          }

          onSave({ deleted: true });
          onClose();
        } catch (error: any) {
          console.error("❌ Error:", error.response?.data || error.message);
          Alert.alert("Error", "No se pudo eliminar la categoría y sus transacciones");
        } finally {
          setLoading(false);
        }
      },
    },
  ]
);


  };

  const openColorPicker = () => setShowPalette((v) => !v);

  return (
    <Modal
      isVisible={visible}
      backdropOpacity={0.4}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      onBackdropPress={onClose}
      useNativeDriver
      style={{ justifyContent: "flex-end", margin: 0 }}
    >
      <View
        className="bg-white rounded-t-3xl p-5"
        style={{
          minHeight: screenHeight * 0.55,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 5,
        }}
      >
        {/* Header */}
        <View className="flex-row justify-between items-center mb-5">
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Text className="text-[14px] text-gray-500 font-medium">Cancelar</Text>
          </TouchableOpacity>

          <Text className="text-[16px] font-semibold text-text">
            {editingItem?.id
              ? editingItem.isSub
                ? "Editar subcategoría"
                : "Editar categoría"
              : editingItem?.isSub
              ? "Nueva subcategoría"
              : "Nueva categoría"}
          </Text>

          {/* Guardar / Actualizar */}
          <TouchableOpacity onPress={handleSave} activeOpacity={0.8} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text
                className="text-[14px] font-semibold"
                style={{ color: colors.primary }}
              >
                {editingItem?.id ? "Actualizar" : "Guardar"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Contenido */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {/* Emoji + Nombre */}
          <View className="items-center mb-5">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowEmojiPicker(true)}
              className="w-16 h-16 bg-gray-100 rounded-2xl items-center justify-center mb-3"
            >
              <Text className="text-[30px]">{emoji}</Text>
            </TouchableOpacity>

            <View className="flex-row items-center w-full justify-center">
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Nombre"
                placeholderTextColor="#9CA3AF"
                className="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-[15px] text-text"
              />
              <View
                style={{
                  backgroundColor: color,
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  marginLeft: 8,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                }}
              />
            </View>
          </View>

          {/* Tipo de categoría */}
          {!editingItem?.isSub && (
            <View className="mb-5">
              <Text className="text-[13px] text-gray-500 mb-2">Tipo de categoría</Text>
              <View className="flex-row bg-gray-100 rounded-full p-1">
                <TouchableOpacity
                  onPress={() => setType("expense")}
                  activeOpacity={0.8}
                  className={`flex-1 rounded-full py-1.5 items-center ${
                    type === "expense" ? "bg-white" : ""
                  }`}
                >
                  <Text
                    className={`text-[14px] font-medium ${
                      type === "expense" ? "text-text" : "text-gray-500"
                    }`}
                  >
                    Gastos
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setType("income")}
                  activeOpacity={0.8}
                  className={`flex-1 rounded-full py-1.5 items-center ${
                    type === "income" ? "bg-white" : ""
                  }`}
                >
                  <Text
                    className={`text-[14px] font-medium ${
                      type === "income" ? "text-text" : "text-gray-500"
                    }`}
                  >
                    Ingresos
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Selector de color */}
          <View>
            <Text className="text-[13px] text-gray-500 mb-2">Color</Text>
            <View className="flex-row items-center">
              <View
                style={{
                  backgroundColor: color,
                  width: 30,
                  height: 30,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  marginRight: 10,
                }}
              />
              <TouchableOpacity
                onPress={openColorPicker}
                className="bg-gray-100 px-3 py-1.5 rounded-full"
                activeOpacity={0.8}
              >
                <Text className="text-[13px] font-medium text-text">Elegir color</Text>
              </TouchableOpacity>
            </View>

            {showPalette && (
              <View className="flex-row flex-wrap mt-4 justify-center">
                {[
                  "#6366F1",
                  "#34D399",
                  "#F87171",
                  "#F59E0B",
                  "#A855F7",
                  "#3B82F6",
                  "#10B981",
                  "#EC4899",
                  "#14B8A6",
                  "#EAB308",
                  "#22D3EE",
                  "#9CA3AF",
                ].map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => {
                      setColor(c);
                      setShowPalette(false);
                    }}
                    style={{
                      backgroundColor: c,
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      margin: 6,
                      borderWidth: color === c ? 2 : 0,
                      borderColor: color === c ? colors.text : "transparent",
                    }}
                  />
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Botón ELIMINAR abajo, estilo iOS */}
        {editingItem?.id && (
          <TouchableOpacity
            onPress={handleDelete}
            activeOpacity={0.8}
            disabled={loading}
            className="mt-1 py-3 items-center"
            style={{
              borderRadius: 14,
              backgroundColor: "#FEE2E2",
              marginBottom:20
            }}
          >
            <Text
              className="text-[14px] font-semibold"
              style={{ color: "#DC2626" }}
            >
              Eliminar {editingItem.isSub ? "subcategoría" : "categoría"}
            </Text>
          </TouchableOpacity>
        )}

        {/* === Selector de emoji === */}
        <Modal
          isVisible={showEmojiPicker}
          backdropOpacity={0.4}
          style={{
            justifyContent: "flex-end",
            margin: 0,
          }}
          onBackdropPress={() => setShowEmojiPicker(false)}
        >
          <View
            style={{
              height: screenHeight * 0.55,
              backgroundColor: "#fff",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              overflow: "hidden",
            }}
          >
            <EmojiModal
              onEmojiSelected={(emoji: string) => {
                setEmoji(emoji);
                setShowEmojiPicker(false);
              }}
              onPressOutside={() => setShowEmojiPicker(false)}
            />
          </View>
        </Modal>
      </View>
    </Modal>
  );
}
