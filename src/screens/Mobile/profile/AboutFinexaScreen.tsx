import React from "react";
import { View, Text, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "../../../components/AppHeader";

export default function AboutFinexaScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pb-2">
        <AppHeader title="Sobre Finexa" showProfile={false} showDatePicker={false} showBack={true} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="bg-white rounded-2xl border border-gray-100 p-5 items-center">
          <Image
            source={require("../../../../assets/finex_logo.png")}
            style={{ width: 72, height: 72, borderRadius: 16, marginBottom: 12 }}
            resizeMode="contain"
          />
          <Text className="text-[20px] font-bold text-text">Finexa</Text>
          <Text className="text-[13px] text-gray-400 mt-1">Versión 1.0.0</Text>
          <Text className="text-[14px] text-gray-500 mt-4 text-center leading-5">
            Finexa te ayuda a controlar tus finanzas, carteras e inversiones de forma clara y sencilla.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

