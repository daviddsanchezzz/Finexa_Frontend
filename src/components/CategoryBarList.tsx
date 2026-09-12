import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatEuro } from "../utils/currency";

export interface CategoryBarItem {
  key: string;
  label: string;
  amount: number;
  percent: number; // 0-100, ya calculado sobre el total del tab
  color: string;
  emoji?: string | null;
  onPress?: () => void;
}

// Lista ranqueada con barra de progreso — usada tanto para "Distribución por
// categorías" (Gastos/Ingresos) como para "Distribución por subcategorías"
// en el detalle de una categoría. Con emoji pinta el icono cuadrado de
// siempre (category.color de fondo); sin emoji es la variante "solo barra"
// que usa el detalle de subcategorías.
export default function CategoryBarList({ items }: { items: CategoryBarItem[] }) {
  return (
    <View>
      {items.map((item, i) => {
        const Wrapper = item.onPress ? TouchableOpacity : View;
        return (
          <Wrapper
            key={item.key}
            {...(item.onPress ? { onPress: item.onPress, activeOpacity: 0.7 } : {})}
            style={{
              paddingVertical: 11,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: "#F1F5F9",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {item.emoji ? (
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    backgroundColor: item.color,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  <Text style={{ fontSize: 15 }}>{item.emoji}</Text>
                </View>
              ) : null}

              <Text style={{ flex: 1, fontSize: 14.5, fontWeight: "600", color: "#0F172A" }} numberOfLines={1}>
                {item.label}
              </Text>

              <Text style={{ fontSize: 14.5, fontWeight: "600", color: "#0F172A", fontVariant: ["tabular-nums"] }}>
                {formatEuro(item.amount)} €
              </Text>

              {item.onPress ? (
                <Ionicons name="chevron-forward" size={14} color="#D1D5DB" style={{ marginLeft: 4 }} />
              ) : null}
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 6,
                marginLeft: item.emoji ? 44 : 0,
                gap: 8,
              }}
            >
              <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: "#F1F2F4", overflow: "hidden" }}>
                <View
                  style={{
                    width: `${Math.max(2, Math.min(100, item.percent))}%`,
                    height: "100%",
                    borderRadius: 2,
                    backgroundColor: item.color,
                  }}
                />
              </View>
              <Text style={{ fontSize: 11, fontWeight: "500", color: "#B0B4BA", width: 40, textAlign: "right" }}>
                {item.percent.toFixed(1).replace(".", ",")}%
              </Text>
            </View>
          </Wrapper>
        );
      })}
    </View>
  );
}
