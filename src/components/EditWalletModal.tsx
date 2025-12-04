import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
} from "react-native";
import Modal from "react-native-modal";
import { colors } from "../theme/theme";
import EmojiModal from "react-native-emoji-modal";
import { useAuth } from "../context/AuthContext";
import api from "../api/api";

const screenHeight = Dimensions.get("window").height;

interface EditWalletModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data?: any) => void;
  editingWallet?: {
    id?: number;
    name?: string;
    emoji?: string;
    balance?: number;
    description?: string;
    currency?: string;
  } | null;
}

export default function EditWalletModal({
  visible,
  onClose,
  onSave,
  editingWallet,
}: EditWalletModalProps) {
  const { user } = useAuth();

  const [emoji, setEmoji] = useState("💰");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [balance, setBalance] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [loading, setLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const formatEuro = (n: number) =>
    n.toLocaleString("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });


  // 🔁 Sincronizar datos al abrir
  useEffect(() => {
    if (editingWallet) {
      setEmoji(editingWallet.emoji || "💰");
      setName(editingWallet.name || "");
      setBalance(
        editingWallet.balance !== undefined && editingWallet.balance !== null
          ? editingWallet.balance.toString().replace(".", ",")
          : ""
      );
      setDescription(editingWallet.description || "");
      setCurrency(editingWallet.currency || "EUR");
    } else {
      setEmoji("💰");
      setName("");
      setBalance("");
      setDescription("");
      setCurrency("EUR");
    }
  }, [editingWallet, visible]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "El nombre de la wallet es obligatorio");
      return;
    }
    if (!balance || isNaN(Number(balance.replace(",", ".")))) {
      Alert.alert("Error", "Introduce un saldo válido");
      return;
    }
    if (!currency.trim()) {
      Alert.alert("Error", "Introduce una divisa válida (ej. EUR)");
      return;
    }

    const payload = {
      name,
      emoji,
      balance: parseFloat(balance.replace(",", ".")),
      description,
      currency: currency.toUpperCase(),
      userId: user?.id,
    };

    try {
      setLoading(true);
      const res = editingWallet?.id
        ? await api.patch(`/wallets/${editingWallet.id}`, payload)
        : await api.post("/wallets", payload);

      onSave(res.data);
      onClose();
    } catch (error: any) {
      console.error("❌ Error al guardar wallet:", error.response?.data || error.message);
      Alert.alert("Error", error.response?.data?.message || "No se pudo guardar la wallet");
    } finally {
      setLoading(false);
    }
  };

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
            {editingWallet?.id ? "Editar wallet" : "Nueva wallet"}
          </Text>

          <TouchableOpacity onPress={handleSave} activeOpacity={0.8} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text className="text-[14px] font-semibold" style={{ color: colors.primary }}>
                Guardar
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Contenido */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }}>
          {/* Emoji + Nombre */}
          <View className="items-center mb-5">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowEmojiPicker(true)}
              className="w-16 h-16 bg-gray-100 rounded-2xl items-center justify-center mb-3"
            >
              <Text className="text-[30px]">{emoji}</Text>
            </TouchableOpacity>

            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Nombre de la wallet"
              placeholderTextColor="#9CA3AF"
              className="w-full bg-gray-50 rounded-xl px-3 py-2 text-[15px] text-text"
            />
          </View>

          {/* Saldo */}
          <View className="mb-5">
            <Text className="text-[13px] text-gray-500 mb-2">Saldo inicial</Text>
            <TextInput
              value={balance}
              onChangeText={(t) => setBalance(t.replace(".", ","))}
              placeholder="Ej: 120,50"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              className="bg-gray-50 rounded-xl px-3 py-2 text-[15px] text-text"
            />
          </View>

          {/* Moneda */}
          <View className="mb-5">
            <Text className="text-[13px] text-gray-500 mb-2">Divisa</Text>
            <TextInput
              value={currency}
              onChangeText={(text) => setCurrency(text.toUpperCase())}
              placeholder="Ej: EUR, USD, PLN"
              placeholderTextColor="#9CA3AF"
              maxLength={3}
              autoCapitalize="characters"
              className="bg-gray-50 rounded-xl px-3 py-2 text-[15px] text-text uppercase"
            />
          </View>

          {/* Descripción */}
          <View className="mb-5">
            <Text className="text-[13px] text-gray-500 mb-2">Descripción</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Ej: Wallet para ahorros o viajes"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              className="bg-gray-50 rounded-xl px-3 py-2 text-[15px] text-text"
              style={{ textAlignVertical: "top" }}
            />
          </View>
        </ScrollView>

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
