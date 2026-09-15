import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../../theme/theme";
import api from "../../../api/api";
import { Ionicons } from "@expo/vector-icons";
import NumericCalculatorKeyboard from "../../../components/NumericCalculatorKeyboard";
import WalletIcon from "../../../components/WalletIcon";
import { formatEuro as formatEuroBase } from "../../../utils/currency";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../../context/AuthContext";

const formatEuro = (n: number) => `${formatEuroBase(n)} €`;

const round2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export default function ReconcileAccountsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [realValues, setRealValues] = useState<{ [key: string]: string }>({});
  const [focusedWalletId, setFocusedWalletId] = useState<number | null>(null);
  const realValuesRef = useRef<{ [key: string]: string }>({});
  const persistQueueRef = useRef<Promise<void>>(Promise.resolve());
  const storageKey = `reconcile-real-values:${user?.id ?? "anonymous"}`;

  useEffect(() => {
    const fetchWallets = async () => {
      try {
        const [res, storedDraft] = await Promise.all([
          api.get("/wallets"),
          AsyncStorage.getItem(storageKey).catch(() => null),
        ]);
        const data = res.data || [];

        setWallets(data);

        let savedValues: Record<string, unknown> = {};
        if (storedDraft) {
          try {
            const parsed = JSON.parse(storedDraft);
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) savedValues = parsed;
          } catch {
            // Un borrador dañado no debe impedir cargar las cuentas.
          }
        }

        const initial: { [key: string]: string } = {};
        data.forEach((w: any) => {
          const savedValue = savedValues[String(w.id)];
          initial[w.id] = typeof savedValue === "string" ? savedValue : "";
        });
        realValuesRef.current = initial;
        setRealValues(initial);
      } catch (e) {
        console.error("❌ Error wallets:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchWallets();
  }, [storageKey]);

  const handleChange = (id: string, value: string) => {
    const next = { ...realValuesRef.current, [id]: value };
    realValuesRef.current = next;
    setRealValues(next);

    // Mantiene el orden de las escrituras para que el último dígito escrito
    // sea también el que quede persistido si se abandona la pantalla enseguida.
    persistQueueRef.current = persistQueueRef.current
      .catch(() => undefined)
      .then(() => AsyncStorage.setItem(storageKey, JSON.stringify(next)))
      .catch((error) => console.error("Error guardando valores de conciliación:", error));
  };

  const focusedIndex = wallets.findIndex((w) => w.id === focusedWalletId);
  const keyboardVisible = focusedWalletId !== null;

  const focusPrev = () => {
    if (focusedIndex <= 0) return;
    setFocusedWalletId(wallets[focusedIndex - 1].id);
  };

  const focusNext = () => {
    if (focusedIndex < 0 || focusedIndex >= wallets.length - 1) return;
    setFocusedWalletId(wallets[focusedIndex + 1].id);
  };

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
          contentContainerStyle={{ paddingBottom: keyboardVisible ? 330 + insets.bottom : 80, paddingTop: 16 }}
        >
          {/* Header simple con flecha */}
          <View className="px-4 mb-4 flex-row items-center">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="mr-2 p-1"
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </TouchableOpacity>

            <View>
              <Text className="text-[22px] font-bold text-text">
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

          {/* Filas tipo tarjeta, compactas */}
          {wallets.map((wallet) => {
            const teorico = wallet.balance || 0;
            const real = parseEuroInput(realValues[wallet.id]);
            const diff = real - teorico;
            const focused = focusedWalletId === wallet.id;

            const addTransaction = () => {
              const isIncome = diff > 0;
              const roundedAmount = round2(Math.abs(diff));

              navigation.navigate("Add", {
                prefillData: {
                  type: isIncome ? "income" : "expense",
                  amount: roundedAmount,
                  description: "",
                  date: new Date().toISOString(),
                  walletId: wallet.id,
                  categoryId: null,
                  subcategoryId: null,
                  recurrence: null,
                },
              });
            };

            return (
              <View
                key={wallet.id}
                style={{
                  marginHorizontal: 16,
                  marginBottom: 8,
                  backgroundColor: "white",
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <WalletIcon emoji={wallet.emoji} size={20} />

                  <Text numberOfLines={1} style={{ flex: 1, fontSize: 14, fontWeight: "700", color: "#0F172A" }}>
                    {wallet.name}
                  </Text>

                  <TouchableOpacity
                    onPress={() => setFocusedWalletId(wallet.id)}
                    activeOpacity={0.85}
                    style={{
                      minWidth: 84,
                      height: 34,
                      borderRadius: 10,
                      paddingHorizontal: 10,
                      justifyContent: "center",
                      backgroundColor: focused ? "#EFF6FF" : "#F1F5F9",
                      borderWidth: focused ? 1 : 0,
                      borderColor: colors.primary,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "700",
                        textAlign: "right",
                        color: realValues[wallet.id] ? "#0F172A" : "#94A3B8",
                      }}
                    >
                      {realValues[wallet.id] || "0,00"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: 4,
                    paddingLeft: 30,
                  }}
                >
                  <Text style={{ fontSize: 11, color: "#94A3B8" }}>Teórico {formatEuro(teorico)}</Text>

                  {diff !== 0 ? (
                    <TouchableOpacity
                      onPress={addTransaction}
                      activeOpacity={0.75}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: "800", color: diff > 0 ? "#16A34A" : "#DC2626" }}>
                        {diff > 0 ? "+" : "−"}{formatEuro(Math.abs(diff))}
                      </Text>
                      <Ionicons name="add-circle" size={13} color={colors.primary} />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="checkmark-circle" size={13} color="#94A3B8" />
                  )}
                </View>
              </View>
            );
          })}

          {/* Totales */}
          <View className="mx-4 mt-2 bg-white rounded-2xl border border-[#E5E7EB] px-4 py-3">
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

      <NumericCalculatorKeyboard
        visible={keyboardVisible}
        variant="calculator"
        value={focusedWalletId ? realValues[focusedWalletId] ?? "" : ""}
        onChangeValue={(next) => {
          if (!focusedWalletId) return;
          handleChange(String(focusedWalletId), next);
        }}
        onMovePrev={focusPrev}
        onMoveNext={focusNext}
        onDone={() => setFocusedWalletId(null)}
        bottomInset={insets.bottom}
      />
    </SafeAreaView>
  );
}
