// src/screens/Reports/ReportsScreen.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../../theme/theme";
import api from "../../../api/api";

type PeriodMode = "monthly" | "yearly";

/* ---------------- Utils ---------------- */

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function monthKeyFromDate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function yearKeyFromDate(d: Date) {
  return `${d.getFullYear()}`;
}

function monthLabelEs(monthKey: string) {
  const d = new Date(`${monthKey}-01T00:00:00Z`);
  const label = new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
  }).format(d);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/* ---------------- Screen ---------------- */

export default function ReportsScreen({ navigation }: any) {
  const now = new Date();

  const [mode, setMode] = useState<PeriodMode>("monthly");
  const [month, setMonth] = useState<string>(monthKeyFromDate(now));
  const [year, setYear] = useState<string>(yearKeyFromDate(now));
  const [loading, setLoading] = useState(false);

  const currency = "EUR";

  const title = useMemo(() => {
    return mode === "monthly"
      ? `Informe mensual · ${monthLabelEs(month)}`
      : `Informe anual · ${year}`;
  }, [mode, month, year]);

  const onBack = () => navigation.goBack();

  const adjustMonth = (delta: number) => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1, 1));
    d.setUTCMonth(d.getUTCMonth() + delta);
    setMonth(`${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`);
  };

  const adjustYear = (delta: number) => {
    setYear(String(Number(year) + delta));
  };

  const buildUrl = () => {
    if (mode === "monthly") {
      return `/reports/monthly/pdf?month=${encodeURIComponent(
        month
      )}&currency=${encodeURIComponent(currency)}`;
    }
    return `/reports/yearly/pdf?year=${encodeURIComponent(
      year
    )}&currency=${encodeURIComponent(currency)}`;
  };

const openPdf = () => {
  navigation.navigate("ReportsPdfViewer", {
    path: buildUrl(), 
    title,
  });
};

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-5 pt-2 pb-3 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={onBack}
          activeOpacity={0.7}
          className="w-10 h-10 rounded-full bg-white border border-gray-200 items-center justify-center"
        >
          <Ionicons name="arrow-back-outline" size={20} color={colors.text} />
        </TouchableOpacity>

        <Text className="text-[16px] font-extrabold text-text">
          Informes
        </Text>

        <View className="w-10 h-10" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Tipo */}
        <View className="mx-5 mt-2 bg-white border border-gray-100 rounded-2xl p-3">
          <Text className="text-[13px] text-gray-500 font-semibold">
            Tipo de informe
          </Text>

          <View className="flex-row mt-3">
            <TouchableOpacity
              onPress={() => setMode("monthly")}
              activeOpacity={0.85}
              className={`flex-1 py-3 rounded-xl border ${
                mode === "monthly"
                  ? "bg-primary/10 border-primary/20"
                  : "border-gray-200"
              }`}
              style={{ marginRight: 10 }}
            >
              <View className="flex-row items-center justify-center">
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={mode === "monthly" ? colors.primary : colors.text}
                  style={{ marginRight: 8 }}
                />
                <Text className="font-extrabold">Mensual</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setMode("yearly")}
              activeOpacity={0.85}
              className={`flex-1 py-3 rounded-xl border ${
                mode === "yearly"
                  ? "bg-primary/10 border-primary/20"
                  : "border-gray-200"
              }`}
            >
              <View className="flex-row items-center justify-center">
                <Ionicons
                  name="stats-chart-outline"
                  size={18}
                  color={mode === "yearly" ? colors.primary : colors.text}
                  style={{ marginRight: 8 }}
                />
                <Text className="font-extrabold">Anual</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Periodo */}
        <View className="mx-5 mt-4 bg-white border border-gray-100 rounded-2xl p-4">
          <Text className="text-[13px] text-gray-500 font-semibold">
            Periodo
          </Text>

          <View className="flex-row items-center justify-between mt-3">
            <TouchableOpacity
              onPress={() =>
                mode === "monthly"
                  ? adjustMonth(-1)
                  : adjustYear(-1)
              }
              className="w-10 h-10 rounded-full bg-gray-50 border border-gray-200 items-center justify-center"
            >
              <Ionicons name="chevron-back-outline" size={20} />
            </TouchableOpacity>

            <View className="items-center">
              <Text className="text-[16px] font-extrabold">
                {mode === "monthly" ? monthLabelEs(month) : year}
              </Text>
              <Text className="text-[12px] text-gray-400 font-semibold mt-1">
                {mode === "monthly" ? month : year}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() =>
                mode === "monthly"
                  ? adjustMonth(1)
                  : adjustYear(1)
              }
              className="w-10 h-10 rounded-full bg-gray-50 border border-gray-200 items-center justify-center"
            >
              <Ionicons name="chevron-forward-outline" size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Acción */}
        <View className="mx-5 mt-4 bg-white border border-gray-100 rounded-2xl p-4">
          <Text className="text-[13px] text-gray-500 font-semibold">
            Exportación
          </Text>

          <TouchableOpacity
            onPress={openPdf}
            disabled={loading}
            activeOpacity={0.85}
            className="mt-3 bg-primary rounded-2xl py-4 items-center"
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <View className="flex-row items-center">
                <Ionicons
                  name="open-outline"
                  size={20}
                  color="white"
                  style={{ marginRight: 8 }}
                />
                <Text className="text-white font-extrabold text-[15px]">
                  Abrir PDF
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View className="mx-5 mt-4 bg-primary/10 border border-primary/10 rounded-2xl p-4">
          <View className="flex-row items-start">
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={colors.primary}
            />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text className="font-extrabold">Qué incluye</Text>
              <Text className="text-[12px] text-gray-500 font-semibold mt-1 leading-5">
                Totales de ingresos, gastos y ahorro, comparación con el
                periodo anterior y categorías principales. El informe
                excluye transferencias.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
