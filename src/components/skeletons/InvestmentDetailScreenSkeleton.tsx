import React from "react";
import { View } from "react-native";
import { SkeletonBox } from "./SkeletonBox";
import { useTheme } from "../../context/ThemeContext";

const BLUE_SKELETON = "rgba(255,255,255,0.25)";

function StatSkeleton() {
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 6 }}>
      <SkeletonBox width={68} height={9} borderRadius={4} />
      <SkeletonBox width={76} height={14} borderRadius={5} />
    </View>
  );
}

function InfoRowSkeleton() {
  const { colors } = useTheme();
  return (
    <View
      style={{
        paddingVertical: 13,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <SkeletonBox width={76} height={10} borderRadius={4} />
        <SkeletonBox width={92} height={12} borderRadius={5} style={{ marginLeft: "auto" }} />
      </View>
    </View>
  );
}

export default function InvestmentDetailScreenSkeleton() {
  const { colors } = useTheme();
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

      <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 11, paddingHorizontal: 14 }}>
        {[52, 52, 68, 64].map((width, index) => (
          <View key={index} style={{ flex: 1, alignItems: "center" }}>
            <SkeletonBox width={width} height={10} borderRadius={4} />
          </View>
        ))}
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 15 }}>
        <SkeletonBox width={74} height={9} borderRadius={4} style={{ marginBottom: 13 }} />
        <View style={{ flexDirection: "row", marginBottom: 23 }}>
          {[0, 1, 2].map((index) => (
            <View key={index} style={{ flex: 1, alignItems: "center", borderLeftWidth: index ? 1 : 0, borderLeftColor: colors.border }}>
              <SkeletonBox width={68} height={15} borderRadius={5} />
              <SkeletonBox width={76} height={9} borderRadius={4} style={{ marginTop: 6 }} />
            </View>
          ))}
        </View>

        <SkeletonBox width={96} height={9} borderRadius={4} style={{ marginBottom: 10 }} />
        <SkeletonBox width="78%" height={15} borderRadius={5} />
        <SkeletonBox width="58%" height={15} borderRadius={5} style={{ marginTop: 6 }} />
        <SkeletonBox width="48%" height={10} borderRadius={4} style={{ marginTop: 8, marginBottom: 7 }} />
        <InfoRowSkeleton />
        <InfoRowSkeleton />
      </View>
    </View>
  );
}
