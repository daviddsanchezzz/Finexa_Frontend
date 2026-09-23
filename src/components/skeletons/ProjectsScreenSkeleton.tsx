import React from 'react';
import { View } from 'react-native';
import { SkeletonBox } from './SkeletonBox';
import { useTheme } from '../../context/ThemeContext';

const BLUE_SKELETON = 'rgba(255,255,255,0.25)';

function StatSkeleton() {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
      <SkeletonBox width={64} height={9} borderRadius={4} />
      <SkeletonBox width={72} height={14} borderRadius={5} />
    </View>
  );
}

function ProjectCardSkeleton() {
  const { colors } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 10,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <SkeletonBox width="45%" height={14} borderRadius={6} />
        <SkeletonBox width={60} height={14} borderRadius={6} style={{ marginLeft: 'auto' }} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <SkeletonBox width={64} height={16} borderRadius={999} />
        <View style={{ flexDirection: 'row', gap: 10, marginLeft: 'auto' }}>
          <SkeletonBox width={44} height={11} borderRadius={4} />
          <SkeletonBox width={44} height={11} borderRadius={4} />
        </View>
      </View>
    </View>
  );
}

export function ProjectsScreenSkeleton() {
  const { colors } = useTheme();
  return (
    <View>
      <View
        style={{
          backgroundColor: '#003cc5',
          borderRadius: 24,
          padding: 16,
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <SkeletonBox width={130} height={11} borderRadius={5} style={{ backgroundColor: BLUE_SKELETON }} />
        <SkeletonBox width={150} height={26} borderRadius={7} style={{ backgroundColor: BLUE_SKELETON, marginTop: 8 }} />
      </View>

      <View style={{ flexDirection: 'row', marginBottom: 16 }}>
        <StatSkeleton />
        <StatSkeleton />
        <StatSkeleton />
      </View>

      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 11, marginBottom: 16 }}>
        {[60, 50, 56].map((width, index) => (
          <View key={index} style={{ flex: 1, alignItems: 'center' }}>
            <SkeletonBox width={width} height={10} borderRadius={4} />
          </View>
        ))}
      </View>

      <ProjectCardSkeleton />
      <ProjectCardSkeleton />
      <ProjectCardSkeleton />
    </View>
  );
}
