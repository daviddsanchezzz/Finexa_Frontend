// src/navigation/DesktopShellNavigator.tsx
import React, { useMemo, useCallback, useState } from "react";
import { View, Text, ScrollView, Image, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { CommonActions } from "@react-navigation/native";

import { useAuth } from "../context/AuthContext";
import { textStyles } from "../theme/typography";

import DashboardScreen from "../screens/Desktop/dashboard/DashboardScreen";
import RegisterScreen from "../screens/Desktop/register/RegisterScreen";
import TripsHomeDesktopScreen from "../screens/Desktop/travel/TripsHomeDesktopScreen";
import DesktopInvestmentsScreen from "../screens/Desktop/investments/DesktopInvestmentsScreen";
import DesktopInvestmentDetailScreen from "../screens/Desktop/investments/DesktopInvestmentDetailScreen";

import CreateTransactionModal from "../components/CreateTransactionModal";
import {
  CreateTxModalProvider,
  CreateTxPrefill,
  EditTxData,
} from "../context/CreateTxModalContext";

import InitialsAvatar from "../components/InitialsAvatar";

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

type PressableStateWeb = { pressed: boolean; hovered?: boolean; focused?: boolean };

const Stack = createNativeStackNavigator<DesktopStackParamList>();
const EmptyScreen = () => <View style={{ flex: 1, backgroundColor: "#F8FAFC" }} />;

/** UI constants (más “black” como la referencia) */
const UI = {
  bg: "#F8FAFC",
  surface: "#FFFFFF",
  border: "#E2E8F0",

  // “negro” pro
  text: "#0B1220",
  muted: "#6B7280",
  muted2: "#9CA3AF",

  // tu primario (se usa en activo)
  primary: "#2563EB",

  // estados
  hover: "rgba(15,23,42,0.04)",
  activeBg: "rgba(15,23,42,0.08)",

  radius: 12,
  itemH: 40,
  padX: 12,
};

function DesktopShellLayout({
  children,
  navigation,
  routeKey,
}: {
  children: React.ReactNode;
  navigation: any;
  routeKey: DesktopRouteKey;
}) {
  const { user, logout } = useAuth();

  const [collapsed, setCollapsed] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

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

  // ✅ LISTA PLANA (sin secciones)
  const items: NavItem[] = useMemo(
    () => [
      { key: "dashboard", label: "Dashboard", icon: "grid-outline" },
      { key: "registre", label: "Registros", icon: "file-tray-full-outline" },
      { key: "investments", label: "Inversiones", icon: "trending-up-outline" },
      { key: "budgets", label: "Presupuestos", icon: "pie-chart-outline" },
      { key: "debts", label: "Deudas", icon: "receipt-outline" },
      { key: "goals", label: "Objetivos", icon: "flag-outline" },
      { key: "travels", label: "Viajes", icon: "airplane-outline" },
      { key: "reports", label: "Reportes", icon: "document-text-outline" },
    ],
    []
  );

  const go = useCallback(
    (key: DesktopRouteKey) => {
      setProfileMenuOpen(false);
      navigation.dispatch(CommonActions.navigate({ name: key }));
    },
    [navigation]
  );

  const handleLogout = useCallback(async () => {
    try {
      setProfileMenuOpen(false);
      await logout();
    } catch (e) {
      console.error("Error al cerrar sesión", e);
    }
  }, [logout]);

  /** Ghost icon button (sin borde permanente) */
  const GhostIconButton = ({
    icon,
    onPress,
    show,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    show?: boolean;
  }) => {
    if (show === false) return null;

    return (
      <Pressable
        onPress={onPress}
        style={(s: PressableStateWeb) => ({
          width: 34,
          height: 34,
          borderRadius: 10,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: s.hovered ? UI.hover : "transparent",
        })}
      >
        <Ionicons name={icon} size={18} color={UI.text} />
      </Pressable>
    );
  };

  const NavRow = ({ item, isActive }: { item: NavItem; isActive: boolean }) => {
    const [hover, setHover] = useState(false);

    // ✅ estilo “negro” como referencia:
    // - texto e icono casi negro incluso no activo
    // - activo: bg suave + un pelín más oscuro
    const bg = isActive ? UI.activeBg : hover ? UI.hover : "transparent";
    const fg = UI.text;
    const ic = UI.text;

    return (
      <Pressable
        onPress={() => go(item.key)}
        onHoverIn={() => setHover(true)}
        onHoverOut={() => setHover(false)}
        style={{
          height: UI.itemH,
          borderRadius: UI.radius,
          paddingHorizontal: UI.padX,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          backgroundColor: bg,
        }}
      >
        <Ionicons name={item.icon} size={23} color={ic} />

        {!collapsed && (
          <Text
            style={[
              textStyles.body,
              {
                marginLeft: 14,
                fontSize: 16,
                fontWeight: "600",
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

  const FooterRow = ({
    label,
    icon,
    active,
    onPress,
  }: {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    active: boolean;
    onPress: () => void;
  }) => {
    const [hover, setHover] = useState(false);

    const bg = active ? UI.activeBg : hover ? UI.hover : "transparent";
    const fg = UI.text;
    const ic = UI.text;

    return (
      <Pressable
        onPress={onPress}
        onHoverIn={() => setHover(true)}
        onHoverOut={() => setHover(false)}
        style={{
          height: UI.itemH,
          borderRadius: UI.radius,
          paddingHorizontal: UI.padX,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          backgroundColor: bg,
        }}
      >
        <Ionicons name={icon} size={18} color={ic} />

        {!collapsed && (
          <Text
            style={[textStyles.body, { marginLeft: 10, fontSize: 13, fontWeight: "600", color: fg }]}
            numberOfLines={1}
          >
            {label}
          </Text>
        )}
      </Pressable>
    );
  };

  return (
    <CreateTxModalProvider value={{ openCreateTx, openEditTx, closeCreateTx }}>
      <View style={{ flex: 1, flexDirection: "row", backgroundColor: UI.bg }}>
        {/* ===== Sidebar ===== */}
        <View
          style={{
            width: collapsed ? 72 : 256,
            backgroundColor: UI.surface,
            borderRightWidth: 1,
            borderRightColor: UI.border,
            paddingHorizontal: 12,
            paddingTop: 12,
            paddingBottom: 12,
          }}
        >
          {/* Header: logo + actions */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 10,
              gap: 6,
            }}
          >
            {/* Logo */}
            <View
              style={{
                width: 36,
                height: 36,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Image
                source={require("../../assets/finex_logo.png")}
                style={{ width: 28, height: 28, resizeMode: "contain" }}
              />
            </View>

            {/* spacer */}
            <View style={{ flex: 1 }} />

            {/* Collapse */}
            <GhostIconButton
              icon={collapsed ? "chevron-forward" : "chevron-back"}
              onPress={() => {
                setProfileMenuOpen(false);
                setCollapsed((v) => !v);
              }}
            />

            {/* Plus (solo abierto) */}
            {!collapsed && <GhostIconButton icon="add" onPress={() => openCreateTx()} />}
          </View>

          {/* Menu */}
<ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 12 }}>
  <View style={{ gap: 12 }}>
    {items.map((item) => (
      <NavRow
        key={item.key}
        item={item}
        isActive={routeKey === item.key}
      />
    ))}
  </View>
</ScrollView>

          {/* Footer */}
          <View style={{ borderTopWidth: 1, borderTopColor: UI.border, paddingTop: 10, gap: 6 }}>
            <FooterRow
              label="Ajustes"
              icon="settings-outline"
              active={routeKey === "settings"}
              onPress={() => go("settings")}
            />

            {/* Profile row + dropdown */}
            <View style={{ position: "relative" }}>
              <Pressable
                onPress={() => {
                  if (!collapsed) setProfileMenuOpen((v) => !v);
                }}
                style={(s: PressableStateWeb) => ({
                  height: 52,
                  borderRadius: UI.radius,
                  paddingHorizontal: UI.padX,
                  backgroundColor: s.hovered ? UI.hover : "transparent",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                })}
              >
                <InitialsAvatar name={user?.name} email={user?.email} size={32} />

                {!collapsed && (
                  <>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[textStyles.body, { fontSize: 13, fontWeight: "600", color: UI.text }]}
                        numberOfLines={1}
                      >
                        {user?.name ?? "Mi cuenta"}
                      </Text>

                      <Text style={[textStyles.caption, { fontSize: 11, color: UI.muted }]} numberOfLines={1}>
                        {user?.email ?? ""}
                      </Text>
                    </View>

                    <Ionicons
                      name={profileMenuOpen ? "chevron-up" : "chevron-down"}
                      size={16}
                      color={UI.muted2}
                    />
                  </>
                )}
              </Pressable>

              {/* Dropdown */}
              {!collapsed && profileMenuOpen && (
                <>
                  {/* overlay cerrar (web) */}
                  {Platform.OS === "web" && (
                    <Pressable
                      onPress={() => setProfileMenuOpen(false)}
                      style={{
                        position: "fixed" as any,
                        inset: 0,
                        backgroundColor: "transparent",
                        zIndex: 999,
                      }}
                    />
                  )}

                  <View
                    style={{
                      position: "absolute",
                      bottom: 58,
                      left: 0,
                      right: 0,
                      backgroundColor: UI.surface,
                      borderRadius: UI.radius,
                      borderWidth: 1,
                      borderColor: UI.border,
                      shadowColor: "#000",
                      shadowOpacity: 0.10,
                      shadowRadius: 18,
                      shadowOffset: { width: 0, height: 12 },
                      overflow: "hidden",
                      zIndex: 1000,
                    }}
                  >
                    <Pressable
                      onPress={handleLogout}
                      style={(s: PressableStateWeb) => ({
                        height: 44,
                        paddingHorizontal: 12,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                        backgroundColor: s.hovered ? UI.hover : UI.surface,
                      })}
                    >
                      <Ionicons name="log-out-outline" size={18} color={UI.text} />
                      <Text style={[textStyles.body, { fontSize: 13, fontWeight: "600", color: UI.text }]}>
                        Cerrar sesión
                      </Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>

        {/* ===== Main ===== */}
        <View style={{ flex: 1 }}>{children}</View>

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
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: UI.bg } }}>
      <Stack.Screen name="dashboard" component={withDesktopShell(DashboardScreen)} />
      <Stack.Screen name="registre" component={withDesktopShell(RegisterScreen)} />
      <Stack.Screen name="profile" component={withDesktopShell(EmptyScreen)} />
      <Stack.Screen name="travels" component={withDesktopShell(TripsHomeDesktopScreen)} />
      <Stack.Screen name="budgets" component={withDesktopShell(EmptyScreen)} />
      <Stack.Screen name="debts" component={withDesktopShell(EmptyScreen)} />
      <Stack.Screen name="goals" component={withDesktopShell(EmptyScreen)} />
      <Stack.Screen name="investments" component={withDesktopShell(DesktopInvestmentsScreen)} />
      <Stack.Screen name="DesktopInvestmentDetail" component={withDesktopShell(DesktopInvestmentDetailScreen)} />
      <Stack.Screen name="reports" component={withDesktopShell(EmptyScreen)} />
      <Stack.Screen name="settings" component={withDesktopShell(EmptyScreen)} />
    </Stack.Navigator>
  );
}
