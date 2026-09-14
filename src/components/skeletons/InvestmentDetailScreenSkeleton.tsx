import React from "react";
import { View } from "react-native";
import { SkeletonBox } from "./SkeletonBox";

const BLUE_SKELETON = "rgba(255,255,255,0.25)";

function StatSkeleton() {
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 6 }}>
      <SkeletonBox width={68} height={9} borderRadius={4} />
      <SkeletonBox width={76} height={14} borderRadius={5} />
    </View>
  );
}

function InfoRowSkeleton({ wide = false }: { wide?: boolean }) {
  return (
    <View
      style={{
        paddingVertical: 13,
        borderBottomWidth: 1,
        borderBottomColor: "#E8EDF4",
        gap: wide ? 9 : 0,
      }}
    >
      {wide ? (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <SkeletonBox width={15} height={15} borderRadius={4} />
            <SkeletonBox width={96} height={10} borderRadius={4} />
          </View>
          <SkeletonBox width="78%" height={13} borderRadius={5} />
        </>
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <SkeletonBox width={15} height={15} borderRadius={4} style={{ marginRight: 8 }} />
          <SkeletonBox width={96} height={10} borderRadius={4} />
          <SkeletonBox width={74} height={12} borderRadius={5} style={{ marginLeft: "auto" }} />
        </View>
      )}
    </View>
  );
}

export default function InvestmentDetailScreenSkeleton() {
  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <View
          style={{
            height: 100,
            borderRadius: 16,
            backgroundColor: "#0B46D8",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 9,
          }}
        >
          <SkeletonBox width={72} height={10} borderRadius={4} style={{ backgroundColor: BLUE_SKELETON }} />
          <SkeletonBox width={156} height={27} borderRadius={7} style={{ backgroundColor: BLUE_SKELETON, marginTop: 8 }} />
          <SkeletonBox width={178} height={9} borderRadius={4} style={{ backgroundColor: "rgba(255,255,255,0.18)", marginTop: 8 }} />
        </View>

        <View style={{ flexDirection: "row", marginBottom: 15 }}>
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
        </View>
      </View>

      <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#E5E7EB", paddingBottom: 11, paddingHorizontal: 14 }}>
        {[52, 52, 68, 64].map((width, index) => (
          <View key={index} style={{ flex: 1, alignItems: "center" }}>
            <SkeletonBox width={width} height={10} borderRadius={4} />
          </View>
        ))}
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 15 }}>
        <SkeletonBox width={146} height={15} borderRadius={5} />
        <SkeletonBox width={72} height={9} borderRadius={4} style={{ marginTop: 6, marginBottom: 7 }} />
        <InfoRowSkeleton wide />
        <InfoRowSkeleton />
        <InfoRowSkeleton />
        <InfoRowSkeleton />
        <InfoRowSkeleton />
        <InfoRowSkeleton />
      </View>
    </View>
  );
}
