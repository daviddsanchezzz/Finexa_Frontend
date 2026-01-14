// src/navigation/DesktopShellNavigator.tsx
import React, { useMemo, useCallback, useState } from "react";
import { View, Text, ScrollView, Image, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { CommonActions } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";

import DashboardScreen from "../screens/Desktop/dashboard/DashboardScreen";
import RegisterScreen from "../screens/Desktop/register/RegisterScreen";
import DesktopInvestmentsScreen from "../screens/Desktop/investments/DesktopInvestmentsScreen";
import DesktopInvestmentDetailScreen from "../screens/Desktop/investments/DesktopInvestmentDetailScreen";

import CreateTransactionModal from "../components/CreateTransactionModal";
import {
  CreateTxModalProvider,
  CreateTxPrefill,
  EditTxData,
} from "../context/CreateTxModalContext";
import { textStyles } from "../theme/typography";
import TripsHomeDesktopScreen from "../screens/Desktop/travel/TripsHomeDesktopScreen";

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

  DesktopInvestmentDetail: { assetId: number };
};

type NavItem = {
  key: DesktopRouteKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

type PressableStateWeb = { pressed: boolean; hovered?: boolean; focused?: boolean };

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

  const [editTx, setEditTx] = useState<EditTxData | null>(null);

  const openCreateTx = useCallback((prefill?: CreateTxPrefill) => {
    setEditTx(null);
    setCreateTxPrefill(prefill);
    setIsCreateTxOpen(true);
  }, []);

  const closeCreateTx = useCallback(() => {
    setIsCreateTxOpen(false);
    setCreateTxPrefill(undefined);
    setEditTx(null);
  }, []);

  const openEditTx = useCallback((tx: EditTxData) => {
    setEditTx(tx);

    setCreateTxPrefill({
      walletId: tx.wallet?.id,
      type: tx.type,
      date: tx.date,
      assetId: tx.asset?.id ?? undefined,
    });

    setIsCreateTxOpen(true);
  }, []);

  const sections: NavSection[] = useMemo(
    () => [
      {
        title: "",
        items: [{ key: "dashboard", label: "Dashboard", icon: "grid-outline" }],
      },
      {
        title: "GESTIÓN",
        items: [
          { key: "registre", label: "Registros", icon: "file-tray-full-outline" },
          { key: "investments", label: "Inversiones", icon: "trending-up-outline" },
          { key: "budgets", label: "Presupuestos", icon: "pie-chart-outline" },
          { key: "debts", label: "Deudas", icon: "receipt-outline" },
          { key: "goals", label: "Objetivos", icon: "flag-outline" },
          { key: "travels", label: "Viajes", icon: "airplane-outline" },
          { key: "reports", label: "Reportes", icon: "document-text-outline" },
        ],
      },
      {
        title: "CUENTA",
        items: [
          { key: "profile", label: "Perfil", icon: "person-outline" },
          { key: "settings", label: "Ajustes", icon: "settings-outline" },
        ],
      },
    ],
    []
  );

  const flatItems = useMemo(() => sections.flatMap((s) => s.items), [sections]);
  const activeLabel = flatItems.find((n) => n.key === routeKey)?.label ?? "Finexa";

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

  const NavRow = ({ item, isActive }: { item: NavItem; isActive: boolean }) => {
    const [hover, setHover] = useState(false);

    const bg = isActive ? "#F1F5F9" : hover ? "#F8FAFC" : "transparent";
    const fg = isActive ? "#0F172A" : "#64748B";
    const icon = isActive ? "#0F172A" : "#64748B";

    return (
      <Pressable
        onPress={() => go(item.key)}
        onHoverIn={() => setHover(true)}
        onHoverOut={() => setHover(false)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderRadius: 8,
          paddingVertical: 10,
          paddingHorizontal: collapsed ? 10 : 12,
          backgroundColor: bg,
        }}
      >
        <Ionicons name={item.icon} size={17} color={icon} />
        {!collapsed && (
          <Text
            style={[
              textStyles.body,
              {
                marginLeft: 10,
                fontSize: 12.5,
                fontWeight: isActive ? "800" : "600",
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
    <CreateTxModalProvider value={{ openCreateTx, openEditTx, closeCreateTx }}>
      <View style={{ flex: 1, flexDirection: "row", backgroundColor: "#F8FAFC" }}>
        {/* Sidebar */}
        <View
          style={{
            width: collapsed ? 76 : 240,
            backgroundColor: "white",
            borderRightWidth: 1,
            borderRightColor: "#E5E7EB",
            paddingHorizontal: 12,
            paddingTop: 12,
            paddingBottom: 12,
          }}
        >
          {/* Header sidebar */}
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                backgroundColor: "#F8FAFC",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                borderWidth: 1,
                borderColor: "#E5E7EB",
                marginRight: collapsed ? 0 : 10,
              }}
            >
              <Image
                source={require("../../assets/finex_logo.png")}
                style={{ width: 20, height: 20, resizeMode: "contain" }}
              />
            </View>

            {!collapsed && (
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "900", color: "#0F172A" }}>Finexa</Text>
              </View>
            )}

            <Pressable
              onPress={() => setCollapsed((v) => !v)}
              style={(s: PressableStateWeb) => ({
                width: 34,
                height: 34,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: "#E5E7EB",
                backgroundColor: s.hovered ? "#F8FAFC" : "white",
                alignItems: "center",
                justifyContent: "center",
                marginLeft: collapsed ? 8 : 0,
              })}
            >
              <Ionicons
                name={collapsed ? "chevron-forward" : "chevron-back"}
                size={18}
                color="#0F172A"
              />
            </Pressable>
          </View>

          {/* Menú */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 10 }}>
            {sections.map((section) => (
              <View key={section.title || "root"} style={{ marginBottom: 10 }}>
                {!!section.title && !collapsed && (
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "800",
                      color: "#94A3B8",
                      letterSpacing: 0.8,
                      marginTop: 8,
                      marginBottom: 6,
                      paddingHorizontal: 2,
                    }}
                  >
                    {section.title}
                  </Text>
                )}

                <View style={{ gap: 4 }}>
                  {section.items.map((item) => (
                    <NavRow key={item.key} item={item} isActive={routeKey === item.key} />
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Logout */}
          <View style={{ borderTopWidth: 1, borderTopColor: "#E5E7EB", paddingTop: 10 }}>
            <Pressable
              onPress={handleLogout}
              style={(s: PressableStateWeb) => ({
                borderRadius: 8,
                backgroundColor: s.hovered ? "#F8FAFC" : "transparent",
                paddingVertical: 10,
                paddingHorizontal: collapsed ? 10 : 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: collapsed ? "center" : "flex-start",
              })}
            >
              <Ionicons name="log-out-outline" size={17} color="#64748B" />
              {!collapsed && (
                <Text
                  style={[
                    textStyles.body,
                    { marginLeft: 10, fontSize: 14, fontWeight: "600", color: "#64748B" },
                  ]}
                >
                  Cerrar sesión
                </Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* Main */}
        <View style={{ flex: 1 }}>
          {/* Topbar */}
          <View
            style={{
              height: 56,
              backgroundColor: "white",
              borderBottomWidth: 1,
              borderBottomColor: "#E5E7EB",
              paddingHorizontal: 18,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={[textStyles.h2, { fontSize: 18, fontWeight: "700", color: "#0F172A" }]}>
              {activeLabel}
            </Text>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Pressable
                onPress={() => openCreateTx()}
                style={(s: PressableStateWeb) => ({
                  height: 34,
                  paddingHorizontal: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  backgroundColor: s.hovered ? "#F8FAFC" : "white",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                })}
              >
                <Ionicons name="add" size={18} color="#0F172A" />
                <Text style={[textStyles.body, { fontSize: 12.5, fontWeight: "600", color: "#0F172A" }]}>
                  Nueva transacción
                </Text>
              </Pressable>

              {[
                { name: "search-outline" as const, color: "#64748B" },
                { name: "notifications-outline" as const, color: "#64748B" },
              ].map((b) => (
                <Pressable
                  key={b.name}
                  style={(s: PressableStateWeb) => ({
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    backgroundColor: s.hovered ? "#F8FAFC" : "white",
                    alignItems: "center",
                    justifyContent: "center",
                  })}
                >
                  <Ionicons name={b.name} size={18} color={b.color} />
                </Pressable>
              ))}

              <Pressable
                style={(s: PressableStateWeb) => ({
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  backgroundColor: s.hovered ? "#F8FAFC" : "#F1F5F9",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                })}
              >
                <Ionicons name="person" size={18} color="#64748B" />
              </Pressable>
            </View>
          </View>

          <View style={{ flex: 1 }}>{children}</View>
        </View>

        <CreateTransactionModal
          visible={isCreateTxOpen}
          onClose={closeCreateTx}
          prefill={createTxPrefill}
          editData={editTx}
          onSaved={() => {}}
        />
      </View>
    </CreateTxModalProvider>
  );
}

function withDesktopShell(Component: React.ComponentType<any>) {
  return function Wrapped(props: any) {
    const name = props.route?.name as string;

    const routeKey: DesktopRouteKey =
      name === "DesktopInvestmentDetail" ? "investments" : (name as DesktopRouteKey);

    return (
      <DesktopShellLayout navigation={props.navigation} routeKey={routeKey}>
        <Component {...props} />
      </DesktopShellLayout>
    );
  };
}

export default function DesktopShellNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#F8FAFC" } }}
    >
      <Stack.Screen name="dashboard" component={withDesktopShell(DashboardScreen)} />
      <Stack.Screen name="registre" component={withDesktopShell(RegisterScreen)} />
      <Stack.Screen name="profile" component={withDesktopShell(EmptyScreen)} />
      <Stack.Screen name="travels" component={withDesktopShell(TripsHomeDesktopScreen)} />
      <Stack.Screen name="budgets" component={withDesktopShell(EmptyScreen)} />
      <Stack.Screen name="debts" component={withDesktopShell(EmptyScreen)} />
      <Stack.Screen name="goals" component={withDesktopShell(EmptyScreen)} />
      <Stack.Screen name="investments" component={withDesktopShell(DesktopInvestmentsScreen)} />
      <Stack.Screen
        name="DesktopInvestmentDetail"
        component={withDesktopShell(DesktopInvestmentDetailScreen)}
      />
      <Stack.Screen name="reports" component={withDesktopShell(EmptyScreen)} />
      <Stack.Screen name="settings" component={withDesktopShell(EmptyScreen)} />
    </Stack.Navigator>
  );
}
