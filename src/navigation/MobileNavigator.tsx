import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../context/AuthContext";

import LoginScreen from "../screens/Mobile/auth/LoginScreen";
import RegisterScreen from "../screens/Mobile/auth/RegisterScreen";
import MainTabs from "./MainTabs";

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
  InvestmentOperation: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function MobileNavigator() {
  const { user, hydrated  } = useAuth();

if (!hydrated) {
  // Opcional: pero intenta que sea mínimo.
  // En web incluso puedes devolver null o un splash muy ligero.
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

          <Stack.Screen
            name="Profile"
            getComponent={() =>
              require("../screens/Mobile/profile/ProfileScreen").default
            }
          />

          <Stack.Screen
            name="Categories"
            getComponent={() =>
              require("../screens/Mobile/categories/CategoriesScreen").default
            }
          />

          <Stack.Screen
            name="Wallets"
            getComponent={() =>
              require("../screens/Mobile/wallets/WalletsScreen").default
            }
          />

          <Stack.Screen
            name="CategoryTransactions"
            getComponent={() =>
              require("../screens/Mobile/stats/CategoryTransactionsCreen").default
            }
          />

          <Stack.Screen
            name="ReconcileAccounts"
            getComponent={() =>
              require("../screens/Mobile/profile/ReconcileAccountsCreen").default
            }
          />

          <Stack.Screen
            name="Transfers"
            getComponent={() =>
              require("../screens/Mobile/wallets/TransferScreen").default
            }
          />

          <Stack.Screen
            name="EditMonth"
            getComponent={() =>
              require("../screens/Mobile/stats/EditMonthScreen").default
            }
          />

          <Stack.Screen
            name="BudgetCreate"
            getComponent={() =>
              require("../screens/Mobile/finances/budgets/BudgetCreateScreen").default
            }
          />

          <Stack.Screen
            name="BudgetTransactions"
            getComponent={() =>
              require("../screens/Mobile/finances/budgets/BudgetTransactionsScreen").default
            }
          />

          <Stack.Screen
            name="DebtDetail"
            getComponent={() =>
              require("../screens/Mobile/finances/debts/DebtDetailScreen").default
            }
          />

          <Stack.Screen
            name="DebtForm"
            getComponent={() =>
              require("../screens/Mobile/finances/debts/DebtFormScreen").default
            }
          />

          <Stack.Screen
            name="Debts"
            getComponent={() =>
              require("../screens/Mobile/finances/debts/DebtsScreen").default
            }
          />

          <Stack.Screen
            name="Budgets"
            getComponent={() =>
              require("../screens/Mobile/finances/budgets/BudgetsScreen").default
            }
          />

          <Stack.Screen
            name="Goals"
            getComponent={() =>
              require("../screens/Mobile/finances/goals/GoalsScreen").default
            }
          />

          <Stack.Screen
            name="Trips"
            getComponent={() =>
              require("../screens/Mobile/finances/travels/TravelsScreen").default
            }
          />

          <Stack.Screen
            name="TripForm"
            getComponent={() =>
              require("../screens/Mobile/finances/travels/TravelFormScreen").default
            }
          />

          <Stack.Screen
            name="TripDetail"
            getComponent={() =>
              require("../screens/Mobile/finances/travels/TripDetailScreen").default
            }
          />

          <Stack.Screen
            name="TripPlanForm"
            getComponent={() =>
              require("../screens/Mobile/finances/travels/TripPlanFormScreen").default
            }
          />

          <Stack.Screen
            name="RecurringTransactions"
            getComponent={() =>
              require("../screens/Mobile/finances/RecurringTransactions/RecurringTransactionsScreen").default
            }
          />

          <Stack.Screen
            name="Investments"
            getComponent={() =>
              require("../screens/Mobile/finances/invests/InvestmentsScreen").default
            }
          />

          <Stack.Screen
            name="InvestmentForm"
            getComponent={() =>
              require("../screens/Mobile/finances/invests/InvestmentFormScreen").default
            }
          />

          <Stack.Screen
            name="InvestmentValuation"
            getComponent={() =>
              require("../screens/Mobile/finances/invests/InvestmentValuationScreen").default
            }
          />

          <Stack.Screen
            name="InvestmentDetail"
            getComponent={() =>
              require("../screens/Mobile/finances/invests/InvestmentDetailScreen").default
            }
          />

          <Stack.Screen
            name="InvestmentOperation"
            getComponent={() =>
              require("../screens/Mobile/finances/invests/InvestmentOperationScreen").default
            }
          />

          <Stack.Screen
            name="Reports"
            getComponent={() =>
              require("../screens/Mobile/reports/ReportsScreen").default
            }
          />

          <Stack.Screen
            name="ReportsPdfViewer"
            getComponent={() =>
              require("../screens/Mobile/reports/ReportsPdfViewerScreen").default
            }
          />

          <Stack.Screen
            name="MonthlyContributions"
            getComponent={() =>
              require("../screens/Mobile/finances/MonthlyContributions/MonthlyContributionsScreen").default
            }
          />
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
