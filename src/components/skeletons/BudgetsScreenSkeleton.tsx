import React from 'react';
import { View } from 'react-native';
import { SkeletonBox } from './SkeletonBox';

function BudgetCard() {
  return (
    <View
      style={{
        backgroundColor: 'white',
        borderRadius: 18,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        gap: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <SkeletonBox width={36} height={36} borderRadius={12} />
          <View style={{ gap: 5 }}>
            <SkeletonBox width={120} height={14} borderRadius={6} />
            <SkeletonBox width={72} height={11} borderRadius={5} />
          </View>
        </View>
        <SkeletonBox width={56} height={20} borderRadius={8} />
      </View>
      {/* Progress bar */}
      <SkeletonBox width="100%" height={6} borderRadius={999} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <SkeletonBox width={80} height={11} borderRadius={5} />
        <SkeletonBox width={80} height={11} borderRadius={5} />
      </View>
    </View>
  );
}

export function BudgetsScreenSkeleton() {
  return (
    <View style={{ paddingHorizontal: 20 }}>
      {/* Summary card (blue hero) */}
      <View
        style={{
          backgroundColor: '#003cc5',
          borderRadius: 22,
          padding: 16,
          marginBottom: 10,
          gap: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <SkeletonBox width={32} height={32} borderRadius={10} style={{ backgroundColor: 'rgba(255,255,255,0.18)' }} />
          <SkeletonBox width={120} height={14} borderRadius={6} style={{ backgroundColor: 'rgba(255,255,255,0.18)' }} />
        </View>
        <SkeletonBox width="100%" height={6} borderRadius={999} style={{ backgroundColor: 'rgba(255,255,255,0.18)' }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <SkeletonBox width={80} height={12} borderRadius={5} style={{ backgroundColor: 'rgba(255,255,255,0.14)' }} />
          <SkeletonBox width={80} height={12} borderRadius={5} style={{ backgroundColor: 'rgba(255,255,255,0.14)' }} />
        </View>
      </View>

      {/* Budget cards */}
      <BudgetCard />
      <BudgetCard />
      <BudgetCard />
    </View>
  );
}
