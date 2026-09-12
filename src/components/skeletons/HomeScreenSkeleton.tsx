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
      {/* Patrimonio neto (card azul) */}
      <View
        style={{
          backgroundColor: '#003cc5',
          borderRadius: 20,
          paddingVertical: 16,
          paddingHorizontal: 16,
          marginBottom: 10,
          alignItems: 'center',
          gap: 8,
        }}
      >
        <SkeletonBox width={110} height={11} borderRadius={5} style={{ backgroundColor: 'rgba(255,255,255,0.18)' }} />
        <SkeletonBox width={150} height={28} borderRadius={8} style={{ backgroundColor: 'rgba(255,255,255,0.18)' }} />
        <SkeletonBox width={120} height={11} borderRadius={5} style={{ backgroundColor: 'rgba(255,255,255,0.14)' }} />
      </View>

      {/* Balance del periodo */}
      <View style={{ alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <SkeletonBox width={100} height={10} borderRadius={5} />
        <SkeletonBox width={130} height={22} borderRadius={7} />
      </View>

      {/* Indicadores: Ingresos / Gastos / Rentabilidad */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
        <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
          <SkeletonBox width={60} height={10} borderRadius={5} />
          <SkeletonBox width={72} height={16} borderRadius={6} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
          <SkeletonBox width={60} height={10} borderRadius={5} />
          <SkeletonBox width={72} height={16} borderRadius={6} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
          <SkeletonBox width={70} height={10} borderRadius={5} />
          <SkeletonBox width={72} height={16} borderRadius={6} />
        </View>
      </View>

      {/* Transaction list */}
      <View style={{ marginTop: 6 }}>
        <DayGroup />
        <DayGroup />
      </View>
    </>
  );
}
