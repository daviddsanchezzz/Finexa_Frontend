import React, { useEffect } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import BottomNav from "../components/BottomTab";
import { readQuickAddFromSession, clearQuickAddFromSession } from "../utils/quickAdd";

const Tab = createBottomTabNavigator();

export default function MainTabs({ navigation }: any) {
  useEffect(() => {
    const params = readQuickAddFromSession();
    if (!params) return;
    clearQuickAddFromSession();
    const id = setTimeout(() => {
      navigation.navigate('Add', {
        prefillData: {
          type: 'expense',
          amount: params.amount,
          description: params.merchant,
          cardName: params.cardName,
        },
      });
    }, 300);
    return () => clearTimeout(id);
  }, [navigation]);
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
        name="Investments"
        options={{ tabBarLabel: "Inversión" }}
        getComponent={() =>
          require("../screens/Mobile/finances/invests/InvestmentsScreen").default
        }
      />

      <Tab.Screen
        name="Finances"
        options={{ tabBarLabel: "Presupuestos" }}
        getComponent={() =>
          require("../screens/Mobile/finances/FinancesScreen").default
        }
      />
    </Tab.Navigator>
  );
}
