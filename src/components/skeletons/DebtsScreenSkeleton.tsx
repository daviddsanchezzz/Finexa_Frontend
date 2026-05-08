import React from 'react';
import { View } from 'react-native';
import { SkeletonBox } from './SkeletonBox';

function DebtCard() {
  return (
    <View
      style={{
        backgroundColor: 'white',
        borderRadius: 18,
        padding: 14,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <SkeletonBox width={42} height={42} borderRadius={14} />
      <View style={{ flex: 1, gap: 6 }}>
        <SkeletonBox width="50%" height={13} borderRadius={6} />
        <SkeletonBox width="35%" height={10} borderRadius={5} />
      </View>
      <View style={{ alignItems: 'flex-end', gap: 5 }}>
        <SkeletonBox width={64} height={13} borderRadius={6} />
        <SkeletonBox width={48} height={10} borderRadius={5} />
      </View>
    </View>
  );
}

export function DebtsScreenSkeleton() {
  return (
    <View style={{ paddingHorizontal: 20 }}>
      {/* Summary card (primary blue) */}
      <View
        style={{
          backgroundColor: '#003cc5',
          borderRadius: 24,
          padding: 16,
          marginBottom: 8,
          gap: 14,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ gap: 6 }}>
            <SkeletonBox width={100} height={11} borderRadius={5} style={{ backgroundColor: 'rgba(255,255,255,0.14)' }} />
            <SkeletonBox width={120} height={24} borderRadius={7} style={{ backgroundColor: 'rgba(255,255,255,0.18)' }} />
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <SkeletonBox width={110} height={11} borderRadius={5} style={{ backgroundColor: 'rgba(255,255,255,0.14)' }} />
            <SkeletonBox width={90} height={20} borderRadius={7} style={{ backgroundColor: 'rgba(255,255,255,0.18)' }} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ gap: 5 }}>
            <SkeletonBox width={120} height={10} borderRadius={4} style={{ backgroundColor: 'rgba(255,255,255,0.12)' }} />
            <SkeletonBox width={72} height={13} borderRadius={5} style={{ backgroundColor: 'rgba(255,255,255,0.16)' }} />
          </View>
          <View style={{ alignItems: 'flex-end', gap: 5 }}>
            <SkeletonBox width={80} height={10} borderRadius={4} style={{ backgroundColor: 'rgba(255,255,255,0.12)' }} />
            <SkeletonBox width={40} height={13} borderRadius={5} style={{ backgroundColor: 'rgba(255,255,255,0.16)' }} />
          </View>
        </View>
      </View>

      {/* Yo debo / Me deben sub-cards */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
        <View
          style={{
            flex: 1,
            borderRadius: 18,
            padding: 12,
            backgroundColor: 'white',
            borderWidth: 1,
            borderColor: '#E5E7EB',
            gap: 6,
          }}
        >
          <SkeletonBox width={60} height={10} borderRadius={4} />
          <SkeletonBox width={80} height={14} borderRadius={6} />
        </View>
        <View
          style={{
            flex: 1,
            borderRadius: 18,
            padding: 12,
            backgroundColor: 'white',
            borderWidth: 1,
            borderColor: '#E5E7EB',
            gap: 6,
          }}
        >
          <SkeletonBox width={68} height={10} borderRadius={4} />
          <SkeletonBox width={80} height={14} borderRadius={6} />
        </View>
      </View>

      {/* Filter pills */}
      <SkeletonBox width="100%" height={44} borderRadius={16} style={{ marginBottom: 14 }} />

      {/* Debt cards */}
      <DebtCard />
      <DebtCard />
      <DebtCard />
    </View>
  );
}
