import React from 'react';
import { View, Dimensions } from 'react-native';
import { SkeletonBox } from './SkeletonBox';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W - 40;

function CategoryRow() {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 11,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
      }}
    >
      <SkeletonBox width={36} height={36} borderRadius={10} style={{ marginRight: 12 }} />
      <View style={{ flex: 1, gap: 5 }}>
        <SkeletonBox width="45%" height={13} borderRadius={6} />
        <SkeletonBox width="25%" height={10} borderRadius={5} />
      </View>
      <View style={{ alignItems: 'flex-end', gap: 5 }}>
        <SkeletonBox width={72} height={13} borderRadius={6} />
        <SkeletonBox width={40} height={10} borderRadius={5} />
      </View>
    </View>
  );
}

export function StatsScreenSkeleton() {
  return (
    <View style={{ paddingHorizontal: 20 }}>
      {/* Type selector */}
      <SkeletonBox width="100%" height={44} borderRadius={16} style={{ marginBottom: 16 }} />

      {/* Chart card */}
      <View style={{ marginBottom: 24 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <SkeletonBox width={140} height={14} borderRadius={6} />
          <SkeletonBox width={110} height={32} borderRadius={12} />
        </View>
        <SkeletonBox width={CARD_W} height={200} borderRadius={24} />
        {/* Dots */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 12, gap: 8 }}>
          <SkeletonBox width={18} height={7} borderRadius={999} />
          <SkeletonBox width={7} height={7} borderRadius={999} />
        </View>
      </View>

      {/* Date label */}
      <SkeletonBox width={200} height={22} borderRadius={8} style={{ marginBottom: 20 }} />

      {/* Category section label */}
      <SkeletonBox width={180} height={12} borderRadius={5} style={{ marginBottom: 10 }} />

      {/* Category rows */}
      <CategoryRow />
      <CategoryRow />
      <CategoryRow />
      <CategoryRow />

      {/* Total row */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: 12,
          marginTop: 4,
        }}
      >
        <SkeletonBox width={100} height={14} borderRadius={6} />
        <SkeletonBox width={80} height={14} borderRadius={6} />
      </View>

      {/* Ahorro section */}
      <SkeletonBox width={80} height={12} borderRadius={5} style={{ marginTop: 16, marginBottom: 8 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 }}>
        <SkeletonBox width={100} height={14} borderRadius={6} />
        <SkeletonBox width={80} height={14} borderRadius={6} />
      </View>

      {/* Advanced button */}
      <SkeletonBox width="100%" height={48} borderRadius={16} style={{ marginTop: 24 }} />
    </View>
  );
}
