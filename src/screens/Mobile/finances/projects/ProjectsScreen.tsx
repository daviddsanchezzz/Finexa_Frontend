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
import { appAlert } from '../../../../utils/appAlert';

type ProjectStatus = 'idea' | 'active' | 'paused' | 'completed' | 'cancelled';

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
    transactionsIncome: number;
    transactionsExpense: number;
    manualIncome: number;
    manualExpense: number;
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

const STATUS_COLORS: Record<ProjectStatus, string> = {
  idea: '#6366F1',
  active: '#16A34A',
  paused: '#D97706',
  completed: '#0EA5E9',
  cancelled: '#DC2626',
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

  const handleDelete = (project: ProjectItem) => {
    appAlert(
      'Eliminar proyecto',
      `¿Seguro que quieres eliminar "${project.name}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/projects/${project.id}`);
              fetchProjects();
            } catch (error) {
              console.error('Error al eliminar proyecto:', error);
              appAlert('Error', 'No se pudo eliminar el proyecto.');
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pb-3">
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
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View
          className="rounded-3xl p-4 mb-3"
          style={{ backgroundColor: colors.primary }}
        >
          <Text className="text-xs text-gray-300">Resumen de proyectos</Text>
          <Text className="text-white text-xl font-semibold mt-1">
            Balance total: {formatCurrency(totals.balance)}
          </Text>

          <View className="flex-row mt-3">
            <View className="flex-1">
              <Text className="text-[11px] text-gray-300">Ingresos</Text>
              <Text className="text-sm text-emerald-300 font-semibold">
                {formatCurrency(totals.income)}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-[11px] text-gray-300">Gastos</Text>
              <Text className="text-sm text-rose-300 font-semibold">
                {formatCurrency(totals.expense)}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate('ProjectForm')}
          className="flex-row items-center justify-center py-3 mb-3 rounded-2xl"
          style={{
            backgroundColor: '#F3F4F6',
            borderWidth: 1,
            borderColor: '#E5E7EB',
          }}
          activeOpacity={0.9}
        >
          <Ionicons name="add-outline" size={18} color="#64748B" />
          <Text className="text-sm text-slate-500 font-medium ml-1.5">
            Nuevo proyecto
          </Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={{ marginTop: 40 }}
          />
        ) : projects.length === 0 ? (
          <View
            className="rounded-2xl p-4"
            style={{ borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: 'white' }}
          >
            <Text className="text-center text-gray-400 text-sm">
              Aún no tienes proyectos. Crea uno para empezar a medir su rentabilidad.
            </Text>
          </View>
        ) : (
          projects.map((project) => {
            const balance = Number(project.financials?.balance || 0);
            const balanceColor = balance >= 0 ? '#16A34A' : '#DC2626';

            return (
              <View
                key={project.id}
                className="rounded-2xl p-4 mb-3"
                style={{ borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: 'white' }}
              >
                <View className="flex-row justify-between items-start">
                  <View className="flex-1 pr-2">
                    <Text className="text-base font-semibold text-gray-900">
                      {project.name}
                    </Text>
                    {!!project.description && (
                      <Text className="text-xs text-gray-500 mt-1" numberOfLines={2}>
                        {project.description}
                      </Text>
                    )}
                  </View>

                  <View
                    className="px-2 py-1 rounded-full"
                    style={{ backgroundColor: `${STATUS_COLORS[project.status]}20` }}
                  >
                    <Text
                      className="text-[11px] font-semibold"
                      style={{ color: STATUS_COLORS[project.status] }}
                    >
                      {STATUS_LABELS[project.status]}
                    </Text>
                  </View>
                </View>

                <Text className="text-[11px] text-gray-500 mt-2">
                  Inicio: {formatDate(project.startDate)}
                </Text>

                <View className="flex-row mt-3">
                  <View className="flex-1">
                    <Text className="text-[11px] text-gray-500">Ingresos</Text>
                    <Text className="text-sm font-semibold text-emerald-600">
                      {formatCurrency(project.financials?.totalIncome || 0)}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-[11px] text-gray-500">Gastos</Text>
                    <Text className="text-sm font-semibold text-rose-600">
                      {formatCurrency(project.financials?.totalExpense || 0)}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-[11px] text-gray-500">Balance</Text>
                    <Text className="text-sm font-semibold" style={{ color: balanceColor }}>
                      {formatCurrency(balance)}
                    </Text>
                  </View>
                </View>

                <View className="flex-row mt-4">
                  <TouchableOpacity
                    onPress={() => navigation.navigate('ProjectDetail', { projectId: project.id })}
                    className="px-3 py-2 rounded-xl mr-2"
                    style={{ backgroundColor: '#EEF2FF' }}
                  >
                    <Text className="text-xs font-semibold text-indigo-600">Ver detalle</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate('ProjectForm', { editProject: project })
                    }
                    className="px-3 py-2 rounded-xl mr-2"
                    style={{ backgroundColor: '#F3F4F6' }}
                  >
                    <Text className="text-xs font-semibold text-gray-700">Editar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDelete(project)}
                    className="px-3 py-2 rounded-xl"
                    style={{ backgroundColor: '#FEF2F2' }}
                  >
                    <Text className="text-xs font-semibold text-red-600">Eliminar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
