import React from "react";
import { SafeAreaView, View } from "react-native";
import { SkeletonBox } from "./SkeletonBox";

function TripListCardSkeleton() {
  return (
    <View
      style={{
        backgroundColor: "white",
        borderRadius: 20,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: "#F0F4F8",
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }}
    >
      <SkeletonBox width={56} height={56} borderRadius={14} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <SkeletonBox width={16} height={16} borderRadius={8} />
          <SkeletonBox width={148} height={16} borderRadius={6} />
        </View>
        <SkeletonBox width={132} height={12} borderRadius={6} />
        <View style={{ flexDirection: "row", gap: 0, marginTop: 2 }}>
          <SkeletonBox width={16} height={16} borderRadius={8} />
          <SkeletonBox width={16} height={16} borderRadius={8} style={{ marginLeft: -6 }} />
          <SkeletonBox width={16} height={16} borderRadius={8} style={{ marginLeft: -6 }} />
        </View>
      </View>
      <SkeletonBox width={10} height={16} borderRadius={4} />
    </View>
  );
}

function PillSkeleton({ width }: { width: number }) {
  return <SkeletonBox width={width} height={34} borderRadius={999} />;
}

export function TravelsScreenSkeleton() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F6F8FC" }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 8 }}>
        <SkeletonBox width={24} height={24} borderRadius={12} />
        <SkeletonBox width={88} height={26} borderRadius={8} style={{ flex: 1 }} />
        <SkeletonBox width={84} height={36} borderRadius={16} />
      </View>

      {/* Buscador */}
      <View style={{ paddingHorizontal: 20, marginBottom: 14 }}>
        <SkeletonBox width="100%" height={38} borderRadius={13} style={{ backgroundColor: "#F3F4F6" }} />
      </View>

      {/* Hero card — mismo lenguaje visual que Inicio/Inversiones */}
      <View style={{ paddingHorizontal: 20, marginBottom: 8 }}>
        <View
          style={{
            borderRadius: 16,
            paddingVertical: 16,
            paddingHorizontal: 16,
            alignItems: "center",
            backgroundColor: "#003cc5",
          }}
        >
          <SkeletonBox width={120} height={11} borderRadius={5} style={{ backgroundColor: "rgba(255,255,255,0.35)" }} />
          <SkeletonBox width={150} height={28} borderRadius={7} style={{ backgroundColor: "rgba(255,255,255,0.28)", marginTop: 8 }} />
          <SkeletonBox width={110} height={11} borderRadius={5} style={{ backgroundColor: "rgba(255,255,255,0.2)", marginTop: 8 }} />
        </View>
      </View>

      {/* Indicadores: Viajes / Países / Tu mundo */}
      <View style={{ paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", marginBottom: 14 }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ flex: 1, alignItems: "center" }}>
            <SkeletonBox width={54} height={10} borderRadius={4} />
            <SkeletonBox width={40} height={14} borderRadius={5} style={{ marginTop: 6 }} />
          </View>
        ))}
      </View>

      {/* Toggle Lista / Calendario (light dense) */}
      <View style={{ marginHorizontal: 20, marginBottom: 14, backgroundColor: "#E5E7EB", borderRadius: 11, padding: 2, flexDirection: "row", gap: 4 }}>
        <SkeletonBox width="49%" height={30} borderRadius={9} style={{ backgroundColor: "white" }} />
        <SkeletonBox width="49%" height={30} borderRadius={9} style={{ backgroundColor: "transparent" }} />
      </View>

      {/* Tabs: Estado / Continente / Año (underline, ancho completo) */}
      <View style={{ flexDirection: "row", marginBottom: 12, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", paddingBottom: 10 }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ flex: 1, alignItems: "center" }}>
            <SkeletonBox width={i === 0 ? 44 : i === 1 ? 68 : 32} height={12} borderRadius={5} />
          </View>
        ))}
      </View>

      <View style={{ paddingHorizontal: 20, flexDirection: "row", gap: 8, marginBottom: 16 }}>
        <PillSkeleton width={96} />
        <PillSkeleton width={104} />
        <PillSkeleton width={88} />
      </View>

      <View style={{ paddingHorizontal: 20, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 8 }}>
        <SkeletonBox width={110} height={14} borderRadius={6} />
        <SkeletonBox width={28} height={20} borderRadius={999} />
      </View>

      <View style={{ paddingHorizontal: 20, gap: 10 }}>
        <TripListCardSkeleton />
        <TripListCardSkeleton />
        <TripListCardSkeleton />
      </View>
    </SafeAreaView>
  );
}
