// src/screens/Finances/FinancesScreen.tsx
import React from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../../components/AppHeader";
import { colors } from "../../theme/theme";

interface FinanceModule {
  key: string;
  title: string;
  subtitle: string;
  emoji: string;
  iconName: keyof typeof Ionicons.glyphMap;
  routeName: string;
  accentColor: string;
  softBg: string;
}

const MODULES: FinanceModule[] = [
  {
    key: "budgets",
    title: "Presupuestos",
    subtitle: "Limita y controla tus gastos por categoría",
    emoji: "📊",
    iconName: "wallet-outline",
    routeName: "Budgets",
    accentColor: "#6366F1",
    softBg: "#EEF2FF",
  },
  {
    key: "goals",
    title: "Objetivos",
    subtitle: "Ahorra para lo que más te importa",
    emoji: "🎯",
    iconName: "flag-outline",
    routeName: "Goals",
    accentColor: "#F97316",
    softBg: "#FFF7ED",
  },
  {
    key: "debts",
    title: "Deudas",
    subtitle: "Controla préstamos, cuotas y pagos pendientes",
    emoji: "💸",
    iconName: "card-outline",
    routeName: "Debts",
    accentColor: "#EF4444",
    softBg: "#FEF2F2",
  },
  {
    key: "investments",
    title: "Inversión",
    subtitle: "Sigue tu cartera y su rentabilidad",
    emoji: "📈",
    iconName: "trending-up-outline",
    routeName: "Investments",
    accentColor: "#22C55E",
    softBg: "#ECFDF3",
  },
  {
    key: "trips",
    title: "Viajes",
    subtitle: "Agrupa y analiza los gastos de viajes",
    emoji: "✈️",
    iconName: "airplane-outline",
    routeName: "Trips",
    accentColor: "#0EA5E9",
    softBg: "#E0F2FE",
  },
];

export default function FinancesScreen({ navigation }: any) {
  const handleNavigate = (module: FinanceModule) => {
    navigation.navigate(module.routeName);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* HEADER SUPERIOR */}
      <View className="px-5 pb-3">
        <AppHeader title="Finanzas personales" showProfile={false} showDatePicker={false} />
      </View>

      {/* LISTA DE MÓDULOS EN GRID */}
      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View className="flex-row flex-wrap justify-between">
          {MODULES.map((m) => (
            <TouchableOpacity
              key={m.key}
              onPress={() => handleNavigate(m)}
              className="mb-4 rounded-3xl"
              style={{
                width: "48%",
                backgroundColor: "white",
                borderWidth: 1,
                borderColor: "#E5E7EB",
                paddingHorizontal: 14,
                paddingVertical: 14,
                shadowColor: "#000",
                shadowOpacity: 0.05,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 3 },
                elevation: 3,
              }}
              activeOpacity={0.9}
            >
              {/* ICONO / EMOJI */}
              <View
                className="w-10 h-10 rounded-2xl items-center justify-center mb-2"
                style={{ backgroundColor: m.softBg }}
              >
                <Text style={{ fontSize: 22 }}>{m.emoji}</Text>
              </View>

              {/* TÍTULO */}
              <Text
                className="text-sm font-semibold text-gray-900"
                numberOfLines={1}
              >
                {m.title}
              </Text>

              {/* SUBTÍTULO */}
              <Text
                className="text-[11px] text-gray-500 mt-0.5 mb-2"
                numberOfLines={2}
              >
                {m.subtitle}
              </Text>

              {/* FILA INFERIOR: ICONO + FLECHA */}
              <View className="flex-row items-center justify-between mt-1">
                <View
                  className="flex-row items-center px-2 py-1 rounded-full"
                  style={{ backgroundColor: m.softBg }}
                >
                  <Ionicons
                    name={m.iconName}
                    size={14}
                    color={m.accentColor}
                  />
                  <Text
                    className="text-[10px] font-medium ml-1"
                    style={{ color: m.accentColor }}
                  >
                    Ver módulo
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color="#94A3B8"
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
