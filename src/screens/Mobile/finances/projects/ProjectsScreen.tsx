import React, { useCallback, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AppHeader from '../../../../components/AppHeader';
import AddButton from '../../../../components/AddButton';
import HeroBalanceCard from '../../../../components/HeroBalanceCard';
import StatsRow from '../../../../components/StatsRow';
import SegmentedTabs from '../../../../components/SegmentedTabs';
import { ProjectsScreenSkeleton } from '../../../../components/skeletons/ProjectsScreenSkeleton';
import { colors } from '../../../../theme/theme';
import { useProjectsQuery } from '../../../../hooks/useProjectsQuery';

type ProjectStatus = 'idea' | 'active' | 'paused' | 'completed' | 'cancelled';
type ProjectFilter = 'all' | 'active' | 'idea';

type ProjectItem = {
  id: number;
  name: string;
  description?: string | null;
  type?: string | null;
  status: ProjectStatus;
  startDate: string;
  endDate?: string | null;
  notes?: string | null;
  financials: {
    income: number;
    expense: number;
    result: number;
  };
};

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
  const projects: ProjectItem[] = projectsQuery.data ?? [];
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
        acc.income += Number(project.financials?.income || 0);
        acc.expense += Number(project.financials?.expense || 0);
        acc.result += Number(project.financials?.result || 0);
        return acc;
      },
      { income: 0, expense: 0, result: 0 },
    );
  }, [projects]);

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
              label="Rentabilidad global"
              value={formatCurrency(totals.result)}
              style={{ marginBottom: 8 }}
            />

            <StatsRow
              items={[
                { key: 'ingresos', label: 'INGRESOS', value: formatCurrency(totals.income), color: colors.success },
                { key: 'gastos', label: 'GASTOS', value: formatCurrency(totals.expense), color: colors.danger },
                { key: 'proyectos', label: 'PROYECTOS', value: String(projects.length) },
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
                const result = Number(project.financials?.result || 0);
                const resultColor = result >= 0 ? colors.success : colors.danger;
                const badgeColors = STATUS_COLORS[project.status];

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
                      <Text style={{ fontSize: 15, fontWeight: '700', color: resultColor, marginLeft: 8 }}>
                        {formatCurrency(result)}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: badgeColors.bg }}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: badgeColors.text }}>
                          {STATUS_LABELS[project.status]}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                          <Ionicons name="arrow-up" size={11} color={colors.success} />
                          <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.success }}>
                            {formatCurrency(project.financials?.income || 0)}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                          <Ionicons name="arrow-down" size={11} color={colors.danger} />
                          <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.danger }}>
                            {formatCurrency(project.financials?.expense || 0)}
                          </Text>
                        </View>
                      </View>
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
