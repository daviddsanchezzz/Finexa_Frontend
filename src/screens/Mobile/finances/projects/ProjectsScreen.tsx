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
import { formatEuro, signColor } from '../../../../utils/currency';

type ProjectFilter = 'all' | 'active' | 'idea';

const STATUS_LABELS: Record<ProjectStatus, string> = {
  idea: 'Idea',
  active: 'Activo',
  paused: 'Pausado',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

function formatCurrency(value: number) {
  return `${formatEuro(Number(value || 0))} €`;
}

function formatPercentage(value: number) {
  const rounded = Math.round(Number(value || 0) * 100) / 100;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(2)}%`;
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
                  color: signColor(totals.myProfit, colors.success, colors.danger, '#0F172A'),
                },
                { key: 'retirado', label: 'RETIRADO', value: formatCurrency(totals.myWithdrawnProfit) },
                {
                  key: 'pendiente',
                  label: 'PENDIENTE',
                  value: formatCurrency(myPending),
                  color: signColor(myPending, colors.success, colors.danger, '#0F172A'),
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
                const myProfitColor = signColor(myProfit, colors.success, colors.danger, '#0F172A');
                const projectResult = Number(project.financials?.result || 0);
                const hasActivity =
                  Number(project.financials?.income || 0) !== 0 ||
                  Number(project.financials?.expense || 0) !== 0 ||
                  Number(project.financials?.myPercentage || 100) !== 100;
                const statusText =
                  project.status === 'active'
                    ? formatPercentage(project.financials?.myPercentage ?? 100)
                    : `${STATUS_LABELS[project.status]}${hasActivity ? ` · ${formatPercentage(project.financials?.myPercentage ?? 100)}` : ''}`;

                return (
                  <TouchableOpacity
                    key={project.id}
                    onPress={() => navigation.navigate('ProjectDetail', { projectId: project.id })}
                    activeOpacity={0.85}
                    style={{
                      backgroundColor: 'white',
                      borderRadius: 16,
                      paddingHorizontal: 14,
                      paddingVertical: 13,
                      marginBottom: 10,
                      shadowColor: '#000',
                      shadowOpacity: 0.03,
                      shadowRadius: 5,
                      elevation: 1,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text
                        style={{ flex: 1, fontSize: 14.5, fontWeight: '600', color: '#0F172A' }}
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

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      <Text style={{ fontSize: 11.5, color: '#94A3B8', fontWeight: '500' }}>{statusText}</Text>
                      {hasActivity ? (
                        <Text style={{ fontSize: 11.5, color: '#94A3B8' }}>
                          Resultado proyecto: {formatCurrency(projectResult)}
                        </Text>
                      ) : (
                        <Text style={{ fontSize: 11.5, color: '#94A3B8' }}>Sin movimientos todavía</Text>
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
