import React from "react";
import { SafeAreaView, View } from "react-native";
import { SkeletonBox } from "./SkeletonBox";

function SummaryCardSkeleton({ height = 120 }: { height?: number }) {
  return (
    <View
      style={{
        backgroundColor: "white",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        padding: 14,
        height,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <SkeletonBox width={120} height={14} borderRadius={6} />
        <SkeletonBox width={86} height={14} borderRadius={6} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <SkeletonBox width={36} height={36} borderRadius={18} />
        <View style={{ gap: 8 }}>
          <SkeletonBox width={84} height={22} borderRadius={8} />
          <SkeletonBox width={108} height={12} borderRadius={6} />
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <SkeletonBox width={"23%"} height={64} borderRadius={12} />
        <SkeletonBox width={"23%"} height={64} borderRadius={12} />
        <SkeletonBox width={"23%"} height={64} borderRadius={12} />
        <SkeletonBox width={"23%"} height={64} borderRadius={12} />
      </View>
    </View>
  );
}

export function TripDetailScreenSkeleton() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F6F8FC" }}>
      <View
        style={{
          height: 220,
          backgroundColor: "#0F4BDA",
          overflow: "hidden",
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: 16,
          justifyContent: "space-between",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <SkeletonBox width={34} height={34} borderRadius={17} style={{ backgroundColor: "rgba(255,255,255,0.18)" }} />
          <View style={{ flex: 1 }} />
          <SkeletonBox width={78} height={24} borderRadius={999} style={{ backgroundColor: "rgba(255,255,255,0.18)" }} />
          <SkeletonBox width={34} height={34} borderRadius={17} style={{ marginLeft: 8, backgroundColor: "rgba(255,255,255,0.18)" }} />
        </View>

        <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
          <View style={{ flex: 1, gap: 8 }}>
            <SkeletonBox width={112} height={14} borderRadius={6} style={{ backgroundColor: "rgba(255,255,255,0.18)" }} />
            <SkeletonBox width={156} height={30} borderRadius={8} style={{ backgroundColor: "rgba(255,255,255,0.24)" }} />
            <SkeletonBox width={188} height={14} borderRadius={6} style={{ backgroundColor: "rgba(255,255,255,0.18)" }} />
          </View>
          <View style={{ alignItems: "flex-end", gap: 6 }}>
            <SkeletonBox width={98} height={14} borderRadius={6} style={{ backgroundColor: "rgba(255,255,255,0.18)" }} />
            <SkeletonBox width={48} height={12} borderRadius={6} style={{ backgroundColor: "rgba(255,255,255,0.14)" }} />
            <SkeletonBox width={92} height={24} borderRadius={8} style={{ backgroundColor: "rgba(255,255,255,0.24)" }} />
          </View>
        </View>
      </View>

      <View style={{ flexDirection: "row", marginHorizontal: 16, marginTop: 18, marginBottom: 14, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", justifyContent: "space-between" }}>
        <SkeletonBox width={60} height={14} borderRadius={6} />
        <SkeletonBox width={90} height={14} borderRadius={6} />
        <SkeletonBox width={52} height={14} borderRadius={6} />
        <SkeletonBox width={72} height={14} borderRadius={6} />
      </View>

      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        <View style={{ gap: 14, paddingBottom: 24 }}>
          <SummaryCardSkeleton height={182} />
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 18,
              borderWidth: 1,
              borderColor: "#E5E7EB",
              padding: 14,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <SkeletonBox width={86} height={18} borderRadius={6} />
              <SkeletonBox width={78} height={18} borderRadius={6} />
            </View>
            <SkeletonBox width="100%" height={74} borderRadius={16} />
          </View>
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 18,
              borderWidth: 1,
              borderColor: "#E5E7EB",
              padding: 14,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <SkeletonBox width={74} height={18} borderRadius={6} />
              <SkeletonBox width={102} height={18} borderRadius={6} />
            </View>
            <SkeletonBox width="100%" height={74} borderRadius={16} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
