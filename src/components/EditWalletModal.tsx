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
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/theme";
import { useAuth } from "../context/AuthContext";
import api from "../api/api";

const screenHeight = Dimensions.get("window").height;

type WalletKind = "cash" | "savings" | "investment";

const KIND_OPTIONS: {
  key: WalletKind;
  label: string;
  icon: string;
  color: string;
  bg: string;
  description: string;
}[] = [
  {
    key: "cash",
    label: "Gastos",
    icon: "card-outline",
    color: "#3B82F6",
    bg: "#EFF6FF",
    description: "Cuenta del día a día",
  },
  {
    key: "savings",
    label: "Ahorro",
    icon: "wallet-outline",
    color: "#10B981",
    bg: "#ECFDF5",
    description: "Cuenta remunerada o fondo",
  },
  {
    key: "investment",
    label: "Inversión",
    icon: "trending-up-outline",
    color: "#8B5CF6",
    bg: "#F5F3FF",
    description: "Solo puede haber una",
  },
];

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
    kind?: WalletKind;
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
  const [kind, setKind] = useState<WalletKind>("cash");
  const [loading, setLoading] = useState(false);

  const isEditing = !!editingWallet?.id;

  const formatEuro = (n: number) =>
    n.toLocaleString("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

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
      setKind(editingWallet.kind || "cash");
    } else {
      setEmoji("💰");
      setName("");
      setBalance("");
      setDescription("");
      setCurrency("EUR");
      setKind("cash");
    }
  }, [editingWallet, visible]);

  const selectedKindInfo = KIND_OPTIONS.find((o) => o.key === kind)!;

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "El nombre de la cartera es obligatorio");
      return;
    }
    if (!balance || isNaN(Number(balance.replace(",", ".")))) {
      Alert.alert("Error", "Introduce un saldo válido");
      return;
    }

    const payload = {
      name: name.trim(),
      emoji,
      balance: parseFloat(balance.replace(",", ".")),
      description: description.trim(),
      currency: currency.toUpperCase(),
      kind,
      userId: user?.id,
    };

    try {
      setLoading(true);
      const res = isEditing
        ? await api.patch(`/wallets/${editingWallet!.id}`, payload)
        : await api.post("/wallets", payload);
      onSave(res.data);
      onClose();
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "No se pudo guardar la cartera"
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
        style={{
          backgroundColor: "white",
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 8,
          minHeight: screenHeight * 0.62,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 5,
        }}
      >
        {/* Header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Text style={{ fontSize: 14, color: "#6B7280", fontWeight: "500" }}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827" }}>
            {isEditing ? "Editar cartera" : "Nueva cartera"}
          </Text>
          <TouchableOpacity onPress={handleSave} activeOpacity={0.8} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={{ fontSize: 14, fontWeight: "700", color: colors.primary }}>
                Guardar
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Preview card */}
          <View
            style={{
              backgroundColor: selectedKindInfo.color,
              borderRadius: 20,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                backgroundColor: "rgba(255,255,255,0.2)",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Text style={{ fontSize: 28 }}>{emoji || "💰"}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: "500" }}>
                {selectedKindInfo.label.toUpperCase()}
              </Text>
              <Text style={{ color: "white", fontSize: 15, fontWeight: "700" }} numberOfLines={1}>
                {name || "Nueva cartera"}
              </Text>
              <Text style={{ color: "white", fontSize: 18, fontWeight: "800", marginTop: 2 }}>
                {formatEuro(parsedBalance)}
              </Text>
            </View>
          </View>

          {/* Tipo de cartera */}
          <Text style={{ fontSize: 12, color: "#9CA3AF", fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10 }}>
            Tipo de cartera
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
            {KIND_OPTIONS.map((opt) => {
              const selected = kind === opt.key;
              const blocked = opt.key === "investment" && isEditing && editingWallet?.kind !== "investment";
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => !blocked && setKind(opt.key)}
                  activeOpacity={0.8}
                  style={{
                    flex: 1,
                    borderRadius: 14,
                    borderWidth: selected ? 2 : 1,
                    borderColor: selected ? opt.color : "#E5E7EB",
                    backgroundColor: selected ? opt.bg : "white",
                    padding: 10,
                    alignItems: "center",
                    opacity: blocked ? 0.4 : 1,
                  }}
                >
                  <Ionicons
                    name={opt.icon as any}
                    size={20}
                    color={selected ? opt.color : "#9CA3AF"}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: selected ? opt.color : "#6B7280",
                      marginTop: 5,
                    }}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {kind === "investment" && (
            <View
              style={{
                backgroundColor: "#F5F3FF",
                borderRadius: 12,
                padding: 12,
                flexDirection: "row",
                alignItems: "flex-start",
                marginBottom: 16,
                borderWidth: 1,
                borderColor: "#DDD6FE",
              }}
            >
              <Ionicons name="information-circle-outline" size={16} color="#8B5CF6" style={{ marginRight: 8, marginTop: 1 }} />
              <Text style={{ fontSize: 12, color: "#6D28D9", flex: 1, lineHeight: 17 }}>
                Solo puede existir una cartera de inversión. Su saldo se sincroniza automáticamente con el módulo de inversiones.
              </Text>
            </View>
          )}

          {/* Nombre y emoji */}
          <Text style={{ fontSize: 12, color: "#9CA3AF", fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10 }}>
            Información básica
          </Text>
          <Text style={{ fontSize: 11, color: "#6B7280", marginBottom: 4 }}>Nombre</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Nombre de la cartera"
            placeholderTextColor="#9CA3AF"
            style={{
              backgroundColor: "#F9FAFB",
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: 15,
              color: "#111827",
              borderWidth: 1,
              borderColor: "#E5E7EB",
              marginBottom: 12,
            }}
          />

          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
            <View style={{ marginRight: 12 }}>
              <Text style={{ fontSize: 11, color: "#6B7280", marginBottom: 4 }}>Emoji</Text>
              <TextInput
                value={emoji}
                onChangeText={setEmoji}
                maxLength={2}
                style={{
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  borderRadius: 12,
                  paddingHorizontal: 10,
                  paddingVertical: 10,
                  width: 58,
                  textAlign: "center",
                  fontSize: 20,
                  backgroundColor: "#F9FAFB",
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: "#6B7280", marginBottom: 4 }}>Divisa</Text>
              <TextInput
                value={currency}
                onChangeText={(t) => setCurrency(t.toUpperCase())}
                placeholder="EUR"
                placeholderTextColor="#9CA3AF"
                maxLength={3}
                autoCapitalize="characters"
                style={{
                  backgroundColor: "#F9FAFB",
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 15,
                  color: "#111827",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                }}
              />
            </View>
          </View>

          {/* Saldo */}
          <Text style={{ fontSize: 12, color: "#9CA3AF", fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10 }}>
            Saldo
          </Text>
          <TextInput
            value={balance}
            onChangeText={(t) => setBalance(t.replace(".", ","))}
            placeholder="0,00"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
            style={{
              backgroundColor: "#F9FAFB",
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: 15,
              color: "#111827",
              borderWidth: 1,
              borderColor: "#E5E7EB",
              marginBottom: 6,
            }}
          />
          <Text style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 20 }}>
            Puedes ajustar el saldo con movimientos después.
          </Text>

          {/* Descripción */}
          <Text style={{ fontSize: 12, color: "#9CA3AF", fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10 }}>
            Descripción (opcional)
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Ej: Cuenta remunerada MyInvestor al 3%..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            style={{
              backgroundColor: "#F9FAFB",
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: 14,
              color: "#111827",
              borderWidth: 1,
              borderColor: "#E5E7EB",
              textAlignVertical: "top",
              minHeight: 80,
            }}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}
