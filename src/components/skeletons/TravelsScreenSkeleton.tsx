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
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 8 }}>
        <SkeletonBox width={24} height={24} borderRadius={12} />
        <SkeletonBox width={88} height={26} borderRadius={8} style={{ flex: 1 }} />
        <SkeletonBox width={92} height={36} borderRadius={16} />
      </View>

      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <View
          style={{
            borderRadius: 16,
            paddingHorizontal: 18,
            paddingVertical: 14,
            backgroundColor: "#0F4BDA",
            overflow: "hidden",
          }}
        >
          <View style={{ alignItems: "flex-end", marginBottom: 10 }}>
            <SkeletonBox width={56} height={22} borderRadius={999} style={{ backgroundColor: "rgba(255,255,255,0.18)" }} />
          </View>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
            <SkeletonBox width={132} height={34} borderRadius={8} style={{ backgroundColor: "rgba(255,255,255,0.22)" }} />
            <SkeletonBox width={54} height={14} borderRadius={6} style={{ backgroundColor: "rgba(255,255,255,0.16)" }} />
          </View>
          <SkeletonBox width={"68%"} height={14} borderRadius={6} style={{ marginTop: 10, backgroundColor: "rgba(255,255,255,0.16)" }} />
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, marginBottom: 14 }}>
        <SkeletonBox width="100%" height={46} borderRadius={16} style={{ backgroundColor: "white" }} />
      </View>

      <View style={{ marginHorizontal: 20, marginBottom: 14, backgroundColor: "#EEF2FF", borderRadius: 14, padding: 3, flexDirection: "row", gap: 4 }}>
        <SkeletonBox width="49%" height={34} borderRadius={11} style={{ backgroundColor: "white" }} />
        <SkeletonBox width="49%" height={34} borderRadius={11} style={{ backgroundColor: "transparent" }} />
      </View>

      <View style={{ marginHorizontal: 20, flexDirection: "row", marginBottom: 12, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", gap: 20 }}>
        <SkeletonBox width={46} height={15} borderRadius={6} />
        <SkeletonBox width={74} height={15} borderRadius={6} />
        <SkeletonBox width={34} height={15} borderRadius={6} />
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
