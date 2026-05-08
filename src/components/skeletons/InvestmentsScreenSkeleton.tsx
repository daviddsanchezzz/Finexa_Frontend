import React from 'react';
import { View } from 'react-native';
import { SkeletonBox } from './SkeletonBox';

const DONUT_SIZE = 148;

function AssetRow() {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 18,
        paddingVertical: 12,
        paddingHorizontal: 14,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#EEF2F7',
      }}
    >
      <SkeletonBox width={40} height={40} borderRadius={14} style={{ marginRight: 12 }} />
      <View style={{ flex: 1, gap: 6 }}>
        <SkeletonBox width="50%" height={13} borderRadius={6} />
        <SkeletonBox width="30%" height={10} borderRadius={5} />
      </View>
      <View style={{ alignItems: 'flex-end', gap: 5 }}>
        <SkeletonBox width={52} height={13} borderRadius={6} />
        <SkeletonBox width={68} height={10} borderRadius={5} />
      </View>
      <SkeletonBox width={14} height={14} borderRadius={4} style={{ marginLeft: 8 }} />
    </View>
  );
}

function SnapshotRow({ even }: { even: boolean }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 10,
        backgroundColor: even ? 'white' : '#FAFAFA',
        gap: 18,
      }}
    >
      <SkeletonBox width={60} height={12} borderRadius={5} />
      <SkeletonBox width={80} height={12} borderRadius={5} />
      <SkeletonBox width={80} height={12} borderRadius={5} />
      <SkeletonBox width={76} height={12} borderRadius={5} />
      <SkeletonBox width={76} height={12} borderRadius={5} />
      <SkeletonBox width={52} height={12} borderRadius={5} />
    </View>
  );
}

export function InvestmentsScreenSkeleton() {
  return (
    <View style={{ paddingHorizontal: 20 }}>
      {/* Hero card */}
      <View
        style={{
          backgroundColor: '#003cc5',
          borderRadius: 26,
          padding: 16,
          marginBottom: 16,
        }}
      >
        {/* Top row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <SkeletonBox width={42} height={42} borderRadius={16} style={{ backgroundColor: 'rgba(255,255,255,0.18)' }} />
            <View style={{ gap: 6 }}>
              <SkeletonBox width={90} height={16} borderRadius={6} style={{ backgroundColor: 'rgba(255,255,255,0.18)' }} />
              <SkeletonBox width={130} height={11} borderRadius={5} style={{ backgroundColor: 'rgba(255,255,255,0.12)' }} />
            </View>
          </View>
          <SkeletonBox width={64} height={28} borderRadius={999} style={{ backgroundColor: 'rgba(255,255,255,0.18)' }} />
        </View>

        {/* Value */}
        <View style={{ marginTop: 14, gap: 6 }}>
          <SkeletonBox width={100} height={11} borderRadius={5} style={{ backgroundColor: 'rgba(255,255,255,0.12)' }} />
          <SkeletonBox width={200} height={30} borderRadius={8} style={{ backgroundColor: 'rgba(255,255,255,0.18)' }} />
        </View>

        {/* Sub cards */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(255,255,255,0.14)',
              borderRadius: 18,
              padding: 12,
              gap: 8,
            }}
          >
            <SkeletonBox width={60} height={11} borderRadius={5} style={{ backgroundColor: 'rgba(255,255,255,0.18)' }} />
            <SkeletonBox width={90} height={16} borderRadius={6} style={{ backgroundColor: 'rgba(255,255,255,0.18)' }} />
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(255,255,255,0.14)',
              borderRadius: 18,
              padding: 12,
              gap: 8,
            }}
          >
            <SkeletonBox width={68} height={11} borderRadius={5} style={{ backgroundColor: 'rgba(255,255,255,0.18)' }} />
            <SkeletonBox width={90} height={16} borderRadius={6} style={{ backgroundColor: 'rgba(255,255,255,0.18)' }} />
          </View>
        </View>
      </View>

      {/* Section label */}
      <SkeletonBox width={90} height={12} borderRadius={5} style={{ marginBottom: 10 }} />

      {/* Asset list */}
      <AssetRow />
      <AssetRow />
      <AssetRow />

      {/* Distribución */}
      <SkeletonBox width={110} height={12} borderRadius={5} style={{ marginTop: 14, marginBottom: 10 }} />

      <View
        style={{
          backgroundColor: 'white',
          borderRadius: 24,
          padding: 16,
          marginBottom: 10,
          borderWidth: 1,
          borderColor: '#E5E7EB',
          gap: 14,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <SkeletonBox width={70} height={14} borderRadius={6} />
          <SkeletonBox width={32} height={32} borderRadius={10} />
        </View>
        {/* Donut circle placeholder */}
        <View style={{ alignItems: 'center' }}>
          <View
            style={{
              width: DONUT_SIZE,
              height: DONUT_SIZE,
              borderRadius: DONUT_SIZE / 2,
              borderWidth: 14,
              borderColor: '#E8EAED',
              backgroundColor: 'white',
            }}
          />
        </View>
      </View>

      {/* Rendimiento mensual */}
      <SkeletonBox width={170} height={12} borderRadius={5} style={{ marginTop: 14, marginBottom: 10 }} />

      <View
        style={{
          backgroundColor: 'white',
          borderRadius: 24,
          borderWidth: 1,
          borderColor: '#E5E7EB',
          overflow: 'hidden',
          marginBottom: 10,
        }}
      >
        {/* Header row */}
        <View
          style={{
            flexDirection: 'row',
            paddingVertical: 10,
            paddingHorizontal: 10,
            backgroundColor: 'rgba(15,23,42,0.04)',
            gap: 18,
          }}
        >
          <SkeletonBox width={60} height={10} borderRadius={4} />
          <SkeletonBox width={80} height={10} borderRadius={4} />
          <SkeletonBox width={80} height={10} borderRadius={4} />
          <SkeletonBox width={76} height={10} borderRadius={4} />
          <SkeletonBox width={76} height={10} borderRadius={4} />
          <SkeletonBox width={52} height={10} borderRadius={4} />
        </View>
        <SnapshotRow even={true} />
        <SnapshotRow even={false} />
        <SnapshotRow even={true} />
        <SnapshotRow even={false} />
      </View>
    </View>
  );
}
