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
      name: name.trim(),
      emoji,
      balance: parseFloat(balance.replace(",", ".")),
      description: description.trim(),
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
      console.error(
        "❌ Error al guardar wallet:",
        error.response?.data || error.message
      );
      Alert.alert(
        "Error",
        error.response?.data?.message || "No se pudo guardar la wallet"
      );
    } finally {
      setLoading(false);
    }
  };

  const parsedBalance =
    balance && !isNaN(Number(balance.replace(",", ".")))
      ? parseFloat(balance.replace(",", "."))
      : 0;

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
          minHeight: screenHeight * 0.55,
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
            {editingWallet?.id ? "Editar wallet" : "Nueva wallet"}
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
                Guardar
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Contenido */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* PREVIEW CARD BONITA */}
          <View className="mb-6">
            <View className="bg-primary rounded-3xl px-4 py-4 flex-row items-center shadow-md shadow-black/5">
              <View className="w-14 h-14 rounded-2xl bg-white/15 items-center justify-center mr-3">
                <Text className="text-[30px]">{emoji || "💰"}</Text>
              </View>

              <View className="flex-1">
                <Text
                  className="text-white text-[14px] font-semibold"
                  numberOfLines={1}
                >
                  {name || "Nueva wallet"}
                </Text>
                <Text className="text-white/80 text-[11px] mt-0.5">
                  {currency.toUpperCase() || "EUR"}
                </Text>
                <Text className="text-white text-[18px] font-bold mt-1">
                  {parsedBalance > 0
                    ? formatEuro(parsedBalance)
                    : formatEuro(0)}
                </Text>
              </View>
            </View>
          </View>

          {/* BLOQUE INFO BÁSICA */}
          <View className="mb-5">
            <Text className="text-[13px] text-gray-400 mb-2">
              Información básica
            </Text>

            {/* Nombre */}
            <Text className="text-[11px] text-gray-500 mb-1">Nombre</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Nombre de la wallet"
              placeholderTextColor="#9CA3AF"
              className="w-full bg-gray-50 rounded-xl px-3 py-2 text-[15px] text-text border border-gray-100"
            />

            {/* Emoji como string (igual estilo que DebtFormScreen) */}
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
                Se mostrará como icono principal de la wallet.
              </Text>
            </View>
          </View>

          {/* BLOQUE DINERO */}
          <View className="mb-5">
            <Text className="text-[13px] text-gray-400 mb-2">
              Dinero y divisa
            </Text>

            <View className="flex-row">
              {/* Saldo */}
              <View className="flex-1 mr-3">
                <Text className="text-[11px] text-gray-500 mb-1">
                  Saldo inicial
                </Text>
                <TextInput
                  value={balance}
                  onChangeText={(t) => setBalance(t.replace(".", ","))}
                  placeholder="Ej: 120,50"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  className="bg-gray-50 rounded-xl px-3 py-2 text-[15px] text-text border border-gray-100"
                />
              </View>

              {/* Moneda */}
              <View style={{ width: 90 }}>
                <Text className="text-[11px] text-gray-500 mb-1">Divisa</Text>
                <TextInput
                  value={currency}
                  onChangeText={(text) => setCurrency(text.toUpperCase())}
                  placeholder="EUR"
                  placeholderTextColor="#9CA3AF"
                  maxLength={3}
                  autoCapitalize="characters"
                  className="bg-gray-50 rounded-xl px-3 py-2 text-[15px] text-text border border-gray-100 text-center"
                />
              </View>
            </View>
            <Text className="text-[10px] text-gray-400 mt-1">
              Puedes cambiar el saldo inicial más adelante con movimientos.
            </Text>
          </View>

          {/* DESCRIPCIÓN */}
          <View className="mb-2">
            <Text className="text-[13px] text-gray-400 mb-2">
              Detalles adicionales
            </Text>
            <Text className="text-[11px] text-gray-500 mb-1">
              Descripción (opcional)
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Ej: Wallet para ahorros, viajes, efectivo..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              className="bg-gray-50 rounded-xl px-3 py-2 text-[15px] text-text border border-gray-100"
              style={{ textAlignVertical: "top" }}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
