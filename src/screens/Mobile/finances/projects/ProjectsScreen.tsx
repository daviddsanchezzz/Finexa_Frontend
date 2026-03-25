import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../../../api/api';
import AppHeader from '../../../../components/AppHeader';
import { colors } from '../../../../theme/theme';

type ProjectStatus = 'idea' | 'active' | 'paused' | 'completed' | 'cancelled';
type ProjectFilter = 'all' | ProjectStatus;

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

function formatDate(value?: string | null) {
  if (!value) return 'Sin fecha';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Sin fecha';
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function ProjectsScreen({ navigation }: any) {
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
          showBack={true}
        />
      </View>

      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 42 }}
      >
        <View
          className="rounded-3xl p-4 mb-3"
          style={{ backgroundColor: colors.primary }}
        >
          <Text className="text-[11px] text-gray-300">RENTABILIDAD GLOBAL</Text>
          <Text className="text-white text-2xl font-semibold mt-1">
            {formatCurrency(totals.balance)}
          </Text>

          <View className="flex-row mt-3">
            <View className="flex-1">
              <Text className="text-[11px] text-gray-300">Ingresos</Text>
              <Text className="text-[13px] text-emerald-300 font-semibold mt-0.5">
                {formatCurrency(totals.income)}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-[11px] text-gray-300">Gastos</Text>
              <Text className="text-[13px] text-rose-300 font-semibold mt-0.5">
                {formatCurrency(totals.expense)}
              </Text>
            </View>
            <View className="flex-1 items-end">
              <Text className="text-[11px] text-gray-300">Proyectos</Text>
              <Text className="text-[13px] text-white font-semibold mt-0.5">
                {projects.length}
              </Text>
            </View>
          </View>
        </View>

        <View className="flex-row items-center mb-3">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row">
              {[{ key: 'all', label: 'Todos' }, ...Object.entries(STATUS_LABELS).map(([k, v]) => ({ key: k, label: v }))].map((item) => {
                const isActive = filter === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    onPress={() => setFilter(item.key as ProjectFilter)}
                    className="px-3 py-2 rounded-full mr-2"
                    style={{
                      backgroundColor: isActive ? '#0F172A' : 'white',
                      borderWidth: 1,
                      borderColor: isActive ? '#0F172A' : '#E2E8F0',
                    }}
                  >
                    <Text
                      className="text-[12px] font-semibold"
                      style={{ color: isActive ? 'white' : '#475569' }}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

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
            const balanceColor = balance >= 0 ? '#16A34A' : '#DC2626';
            const badgeColors = STATUS_COLORS[project.status];

            return (
              <TouchableOpacity
                key={project.id}
                onPress={() => navigation.navigate('ProjectDetail', { projectId: project.id })}
                activeOpacity={0.92}
                className="rounded-3xl p-4 mb-3"
                style={{
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  backgroundColor: 'white',
                  shadowColor: '#0F172A',
                  shadowOpacity: 0.04,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 4 },
                }}
              >
                <View className="flex-row justify-between items-start">
                  <View className="flex-1 pr-2">
                    <Text className="text-[15px] font-semibold text-gray-900">
                      {project.name}
                    </Text>
                    <Text className="text-[11px] text-gray-500 mt-1">
                      Inicio: {formatDate(project.startDate)}
                    </Text>
                    {!!project.description && (
                      <Text className="text-[12px] text-gray-500 mt-1" numberOfLines={2}>
                        {project.description}
                      </Text>
                    )}
                  </View>

                  <View
                    className="px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: badgeColors.bg }}
                  >
                    <Text className="text-[11px] font-semibold" style={{ color: badgeColors.text }}>
                      {STATUS_LABELS[project.status]}
                    </Text>
                  </View>
                </View>

                <View className="mt-3 p-3 rounded-2xl" style={{ backgroundColor: '#F8FAFC' }}>
                  <View className="flex-row">
                    <View className="flex-1">
                      <Text className="text-[10px] text-gray-500">Ingresos</Text>
                      <Text className="text-[13px] font-semibold text-emerald-600 mt-0.5">
                        {formatCurrency(project.financials?.totalIncome || 0)}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-[10px] text-gray-500">Gastos</Text>
                      <Text className="text-[13px] font-semibold text-rose-600 mt-0.5">
                        {formatCurrency(project.financials?.totalExpense || 0)}
                      </Text>
                    </View>
                    <View className="flex-1 items-end">
                      <Text className="text-[10px] text-gray-500">Balance</Text>
                      <Text className="text-[13px] font-semibold mt-0.5" style={{ color: balanceColor }}>
                        {formatCurrency(balance)}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <TouchableOpacity
        onPress={() => navigation.navigate('ProjectForm')}
        activeOpacity={0.9}
        style={{
          position: 'absolute',
          right: 20,
          bottom: 20,
          width: 56,
          height: 56,
          borderRadius: 999,
          backgroundColor: '#0F172A',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#0B1220',
          shadowOpacity: 0.2,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 8 },
        }}
      >
        <Ionicons name="add-outline" size={24} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
