import React from 'react';
import { View } from 'react-native';
import { radii } from '../../theme/theme';
import { useTheme } from '../../context/ThemeContext';
import { SkeletonBox } from './SkeletonBox';

function GoalSummarySkeleton({ detail = false }: { detail?: boolean }) {
  const { colors } = useTheme();
  const white = { backgroundColor: 'rgba(255,255,255,0.25)' };
  return (
    <>
      <View style={{ paddingHorizontal: 20 }}>
        <View style={{ backgroundColor: colors.primary, borderRadius: radii.card, paddingHorizontal: 14, paddingVertical: 12, alignItems: 'center' }}>
          <SkeletonBox width={detail ? 70 : 160} height={12} borderRadius={4} style={white} />
          <SkeletonBox width={140} height={30} borderRadius={7} style={{ ...white, marginTop: 6 }} />
          <SkeletonBox height={6} borderRadius={999} style={{ ...white, marginTop: 10 }} />
          <SkeletonBox width={120} height={11} borderRadius={4} style={{ ...white, marginTop: 6 }} />
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
          {Array.from({ length: detail ? 2 : 3 }, (_, index) => (
            <View key={index} style={{ flex: 1, alignItems: 'center', gap: 5 }}>
              <SkeletonBox width="75%" height={11} borderRadius={4} />
              <SkeletonBox width="70%" height={16} borderRadius={5} />
            </View>
          ))}
        </View>
      </View>
      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, marginTop: 12, paddingVertical: 12 }}>
        {Array.from({ length: detail ? 2 : 3 }, (_, index) => (
          <View key={index} style={{ flex: 1, alignItems: 'center' }}>
            <SkeletonBox width={70} height={12} borderRadius={4} />
          </View>
        ))}
      </View>
    </>
  );
}

export function GoalsScreenSkeleton() {
  const { colors } = useTheme();
  return (
    <View accessibilityLabel="Cargando objetivos" accessibilityState={{ busy: true }}>
      <GoalSummarySkeleton />
      <View style={{ paddingHorizontal: 14, paddingTop: 14, gap: 12 }}>
        {[0, 1, 2].map((index) => (
          <View key={index} style={{ backgroundColor: colors.surface, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <SkeletonBox width={24} height={24} borderRadius={6} />
              <View style={{ flex: 1 }}><SkeletonBox width="80%" height={14} borderRadius={4} /></View>
              <SkeletonBox width={80} height={14} borderRadius={4} />
            </View>
            <SkeletonBox height={8} borderRadius={999} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
              <SkeletonBox width={80} height={11} borderRadius={4} />
              <SkeletonBox width={110} height={11} borderRadius={4} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export function GoalDetailScreenSkeleton() {
  const { colors } = useTheme();
  return (
    <View accessibilityLabel="Cargando objetivo" accessibilityState={{ busy: true }}>
      <GoalSummarySkeleton detail />
      <View style={{ paddingHorizontal: 20, paddingTop: 14, gap: 16 }}>
        <View style={{ backgroundColor: colors.surface, borderRadius: radii.card, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 16 }}>
          <SkeletonBox width="85%" height={13} borderRadius={4} />
          {[0, 1, 2].map((index) => (
            <View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <SkeletonBox width="30%" height={12} borderRadius={4} />
              <SkeletonBox width="45%" height={13} borderRadius={4} />
            </View>
          ))}
        </View>
        <View style={{ backgroundColor: colors.surface, borderRadius: radii.card, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 14 }}>
          <SkeletonBox width={130} height={11} borderRadius={4} />
          {[0, 1].map((index) => (
            <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <SkeletonBox width={24} height={24} borderRadius={7} />
              <View style={{ flex: 1 }}><SkeletonBox width="70%" height={13} borderRadius={4} /></View>
              <SkeletonBox width={80} height={14} borderRadius={4} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
