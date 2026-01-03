// src/navigation/DesktopShellNavigator.tsx
// Mejora: selección del menú lateral MÁS SIMPLE y MÁS CLARA.
// - Quitamos "caja" + doble fondo + borde del item activo.
// - Deja SOLO: una barra izquierda (accent) + texto/icono más oscuro.
// - En hover (web) un fondo muy suave.
// - Mantiene tu colapsado.
// - No cambia navegación ni estructura.

// ✅ Nota: Requiere Pressable (para hover en web). En móvil funciona igual.
import React, { useMemo, useCallback, useState } from "react";
import { View, Text, ScrollView, Image, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { CommonActions } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/theme";
import DashboardScreen from "../screens/Desktop/dashboard/DashboardScreen";

import CreateTransactionModal from "../components/CreateTransactionModal";
import { CreateTxModalProvider } from "../context/CreateTxModalContext";
import RegisterScreen from "../screens/Desktop/register/RegisterScreen";
import DesktopInvestmentsScreen from "../screens/Desktop/investments/DesktopInvestmentsScreen";

import { textStyles } from "../theme/typography";

type DesktopRouteKey =
  | "dashboard"
  | "registre"
  | "profile"
  | "travels"
  | "budgets"
  | "debts"
  | "goals"
  | "investments"
  | "reports"
  | "settings";

export type DesktopStackParamList = {
  dashboard: undefined;
  registre: undefined;
  profile: undefined;
  travels: undefined;
  budgets: undefined;
  debts: undefined;
  goals: undefined;
  investments: undefined;
  reports: undefined;
  settings: undefined;
};

type NavItem = {
  key: DesktopRouteKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const Stack = createNativeStackNavigator<DesktopStackParamList>();
const EmptyScreen = () => <View style={{ flex: 1, backgroundColor: "#F8FAFC" }} />;

function DesktopShellLayout({
  children,
  navigation,
  routeKey,
}: {
  children: React.ReactNode;
  navigation: any;
  routeKey: DesktopRouteKey;
}) {
  const { logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const [isCreateTxOpen, setIsCreateTxOpen] = useState(false);
  const [createTxPrefill, setCreateTxPrefill] = useState<
    | {
        walletId?: number;
        type?: "expense" | "income" | "transfer";
        date?: string;
        assetId?: number;
      }
    | undefined
  >(undefined);

  const openCreateTx = useCallback((args?: typeof createTxPrefill) => {
    setCreateTxPrefill(args);
    setIsCreateTxOpen(true);
  }, []);

  const closeCreateTx = useCallback(() => {
    setIsCreateTxOpen(false);
    setCreateTxPrefill(undefined);
  }, []);

  const navItems: NavItem[] = useMemo(
    () => [
      { key: "dashboard", label: "Dashboard", icon: "grid-outline" },
      { key: "registre", label: "Registros", icon: "file-tray-full-outline" },
      { key: "investments", label: "Inversiones", icon: "trending-up-outline" },
      { key: "budgets", label: "Presupuestos", icon: "pie-chart-outline" },
      { key: "debts", label: "Deudas", icon: "receipt-outline" },
      { key: "goals", label: "Objetivos", icon: "flag-outline" },
      { key: "travels", label: "Viajes", icon: "airplane-outline" },
      { key: "reports", label: "Reportes", icon: "document-text-outline" },
      { key: "profile", label: "Perfil", icon: "person-outline" },
      { key: "settings", label: "Ajustes", icon: "settings-outline" },
    ],
    []
  );

  const activeLabel = navItems.find((n) => n.key === routeKey)?.label ?? "Finexa";

  const go = useCallback(
    (key: DesktopRouteKey) => navigation.dispatch(CommonActions.navigate({ name: key })),
    [navigation]
  );

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch (e) {
      console.error("Error al cerrar sesión", e);
    }
  }, [logout]);

  // ✅ Componente de item SIMPLE
  const NavRow = ({
    item,
    isActive,
  }: {
    item: NavItem;
    isActive: boolean;
  }) => {
    const [hover, setHover] = useState(false);

    // Look “finanzas”: selección sobria -> barra + tipografía, sin cajas.
    const fg = isActive ? "#0F172A" : "#475569";
    const icon = isActive ? "#0F172A" : "#64748B";
    const bg = hover && !isActive ? "rgba(15,23,42,0.04)" : "transparent";

    return (
      <Pressable
        onPress={() => go(item.key)}
        onHoverIn={() => setHover(true)}
        onHoverOut={() => setHover(false)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderRadius: 10,
          paddingVertical: 9,
          paddingHorizontal: collapsed ? 10 : 12,
          marginBottom: 4,
          backgroundColor: bg,
        }}
      >
        {/* Indicador activo: SOLO una barra */}
        <View
          style={{
            width: 3,
            height: 22,
            borderRadius: 999,
            backgroundColor: isActive ? colors.primary : "transparent",
            marginRight: collapsed ? 0 : 10,
          }}
        />

        <Ionicons name={item.icon} size={18} color={icon} />

        {!collapsed && (
          <Text
            style={[
              textStyles.body,
              {
                marginLeft: 10,
                fontSize: 13,
                fontWeight: isActive ? "800" : "700",
                color: fg,
              },
            ]}
            numberOfLines={1}
          >
            {item.label}
          </Text>
        )}
      </Pressable>
    );
  };

  return (
    <CreateTxModalProvider value={{ openCreateTx, closeCreateTx }}>
      <View style={{ flex: 1, flexDirection: "row", backgroundColor: "#F8FAFC" }}>
        {/* Sidebar */}
        <View
          style={{
            width: collapsed ? 84 : 220,
            backgroundColor: "white",
            borderRightWidth: 1,
            borderRightColor: "#E5E7EB",
            padding: 12,
          }}
        >
          {/* Header sidebar */}
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "#E5E7EB",
                backgroundColor: "#F8FAFC",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                marginRight: collapsed ? 0 : 10,
              }}
            >
              <Image
                source={require("../../assets/finex_logo.png")}
                style={{ width: 22, height: 22, resizeMode: "contain" }}
              />
            </View>

            {!collapsed && (
              <View style={{ flex: 1 }}>
                {/* Branding: lo dejas igual */}
                <Text style={{ fontSize: 14, fontWeight: "900", color: "#0F172A" }}>Finexa</Text>
              </View>
            )}

            <Pressable
              onPress={() => setCollapsed((v) => !v)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "#E5E7EB",
                backgroundColor: "white",
                alignItems: "center",
                justifyContent: "center",
                marginLeft: collapsed ? 8 : 0,
              }}
            >
              <Ionicons name={collapsed ? "chevron-forward" : "chevron-back"} size={18} color="#0F172A" />
            </Pressable>
          </View>

          {/* Menú */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 12 }}>
            {navItems.map((item) => {
              const isActive = routeKey === item.key;
              return <NavRow key={item.key} item={item} isActive={isActive} />;
            })}
          </ScrollView>

          {/* Logout (sobrio, sin caja pesada) */}
          <Pressable
            onPress={handleLogout}
            style={({ hovered }) => ({
              borderRadius: 10,
              borderWidth: 1,
              borderColor: "#E5E7EB",
              backgroundColor: hovered ? "rgba(15,23,42,0.04)" : "white",
              paddingVertical: 10,
              paddingHorizontal: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
              gap: 8,
            })}
          >
            <Ionicons name="log-out-outline" size={18} color="#0F172A" />
            {!collapsed && <Text style={[textStyles.label, { fontSize: 12, fontWeight: "800" }]}>Cerrar sesión</Text>}
          </Pressable>
        </View>

        {/* Main */}
        <View style={{ flex: 1 }}>
          {/* Topbar */}
          <View
            style={{
              height: 60,
              backgroundColor: "white",
              borderBottomWidth: 1,
              borderBottomColor: "#E5E7EB",
              paddingHorizontal: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={[textStyles.h2, { fontSize: 16, fontWeight: "800" }]}>{activeLabel}</Text>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Pressable
                onPress={() => openCreateTx()}
                style={({ hovered }) => ({
                  height: 40,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: "rgba(15,23,42,0.14)",
                  backgroundColor: hovered ? "rgba(37,99,235,0.06)" : "white",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                })}
              >
                <Ionicons name="add" size={18} color={colors.primary} />
                <Text style={[textStyles.label, { fontWeight: "800" }]}>Nueva transacción</Text>
              </Pressable>

              <Pressable
                style={({ hovered }) => ({
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  backgroundColor: hovered ? "rgba(15,23,42,0.04)" : "white",
                  alignItems: "center",
                  justifyContent: "center",
                })}
              >
                <Ionicons name="search-outline" size={18} color="#0F172A" />
              </Pressable>

              <Pressable
                style={({ hovered }) => ({
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  backgroundColor: hovered ? "rgba(15,23,42,0.04)" : "white",
                  alignItems: "center",
                  justifyContent: "center",
                })}
              >
                <Ionicons name="notifications-outline" size={18} color={colors.primary} />
              </Pressable>
            </View>
          </View>

          <View style={{ flex: 1 }}>{children}</View>
        </View>

        <CreateTransactionModal
          visible={isCreateTxOpen}
          onClose={closeCreateTx}
          prefill={createTxPrefill}
          onSaved={() => {}}
        />
      </View>
    </CreateTxModalProvider>
  );
}

