import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import Modal from "react-native-modal";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/theme";
import { useAuth } from "../context/AuthContext";
import api from "../api/api";
import { appAlert } from "../utils/appAlert";
import { formatEuro as formatEuroBase } from "../utils/currency";
import { BANK_PRESETS, getBankLogoUrl, isLogoUrl } from "../constants/bankPresets";
import WalletIcon from "./WalletIcon";
import PresetPickerCard from "./PresetPickerCard";
import ModalHeader from "./ModalHeader";
import { FormTextField, FormMoneyField, FormOptionCard, FormCurrencyPicker } from "./creation";

const screenHeight = Dimensions.get("window").height;

// Mismo estilo que la etiqueta de FormTextField/FormSelect ("Nombre", "Divisa"...)
// para que "Tipo de cartera", "Banco" e "Información básica" se vean idénticos.
const sectionLabelStyle = { fontSize: 12, fontWeight: "700" as const, color: "#64748B", marginBottom: 5 };

type WalletKind = "cash" | "savings" | "investment";

const KIND_OPTIONS: {
  key: WalletKind;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
}[] = [
  { key: "cash", label: "Gastos", icon: "card-outline", color: "#3B82F6", bg: "#EFF6FF" },
  { key: "savings", label: "Ahorro", icon: "wallet-outline", color: "#10B981", bg: "#ECFDF5" },
  { key: "investment", label: "Inversión", icon: "trending-up-outline", color: "#8B5CF6", bg: "#F5F3FF" },
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
  const [deactivating, setDeactivating] = useState(false);

  const isEditing = !!editingWallet?.id;

  const formatEuro = (n: number) => `${formatEuroBase(n)} €`;

  useEffect(() => {
    if (editingWallet) {
      setEmoji(editingWallet.emoji || "💰");
      setName(editingWallet.name || "");
      setBalance(
        editingWallet.balance !== undefined && editingWallet.balance !== null
          ? parseFloat(editingWallet.balance.toFixed(2)).toString().replace(".", ",")
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
      appAlert("Error", "El nombre de la cartera es obligatorio");
      return;
    }
    if (!balance || isNaN(Number(balance.replace(",", ".")))) {
      appAlert("Error", "Introduce un saldo válido");
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
      appAlert(
        "Error",
        error.response?.data?.message || "No se pudo guardar la cartera"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = () => {
    if (!editingWallet?.id) return;
    appAlert(
      "Desactivar cartera",
      `"${editingWallet.name}" dejará de aparecer en la app, pero sus movimientos históricos se conservan.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Desactivar",
          style: "destructive",
          onPress: async () => {
            try {
              setDeactivating(true);
              await api.delete(`/wallets/${editingWallet.id}`);
              onSave();
              onClose();
            } catch (error: any) {
              appAlert(
                "Error",
                error.response?.data?.message || "No se pudo desactivar la cartera"
              );
            } finally {
              setDeactivating(false);
            }
          },
        },
      ]
    );
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
          maxHeight: screenHeight * 0.9,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 5,
        }}
      >
        <ModalHeader
          title={isEditing ? "Editar cartera" : "Nueva cartera"}
          onClose={onClose}
          closeLabel="Cancelar"
          rightLabel="Guardar"
          onRightPress={handleSave}
          rightLoading={loading}
        />

        <ScrollView style={{ flex: 1, marginTop: 14 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Preview */}
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
              <WalletIcon emoji={emoji} size={28} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: "600" }}>
                {selectedKindInfo.label}
              </Text>
              <Text style={{ color: "white", fontSize: 15, fontWeight: "700" }} numberOfLines={1}>
                {name || "Nueva cartera"}
              </Text>
              <Text style={{ color: "white", fontSize: 18, fontWeight: "800", marginTop: 2 }}>
                {formatEuro(parsedBalance)}
              </Text>
            </View>
          </View>

          <View style={{ gap: 18 }}>
            <View>
              <Text style={sectionLabelStyle}>Tipo de cartera</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {KIND_OPTIONS.map((opt) => {
                  const blocked = opt.key === "investment" && isEditing && editingWallet?.kind !== "investment";
                  return (
                    <View key={opt.key} style={{ flex: 1, opacity: blocked ? 0.4 : 1 }}>
                      <FormOptionCard
                        label={opt.label}
                        icon={opt.icon}
                        selected={kind === opt.key}
                        onPress={() => { if (!blocked) setKind(opt.key); }}
                      />
                    </View>
                  );
                })}
              </View>
              {kind === "investment" && (
                <View
                  style={{
                    marginTop: 12,
                    backgroundColor: "#F5F3FF",
                    borderRadius: 12,
                    padding: 12,
                    flexDirection: "row",
                    alignItems: "flex-start",
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
            </View>

            <View>
              <Text style={sectionLabelStyle}>Banco</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
              >
                {BANK_PRESETS.map((preset) => (
                  <PresetPickerCard
                    key={preset.key}
                    logoUrl={getBankLogoUrl(preset.domain)}
                    label={preset.name}
                    selected={emoji === getBankLogoUrl(preset.domain)}
                    onPress={() => {
                      setEmoji(getBankLogoUrl(preset.domain));
                      setName(preset.name);
                    }}
                  />
                ))}
              </ScrollView>
            </View>

            <View>
              <View style={{ gap: 12 }}>
                <FormTextField
                  label="Nombre"
                  required
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />

                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View>
                    <Text style={sectionLabelStyle}>Emoji</Text>
                    {isLogoUrl(emoji) ? (
                      <TouchableOpacity
                        onPress={() => setEmoji("💰")}
                        activeOpacity={0.7}
                        style={{
                          width: 58,
                          height: 44,
                          borderWidth: 1,
                          borderColor: "#E2E8F0",
                          borderRadius: 14,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: "white",
                        }}
                      >
                        <WalletIcon emoji={emoji} size={24} />
                      </TouchableOpacity>
                    ) : (
                      <View style={{ width: 58 }}>
                        <FormTextField
                          label=""
                          value={emoji}
                          onChangeText={setEmoji}
                          maxLength={2}
                        />
                      </View>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <FormCurrencyPicker value={currency} onChange={setCurrency} required />
                  </View>
                </View>
              </View>
            </View>

            <FormMoneyField
              label="Saldo"
              required
              value={balance}
              onChangeText={(t) => setBalance(t.replace(".", ","))}
              currency={currency.toUpperCase() || "EUR"}
              hint="Puedes ajustar el saldo con movimientos después."
            />

            <FormTextField
              label="Descripción"
              value={description}
              onChangeText={setDescription}
            />
          </View>

          {isEditing && (
            <TouchableOpacity
              onPress={handleDeactivate}
              disabled={deactivating}
              activeOpacity={0.8}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 24,
                paddingVertical: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#FECACA",
                backgroundColor: "#FEF2F2",
              }}
            >
              {deactivating ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <>
                  <Ionicons name="eye-off-outline" size={16} color="#DC2626" style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 14, fontWeight: "600", color: "#DC2626" }}>
                    Desactivar cartera
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
