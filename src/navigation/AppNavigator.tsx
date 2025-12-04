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
import BudgetCreateScreen from "../screens/budgets/BudgetCreateScreen";
import BudgetTransactionsScreen from "../screens/budgets/BudgetTransactionsScreen";
import DebtDetailScreen from "../screens/budgets/DebtDetailScreen";
import DebtFormScreen from "../screens/budgets/DebtFormScreen";

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
