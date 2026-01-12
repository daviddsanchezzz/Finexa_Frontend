import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import BottomNav from "../components/BottomTab";

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <BottomNav {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen
        name="Home"
        options={{ tabBarLabel: "Inicio" }}
        getComponent={() =>
          require("../screens/Mobile/home/HomeScreen").default
        }
      />

      <Tab.Screen
        name="Stats"
        options={{ tabBarLabel: "Estadísticas" }}
        getComponent={() =>
          require("../screens/Mobile/stats/StatsScreen").default
        }
      />

      <Tab.Screen
        name="Add"
        getComponent={() =>
          require("../screens/Mobile/addTransaction/AddTransactionScreen").default
        }
      />

      <Tab.Screen
        name="Finances"
        options={{ tabBarLabel: "Presupuestos" }}
        getComponent={() =>
          require("../screens/Mobile/finances/FinancesScreen").default
        }
      />

      <Tab.Screen
        name="AIChat"
        options={{ tabBarLabel: "Chat" }}
        getComponent={() =>
          require("../screens/Mobile/aiChat/AIChatScreen").default
        }
      />
    </Tab.Navigator>
  );
}
