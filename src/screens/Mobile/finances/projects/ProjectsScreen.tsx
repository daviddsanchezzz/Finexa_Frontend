import React, { useCallback, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AppHeader from '../../../../components/AppHeader';
import AddButton from '../../../../components/AddButton';
import HeroBalanceCard from '../../../../components/HeroBalanceCard';
import StatsRow from '../../../../components/StatsRow';
import SegmentedTabs from '../../../../components/SegmentedTabs';
import { ProjectsScreenSkeleton } from '../../../../components/skeletons/ProjectsScreenSkeleton';
import { colors } from '../../../../theme/theme';
import { useProjectsQuery } from '../../../../hooks/useProjectsQuery';
import { ProjectListItem, ProjectStatus } from '../../../../types/project';

type ProjectFilter = 'all' | 'active' | 'idea';

const STATUS_LABELS: Record<ProjectStatus, string> = {
  idea: 'Idea',
  active: 'Activo',
  paused: 'Pausado',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

const STATUS_COLORS: Record<ProjectStatus, { bg: string; text: string }> = {
  idea: { bg: '#EEF2FF', text: '#4F46E5' },
  active: { bg: '#ECFDF3', text: '#15803D' },
  paused: { bg: '#FFF7ED', text: '#C2410C' },
  completed: { bg: '#E0F2FE', text: '#0369A1' },
  cancelled: { bg: '#FEF2F2', text: '#B91C1C' },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export default function ProjectsScreen({ navigation, isPinnedModuleTab = false }: any) {
  const projectsQuery = useProjectsQuery();
  const projects: ProjectListItem[] = projectsQuery.data ?? [];
  const loading = projectsQuery.isLoading;
  const [filter, setFilter] = useState<ProjectFilter>('all');

  useFocusEffect(
    useCallback(() => {
      projectsQuery.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const totals = useMemo(() => {
    return projects.reduce(
      (acc, project) => {
        acc.myProfit += Number(project.financials?.myProfit || 0);
        acc.myWithdrawnProfit += Number(project.financials?.myWithdrawnProfit || 0);
        return acc;
      },
      { myProfit: 0, myWithdrawnProfit: 0 },
    );
  }, [projects]);

  const myPending = totals.myProfit - totals.myWithdrawnProfit;

  const filteredProjects = useMemo(() => {
    if (filter === 'all') return projects;
    return projects.filter((project) => project.status === filter);
  }, [projects, filter]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pb-2">
        <AppHeader
          title="Proyectos"
          showProfile={false}
          showDatePicker={false}
          showBack={!isPinnedModuleTab}
          rightElement={<AddButton label="Añadir" onPress={() => navigation.navigate('ProjectForm')} />}
        />
      </View>

      {loading ? (
        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 42 }}>
          <ProjectsScreenSkeleton />
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
            <HeroBalanceCard
              label="MI BENEFICIO"
              value={formatCurrency(totals.myProfit)}
              style={{ marginBottom: 8 }}
            />

            <StatsRow
              items={[
                {
                  key: 'generado',
                  label: 'GENERADO',
                  value: formatCurrency(totals.myProfit),
                  color: totals.myProfit >= 0 ? colors.success : colors.danger,
                },
                { key: 'retirado', label: 'RETIRADO', value: formatCurrency(totals.myWithdrawnProfit) },
                {
                  key: 'pendiente',
                  label: 'PENDIENTE',
                  value: formatCurrency(myPending),
                  color: myPending >= 0 ? colors.success : colors.danger,
                },
              ]}
            />
          </View>

          <SegmentedTabs<ProjectFilter>
            variant="underline"
            options={[
              { key: 'active', label: 'Activos' },
              { key: 'idea', label: 'Ideas' },
              { key: 'all', label: 'Todos' },
            ]}
            value={filter}
            onChange={setFilter}
          />

          <ScrollView
            className="flex-1 px-5"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 42, paddingTop: 14 }}
          >
            {filteredProjects.length === 0 ? (
              <Text className="text-center text-gray-400 mb-4 text-sm">
                {projects.length === 0
                  ? 'Aún no tienes proyectos. Crea uno para empezar a medir su rentabilidad.'
                  : 'No hay proyectos en este estado.'}
              </Text>
            ) : (
              filteredProjects.map((project) => {
                const myProfit = Number(project.financials?.myProfit || 0);
                const myProfitColor = myProfit >= 0 ? colors.success : colors.danger;
                const projectResult = Number(project.financials?.result || 0);
                const resultColor = projectResult >= 0 ? colors.success : colors.danger;
                const badgeColors = STATUS_COLORS[project.status];
                const hasActivity =
                  Number(project.financials?.income || 0) !== 0 ||
                  Number(project.financials?.expense || 0) !== 0 ||
                  Number(project.financials?.myPercentage || 100) !== 100;

                return (
                  <TouchableOpacity
                    key={project.id}
                    onPress={() => navigation.navigate('ProjectDetail', { projectId: project.id })}
                    activeOpacity={0.85}
                    style={{
                      backgroundColor: 'white',
                      borderRadius: 18,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      marginBottom: 10,
                      shadowColor: '#000',
                      shadowOpacity: 0.04,
                      shadowRadius: 6,
                      elevation: 1,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <Text
                        style={{ flex: 1, fontSize: 15, fontWeight: '700', color: '#0F172A' }}
                        numberOfLines={1}
                      >
                        {project.name}
                      </Text>
                      {hasActivity && (
                        <Text style={{ fontSize: 15, fontWeight: '700', color: myProfitColor, marginLeft: 8 }}>
                          {formatCurrency(myProfit)}
                        </Text>
                      )}
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: badgeColors.bg }}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: badgeColors.text }}>
                          {STATUS_LABELS[project.status]}
                          {hasActivity ? ` · ${project.financials.myPercentage}%` : ''}
                        </Text>
                      </View>
                      {hasActivity ? (
                        <Text style={{ fontSize: 11, fontWeight: '600', color: resultColor }}>
                          Resultado proyecto: {formatCurrency(projectResult)}
                        </Text>
                      ) : (
                        <Text style={{ fontSize: 11, color: '#94A3B8' }}>Sin movimientos todavía</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}
