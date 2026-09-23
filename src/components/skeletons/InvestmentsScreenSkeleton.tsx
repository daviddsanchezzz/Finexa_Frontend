import React from 'react';
import { View } from 'react-native';
import { SkeletonBox } from './SkeletonBox';
import { useTheme } from '../../context/ThemeContext';

const DONUT_SIZE = 148;

function AssetRow() {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 18,
        paddingVertical: 12,
        paddingHorizontal: 14,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: colors.border,
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
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 10,
        backgroundColor: even ? colors.surface : colors.card,
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
  const { colors } = useTheme();
  return (
    <View style={{ paddingHorizontal: 20 }}>
      {/* Hero card — mismo lenguaje visual que el Patrimonio neto de Inicio */}
      <View
        style={{
          backgroundColor: '#003cc5',
          borderRadius: 16,
          paddingVertical: 16,
          paddingHorizontal: 16,
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <SkeletonBox width={110} height={11} borderRadius={5} style={{ backgroundColor: 'rgba(255,255,255,0.35)' }} />
        <SkeletonBox width={170} height={28} borderRadius={7} style={{ backgroundColor: 'rgba(255,255,255,0.28)', marginTop: 8 }} />
        <SkeletonBox width={190} height={11} borderRadius={5} style={{ backgroundColor: 'rgba(255,255,255,0.2)', marginTop: 8 }} />
      </View>

      {/* Indicadores: Invertido / Ganancia / Rentabilidad */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <SkeletonBox width={62} height={10} borderRadius={4} />
            <SkeletonBox width={70} height={14} borderRadius={5} style={{ marginTop: 6 }} />
          </View>
        ))}
      </View>

      {/* Tabs: Cartera / Distribución / Rentabilidad / Operaciones */}
      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 14, paddingBottom: 11 }}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <SkeletonBox width={i === 0 ? 52 : 64} height={11} borderRadius={5} />
          </View>
        ))}
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
          backgroundColor: colors.surface,
          borderRadius: 24,
          padding: 16,
          marginBottom: 10,
          borderWidth: 1,
          borderColor: colors.border,
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
              borderColor: colors.border,
              backgroundColor: colors.surface,
            }}
          />
        </View>
      </View>

      {/* Rendimiento mensual */}
      <SkeletonBox width={170} height={12} borderRadius={5} style={{ marginTop: 14, marginBottom: 10 }} />

      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: colors.border,
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
            backgroundColor: colors.card,
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
