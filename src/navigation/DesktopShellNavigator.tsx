// src/navigation/DesktopShellNavigator.tsx
import React, { useCallback, useState, useEffect } from "react";
import { View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { CommonActions } from "@react-navigation/native";

import { useAuth } from "../context/AuthContext";

import DashboardScreen from "../screens/Desktop/dashboard/DashboardScreen";
import RegisterScreen from "../screens/Desktop/register/RegisterScreen";
import TripsHomeDesktopScreen from "../screens/Desktop/travel/TripsHomeDesktopScreen";
import DesktopInvestmentsScreen from "../screens/Desktop/investments/DesktopInvestmentsScreen";
import DesktopInvestmentDetailScreen from "../screens/Desktop/investments/DesktopInvestmentDetailScreen";
import GoalsScreen from "../screens/Mobile/finances/goals/GoalsScreen";
import GoalDetailScreen from "../screens/Mobile/finances/goals/GoalDetailScreen";
import GoalFormScreen from "../screens/Mobile/finances/goals/GoalFormScreen";
import GoalAllocationsScreen from "../screens/Mobile/finances/goals/GoalAllocationsScreen";
import GoalManualEntryFormScreen from "../screens/Mobile/finances/goals/GoalManualEntryFormScreen";

import CreateTransactionModal from "../components/CreateTransactionModal";
import {
  CreateTxModalProvider,
  CreateTxPrefill,
  EditTxData,
  useCreateTxModal,
} from "../context/CreateTxModalContext";
import { readQuickAddFromSession, clearQuickAddFromSession, fetchCategorySuggestion } from "../utils/quickAdd";

import DesktopSidebar from "../components/DesktopSidebar";
import TripDetailDesktopScreen from "../screens/Desktop/travel/TripDetailDesktopScreen";

import ProjectsScreen from "../screens/Mobile/finances/projects/ProjectsScreen";
import ProjectFormScreen from "../screens/Mobile/finances/projects/ProjectFormScreen";
import ProjectDetailScreen from "../screens/Mobile/finances/projects/ProjectDetailScreen";
import ProjectManualEntryFormScreen from "../screens/Mobile/finances/projects/ProjectManualEntryFormScreen";
import type { ProjectDetail, ProjectManualEntry, ProjectPartner } from "../types/project";

type DesktopRouteKey =
  | "dashboard"
  | "registre"
  | "profile"
  | "travels"
  | "budgets"
  | "debts"
  | "goals"
  | "investments"
  | "Projects"
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
  GoalDetail: { goalId: number };
  GoalForm: { goalId?: number } | undefined;
  GoalAllocations: { goalId: number };
  GoalManualEntryForm: { goalId: number; entryId?: number };
  investments: undefined;
  Projects: undefined;
  ProjectForm: { editProject?: ProjectDetail } | undefined;
  ProjectDetail: { projectId: number; openTxSelector?: boolean };
  ProjectManualEntryForm: { projectId: number; partners?: ProjectPartner[]; editEntry?: ProjectManualEntry };
  reports: undefined;
  settings: undefined;
  TripDetailDesktop: { tripId: number }; // ✅ AÑADIR
  DesktopInvestmentDetail: { assetId: number };
};

const Stack = createNativeStackNavigator<DesktopStackParamList>();
const EmptyScreen = () => <View style={{ flex: 1, backgroundColor: "#F3F7FC" }} />;

