import React, { useState } from "react";
import { View, Text } from "react-native";
import Svg, { G, Path } from "react-native-svg";
import * as d3 from "d3-shape";

interface PieItem {
  value: number;       // valor usado para el tamaño del segmento
  color: string;
  label: string;
  realValue?: number;  // valor real en €
}

interface PieChartProps {
  data?: PieItem[];
  size?: number;
  innerRadius?: number;
  mode?: "income" | "expense" | "saving";
  incomes?: number;
  expenses?: number;
}

export default function PieChartComponent({
  data = [],
  size = 170,
  innerRadius = 55,
  mode = "expense",
  incomes = 0,
  expenses = 0,
}: PieChartProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  let pieData: PieItem[] = [];

  // --------------------------------------------------
  // 🟠 MODO AHORRO TOTAL
  // --------------------------------------------------
  if (mode === "saving") {
    const ahorroReal = incomes - expenses;

    // Sin datos en absoluto
    if (incomes <= 0 && expenses <= 0) {
      return (
        <View style={{ paddingVertical: 20, alignItems: "center" }}>
          <Text style={{ color: "#9ca3af", fontSize: 14 }}>Sin datos</Text>
        </View>
      );
    }

    if (expenses <= incomes) {
      // Ingresos cubren gastos → repartimos ingresos entre Gastos y Ahorro
      const gastos = expenses;
      const ahorro = incomes - expenses;

      pieData = [
        {
          value: gastos,
          realValue: gastos,
          color: "#ef4444",
          label: "Gastos",
        },
        {
          value: ahorro,
          realValue: ahorro,
          color: "#3b82f6",
          label: "Ahorro",
        },
      ].filter((d) => d.value > 0);
    } else {
      // Gastos > ingresos → donut completo de Gastos
      pieData = [
        {
          value: expenses,
          realValue: expenses,
          color: "#ef4444",
          label: "Gastos",
        },
      ];
    }
  }

  // --------------------------------------------------
  // 🟢 MODOS NORMALES: ingresos / gastos por categoría
  // --------------------------------------------------
  else {
    pieData = data
      .filter((d) => d.value > 0)
      .map((d) => ({
        ...d,
        realValue: d.realValue ?? d.value,
      }));
  }

  const formatEuro = (n: number) =>
    n.toLocaleString("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });


  // --------------------------------------------------
  // 🔢 TOTAL DE REFERENCIA (para % y centro)
  // - En ahorro: referencia = ingresos (si hay), si no, gastos
  //   → así los % pueden ser > 100 cuando gastos > ingresos
  // --------------------------------------------------
  const totalReferencia =
    mode === "saving"
      ? incomes > 0
        ? incomes
        : expenses
      : pieData.reduce((sum, i) => sum + (i.realValue ?? i.value), 0);

  // --------------------------------------------------
  // 🔵 TOTAL GEOMÉTRICO (para el dibujo del donut)
  // --------------------------------------------------
  const totalGeom = pieData.reduce((sum, i) => sum + i.value, 0);
  const radius = size / 2;

  if (totalGeom <= 0) {
    return (
      <View style={{ paddingVertical: 20, alignItems: "center" }}>
        <Text style={{ color: "#9ca3af", fontSize: 14 }}>Sin datos suficientes</Text>
      </View>
    );
  }

  // Crear gráfico
  const pieGenerator = d3
    .pie<PieItem>()
    .value((d) => d.value)
    .sort(null)
    .padAngle(0.01);

  const arc = d3
    .arc<d3.PieArcDatum<PieItem>>()
    .outerRadius(radius)
    .innerRadius(innerRadius);

  const arcActive = d3
    .arc<d3.PieArcDatum<PieItem>>()
    .outerRadius(radius + 6)
    .innerRadius(innerRadius);

  const arcs = pieGenerator(pieData);

  const ahorroReal = incomes - expenses;

  return (
    <View
      style={{
        width: "100%",
        alignItems: "center",
        paddingVertical: 4,
        padding: 20,
      }}
    >
      {/* DONUT */}
      <View
        style={{
          alignItems: "center",
          justifyContent: "center",
          overflow: "visible",
        }}
      >
        <Svg width={size + 20} height={size + 20} style={{ overflow: "visible" }}>
          <G x={(size + 20) / 2} y={(size + 20) / 2}>
            {arcs.map((arcData, index) => {
              const isActive = index === selectedIndex;
              const path = (isActive ? arcActive : arc)(arcData);
              if (!path) return null;

              return (
                <Path
                  key={index}
                  d={path}
                  fill={arcData.data.color}
                  stroke="#fff"
                  strokeWidth={2}
                  onPress={() => setSelectedIndex(isActive ? null : index)}
                />
              );
            })}
          </G>
        </Svg>

        {/* TEXTO CENTRAL */}
        <View
          style={{
            position: "absolute",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#4b5563" }}>
            {mode === "saving"
              ? "Ahorro"
              : selectedIndex !== null
              ? pieData[selectedIndex].label
              : "Total"}
          </Text>

          <Text
            style={{
              fontSize: 20,
              fontWeight: "800",
              color: "#111827",
              marginTop: 2,
            }}
          >
            {mode === "saving"
              ? `${formatEuro(ahorroReal)}` // 👈 nunca verás 1€ aquí
              : selectedIndex !== null
              ? `${formatEuro(pieData[selectedIndex].realValue ?? pieData[selectedIndex].value)}`
              : `${formatEuro(totalReferencia)}`}
          </Text>
        </View>
      </View>

      {/* LEYENDA: solo cuando hay algo seleccionado */}
      {selectedIndex !== null && (
        <View style={{ marginTop: 10, width: "88%" }}>
          {(() => {
            const item = pieData[selectedIndex];
            const base = totalReferencia || 1;
            // Puede ser >100% cuando gastos > ingresos, que es lo que quieres
            const percent = ((item.realValue ?? item.value) / base) * 100;

            return (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 5,
                }}
              >
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    backgroundColor: item.color,
                    marginRight: 8,
                  }}
                />

                <Text
                  style={{
                    flex: 1,
                    fontSize: 13,
                    fontWeight: "700",
                    color: "#111827",
                  }}
                >
                  {item.label}
                </Text>

                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: "#4b5563",
                  }}
                >
                  {percent.toFixed(1).replace(".", ",")}%{/* puede ser > 100 */}
                </Text>
              </View>
            );
          })()}
        </View>
      )}
    </View>
  );
}
