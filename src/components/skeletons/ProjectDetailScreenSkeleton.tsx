import React from 'react';
import { View } from 'react-native';
import { SkeletonBox } from './SkeletonBox';

const BLUE_SKELETON = 'rgba(255,255,255,0.25)';

function StatSkeleton() {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
      <SkeletonBox width={68} height={9} borderRadius={4} />
      <SkeletonBox width={76} height={14} borderRadius={5} />
    </View>
  );
}

function InfoRowSkeleton() {
  return (
    <View style={{ paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#E8EDF4' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <SkeletonBox width={90} height={10} borderRadius={4} />
        <SkeletonBox width={80} height={12} borderRadius={5} style={{ marginLeft: 'auto' }} />
      </View>
    </View>
  );
}

export function ProjectDetailScreenSkeleton() {
  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 20 }}>
        <View
          style={{
            height: 100,
            borderRadius: 20,
            backgroundColor: '#003cc5',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 9,
          }}
        >
          <SkeletonBox width={110} height={10} borderRadius={4} style={{ backgroundColor: BLUE_SKELETON }} />
          <SkeletonBox width={140} height={27} borderRadius={7} style={{ backgroundColor: BLUE_SKELETON, marginTop: 8 }} />
        </View>

        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
          <StatSkeleton />
          <StatSkeleton />
        </View>
      </View>

      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingBottom: 11, paddingHorizontal: 20 }}>
        {[70, 90, 56].map((width, index) => (
          <View key={index} style={{ flex: 1, alignItems: 'center' }}>
            <SkeletonBox width={width} height={10} borderRadius={4} />
          </View>
        ))}
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 15 }}>
        <SkeletonBox width={70} height={18} borderRadius={999} style={{ marginBottom: 14 }} />
        <InfoRowSkeleton />
        <InfoRowSkeleton />
        <InfoRowSkeleton />
      </View>
    </View>
  );
}
