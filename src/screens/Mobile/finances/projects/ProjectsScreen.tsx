import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../../../api/api';
import AppHeader from '../../../../components/AppHeader';
import AddButton from '../../../../components/AddButton';
import HeroBalanceCard from '../../../../components/HeroBalanceCard';
import StatsRow from '../../../../components/StatsRow';
import SegmentedTabs from '../../../../components/SegmentedTabs';
import { colors } from '../../../../theme/theme';

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
    totalIncome: number;
    totalExpense: number;
    balance: number;
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
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [filter, setFilter] = useState<ProjectFilter>('all');

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/projects');
      setProjects(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Error al cargar proyectos:', error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProjects();
    }, [fetchProjects]),
  );

  const totals = useMemo(() => {
    return projects.reduce(
      (acc, project) => {
        acc.income += Number(project.financials?.totalIncome || 0);
        acc.expense += Number(project.financials?.totalExpense || 0);
        acc.balance += Number(project.financials?.balance || 0);
        return acc;
      },
      { income: 0, expense: 0, balance: 0 },
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

      <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
        <HeroBalanceCard
          label="RENTABILIDAD GLOBAL"
          value={formatCurrency(totals.balance)}
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
        {loading ? (
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={{ marginTop: 40 }}
          />
        ) : filteredProjects.length === 0 ? (
          <View
            className="rounded-2xl p-4"
            style={{ borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: 'white' }}
          >
            <Text className="text-center text-gray-400 text-sm">
              {projects.length === 0
                ? 'Aún no tienes proyectos. Crea uno para empezar a medir su rentabilidad.'
                : 'No hay proyectos en este estado.'}
            </Text>
          </View>
        ) : (
          filteredProjects.map((project) => {
            const balance = Number(project.financials?.balance || 0);
            const balanceColor = balance >= 0 ? colors.success : colors.danger;
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
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 9,
                      backgroundColor: badgeColors.bg,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 9,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: badgeColors.text }}>
                      {project.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text
                    style={{ flex: 1, fontSize: 14.5, fontWeight: '700', color: '#0F172A' }}
                    numberOfLines={1}
                  >
                    {project.name}
                  </Text>
                  <Text style={{ fontSize: 14.5, fontWeight: '700', color: balanceColor, marginLeft: 8 }}>
                    {formatCurrency(balance)}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: badgeColors.bg }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: badgeColors.text }}>
                      {STATUS_LABELS[project.status]}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11.5, fontWeight: '600', color: '#6B7280' }}>
                    +{formatCurrency(project.financials?.totalIncome || 0)} · -{formatCurrency(project.financials?.totalExpense || 0)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
