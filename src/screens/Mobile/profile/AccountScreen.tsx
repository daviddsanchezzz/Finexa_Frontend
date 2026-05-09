import React from "react";
import { View, Text, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../../../components/AppHeader";
import { useAuth } from "../../../context/AuthContext";

export default function AccountScreen() {
  const { user } = useAuth();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pb-2">
        <AppHeader title="Cuenta" showProfile={false} showDatePicker={false} showBack={true} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="bg-white rounded-2xl border border-gray-100 p-4">
          <View className="items-center mb-4">
            <View className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 mb-3">
              <Image
                source={{
                  uri: user?.avatar || "https://cdn-icons-png.flaticon.com/512/847/847969.png",
                }}
                className="w-full h-full"
              />
            </View>
            <Text className="text-[18px] font-bold text-text">{user?.name || "Usuario"}</Text>
            <Text className="text-gray-500 text-[14px] mt-1">{user?.email || "-"}</Text>
          </View>

          <View className="border-t border-gray-100 pt-3">
            <Row icon="mail-outline" label="Email" value={user?.email || "-"} />
            <Row icon="person-outline" label="Nombre" value={user?.name || "-"} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View className="flex-row items-center py-3">
      <Ionicons name={icon} size={18} color="#6B7280" style={{ marginRight: 10 }} />
      <View className="flex-1">
        <Text className="text-[12px] text-gray-400">{label}</Text>
        <Text className="text-[14px] text-text font-medium mt-0.5">{value}</Text>
      </View>
    </View>
  );
}

