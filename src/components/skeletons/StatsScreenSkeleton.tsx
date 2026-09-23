import React from 'react';
import { View } from 'react-native';
import { SkeletonBox } from './SkeletonBox';
import { useTheme } from '../../context/ThemeContext';

function KpiCardSkeleton() {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: 10,
        paddingHorizontal: 12,
        gap: 6,
      }}
    >
      <SkeletonBox width="60%" height={11} borderRadius={5} />
      <SkeletonBox width="75%" height={16} borderRadius={6} />
      <SkeletonBox width="80%" height={10} borderRadius={5} />
    </View>
  );
}

function FinancialRowSkeleton({ first }: { first?: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 9,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <SkeletonBox width={6} height={6} borderRadius={3} />
        <SkeletonBox width={90} height={12} borderRadius={5} />
      </View>
      <SkeletonBox width={70} height={13} borderRadius={5} />
    </View>
  );
}

function InsightRowSkeleton({ first }: { first?: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.border,
        gap: 12,
      }}
    >
      <SkeletonBox width={30} height={30} borderRadius={9} />
      <View style={{ flex: 1, gap: 6 }}>
        <SkeletonBox width="80%" height={12} borderRadius={5} />
        <SkeletonBox width="45%" height={10} borderRadius={5} />
      </View>
    </View>
  );
}

// Refleja la pestaña "Resumen" (la que se ve al abrir Estadísticas): mismos
// radios, paddings y proporciones que el layout real para que la carga no
// dé una sensación de salto al llegar los datos.
export function StatsScreenSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={{ paddingHorizontal: 20, gap: 20 }}>
      {/* Tabs Resumen/Gastos/Ingresos/Evolución */}
      <SkeletonBox width="100%" height={44} borderRadius={13} />

      {/* Título + subtítulo */}
      <View style={{ gap: 11 }}>
        <View style={{ gap: 6 }}>
          <SkeletonBox width={170} height={19} borderRadius={6} />
          <SkeletonBox width={230} height={12} borderRadius={5} />
        </View>

        {/* 3 KPI cards */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <KpiCardSkeleton />
          <KpiCardSkeleton />
          <KpiCardSkeleton />
        </View>

        {/* Tasa de ahorro */}
        <View style={{ paddingTop: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 }}>
            <SkeletonBox width={90} height={13} borderRadius={5} />
            <SkeletonBox width={50} height={15} borderRadius={5} />
          </View>
          <SkeletonBox width="100%" height={3} borderRadius={2} style={{ marginTop: 10 }} />
        </View>
      </View>

      {/* Card "Ingresos vs gastos" */}
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 14,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
          <SkeletonBox width={120} height={13} borderRadius={5} />
          <SkeletonBox width={90} height={11} borderRadius={5} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12, height: 100, paddingLeft: 42 }}>
          {[0.55, 0.7, 0.5, 0.8, 0.65, 1].map((h, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
              <View style={{ flexDirection: 'row', gap: 3, alignItems: 'flex-end' }}>
                <SkeletonBox width={9} height={100 * h} borderRadius={3} />
                <SkeletonBox width={9} height={100 * h * 0.55} borderRadius={3} />
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Comparado con... */}
      <View>
        <SkeletonBox width={190} height={15} borderRadius={5} style={{ marginBottom: 8 }} />
        <FinancialRowSkeleton first />
        <FinancialRowSkeleton />
        <FinancialRowSkeleton />
      </View>

      {/* Insights */}
      <View>
        <SkeletonBox width={110} height={15} borderRadius={5} style={{ marginBottom: 4 }} />
        <InsightRowSkeleton first />
        <InsightRowSkeleton />
        <InsightRowSkeleton />
      </View>
    </View>
  );
}