function withDesktopShell(Component: React.ComponentType<any>) {
  return function Wrapped(props: any) {
    const routeKey = props.route?.name as DesktopRouteKey;
    return (
      <DesktopShellLayout navigation={props.navigation} routeKey={routeKey}>
        <Component {...props} />
      </DesktopShellLayout>
    );
  };
}

export default function DesktopShellNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#F8FAFC" } }}>
      <Stack.Screen name="dashboard" component={withDesktopShell(DashboardScreen)} />
      <Stack.Screen name="registre" component={withDesktopShell(RegisterScreen)} />
      <Stack.Screen name="profile" component={withDesktopShell(EmptyScreen)} />
      <Stack.Screen name="travels" component={withDesktopShell(EmptyScreen)} />
      <Stack.Screen name="budgets" component={withDesktopShell(EmptyScreen)} />
      <Stack.Screen name="debts" component={withDesktopShell(EmptyScreen)} />
      <Stack.Screen name="goals" component={withDesktopShell(EmptyScreen)} />
      <Stack.Screen name="investments" component={withDesktopShell(DesktopInvestmentsScreen)} />
      <Stack.Screen name="reports" component={withDesktopShell(EmptyScreen)} />
      <Stack.Screen name="settings" component={withDesktopShell(EmptyScreen)} />
    </Stack.Navigator>
  );
}
