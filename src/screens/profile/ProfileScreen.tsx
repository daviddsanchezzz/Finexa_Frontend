import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { colors } from "../../theme/theme";

export default function ProfileScreen({ navigation }: any) {
  const { user, logout } = useAuth();

  return (
    <SafeAreaView className="flex-1 bg-background">

      {/* 🔹 Header con avatar */}
      <View className="bg-primary/10 pb-6 pt-8 items-center relative">
        {/* Botón cerrar */}
        <TouchableOpacity
          onPress={() => navigation.navigate("Home")}
          activeOpacity={0.7}
          style={{
            position: "absolute",
            top: 18,
            left: 20,
            zIndex: 10,
            backgroundColor: "white",
            borderRadius: 100,
            padding: 6,
            borderWidth: 1,
            borderColor: "#E5E7EB",
          }}
        >
          <Ionicons name="close-outline" size={22} color={colors.text} />
        </TouchableOpacity>

        <View className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 mb-3 mt-4">
          <Image
            source={{
              uri:
                user?.avatar ||
                "https://cdn-icons-png.flaticon.com/512/847/847969.png",
            }}
            className="w-full h-full"
          />
        </View>

        <Text className="text-xl font-bold text-text">
          {user?.name || "Usuario"}
        </Text>
        <Text className="text-gray-500 text-[14px] mt-1">
          {user?.email || "@usuario"}
        </Text>
      </View>

      {/* 🔹 Bloques plan / referidos */}
      <View className="flex-row justify-between px-6 mt-6 mb-4">
        <TouchableOpacity
          activeOpacity={0.8}
          className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mr-3"
        >
          <Ionicons name="card-outline" size={26} color={colors.primary} />
          <Text className="text-text font-semibold mt-2 text-[15px]">
            Estándar
          </Text>
          <Text className="text-gray-400 text-[12px] mt-0.5">Tu plan</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 ml-3"
        >
          <Ionicons name="person-add-outline" size={26} color={colors.primary} />
          <Text className="text-text font-semibold mt-2 text-[15px]">
            Invita amigos
          </Text>
          <Text className="text-gray-400 text-[12px] mt-0.5">
            Recomienda Finexa
          </Text>
        </TouchableOpacity>
      </View>

      {/* 🔹 SOLO la lista tiene scroll */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        className="mt-2"
      >
        {/* Lista de opciones */}
        <View className="bg-white mx-6 rounded-2xl border border-gray-100 overflow-hidden">
          {[
            { label: "Cuenta", icon: "person-outline" },
            { label: "Notificaciones", icon: "notifications-outline" },
            { label: "Apariencia", icon: "sunny-outline" },
            { label: "Categorías", icon: "color-palette-outline", navigate: "Categories" },
            { label: "Carteras", icon: "wallet-outline", navigate: "Wallets" },
            { label: "Cuadrar cuentas", icon: "receipt-outline", navigate: "ReconcileAccounts" },
            { label: "Seguridad", icon: "lock-closed-outline" },
            { label: "Centro de ayuda", icon: "help-circle-outline" },
            { label: "Sobre Spendly", icon: "information-circle-outline" },
          ].map((item, idx) => (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.7}
              onPress={() => item.navigate && navigation.navigate(item.navigate as never)}
              className={`flex-row justify-between items-center px-6 py-4 ${
                idx !== 7 ? "border-b border-gray-100" : ""
              }`}
            >
              <View className="flex-row items-center">
                <Ionicons
                  name={item.icon as any}
                  size={22}
                  color={colors.text}
                  style={{ marginRight: 14 }}
                />
                <Text className="text-[15px] text-text font-medium">
                  {item.label}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward-outline"
                size={20}
                color="#9CA3AF"
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Cerrar sesión */}
        <TouchableOpacity
          onPress={logout}
          activeOpacity={0.8}
          className="mx-6 mt-8 bg-red-50 border border-red-100 py-3 rounded-2xl items-center"
        >
          <Text className="text-red-600 font-semibold text-[16px]">
            Cerrar sesión
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
