import React from "react";
import { View, Text, ScrollView, Linking, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../../../components/AppHeader";

export default function HelpCenterScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pb-2">
        <AppHeader title="Centro de ayuda" showProfile={false} showDatePicker={false} showBack={true} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text className="text-[13px] text-gray-500 mb-4">
          ¿Necesitas ayuda? Aquí tienes vías rápidas para soporte.
        </Text>

        <ActionCard
          icon="mail-outline"
          title="Soporte por email"
          subtitle="hola@finexa.app"
          onPress={() => Linking.openURL("mailto:hola@finexa.app")}
        />
        <ActionCard
          icon="help-buoy-outline"
          title="FAQ"
          subtitle="Preguntas frecuentes"
          onPress={() => {}}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionCard({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: any;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className="bg-white rounded-2xl border border-gray-100 p-4 mb-3 flex-row items-center"
    >
      <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center mr-3">
        <Ionicons name={icon} size={20} color="#2563EB" />
      </View>
      <View className="flex-1">
        <Text className="text-[15px] font-semibold text-text">{title}</Text>
        <Text className="text-[12px] text-gray-400 mt-0.5">{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward-outline" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

