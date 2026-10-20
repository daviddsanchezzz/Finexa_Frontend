import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

interface StatItem {
  key: string;
  label: string;
  value: string;
  color?: string;
  onPress?: () => void;
}

interface Props {
  items: StatItem[];
  /** Versión más baja: etiqueta y cifra algo menores y sin margen inferior. */
  compact?: boolean;
}

// Fila de indicadores de 3 (o más) columnas sobre fondo plano — el mismo
// patrón "INGRESOS / GASTOS / RENTABILIDAD" de Inicio, reutilizado también
// en Inversiones y Viajes: etiqueta gris en mayúsculas + cifra debajo,
// coloreada opcionalmente (verde/rojo según signo, o el color que se pase).
export default function StatsRow({ items, compact = false }: Props) {
  return (
    <View className={compact ? "flex-row justify-between" : "flex-row justify-between mb-1"}>
      {items.map((item, i) => {
        const Wrapper: any = item.onPress ? TouchableOpacity : View;
        const marginStyle =
          i === 0
            ? { marginRight: 10 }
            : i === items.length - 1
            ? { marginLeft: 10 }
            : { marginHorizontal: 6 };
        return (
          <Wrapper
            key={item.key}
            style={[{ flex: 1, alignItems: "center" }, marginStyle]}
            onPress={item.onPress}
            activeOpacity={item.onPress ? 0.7 : undefined}
          >
            <Text style={{ fontSize: compact ? 10.5 : 12, color: "#9CA3AF", letterSpacing: compact ? 0.6 : 0.8, fontWeight: "500" }}>{item.label}</Text>
            <Text
              style={{ fontSize: compact ? 14.5 : 16, fontWeight: "600", color: item.color ?? "#0F172A", marginTop: compact ? 0 : 1, fontVariant: ["tabular-nums"] }}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {item.value}
            </Text>
          </Wrapper>
        );
      })}
    </View>
  );
}
