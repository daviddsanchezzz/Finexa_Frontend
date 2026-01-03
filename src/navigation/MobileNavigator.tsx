import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import LoginScreen from "../screens/Mobile/auth/LoginScreen";
import RegisterScreen from "../screens/Mobile/auth/RegisterScreen";
import MainTabs from "./MainTabs";
import ProfileScreen from "../screens/Mobile/profile/ProfileScreen";
import CategoriesScreen from "../screens/Mobile/categories/CategoriesScreen";
import { ActivityIndicator, View } from "react-native";
import WalletsScreen from "../screens/Mobile/wallets/WalletsScreen";
import CategoryTransactionsScreen from "../screens/Mobile/stats/CategoryTransactionsCreen";
import ReconcileAccountsScreen from "../screens/Mobile/profile/ReconcileAccountsCreen";
import TransfersScreen from "../screens/Mobile/wallets/TransferScreen";
import EditMonthScreen from "../screens/Mobile/stats/EditMonthScreen";
import BudgetCreateScreen from "../screens/Mobile/finances/budgets/BudgetCreateScreen";
import BudgetTransactionsScreen from "../screens/Mobile/finances/budgets/BudgetTransactionsScreen";
import DebtDetailScreen from "../screens/Mobile/finances/debts/DebtDetailScreen";
import DebtFormScreen from "../screens/Mobile/finances/debts/DebtFormScreen";
import DebtsHomeScreen from "../screens/Mobile/finances/debts/DebtsScreen";
import BudgetsHomeScreen from "../screens/Mobile/finances/budgets/BudgetsScreen";
import GoalsHomeScreen from "../screens/Mobile/finances/goals/GoalsScreen";
import TripsHomeScreen from "../screens/Mobile/finances/travels/TravelsScreen";
import TripFormScreen from "../screens/Mobile/finances/travels/TravelFormScreen";
import TripDetailScreen from "../screens/Mobile/finances/travels/TripDetailScreen";
import TripPlanFormScreen from "../screens/Mobile/finances/travels/TripPlanFormScreen";
import RecurringTransactionsScreen from "../screens/Mobile/finances/RecurringTransactions/RecurringTransactionsScreen";
import InvestmentsScreen from "../screens/Mobile/finances/invests/InvestmentsScreen";
import InvestmentFormScreen from "../screens/Mobile/finances/invests/InvestmentFormScreen";
import InvestmentValuationScreen from "../screens/Mobile/finances/invests/InvestmentValuationScreen";
import InvestmentDetailScreen from "../screens/Mobile/finances/invests/InvestmentDetailScreen";
import ReportsScreen from "../screens/Mobile/reports/ReportsScreen";
import ReportsPdfViewerScreen from "../screens/Mobile/reports/ReportsPdfViewerScreen";
import MonthlyContributionsScreen from "../screens/Mobile/finances/MonthlyContributions/MonthlyContributionsScreen";

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
  MonthlyContributions: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function MobileNavigator() {
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
          <Stack.Screen name="MonthlyContributions" component={MonthlyContributionsScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
