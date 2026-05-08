import React from 'react';
import { View } from 'react-native';
import { SkeletonBox } from './SkeletonBox';

function TransactionRow() {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
      }}
    >
      <SkeletonBox width={40} height={40} borderRadius={14} style={{ marginRight: 12 }} />
      <View style={{ flex: 1, gap: 6 }}>
        <SkeletonBox width="55%" height={13} borderRadius={6} />
        <SkeletonBox width="35%" height={11} borderRadius={5} />
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <SkeletonBox width={64} height={13} borderRadius={6} />
        <SkeletonBox width={40} height={10} borderRadius={5} />
      </View>
    </View>
  );
}

function DayGroup() {
  return (
    <View style={{ marginBottom: 8 }}>
      <SkeletonBox width={100} height={12} borderRadius={5} style={{ marginVertical: 10 }} />
      <TransactionRow />
      <TransactionRow />
      <TransactionRow />
    </View>
  );
}

export function HomeScreenSkeleton() {
  return (
    <>
      {/* Hero card */}
      <View
        style={{
          backgroundColor: '#003cc5',
          borderRadius: 24,
          padding: 24,
          marginBottom: 16,
          alignItems: 'center',
          gap: 10,
        }}
      >
        <SkeletonBox width={160} height={14} borderRadius={6} style={{ backgroundColor: 'rgba(255,255,255,0.18)' }} />
        <SkeletonBox width={180} height={32} borderRadius={8} style={{ marginTop: 4, backgroundColor: 'rgba(255,255,255,0.18)' }} />
      </View>

      {/* Indicators */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
          <SkeletonBox width={64} height={11} borderRadius={5} />
          <SkeletonBox width={88} height={18} borderRadius={7} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
          <SkeletonBox width={64} height={11} borderRadius={5} />
          <SkeletonBox width={88} height={18} borderRadius={7} />
        </View>
      </View>

      {/* Transaction list */}
      <View style={{ marginTop: 16 }}>
        <DayGroup />
        <DayGroup />
      </View>
    </>
  );
}
