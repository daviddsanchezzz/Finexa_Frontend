import React, { useEffect, useRef } from "react";
import { View, Text, Animated, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { HealthScoreResult } from "../utils/healthScore";

interface Props {
  result: HealthScoreResult;
  onPress?: () => void;
}

export function HealthScoreWidget({ result, onPress }: Props) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: result.score / 100,
      useNativeDriver: false,
      friction: 7,
    }).start();
  }, [result.score]);

  const barWidth = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      onPress={onPress}
      activeOpacity={0.85}
      style={styles.card}
    >
      <View style={styles.row}>
        <View style={styles.left}>
          <Text style={styles.title}>Salud financiera</Text>
          <Text style={[styles.label, { color: result.color }]}>{result.label}</Text>
        </View>
        <View style={[styles.badge, { borderColor: result.color + "33", backgroundColor: result.color + "12" }]}>
          <Text style={[styles.grade, { color: result.color }]}>{result.grade}</Text>
          <Text style={[styles.score, { color: result.color }]}>{result.score}</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.barBg}>
        <Animated.View
          style={[styles.barFill, { width: barWidth, backgroundColor: result.color }]}
        />
      </View>

      {/* Breakdown */}
      <View style={styles.breakdown}>
        {[
          { label: "Ahorro", value: result.breakdown.savingsRate, max: 30 },
          { label: "Presupuesto", value: result.breakdown.budgetAdherence, max: 25 },
          { label: "Deuda", value: result.breakdown.debtRatio, max: 20 },
          { label: "Inversiones", value: result.breakdown.investmentPresence, max: 15 },
          { label: "Fondo emerg.", value: result.breakdown.emergencyFund, max: 10 },
        ].map((item) => (
          <View key={item.label} style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>{item.label}</Text>
            <Text style={styles.breakdownValue}>
              {item.value}/{item.max}
            </Text>
          </View>
        ))}
      </View>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: { gap: 2 },
  title: { fontSize: 13, color: "#6B7280", fontWeight: "500" },
  label: { fontSize: 17, fontWeight: "700" },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
  },
  grade: { fontSize: 20, fontWeight: "800", lineHeight: 22 },
  score: { fontSize: 11, fontWeight: "600", opacity: 0.8 },
  barBg: {
    height: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 999,
    overflow: "hidden",
  },
  barFill: { height: 6, borderRadius: 999 },
  breakdown: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  breakdownItem: { alignItems: "center", gap: 2 },
  breakdownLabel: { fontSize: 10, color: "#9CA3AF" },
  breakdownValue: { fontSize: 11, color: "#374151", fontWeight: "600" },
});
