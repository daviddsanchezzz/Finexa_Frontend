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
}

// Fila de indicadores de 3 (o más) columnas sobre fondo plano — el mismo
// patrón "INGRESOS / GASTOS / RENTABILIDAD" de Inicio, reutilizado también
// en Inversiones y Viajes: etiqueta gris en mayúsculas + cifra debajo,
// coloreada opcionalmente (verde/rojo según signo, o el color que se pase).
export default function StatsRow({ items }: Props) {
  return (
    <View className="flex-row justify-between mb-1">
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
            <Text style={{ fontSize: 13, color: "#9CA3AF", letterSpacing: 1, fontWeight: "500" }}>{item.label}</Text>
            <Text style={{ fontSize: 18, fontWeight: "600", color: item.color ?? "#0F172A", marginTop: 2 }}>
              {item.value}
            </Text>
          </Wrapper>
        );
      })}
    </View>
  );
}
