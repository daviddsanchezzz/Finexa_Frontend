import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Pressable, Animated, ViewStyle, TextStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/theme";

type Variant = "calculator" | "numeric";

type Props = {
  visible: boolean;
  value: string;
  onChangeValue: (next: string) => void;
  onDone?: () => void;
  onExpressionChange?: (expression: string) => void;
  showExpressionInHeader?: boolean;
  bottomInset?: number;
  variant?: Variant;
  onMovePrev?: () => void;
  onMoveNext?: () => void;
};

type KeyButtonProps = {
  onPress: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

function KeyButton({ onPress, children, style, textStyle }: KeyButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  const animateTo = (toScale: number, toGlow: number, duration: number) => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: toScale,
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(glowOpacity, {
        toValue: toGlow,
        duration,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => animateTo(0.97, 1, 90)}
      onPressOut={() => animateTo(1, 0, 140)}
      style={{ flex: style?.flex ?? 1 }}
    >
      <Animated.View
        style={[
          {
            height: 58,
            borderRadius: 16,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "white",
            borderWidth: 1,
            borderColor: "#E2E8F0",
            shadowColor: "#0F172A",
            shadowOpacity: 0.06,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 },
            elevation: 1,
            transform: [{ scale }],
          },
          style,
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 1,
            left: 1,
            right: 1,
            bottom: 1,
            borderRadius: 15,
            borderWidth: 1,
            borderColor: "#FFFFFF",
            opacity: glowOpacity,
          }}
        />
        {typeof children === "string" ? <Text style={textStyle}>{children}</Text> : children}
      </Animated.View>
    </Pressable>
  );
}

function parseDisplay(s: string) {
  return parseFloat((s || "0").replace(",", ".")) || 0;
}

function formatDisplay(n: number) {
  if (!isFinite(n)) return "0";
  const rounded = Math.round(n * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(".", ",");
}

export default function NumericCalculatorKeyboard({
  visible,
  value,
  onChangeValue,
  onDone,
  onExpressionChange,
  showExpressionInHeader = true,
  bottomInset = 0,
  variant = "calculator",
  onMovePrev,
  onMoveNext,
}: Props) {
  const [calcOp, setCalcOp] = useState<string | null>(null);
  const [calcPrev, setCalcPrev] = useState<number | null>(null);
  const [calcFresh, setCalcFresh] = useState(false);

  const isCalculator = variant === "calculator";
  const canMove = useMemo(() => !!onMovePrev || !!onMoveNext, [onMovePrev, onMoveNext]);
  const expressionText =
    isCalculator && calcOp && calcPrev !== null
      ? calcFresh
        ? `${formatDisplay(calcPrev)} ${calcOp}`
        : `${formatDisplay(calcPrev)} ${calcOp} ${value || "0"}`
      : "";

  useEffect(() => {
    onExpressionChange?.(expressionText);
  }, [expressionText, onExpressionChange]);

  if (!visible) return null;

  const onDigit = (d: string) => {
    if (calcFresh) {
      onChangeValue(d);
      setCalcFresh(false);
      return;
    }
    onChangeValue(value === "0" || value === "" ? d : value + d);
  };

  const onComma = () => {
    if (calcFresh) {
      onChangeValue("0,");
      setCalcFresh(false);
      return;
    }
    if (value.includes(",")) return;
    onChangeValue((value || "0") + ",");
  };

  const onBackspace = () => {
    setCalcFresh(false);
    onChangeValue(value.length <= 1 ? "" : value.slice(0, -1));
  };

  const onOperator = (op: string) => {
    setCalcPrev(parseDisplay(value));
    setCalcOp(op);
    setCalcFresh(true);
  };

  const onEquals = () => {
    if (!calcOp || calcPrev === null) return;
    const curr = parseDisplay(value);
    let result = curr;
    switch (calcOp) {
      case "+":
        result = calcPrev + curr;
        break;
      case "-":
        result = calcPrev - curr;
        break;
      case "×":
        result = calcPrev * curr;
        break;
      case "÷":
        result = curr !== 0 ? calcPrev / curr : 0;
        break;
      default:
        break;
    }
    onChangeValue(formatDisplay(result));
    setCalcOp(null);
    setCalcPrev(null);
    setCalcFresh(true);
  };

  return (
    <View
      style={{
        backgroundColor: "#ECEFF5",
        borderTopWidth: 1,
        borderTopColor: "#D8E0EC",
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: 8 + bottomInset,
      }}
    >
      {(canMove || onDone) && (
        <View
          style={{
            height: 52,
            borderRadius: 16,
            paddingHorizontal: 6,
            marginBottom: 10,
            backgroundColor: "rgba(255,255,255,0.84)",
            borderWidth: 1,
            borderColor: "#DDE5F0",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", gap: 6 }}>
            {onMovePrev && (
              <TouchableOpacity
                onPress={onMovePrev}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "white",
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                }}
              >
                <Ionicons name="chevron-up-outline" size={22} color="#111827" />
              </TouchableOpacity>
            )}
            {onMoveNext && (
              <TouchableOpacity
                onPress={onMoveNext}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "white",
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                }}
              >
                <Ionicons name="chevron-down-outline" size={22} color="#111827" />
              </TouchableOpacity>
            )}
          </View>

          {isCalculator && showExpressionInHeader && (
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#64748B" }}>
              {calcOp && calcPrev !== null ? `${formatDisplay(calcPrev)} ${calcOp}` : ""}
            </Text>
          )}

          {onDone && (
            <TouchableOpacity
              onPress={onDone}
              style={{
                minWidth: 44,
                height: 40,
                borderRadius: 12,
                paddingHorizontal: 12,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#DBEAFE",
                borderWidth: 1,
                borderColor: "#BFDBFE",
              }}
            >
              <Ionicons name="checkmark-outline" size={24} color="#1E3A8A" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {isCalculator && (
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
          {["+", "-", "×", "÷", "="].map((op) => {
            const isEq = op === "=";
            const isActive = calcOp === op;
            return (
              <KeyButton
                key={op}
                onPress={() => (isEq ? onEquals() : onOperator(op))}
                style={{
                  flex: isEq ? 1.15 : 1,
                  height: 54,
                  backgroundColor: isEq ? colors.primary : isActive ? "#E6F0FF" : "white",
                  borderColor: isEq ? colors.primary : isActive ? "#93C5FD" : "#E2E8F0",
                  shadowOpacity: isEq ? 0.12 : 0.06,
                }}
                textStyle={{ fontSize: 20, fontWeight: "700", color: isEq ? "white" : isActive ? "#1D4ED8" : "#475569" }}
              >
                {op}
              </KeyButton>
            );
          })}
        </View>
      )}

      {[ ["7", "8", "9"], ["4", "5", "6"], ["1", "2", "3"] ].map((row) => (
        <View key={row[0]} style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
          {row.map((d) => (
            <KeyButton key={d} onPress={() => onDigit(d)} textStyle={{ fontSize: 22, fontWeight: "600", color: "#0F172A" }}>
              {d}
            </KeyButton>
          ))}
        </View>
      ))}

      <View style={{ flexDirection: "row", gap: 8 }}>
        <KeyButton onPress={onComma} textStyle={{ fontSize: 22, fontWeight: "600", color: "#0F172A" }}>
          ,
        </KeyButton>
        <KeyButton onPress={() => onDigit("0")} textStyle={{ fontSize: 22, fontWeight: "600", color: "#0F172A" }}>
          0
        </KeyButton>
        <KeyButton onPress={onBackspace}>
          <Ionicons name="backspace-outline" size={22} color="#475569" />
        </KeyButton>
      </View>
    </View>
  );
}
