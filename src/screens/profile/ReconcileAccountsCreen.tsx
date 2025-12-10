import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../theme/theme";
import api from "../../api/api";
import { Ionicons } from "@expo/vector-icons";

const formatEuro = (n: number) =>
  n.toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function ReconcileAccountsScreen({ navigation }: any) {
  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [realValues, setRealValues] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const fetchWallets = async () => {
      try {
        const res = await api.get("/wallets");
        const data = res.data || [];

        setWallets(data);

        const initial: any = {};
        data.forEach((w: any) => (initial[w.id] = ""));
        setRealValues(initial);
      } catch (e) {
        console.error("❌ Error wallets:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchWallets();
  }, []);

  const handleChange = (id: string, value: string) =>
    setRealValues((prev) => ({ ...prev, [id]: value }));

  const parseEuroInput = (raw?: string): number => {
    if (!raw) return 0;
    const cleaned = raw.replace(",", ".").replace(/\s/g, "");
    const v = parseFloat(cleaned);
    return isNaN(v) ? 0 : v;
  };

  // Totales
  const totalTeorico = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);
  const totalReal = Object.keys(realValues).reduce((sum, id) => {
    return sum + parseEuroInput(realValues[id]);
  }, 0);
  const totalDiff = totalReal - totalTeorico;

  return (
    <SafeAreaView className="flex-1 bg-background">
      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 40 }}
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 80, paddingTop: 16 }}
        >
          {/* Header simple con flecha */}
          <View className="px-4 mb-4 flex-row items-center">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="mr-2 p-1"
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={24} color="#111" />
            </TouchableOpacity>

            <View>
              <Text className="text-[18px] font-bold text-text">
                Cuadrar cuentas
              </Text>
              <Text className="text-[12px] text-gray-500 mt-0.5">
                Ajusta el saldo real de cada cuenta.
              </Text>
            </View>
          </View>

          {/* "Cabecera" conceptual de la tabla */}
          <View className="px-5 mb-2">
            <Text className="text-[11px] text-gray-400">
              Wallet · Teórico · Real · Diferencia
            </Text>
          </View>

          {/* Filas tipo tarjeta */}
          {wallets.map((wallet) => {
            const teorico = wallet.balance || 0;
            const real = parseEuroInput(realValues[wallet.id]);
            const diff = real - teorico;

            const diffColorBg =
              diff === 0
                ? "bg-gray-100"
                : diff > 0
                ? "bg-green-100"
                : "bg-red-100";

            const diffColorText =
              diff === 0
                ? "text-gray-700"
                : diff > 0
                ? "text-green-700"
                : "text-red-700";

            return (
              <View
                key={wallet.id}
                className="mx-4 mb-4 bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3"
              >
                {/* Línea 1: wallet + nombre + dif */}
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center flex-shrink">
                    <Text className="text-[22px] mr-2">{wallet.emoji}</Text>
                    <Text
                      className="text-[15px] font-semibold text-text"
                      numberOfLines={1}
                    >
                      {wallet.name}
                    </Text>
                  </View>

                  <View className={`px-2 py-1 rounded-full ${diffColorBg}`}>
                    <Text
                      className={`text-[12px] font-semibold ${diffColorText}`}
                    >
                      {diff > 0 ? "+" : diff < 0 ? "−" : ""}
                      {formatEuro(Math.abs(diff))}
                    </Text>
                  </View>
                </View>

                {/* Línea 2: Teórico y Real */}
                <View className="flex-row justify-between items-center">
                  <View className="flex-1 mr-3">
                    <Text className="text-[11px] text-gray-500 mb-1">
                      Teórico
                    </Text>
                    <Text className="text-[15px] font-semibold text-gray-800">
                      {formatEuro(teorico)}
                    </Text>
                  </View>

                  <View className="flex-1">
                    <Text className="text-[11px] text-gray-500 mb-1 text-right">
                      Real
                    </Text>
                    <TextInput
                      value={realValues[wallet.id] ?? ""}
                      onChangeText={(v) => handleChange(wallet.id, v)}
                      placeholder={formatEuro(teorico)
                        .replace("€", "")
                        .trim()}
                      keyboardType="numeric"
                      className="text-[15px] text-right bg-gray-100 px-3 py-1.5 rounded-xl"
                    />
                  </View>
                </View>

                {/* ➕ Botón añadir transacción */}
                {diff !== 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      const isIncome = diff > 0;

                      const fakeEditData = {
                        id: null, // para que AddScreen trate como "nuevo"
                        type: isIncome ? "income" : "expense",
                        amount: Math.abs(diff),
                        description: "",
                        date: new Date().toISOString(),
                        walletId: wallet.id,
                        categoryId: null,
                        subcategoryId: null,
                        recurrence: null,
                      };

                      navigation.navigate("Add", { editData: fakeEditData });
                    }}
                    className="mt-3 py-2 bg-primary/10 rounded-xl items-center"
                    activeOpacity={0.8}
                  >
                    <Text className="text-primary font-semibold text-[14px]">
                      Añadir transacción (
                      {diff > 0 ? "+" : diff < 0 ? "−" : ""}
                      {formatEuro(Math.abs(diff))})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

          {/* Totales */}
          <View className="mx-4 mt-2 bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3">
            <Text className="text-[15px] font-semibold text-text mb-3">
              Resumen total
            </Text>

            <View className="flex-row justify-between mb-2">
              <Text className="text-[13px] text-gray-500">Total teórico</Text>
              <Text className="text-[15px] font-semibold text-gray-800">
                {formatEuro(totalTeorico)}
              </Text>
            </View>

            <View className="flex-row justify-between mb-2">
              <Text className="text-[13px] text-gray-500">Total real</Text>
              <Text className="text-[15px] font-semibold text-gray-800">
                {formatEuro(totalReal)}
              </Text>
            </View>

            <View className="flex-row justify-between mt-1 pt-2 border-t border-gray-200">
              <Text className="text-[13px] text-gray-500">
                Diferencia total
              </Text>
              <Text
                className={`text-[16px] font-bold ${
                  totalDiff === 0
                    ? "text-gray-800"
                    : totalDiff > 0
                    ? "text-green-600"
                    : "text-red-500"
                }`}
              >
                {totalDiff > 0 ? "+" : totalDiff < 0 ? "−" : ""}
                {formatEuro(Math.abs(totalDiff))}
              </Text>
            </View>
          </View>

          {/* Nota */}
          <View className="mx-5 mt-4">
            <Text className="text-[11px] text-gray-400">
              Consejo: usa esta pantalla después de contar efectivo o revisar
              extractos para detectar descuadres entre la app y la realidad.
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
