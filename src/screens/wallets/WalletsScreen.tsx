import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  UIManager,
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/theme";
import api from "../../api/api";
import EditWalletModal from "../../components/EditWalletModal";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const formatEuro = (n: number) =>
  n.toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

type Wallet = {
  id: number;
  name: string;
  emoji: string;
  balance: number;
};

const moveItem = <T,>(arr: T[], fromIndex: number, toIndex: number): T[] => {
  const newArr = [...arr];
  const item = newArr.splice(fromIndex, 1)[0];
  newArr.splice(toIndex, 0, item);
  return newArr;
};

export default function WalletsScreen({ navigation }: any) {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);

  const [reorderMode, setReorderMode] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  // 🔹 Cargar wallets desde el backend
  const fetchWallets = async () => {
    try {
      setLoading(true);
      const res = await api.get("/wallets");
      setWallets(res.data || []);
    } catch (error: any) {
      console.error("❌ Error al cargar wallets:", error.response?.data || error.message);
      Alert.alert("Error", "No se pudieron cargar las wallets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallets();
  }, []);

  // 🧠 Modal (crear / editar wallet)
  const openModal = (wallet?: Wallet) => {
    if (reorderMode) return; // en modo reordenar no dejamos editar
    setEditingWallet(wallet || null);
    setModalVisible(true);
  };

  const handleSave = () => {
    fetchWallets();
    setModalVisible(false);
  };

  // 🔼🔽 Mover hacia arriba / abajo
  const moveUp = (index: number) => {
    if (index === 0) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setWallets((prev) => moveItem(prev, index, index - 1));
  };

  const moveDown = (index: number) => {
    if (index === wallets.length - 1) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setWallets((prev) => moveItem(prev, index, index + 1));
  };

  // 💾 Guardar orden en el backend
  const handleSaveOrder = async () => {
    try {
      setSavingOrder(true);
      const order = wallets.map((w) => w.id); // [id1, id2, ...]
      await api.patch("/wallets/reorder", { order });
      Alert.alert("Orden guardado");
      setReorderMode(false);
      await fetchWallets(); // opcional, para refrescar desde back
    } catch (error: any) {
      console.error("❌ Error al reordenar wallets:", error.response?.data || error.message);
      Alert.alert("Error", "No se pudo guardar el orden.");
    } finally {
      setSavingOrder(false);
    }
  };

  const handleCancelReorder = async () => {
    setReorderMode(false);
    await fetchWallets(); // volver al orden del back
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
          <Text className="text-[20px] font-bold text-text">Carteras</Text>
        </View>

        {/* Botones derecha */}
        <View className="flex-row items-center">
          {!reorderMode && (
            <TouchableOpacity
              activeOpacity={0.8}
              className="bg-primary/10 rounded-full p-2.5 mr-2"
              onPress={() => openModal()}
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

      {/* Lista */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="px-6"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {loading ? (
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={{ marginTop: 50 }}
          />
        ) : wallets.length === 0 ? (
          <Text className="text-center text-gray-400 mt-10">
            No tienes ninguna cartera aún.
          </Text>
        ) : (
          wallets.map((wallet, index) => (
            <View
              key={wallet.id}
              className="bg-white rounded-2xl mb-3 px-4 py-3 flex-row justify-between items-center"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 3,
              }}
            >
              {/* Info (toca para editar si no estamos en modo reordenar) */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => openModal(wallet)}
                style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
                disabled={reorderMode}
              >
                <View
                  style={{
                    backgroundColor: colors.primary + "15",
                    padding: 8,
                    borderRadius: 10,
                    marginRight: 12,
                  }}
                >
                  <Text style={{ fontSize: 22 }}>{wallet.emoji}</Text>
                </View>
                <Text className="text-[17px] font-semibold text-text">
                  {wallet.name}
                </Text>
              </TouchableOpacity>

              {/* Saldo + controles reordenar */}
              <View className="flex-row items-center">
                <Text className="text-[17px] font-semibold text-text mr-2">
                  {formatEuro(wallet.balance)}
                </Text>

                {reorderMode && (
                  <View className="flex-col">
                    <TouchableOpacity
                      onPress={() => moveUp(index)}
                      disabled={index === 0}
                      style={{ opacity: index === 0 ? 0.3 : 1, paddingVertical: 2 }}
                    >
                      <Ionicons name="arrow-up-outline" size={18} color="#6b7280" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => moveDown(index)}
                      disabled={index === wallets.length - 1}
                      style={{
                        opacity: index === wallets.length - 1 ? 0.3 : 1,
                        paddingVertical: 2,
                      }}
                    >
                      <Ionicons name="arrow-down-outline" size={18} color="#6b7280" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal editar/crear */}
      <EditWalletModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        editingWallet={editingWallet}
        onSave={handleSave}
      />
    </SafeAreaView>
  );
}
