import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../../context/AuthContext";
import { useTheme } from "../../../context/ThemeContext";
import { useFriends } from "../../../hooks/useFriends";
import { useNotificationsFeed } from "../../../hooks/useNotificationsFeed";
import IconCircleButton from "../../../components/IconCircleButton";
import UserAvatar from "../../../components/UserAvatar";

export default function ProfileScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const { colors, isDark } = useTheme();
  const { friends } = useFriends();
  const { unreadCount } = useNotificationsFeed();
  const sections = [
    {
      title: "Perfil",
      items: [
        { label: "Cuenta", icon: "person-outline", navigate: "Account" },
        { label: "Amigos", icon: "people-outline", navigate: "Friends", count: friends.length },
        { label: "Notificaciones", icon: "notifications-outline", navigate: "Notifications", badge: unreadCount },
      ],
    },
    {
      title: "Finanzas",
      items: [
        { label: "Finanzas personal", icon: "grid-outline", navigate: "FinancesSettings" },
        { label: "Informes", icon: "document-text-outline", navigate: "Reports" },
        { label: "Cuadrar cuentas", icon: "receipt-outline", navigate: "ReconcileAccounts" },
      ],
    },
    {
      title: "Soporte",
      items: [
        { label: "Centro de ayuda", icon: "help-circle-outline", navigate: "HelpCenter" },
        { label: "Sobre Finexa", icon: "information-circle-outline", navigate: "AboutFinexa" },
      ],
    },
  ] as const;

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header con avatar */}
      <View className="bg-primary/10 pb-6 pt-8 items-center relative">
        {/* Botón cerrar */}
        <IconCircleButton
          icon="close-outline"
          onPress={() => navigation.navigate("Home")}
          size={36}
          iconSize={22}
          color={colors.text}
          backgroundColor={colors.surface}
          style={{
            position: "absolute",
            top: 18,
            left: 20,
            zIndex: 10,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        />

        <View className="mb-3 mt-4">
          <UserAvatar user={user} size={80} fontSize={28} />
        </View>

        <Text className="text-xl font-bold text-text">{user?.name || "Usuario"}</Text>
        <Text className="text-textSecondary text-[14px] mt-1">{user?.email || "@usuario"}</Text>
      </View>

      {/* Zona scrolleable */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        className="mt-2"
      >
        {/* Accesos rápidos */}
        <View className="flex-row justify-between px-6 mt-6 mb-4">
          <TouchableOpacity
            onPress={() => navigation.navigate("Wallets")}
            activeOpacity={0.8}
            className="flex-1 bg-surface rounded-2xl p-4 mr-3"
            style={isDark
              ? { borderWidth: 1, borderColor: colors.border }
              : { shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}
          >
            <Ionicons name="wallet-outline" size={26} color={colors.primary} />
            <Text className="text-text font-semibold mt-2 text-[15px]">Carteras</Text>
            <Text className="text-textSecondary text-[12px] mt-0.5">Gestiona tus carteras</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate("Categories")}
            activeOpacity={0.8}
            className="flex-1 bg-surface rounded-2xl p-4 ml-3"
            style={isDark
              ? { borderWidth: 1, borderColor: colors.border }
              : { shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}
          >
            <Ionicons name="color-palette-outline" size={26} color={colors.primary} />
            <Text className="text-text font-semibold mt-2 text-[15px]">Categorías</Text>
            <Text className="text-textSecondary text-[12px] mt-0.5">Organiza tus categorías</Text>
          </TouchableOpacity>
        </View>

        {sections.map((section) => (
          <View key={section.title} className="mx-6 mb-4">
            <Text className="text-[12px] font-semibold text-textSecondary uppercase tracking-wider px-1 mb-2">
              {section.title}
            </Text>
            <View
              className="bg-surface rounded-2xl overflow-hidden"
              style={isDark
                ? { borderWidth: 1, borderColor: colors.border }
                : { shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}
            >
              {section.items.map((item, idx) => (
                <TouchableOpacity
                  key={item.label}
                  activeOpacity={0.7}
                  onPress={() => item.navigate && navigation.navigate(item.navigate as never)}
                  className="flex-row justify-between items-center px-6 py-4"
                  style={idx !== section.items.length - 1 ? { borderBottomWidth: 1, borderBottomColor: colors.border } : undefined}
                >
                  <View className="flex-row items-center">
                    <Ionicons
                      name={item.icon as any}
                      size={22}
                      color={colors.text}
                      style={{ marginRight: 14 }}
                    />
                    <Text className="text-[15px] text-text font-medium">{item.label}</Text>
                  </View>
                  <View className="flex-row items-center">
                    {"count" in item && !!item.count && (
                      <Text className="text-textSecondary text-[14px] mr-2">{item.count}</Text>
                    )}
                    {"badge" in item && !!item.badge && (
                      <View
                        style={{
                          backgroundColor: "#EF4444",
                          borderRadius: 100,
                          minWidth: 18,
                          height: 18,
                          paddingHorizontal: 4,
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 6,
                        }}
                      >
                        <Text style={{ color: "white", fontSize: 11, fontWeight: "700" }}>
                          {item.badge}
                        </Text>
                      </View>
                    )}
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Cerrar sesión */}
        <TouchableOpacity
          onPress={logout}
          activeOpacity={0.8}
          className="mx-6 mt-8 py-3 rounded-2xl items-center border"
          style={{
            backgroundColor: isDark ? "rgba(248,113,113,0.12)" : "#FEF2F2",
            borderColor: isDark ? "rgba(248,113,113,0.35)" : "#FEE2E2",
          }}
        >
          <Text className="font-semibold text-[16px]" style={{ color: colors.error }}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
