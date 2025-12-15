import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import MainTabs from "./MainTabs";
import ProfileScreen from "../screens/profile/ProfileScreen";
import CategoriesScreen from "../screens/categories/CategoriesScreen"; 

import { ActivityIndicator, View } from "react-native";
import WalletsScreen from "../screens/wallets/WalletsScreen";
import HomeScreen from "../screens/home/HomeScreen";
import CategoryTransactionsScreen from "../screens/stats/CategoryTransactionsCreen";
import ReconcileAccountsScreen from "../screens/profile/ReconcileAccountsCreen";
import TransfersScreen from "../screens/wallets/TransferScreen";
import EditMonthScreen from "../screens/stats/EditMonthScreen";
import BudgetCreateScreen from "../screens/finances/budgets/BudgetCreateScreen";
import BudgetTransactionsScreen from "../screens/finances/budgets/BudgetTransactionsScreen";
import DebtDetailScreen from "../screens/finances/debts/DebtDetailScreen";
import DebtFormScreen from "../screens/finances/debts/DebtFormScreen";
import DebtsHomeScreen from "../screens/finances/debts/DebtsScreen";
import BudgetsHomeScreen from "../screens/finances/budgets/BudgetsScreen";
import GoalsHomeScreen from "../screens/finances/goals/GoalsScreen";
import TripsHomeScreen from "../screens/finances/travels/TravelsScreen";
import TripFormScreen from "../screens/finances/travels/TravelFormScreen";
import TripDetailScreen from "../screens/finances/travels/TripDetailScreen";
import TripPlanFormScreen from "../screens/finances/travels/TripPlanFormScreen";
import RecurringTransactionsScreen from "../screens/finances/RecurringTransactions/RecurringTransactionsScreen";
import InvestmentsScreen from "../screens/finances/invests/InvestmentsScreen";
import InvestmentFormScreen from "../screens/finances/invests/InvestmentFormScreen";
import InvestmentValuationScreen from "../screens/finances/invests/InvestmentValuationScreen";
import InvestmentDetailScreen from "../screens/finances/invests/InvestmentDetailScreen";
import ReportsScreen from "../screens/reports/ReportsScreen";
import ReportsPdfViewerScreen from "../screens/reports/ReportsPdfViewerScreen";

export type RootStackParamList = {
  MainTabs: undefined;
  Profile: undefined;
  Categories: undefined;
  Login: undefined;
  Register: undefined;
  Wallets: undefined;
  CategoryTransactions: undefined;
  ReconcileAccounts: undefined;
  Transfers: undefined;
  EditMonth: undefined;
  BudgetCreate: undefined;
  BudgetTransactions: undefined;
  DebtDetail: undefined;
  DebtForm: undefined;
  Debts: undefined;
  Budgets: undefined;
  Goals: undefined;
  Trips: undefined;
  TripForm: undefined;
  TripDetail: undefined;
  TripPlanForm: undefined;
  RecurringTransactions: undefined;
  Investments: undefined;
  InvestmentForm: undefined;
  InvestmentValuation: undefined;
  InvestmentDetail: undefined;
  Reports: undefined;
  ReportsPdfViewer: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        // 🔒 Rutas privadas
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Categories" component={CategoriesScreen} />
          <Stack.Screen name="Wallets" component={WalletsScreen} />
          <Stack.Screen name="CategoryTransactions" component={CategoryTransactionsScreen} />
          <Stack.Screen name="ReconcileAccounts" component={ReconcileAccountsScreen} />
          <Stack.Screen name="Transfers" component={TransfersScreen} />
          <Stack.Screen name="EditMonth" component={EditMonthScreen} />
          <Stack.Screen name="BudgetCreate" component={BudgetCreateScreen} />
          <Stack.Screen name="BudgetTransactions" component={BudgetTransactionsScreen} />
          <Stack.Screen name="DebtDetail" component={DebtDetailScreen} />
          <Stack.Screen name="DebtForm" component={DebtFormScreen} />
          <Stack.Screen name="Debts" component={DebtsHomeScreen} />
          <Stack.Screen name="Budgets" component={BudgetsHomeScreen} />
          <Stack.Screen name="Goals" component={GoalsHomeScreen} />
          <Stack.Screen name="Trips" component={TripsHomeScreen} />
          <Stack.Screen name="TripForm" component={TripFormScreen} />
          <Stack.Screen name="TripDetail" component={TripDetailScreen} />
          <Stack.Screen name="TripPlanForm" component={TripPlanFormScreen} />
          <Stack.Screen name="RecurringTransactions" component={RecurringTransactionsScreen} />
          <Stack.Screen name="Investments" component={InvestmentsScreen} />
          <Stack.Screen name="InvestmentForm" component={InvestmentFormScreen} />
          <Stack.Screen name="InvestmentValuation" component={InvestmentValuationScreen} />
          <Stack.Screen name="InvestmentDetail" component={InvestmentDetailScreen} />
          <Stack.Screen name="Reports" component={ReportsScreen} />
          <Stack.Screen name="ReportsPdfViewer" component={ReportsPdfViewerScreen} />
        </>
      ) : (
        // 🔓 Rutas públicas
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
