import React from 'react';
import { View, Dimensions } from 'react-native';
import { SkeletonBox } from './SkeletonBox';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W * 0.72;

function TripCard() {
  return (
    <View
      style={{
        width: CARD_W,
        backgroundColor: 'white',
        borderRadius: 22,
        padding: 16,
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        gap: 10,
      }}
    >
      <SkeletonBox width="100%" height={110} borderRadius={14} />
      <SkeletonBox width={70} height={20} borderRadius={8} />
      <SkeletonBox width="70%" height={16} borderRadius={6} />
      <SkeletonBox width="45%" height={12} borderRadius={5} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <SkeletonBox width={72} height={11} borderRadius={5} />
        <SkeletonBox width={72} height={11} borderRadius={5} />
      </View>
    </View>
  );
}

export function TravelsScreenSkeleton() {
  return (
    <View style={{ paddingTop: 8 }}>
      {/* Section label */}
      <View style={{ paddingHorizontal: 20, marginBottom: 10 }}>
        <SkeletonBox width={100} height={13} borderRadius={5} />
      </View>

      {/* Trip cards horizontal */}
      <View style={{ paddingLeft: 20, flexDirection: 'row', paddingBottom: 16 }}>
        <TripCard />
        <TripCard />
      </View>

      {/* Second group */}
      <View style={{ paddingHorizontal: 20, marginBottom: 10, marginTop: 8 }}>
        <SkeletonBox width={120} height={13} borderRadius={5} />
      </View>
      <View style={{ paddingLeft: 20, flexDirection: 'row' }}>
        <TripCard />
      </View>
    </View>
  );
}
