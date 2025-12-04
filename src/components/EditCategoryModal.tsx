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
import WheelColorPicker from "react-native-wheel-color-picker";
import { colors } from "../theme/theme";
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
  const [loading, setLoading] = useState(false);

  // Color picker avanzado
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [tempColor, setTempColor] = useState(colors.primary);

  // 🔁 Sincronizar los valores al abrir el modal o cambiar de item
  useEffect(() => {
    if (editingItem) {
      const initialColor = editingItem.color || colors.primary;
      setEmoji(editingItem.emoji || "💸");
      setName(editingItem.name || "");
      setColor(initialColor);
      setType(editingItem.type || "expense");
      setTempColor(initialColor);
    } else {
      setEmoji("💸");
      setName("");
      setColor(colors.primary);
      setType("expense");
      setTempColor(colors.primary);
    }
  }, [editingItem, visible]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "El nombre de la categoría es obligatorio");
      return;
    }

    const payloadCategory = {
      name: name.trim(),
      type,
      emoji,
      color,
      userId: user?.id,
    };

    const payloadSub = {
      name: name.trim(),
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
      console.error(
        "❌ Error al guardar categoría:",
        error.response?.data || error.message
      );
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

    Alert.alert("Eliminar categoría", "¿Qué deseas hacer?", [
      {
        text: "Cancelar",
        style: "cancel",
      },

      {
        text: "Eliminar solo la categoría",
        style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);

            if (editingItem.isSub) {
              await api.delete(
                `/categories/${editingItem.categoryId}/subcategories/${editingItem.id}?deleteTransactions=false`
              );
            } else {
              await api.delete(
                `/categories/${editingItem.id}?deleteTransactions=false`
              );
            }

            onSave({ deleted: true });
            onClose();
          } catch (error: any) {
            console.error(
              "❌ Error:",
              error.response?.data || error.message
            );
            Alert.alert(
              "Error",
              "No se pudo eliminar solo la categoría"
            );
          } finally {
            setLoading(false);
          }
        },
      },

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
            console.error(
              "❌ Error:",
              error.response?.data || error.message
            );
            Alert.alert(
              "Error",
              "No se pudo eliminar la categoría y sus transacciones"
            );
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const typeLabel =
    editingItem?.isSub ? "Subcategoría" : type === "expense" ? "Gasto" : "Ingreso";

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
        className="bg-white rounded-t-3xl px-5 pt-4 pb-2"
        style={{
          minHeight: screenHeight * 0.6,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 5,
        }}
      >
        {/* Header */}
        <View className="flex-row justify-between items-center mb-3">
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Text className="text-[14px] text-gray-500 font-medium">
              Cancelar
            </Text>
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

          <TouchableOpacity
            onPress={handleSave}
            activeOpacity={0.8}
            disabled={loading}
          >
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
          {/* PREVIEW CARD */}
          <View className="mb-6">
            <View
              className="rounded-3xl px-4 py-4 flex-row items-center shadow-md shadow-black/5"
              style={{ backgroundColor: color }}
            >
              <View className="w-12 h-12 rounded-2xl bg-white/15 items-center justify-center mr-3">
                <Text className="text-[28px]">{emoji || "💸"}</Text>
              </View>

              <View className="flex-1">
                <Text
                  className="text-white text-[14px] font-semibold"
                  numberOfLines={1}
                >
                  {name ||
                    (editingItem?.isSub
                      ? "Nueva subcategoría"
                      : "Nueva categoría")}
                </Text>
                <Text className="text-white/80 text-[11px] mt-1">
                  {typeLabel}
                </Text>
              </View>
            </View>
          </View>

          {/* INFO BÁSICA */}
          <View className="mb-5">
            <Text className="text-[13px] text-gray-400 mb-2">
              Información básica
            </Text>

            <Text className="text-[11px] text-gray-500 mb-1">Nombre</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={
                editingItem?.isSub
                  ? "Nombre de la subcategoría"
                  : "Nombre de la categoría"
              }
              placeholderTextColor="#9CA3AF"
              className="w-full bg-gray-50 rounded-xl px-3 py-2 text-[15px] text-text border border-gray-100"
            />

            <Text className="text-[11px] text-gray-500 mb-1 mt-3">
              Emoji (opcional)
            </Text>
            <View className="flex-row items-center">
              <TextInput
                value={emoji}
                onChangeText={setEmoji}
                maxLength={2}
                className="border border-slate-200 rounded-xl px-3 py-2 w-16 text-center mr-2 text-[18px] bg-gray-50"
              />
              <Text className="text-[11px] text-gray-500 flex-1">
                Se mostrará en listas, tarjetas y gráficos.
              </Text>
            </View>
          </View>

          {/* TIPO */}
          {!editingItem?.isSub && (
            <View className="mb-5">
              <Text className="text-[13px] text-gray-400 mb-2">
                Tipo de categoría
              </Text>
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

          {/* SELECTOR DE COLOR AVANZADO */}
          <View className="mb-4">
            <Text className="text-[13px] text-gray-400 mb-2">Color</Text>

            <View className="flex-row items-center mb-2">
              <View
                style={{
                  backgroundColor: color,
                  width: 34,
                  height: 34,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  marginRight: 10,
                }}
              />
              <TouchableOpacity
                onPress={() => {
                  setTempColor(color);
                  setShowColorPicker(true);
                }}
                className="bg-gray-100 px-3 py-1.5 rounded-full"
                activeOpacity={0.8}
              >
                <Text className="text-[13px] font-medium text-text">
                  Elegir color
                </Text>
              </TouchableOpacity>
            </View>

            <Text className="text-[10px] text-gray-400">
              Puedes escoger cualquier color con el selector avanzado.
            </Text>
          </View>
        </ScrollView>

        {/* Botón ELIMINAR */}
        {editingItem?.id && (
          <TouchableOpacity
            onPress={handleDelete}
            activeOpacity={0.8}
            disabled={loading}
            className="mt-1 py-3 items-center"
            style={{
              borderRadius: 14,
              backgroundColor: "#FEE2E2",
              marginBottom: 20,
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
      </View>

      {/* SUB-MODAL COLOR PICKER */}
      <Modal
        isVisible={showColorPicker}
        onBackdropPress={() => setShowColorPicker(false)}
        backdropOpacity={0.4}
        style={{ justifyContent: "flex-end", margin: 0 }}
      >
        <View
          style={{
            backgroundColor: "#fff",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
            height: screenHeight * 0.6,
          }}
        >
          <Text className="text-[15px] font-semibold text-text mb-2">
            Elige un color
          </Text>
          <Text className="text-[11px] text-gray-500 mb-4">
            Arrastra por la rueda de color y ajusta la luminosidad.
          </Text>

          <View style={{ flex: 1 }}>
            <WheelColorPicker
              color={tempColor}
              onColorChangeComplete={(c: string) => setTempColor(c)}
              thumbSize={30}
              sliderSize={25}
              noSnap={true}
              row={false}
            />
          </View>

          <View className="flex-row justify-end mt-3">
            <TouchableOpacity
              onPress={() => setShowColorPicker(false)}
              className="px-3 py-2 mr-2"
            >
              <Text className="text-[13px] text-gray-500">Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setColor(tempColor);
                setShowColorPicker(false);
              }}
              className="px-4 py-2 rounded-full"
              style={{ backgroundColor: colors.primary }}
            >
              <Text className="text-[13px] text-white font-semibold">
                Usar este color
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}
