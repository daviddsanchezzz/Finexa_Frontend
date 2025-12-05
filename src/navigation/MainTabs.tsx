import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import BottomNav from "../components/BottomTab";
import HomeScreen from "../screens/home/HomeScreen";
import StatsScreen from "../screens/stats/StatsScreen";
import AddScreen from "../screens/addTransaction/AddTransactionScreen";
import AIChatScreen from "../screens/aiChat/AIChatScreen";
import FinancesScreen from "../screens/finances/FinancesScreen";

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <BottomNav {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: "Inicio" }} />
      <Tab.Screen name="Stats" component={StatsScreen} options={{ tabBarLabel: "Estadísticas" }} />
      <Tab.Screen name="Add" component={AddScreen} />
      <Tab.Screen name="Finances" component={FinancesScreen} options={{ tabBarLabel: "Presupuestos" }} />
      <Tab.Screen name="AIChat" component={AIChatScreen} options={{ tabBarLabel: "Chat" }} />
    </Tab.Navigator>
  );
}
