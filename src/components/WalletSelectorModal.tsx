import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import Modal from "react-native-modal";
import { colors } from "../theme/theme";
import { useNavigation } from "@react-navigation/native";
import api from "../api/api";

interface WalletSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (wallet: any | null) => void; // null = todas las carteras
  selectedWallet?: any;
}

export default function WalletSelectorModal({
  visible,
  onClose,
  onSelect,
  selectedWallet,
}: WalletSelectorModalProps) {

  const navigation = useNavigation<any>(); // 👈 AQUÍ ESTÁ LA CLAVE

  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWallets = async () => {
      try {
        setLoading(true);
        const res = await api.get("/wallets");
        setWallets(res.data || []);
      } catch (error) {
        console.error("❌ Error al cargar carteras:", error);
      } finally {
        setLoading(false);
      }
    };

    if (visible) fetchWallets();
  }, [visible]);

  const total = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);

  const formatEuro = (n: number) =>
    n.toLocaleString("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
  });


  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      backdropOpacity={0.4}
      style={{ justifyContent: "flex-end", margin: 0 }}
    >
      <View className="bg-white rounded-t-3xl p-5 pb-8 max-h-[80%]">
        {/* Header */}
        <View className="flex-row justify-between items-center mb-5">
          <Text className="text-[17px] font-semibold text-text">Selecciona una cartera</Text>
          <TouchableOpacity onPress={onClose}>
            <Text className="text-[14px] text-gray-500 font-medium">Cerrar</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* 🔹 Total - Todas las carteras */}
              <TouchableOpacity
                onPress={() => {
                  onSelect(null);
                  onClose();
                }}
                activeOpacity={0.8}
                className="bg-primary/10 rounded-2xl px-5 py-4 mb-4 flex-row justify-between items-center border border-primary/20"
              >
                <Text className="text-[16px] font-semibold text-primary">
                  Todas las carteras
                </Text>
                <Text className="text-[16px] font-semibold text-primary">
                  {formatEuro(total)}
                </Text>
              </TouchableOpacity>

              {/* Línea separadora */}
              <View className="h-[1px] bg-gray-200 mb-4 mx-1" />

              {/* 🔹 Lista de carteras individuales */}
              {wallets.map((wallet) => (
                <TouchableOpacity
                  key={wallet.id}
                  activeOpacity={0.8}
                  onPress={() => {
                    onSelect(wallet);
                    onClose();
                  }}
                  className={`flex-row justify-between items-center px-4 py-3 rounded-2xl mb-2 ${
                    selectedWallet?.id === wallet.id
                      ? "bg-primary/10 border border-primary/50"
                      : "bg-gray-50 border border-transparent"
                  }`}
                >
                  <View className="flex-row items-center">
                    <Text className="text-[20px] mr-3">{wallet.emoji}</Text>
                    <Text className="text-[15px] text-text font-medium">{wallet.name}</Text>
                  </View>
                  <Text className="text-[15px] text-gray-700 font-semibold">
                    {formatEuro(wallet.balance)}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* ESPACIO ENTRE LISTA Y BOTONES */}
              <View className="h-16" />
            </ScrollView>

            {/* BOTONES INFERIORES */}
            <View className="mt-2 px-1 flex-row justify-between">
              {/* Botón Editar carteras */}
              <TouchableOpacity
                activeOpacity={0.8}
                className="flex-1 bg-gray-100 rounded-2xl py-3 mr-2 items-center justify-center"
                onPress={() => {
                  onClose();
                  navigation.navigate("Wallets"); // 👈 FUNCIONA AHORA
                }}
              >
                <Text className="text-[15px] font-semibold text-gray-700">
                  Editar carteras
                </Text>
              </TouchableOpacity>

              {/* Botón Ver transferencias */}
              <TouchableOpacity
                activeOpacity={0.8}
                className="flex-1 bg-gray-100 rounded-2xl py-3 ml-2 items-center justify-center"
                onPress={() => {
                  onClose();
                  navigation.navigate("Transfers"); // 👈 CAMBIA POR TU SCREEN
                }}
              >
                <Text className="text-[15px] font-semibold text-gray-700">
                  Ver transferencias
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}
