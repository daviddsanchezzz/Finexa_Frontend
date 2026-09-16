import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
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
import ModalHeader from "./ModalHeader";
import { FormTextField, FormSegmentedControl } from "./creation";

const screenHeight = Dimensions.get("window").height;

// Mismo estilo que la etiqueta de FormTextField ("Nombre", "Emoji"...) para
// que "Información básica" y "Color" se vean idénticos.
const sectionLabelStyle = { fontSize: 12, fontWeight: "700" as const, color: "#64748B", marginBottom: 5 };

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

  const title = editingItem?.id
    ? editingItem.isSub
      ? "Editar subcategoría"
      : "Editar categoría"
    : editingItem?.isSub
    ? "Nueva subcategoría"
    : "Nueva categoría";

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
        style={{
          backgroundColor: "white",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 8,
          maxHeight: screenHeight * 0.85,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 5,
        }}
      >
        <ModalHeader
          title={title}
          onClose={onClose}
          closeLabel="Cancelar"
          rightLabel={editingItem?.id ? "Actualizar" : "Guardar"}
          onRightPress={handleSave}
          rightLoading={loading}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ marginTop: 14, flexShrink: 1 }}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {/* Preview */}
          <View
            style={{
              backgroundColor: color,
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 16,
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
              <Text style={{ fontSize: 28 }}>{emoji || "💸"}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "white", fontSize: 14, fontWeight: "700" }} numberOfLines={1}>
                {name || (editingItem?.isSub ? "Nueva subcategoría" : "Nueva categoría")}
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, marginTop: 2 }}>
                {typeLabel}
              </Text>
            </View>
          </View>

          <View style={{ gap: 18 }}>
            {!editingItem?.isSub && (
              <FormSegmentedControl<"expense" | "income">
                label="Tipo de categoría"
                value={type}
                options={[
                  { value: "expense", label: "Gastos" },
                  { value: "income", label: "Ingresos" },
                ]}
                onChange={setType}
              />
            )}

            <FormTextField
              label={editingItem?.isSub ? "Nombre de la subcategoría" : "Nombre de la categoría"}
              required
              value={name}
              onChangeText={setName}
              autoCapitalize="sentences"
            />

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ width: 72 }}>
                <FormTextField
                  label="Emoji"
                  value={emoji}
                  onChangeText={setEmoji}
                  maxLength={8}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={sectionLabelStyle}>Color</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View
                    style={{
                      backgroundColor: color,
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: "#E2E8F0",
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      setTempColor(color);
                      setShowColorPicker(true);
                    }}
                    activeOpacity={0.8}
                    style={{
                      flex: 1,
                      height: 44,
                      paddingHorizontal: 16,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: "#E2E8F0",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "700", color: colors.ink }}>Elegir color</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {editingItem?.id && (
            <TouchableOpacity
              onPress={handleDelete}
              activeOpacity={0.8}
              disabled={loading}
              style={{
                marginTop: 24,
                paddingVertical: 12,
                alignItems: "center",
                borderRadius: 12,
                backgroundColor: "#FEE2E2",
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#DC2626" }}>
                Eliminar {editingItem.isSub ? "subcategoría" : "categoría"}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
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
          <Text style={{ fontSize: 15, fontWeight: "700", color: colors.ink, marginBottom: 4 }}>
            Elige un color
          </Text>
          <Text style={{ fontSize: 11, color: "#94A3B8", marginBottom: 16 }}>
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

          <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 12 }}>
            <TouchableOpacity
              onPress={() => setShowColorPicker(false)}
              style={{ paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 }}
            >
              <Text style={{ fontSize: 13, color: "#94A3B8" }}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setColor(tempColor);
                setShowColorPicker(false);
              }}
              style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.primary }}
            >
              <Text style={{ fontSize: 13, color: "white", fontWeight: "700" }}>
                Usar este color
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}
