import React, { useState } from "react";
import { View, Text, Dimensions, TouchableOpacity } from "react-native";
import { colors } from "../theme/theme";

interface DataPoint {
  display: number; // valor usado para la altura de la barra (nunca negativo)
  real: number;    // valor real (puede ser negativo para ahorro)
}

interface Props {
  data: DataPoint[];               // ahora data es array de objetos
  labels: (string | number)[];
}

export default function PeriodChart({ data, labels }: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Alturas usando solo el valor display (que nunca será negativo)
  const absData = data.map((v) => Math.abs(v.display));

  const rawMax = Math.max(...absData, 1);
  const niceMax = Math.ceil(rawMax / 25) * 25;

  const screenWidth = Dimensions.get("window").width - 60;

  const barWidth =
    labels.length === 12
      ? 14
      : labels.length > 6
      ? 22
      : 28;

  const chartHeight = 120;

  const formatValue = (value: number) => {
    return value.toLocaleString("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleBarPress = (index: number) => {
    setSelectedIndex((prev) => (prev === index ? null : index));
  };

  return (
    <View
      style={{
        width: screenWidth,
        alignSelf: "center",
        marginTop: 10,
        paddingVertical: 16,
        paddingHorizontal: 4,
      }}
    >
      {/* GRID Y EJE Y */}
      <View
        style={{
          height: chartHeight,
          position: "absolute",
          left: 0,
          right: 0,
          top: 16,
          justifyContent: "space-between",
        }}
      >
        {[niceMax, niceMax / 2, 0].map((v, idx) => (
          <View key={idx} style={{ flexDirection: "row", alignItems: "center" }}>
            <Text
              style={{
                width: 35,
                textAlign: "right",
                marginRight: 8,
                fontSize: 11,
                color: "#9CA3AF",
                fontWeight: "600",
              }}
            >
              {Math.round(v)}
            </Text>

            <View
              style={{
                height: 1,
                backgroundColor: "#E5E7EB",
                opacity: 0.7,
                flex: 1,
              }}
            />
          </View>
        ))}
      </View>

      {/* BARRAS */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-end",
          paddingHorizontal: 8,
          marginLeft: 45,
          marginTop: 16,
          height: chartHeight,
        }}
      >
        {data.map((item, i) => {
          const valueForHeight = Math.abs(item.display);
          const originalValue = item.real;

          const maxBarHeight = chartHeight - 10;
          const height = (valueForHeight / niceMax) * maxBarHeight;

          const isSelected = selectedIndex === i;

          return (
            <TouchableOpacity
              key={i}
              activeOpacity={0.8}
              onPress={() => handleBarPress(i)}
              style={{
                alignItems: "center",
                justifyContent: "flex-end",
              }}
            >
              {/* Tooltip con valor real */}
              {isSelected && (
                <View
                  style={{
                    marginBottom: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 12,
                    backgroundColor: "#E5E7EB",
                    shadowColor: "#000",
                    shadowOpacity: 0.12,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: "#111827",
                    }}
                  >
                    {formatValue(originalValue)}
                  </Text>
                </View>
              )}

              {/* Barra */}
              <View
                style={{
                  width: barWidth,
                  height: height < 10 ? 10 : height,
                  borderRadius: 6,
                  backgroundColor: colors.primary,
                  opacity:
                    valueForHeight === 0
                      ? 0.25
                      : isSelected
                      ? 1
                      : 0.9,
                  transform: isSelected ? [{ scaleY: 1.05 }] : [],
                }}
              />

              {/* Label */}
              <Text
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  fontWeight: "600",
                  color: "#9CA3AF",
                }}
              >
                {labels[i]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