const UI = { bg: "#F3F7FC" };

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


  const [isCreateTxOpen, setIsCreateTxOpen] = useState(false);
  const [createTxPrefill, setCreateTxPrefill] = useState<CreateTxPrefill | undefined>(undefined);
  const [editTx, setEditTx] = useState<EditTxData | null>(null);

  const openCreateTx = useCallback((prefill?: CreateTxPrefill) => {
    setEditTx(null);
    setCreateTxPrefill(prefill);
    setIsCreateTxOpen(true);
  }, []);

  useEffect(() => {
    const params = readQuickAddFromSession();
    if (!params) return;
    clearQuickAddFromSession();
    let cancelled = false;
    const id = setTimeout(async () => {
      const suggestion = await fetchCategorySuggestion(params.merchant);
      if (cancelled) return;
      openCreateTx({
        amount: params.amount,
        currency: params.currency ?? undefined,
        description: params.merchant,
        cardName: params.cardName,
        quickAddId: params.qid,
        categoryId: suggestion?.categoryId,
        subcategoryId: suggestion?.subcategoryId ?? undefined,
      });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [openCreateTx]);

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

  const go = useCallback(
    (key: DesktopRouteKey) => {
      navigation.dispatch(CommonActions.navigate({ name: key }));
    },
    [navigation]
  );

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch (e) {
      console.error("Error al cerrar sesión", e);
    }
  }, [logout]);

  return (
    <CreateTxModalProvider value={{ openCreateTx, openEditTx, closeCreateTx }}>
      <View style={{ flex: 1, flexDirection: "row", backgroundColor: UI.bg }}>
        <DesktopSidebar
          activeRoute={routeKey}
          user={user}
          onNavigate={(key) => go(key as DesktopRouteKey)}
          onCreate={() => openCreateTx()}
          onLogout={handleLogout}
        />

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
      name === "DesktopInvestmentDetail"
        ? "investments"
        : name === "TripsDetailDesktop"
        ? "travels"
        : name.startsWith("Project") ? "Projects"
        : name.startsWith("Goal") ? "goals"
        : (name as DesktopRouteKey);

    return (
      <DesktopShellLayout navigation={props.navigation} routeKey={routeKey}>
        <Component {...props} />
      </DesktopShellLayout>
    );
  };
}

const DesktopProjectsScreen = (props: any) => <ProjectsScreen {...props} isPinnedModuleTab />;
const DesktopProjectDetailScreen = (props: any) => {
  const { openEditTx } = useCreateTxModal();
  return <ProjectDetailScreen {...props} onEditTransaction={openEditTx} />;
};

const DesktopGoalsScreen = (props: any) => <GoalsScreen {...props} isDesktop />;

export default function DesktopShellNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: UI.bg } }}>
      <Stack.Screen name="dashboard" component={withDesktopShell(DashboardScreen)} />
      <Stack.Screen name="registre" component={withDesktopShell(RegisterScreen)} />
      <Stack.Screen name="profile" component={withDesktopShell(EmptyScreen)} />
      <Stack.Screen name="travels" component={withDesktopShell(TripsHomeDesktopScreen)} />
      <Stack.Screen name="budgets" component={withDesktopShell(EmptyScreen)} />
      <Stack.Screen name="debts" component={withDesktopShell(EmptyScreen)} />
      <Stack.Screen name="goals" component={withDesktopShell(DesktopGoalsScreen)} />
      <Stack.Screen name="GoalDetail" component={withDesktopShell(GoalDetailScreen)} />
      <Stack.Screen name="GoalForm" component={withDesktopShell(GoalFormScreen)} />
      <Stack.Screen name="GoalAllocations" component={withDesktopShell(GoalAllocationsScreen)} />
      <Stack.Screen name="GoalManualEntryForm" component={withDesktopShell(GoalManualEntryFormScreen)} />
      <Stack.Screen name="investments" component={withDesktopShell(DesktopInvestmentsScreen)} />
      <Stack.Screen name="DesktopInvestmentDetail" component={withDesktopShell(DesktopInvestmentDetailScreen)} />
      <Stack.Screen name="TripDetailDesktop" component={withDesktopShell(TripDetailDesktopScreen)} />
      <Stack.Screen name="Projects" component={withDesktopShell(DesktopProjectsScreen)} />
      <Stack.Screen name="ProjectForm" component={withDesktopShell(ProjectFormScreen)} />
      <Stack.Screen name="ProjectDetail" component={withDesktopShell(DesktopProjectDetailScreen)} />
      <Stack.Screen name="ProjectManualEntryForm" component={withDesktopShell(ProjectManualEntryFormScreen)} />
      <Stack.Screen name="reports" component={withDesktopShell(EmptyScreen)} />
      <Stack.Screen name="settings" component={withDesktopShell(EmptyScreen)} />
    </Stack.Navigator>
  );
}
