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
    subtitle: "Limita y controla tus gastos por categoría.",
    emoji: "📊",
    iconName: "wallet-outline",
    routeName: "Budgets",
    accentColor: "#6366F1",
    softBg: "#EEF2FF",
  },
  {
    key: "goals",
    title: "Objetivos",
    subtitle: "Ahorra para lo que más te importa.",
    emoji: "🎯",
    iconName: "flag-outline",
    routeName: "Goals",
    accentColor: "#F97316",
    softBg: "#FFF7ED",
  },
  {
    key: "debts",
    title: "Deudas",
    subtitle: "Controla préstamos, cuotas y pagos pendientes.",
    emoji: "💸",
    iconName: "card-outline",
    routeName: "Debts",
    accentColor: "#EF4444",
    softBg: "#FEF2F2",
  },
  {
    key: "investments",
    title: "Inversión",
    subtitle: "Sigue tu cartera y su rentabilidad.",
    emoji: "📈",
    iconName: "trending-up-outline",
    routeName: "Investments",
    accentColor: "#22C55E",
    softBg: "#ECFDF3",
  },
  {
    key: "trips",
    title: "Viajes",
    subtitle: "Agrupa y analiza los gastos de viajes.",
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
    <SafeAreaView className="flex-1" style={{ backgroundColor: "#F3F4F6" }}>
      {/* HEADER SUPERIOR */}
      <View className="px-5 pb-2">
        <AppHeader
          title="Finanzas personales"
          showProfile={false}
          showDatePicker={false}
        />
      </View>

      {/* BANNER INTRO */}
      <View className="px-5 mb-3">
        <View
          style={{
            backgroundColor: "#E0E7FF",
            borderRadius: 18,
            paddingVertical: 10,
            paddingHorizontal: 14,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              backgroundColor: "#EEF2FF",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}
          >
            <Ionicons
              name="sparkles-outline"
              size={16}
              color={colors.primary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: "#1F2933",
                marginBottom: 2,
              }}
            >
              Centraliza tus decisiones de dinero
            </Text>
          </View>
        </View>
      </View>

      {/* LISTA 1 COLUMNA */}
      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40, paddingTop: 4 }}
      >
        {MODULES.map((m) => (
          <TouchableOpacity
            key={m.key}
            onPress={() => handleNavigate(m)}
            activeOpacity={0.9}
            style={{
              borderRadius: 22,
              marginBottom: 12,
              backgroundColor: "#FFFFFF",
              borderWidth: 1,
              borderColor: "#E2E8F0",
              paddingHorizontal: 16,
              paddingVertical: 14,
              shadowColor: "#0F172A",
              shadowOpacity: 0.03,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              elevation: 2,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            {/* ICONO IZQUIERDA */}
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 18,
                backgroundColor: m.softBg,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Text style={{ fontSize: 24 }}>{m.emoji}</Text>
            </View>

            {/* CONTENIDO CENTRAL */}
            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 2,
                }}
              >
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: "#0F172A",
                    flex: 1,
                  }}
                >
                  {m.title}
                </Text>
              </View>

              <Text
                style={{
                  fontSize: 11,
                  color: "#6B7280",
                  marginBottom: 6,
                }}
                numberOfLines={2}
              >
                {m.subtitle}
              </Text>

              {/* CHIPS INFERIORES: icono + tag */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 999,
                    backgroundColor: m.softBg,
                  }}
                >
                  <Ionicons
                    name={m.iconName}
                    size={13}
                    color={m.accentColor}
                  />
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "600",
                      color: m.accentColor,
                      marginLeft: 4,
                    }}
                  >
                    Ver módulo
                  </Text>
                </View>
              </View>
            </View>

            {/* FLECHA DERECHA */}
            <View style={{ marginLeft: 10 }}>
              <Ionicons
                name="chevron-forward"
                size={20}
                color="#94A3B8"
              />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
