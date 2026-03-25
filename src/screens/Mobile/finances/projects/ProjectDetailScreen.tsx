import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../../../api/api';
import AppHeader from '../../../../components/AppHeader';
import CrossPlatformDateTimePicker from '../../../../components/CrossPlatformDateTimePicker';
import { colors } from '../../../../theme/theme';
import { appAlert } from '../../../../utils/appAlert';

type ProjectStatus = 'idea' | 'active' | 'paused' | 'completed' | 'cancelled';
type EntryType = 'income' | 'expense';

type ProjectTransaction = {
  id: number;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  description?: string | null;
  date?: string | null;
  projectId?: number | null;
};

type ProjectManualEntry = {
  id: number;
  type: EntryType;
  title: string;
  description?: string | null;
  amount: number;
  date: string;
  category?: string | null;
  notes?: string | null;
};

type ProjectDetail = {
  id: number;
  name: string;
  description?: string | null;
  type?: string | null;
  status: ProjectStatus;
  startDate: string;
  endDate?: string | null;
  notes?: string | null;
  transactions: ProjectTransaction[];
  manualEntries: ProjectManualEntry[];
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

type ManualForm = {
  type: EntryType;
  title: string;
  description: string;
  amount: string;
  date: Date;
  category: string;
  notes: string;
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  idea: 'Idea',
  active: 'Activo',
  paused: 'Pausado',
  completed: 'Completado',
  cancelled: 'Cancelado',
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

function defaultManualForm(): ManualForm {
  return {
    type: 'expense',
    title: '',
    description: '',
    amount: '',
    date: new Date(),
    category: '',
    notes: '',
  };
}

export default function ProjectDetailScreen({ navigation, route }: any) {
  const projectId: number | undefined = route?.params?.projectId;

  const [loading, setLoading] = useState(false);
  const [project, setProject] = useState<ProjectDetail | null>(null);

  const [txSelectorOpen, setTxSelectorOpen] = useState(false);
  const [txLoading, setTxLoading] = useState(false);
  const [allTransactions, setAllTransactions] = useState<ProjectTransaction[]>([]);
  const [search, setSearch] = useState('');
  const [selectedTxIds, setSelectedTxIds] = useState<Set<number>>(new Set());

  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualSaving, setManualSaving] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ProjectManualEntry | null>(null);
  const [manualForm, setManualForm] = useState<ManualForm>(defaultManualForm());
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  const fetchProject = useCallback(async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      const res = await api.get(`/projects/${projectId}`);
      setProject(res.data || null);
    } catch (error) {
      console.error('Error cargando detalle del proyecto:', error);
      setProject(null);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useFocusEffect(
    useCallback(() => {
      fetchProject();
    }, [fetchProject]),
  );

  const fetchAllTransactions = async () => {
    try {
      setTxLoading(true);
      const res = await api.get('/transactions');
      const data = Array.isArray(res.data) ? res.data : [];
      const filtered = data.filter((tx: any) => tx.type === 'income' || tx.type === 'expense');
      setAllTransactions(filtered);
      const currentIds = new Set<number>((project?.transactions || []).map((tx) => tx.id));
      setSelectedTxIds(currentIds);
    } catch (error) {
      console.error('Error cargando transacciones para asociar:', error);
      appAlert('Error', 'No se pudieron cargar las transacciones.');
    } finally {
      setTxLoading(false);
    }
  };

  const openTxSelector = async () => {
    setTxSelectorOpen(true);
    await fetchAllTransactions();
  };

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return allTransactions;
    return allTransactions.filter((tx) =>
      String(tx.description || '').toLowerCase().includes(query),
    );
  }, [allTransactions, search]);

  const toggleTx = (txId: number) => {
    setSelectedTxIds((prev) => {
      const next = new Set(prev);
      if (next.has(txId)) next.delete(txId);
      else next.add(txId);
      return next;
    });
  };

  const saveSelectedTransactions = async () => {
    if (!project) return;

    const previous = new Set<number>((project.transactions || []).map((tx) => tx.id));
    const toAttach = Array.from(selectedTxIds).filter((id) => !previous.has(id));
    const toDetach = Array.from(previous).filter((id) => !selectedTxIds.has(id));

    try {
      setTxLoading(true);
      if (toAttach.length) {
        await api.patch(`/projects/${project.id}/attach-transactions`, {
          transactionIds: toAttach,
        });
      }

      if (toDetach.length) {
        await api.patch(`/projects/${project.id}/detach-transactions`, {
          transactionIds: toDetach,
        });
      }

      setTxSelectorOpen(false);
      setSearch('');
      fetchProject();
    } catch (error) {
      console.error('Error actualizando transacciones asociadas:', error);
      appAlert('Error', 'No se pudieron actualizar las transacciones asociadas.');
    } finally {
      setTxLoading(false);
    }
  };

  const detachTransaction = async (txId: number) => {
    if (!project) return;

    try {
      await api.patch(`/projects/${project.id}/detach-transactions`, {
        transactionIds: [txId],
      });
      fetchProject();
    } catch (error) {
      console.error('Error desasociando transacción:', error);
      appAlert('Error', 'No se pudo desasociar la transacción.');
    }
  };

  const openManualCreate = () => {
    setEditingEntry(null);
    setManualForm(defaultManualForm());
    setManualModalOpen(true);
  };

  const openManualEdit = (entry: ProjectManualEntry) => {
    setEditingEntry(entry);
    setManualForm({
      type: entry.type,
      title: entry.title,
      description: entry.description || '',
      amount: String(entry.amount),
      date: entry.date ? new Date(entry.date) : new Date(),
      category: entry.category || '',
      notes: entry.notes || '',
    });
    setManualModalOpen(true);
  };

  const validateManualForm = () => {
    if (!manualForm.type) {
      appAlert('Validación', 'El tipo es obligatorio.');
      return false;
    }

    if (!manualForm.title.trim()) {
      appAlert('Validación', 'El título es obligatorio.');
      return false;
    }

    const amount = Number(String(manualForm.amount).replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) {
      appAlert('Validación', 'El importe debe ser mayor que 0.');
      return false;
    }

    if (!manualForm.date || Number.isNaN(manualForm.date.getTime())) {
      appAlert('Validación', 'La fecha es obligatoria.');
      return false;
    }

    return true;
  };

  const saveManualEntry = async () => {
    if (!project) return;
    if (!validateManualForm()) return;

    const payload = {
      type: manualForm.type,
      title: manualForm.title.trim(),
      description: manualForm.description.trim() || null,
      amount: Number(String(manualForm.amount).replace(',', '.')),
      date: manualForm.date.toISOString(),
      category: manualForm.category.trim() || null,
      notes: manualForm.notes.trim() || null,
    };

    try {
      setManualSaving(true);

      if (editingEntry) {
        await api.patch(`/projects/${project.id}/manual-entries/${editingEntry.id}`, payload);
      } else {
        await api.post(`/projects/${project.id}/manual-entries`, payload);
      }

      setManualModalOpen(false);
      setEditingEntry(null);
      setManualForm(defaultManualForm());
      fetchProject();
    } catch (error) {
      console.error('Error guardando movimiento manual:', error);
      appAlert('Error', 'No se pudo guardar el movimiento manual.');
    } finally {
      setManualSaving(false);
    }
  };

  const removeManualEntry = (entry: ProjectManualEntry) => {
    if (!project) return;

    appAlert('Eliminar movimiento', '¿Seguro que quieres eliminar este movimiento manual?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/projects/${project.id}/manual-entries/${entry.id}`);
            fetchProject();
          } catch (error) {
            console.error('Error eliminando movimiento manual:', error);
            appAlert('Error', 'No se pudo eliminar el movimiento manual.');
          }
        },
      },
    ]);
  };

  if (loading && !project) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!project) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="px-5 pb-3">
          <AppHeader
            title="Proyecto"
            showProfile={false}
            showDatePicker={false}
            showBack={true}
          />
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-gray-500 text-center">No se pudo cargar el proyecto.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const balanceColor = Number(project.financials.balance || 0) >= 0 ? '#16A34A' : '#DC2626';

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pb-3">
        <AppHeader
          title={project.name}
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
          className="rounded-2xl p-4 mb-3"
          style={{ borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: 'white' }}
        >
          <View className="flex-row justify-between items-start">
            <View className="flex-1 pr-2">
              <Text className="text-base font-semibold text-gray-900">{project.name}</Text>
              {!!project.description && (
                <Text className="text-xs text-gray-500 mt-1">{project.description}</Text>
              )}
            </View>
            <View className="px-2 py-1 rounded-full" style={{ backgroundColor: '#EEF2FF' }}>
              <Text className="text-[11px] font-semibold text-indigo-600">
                {STATUS_LABELS[project.status]}
              </Text>
            </View>
          </View>

          <Text className="text-[11px] text-gray-500 mt-2">
            Inicio: {formatDate(project.startDate)}
          </Text>
          <Text className="text-[11px] text-gray-500 mt-1">
            Fin: {formatDate(project.endDate || null)}
          </Text>
          {!!project.type && (
            <Text className="text-[11px] text-gray-500 mt-1">Tipo: {project.type}</Text>
          )}
          {!!project.notes && (
            <Text className="text-[11px] text-gray-500 mt-2">Notas: {project.notes}</Text>
          )}
        </View>

        <View
          className="rounded-2xl p-4 mb-3"
          style={{ borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: 'white' }}
        >
          <Text className="text-sm font-semibold text-gray-900 mb-2">Resumen financiero</Text>
          <View className="flex-row">
            <View className="flex-1">
              <Text className="text-[11px] text-gray-500">Ingresos</Text>
              <Text className="text-sm font-semibold text-emerald-600">
                {formatCurrency(project.financials.totalIncome || 0)}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-[11px] text-gray-500">Gastos</Text>
              <Text className="text-sm font-semibold text-rose-600">
                {formatCurrency(project.financials.totalExpense || 0)}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-[11px] text-gray-500">Balance</Text>
              <Text className="text-sm font-semibold" style={{ color: balanceColor }}>
                {formatCurrency(project.financials.balance || 0)}
              </Text>
            </View>
          </View>
        </View>

        <View
          className="rounded-2xl p-4 mb-3"
          style={{ borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: 'white' }}
        >
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-sm font-semibold text-gray-900">Transacciones asociadas</Text>
            <TouchableOpacity onPress={openTxSelector}>
              <Text className="text-xs font-semibold text-primary">Asociar</Text>
            </TouchableOpacity>
          </View>

          {project.transactions.length === 0 ? (
            <Text className="text-xs text-gray-400">No hay transacciones asociadas.</Text>
          ) : (
            project.transactions.map((tx) => {
              const amountColor = tx.type === 'income' ? '#16A34A' : '#DC2626';
              return (
                <View
                  key={tx.id}
                  className="py-2 border-b border-gray-100 flex-row items-center"
                >
                  <View className="flex-1 pr-2">
                    <Text className="text-[13px] text-gray-900" numberOfLines={1}>
                      {tx.description || 'Sin descripción'}
                    </Text>
                    <Text className="text-[11px] text-gray-500">{formatDate(tx.date)}</Text>
                  </View>

                  <Text className="text-[12px] font-semibold mr-3" style={{ color: amountColor }}>
                    {formatCurrency(tx.amount)}
                  </Text>

                  <TouchableOpacity onPress={() => detachTransaction(tx.id)}>
                    <Ionicons name="close-circle-outline" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>

        <View
          className="rounded-2xl p-4"
          style={{ borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: 'white' }}
        >
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-sm font-semibold text-gray-900">Movimientos manuales</Text>
            <TouchableOpacity onPress={openManualCreate}>
              <Text className="text-xs font-semibold text-primary">Nuevo</Text>
            </TouchableOpacity>
          </View>

          {project.manualEntries.length === 0 ? (
            <Text className="text-xs text-gray-400">No hay movimientos manuales.</Text>
          ) : (
            project.manualEntries.map((entry) => {
              const amountColor = entry.type === 'income' ? '#16A34A' : '#DC2626';
              return (
                <View
                  key={entry.id}
                  className="py-2 border-b border-gray-100"
                >
                  <View className="flex-row items-center">
                    <View className="flex-1 pr-2">
                      <Text className="text-[13px] text-gray-900" numberOfLines={1}>
                        {entry.title}
                      </Text>
                      <Text className="text-[11px] text-gray-500">
                        {formatDate(entry.date)}
                        {entry.category ? ` · ${entry.category}` : ''}
                      </Text>
                    </View>

                    <Text className="text-[12px] font-semibold mr-3" style={{ color: amountColor }}>
                      {formatCurrency(entry.amount)}
                    </Text>

                    <TouchableOpacity onPress={() => openManualEdit(entry)} style={{ marginRight: 8 }}>
                      <Ionicons name="create-outline" size={17} color="#6B7280" />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => removeManualEntry(entry)}>
                      <Ionicons name="trash-outline" size={17} color="#DC2626" />
                    </TouchableOpacity>
                  </View>

                  {!!entry.description && (
                    <Text className="text-[11px] text-gray-500 mt-1">{entry.description}</Text>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <Modal visible={txSelectorOpen} transparent animationType="slide" onRequestClose={() => setTxSelectorOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: 'white',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: '86%',
              paddingBottom: 10,
            }}
          >
            <View className="px-4 pt-3 pb-2 flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-gray-900">Asociar transacciones</Text>
              <TouchableOpacity onPress={() => setTxSelectorOpen(false)}>
                <Ionicons name="close-outline" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View className="px-4 pb-2">
              <View className="flex-row items-center px-3 py-2 rounded-full" style={{ backgroundColor: '#F3F4F6' }}>
                <Ionicons name="search-outline" size={16} color="#6B7280" />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Buscar por descripción"
                  className="ml-2 text-[13px] flex-1 text-black"
                />
              </View>
            </View>

            {txLoading ? (
              <View className="py-8 items-center justify-center">
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : (
              <FlatList
                data={filteredTransactions}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => {
                  const checked = selectedTxIds.has(item.id);
                  const amountColor = item.type === 'income' ? '#16A34A' : '#DC2626';
                  return (
                    <TouchableOpacity
                      onPress={() => toggleTx(item.id)}
                      className="px-4 py-3 border-b border-gray-100 flex-row items-center"
                    >
                      <Ionicons
                        name={checked ? 'checkbox' : 'square-outline'}
                        size={20}
                        color={checked ? colors.primary : '#9CA3AF'}
                      />

                      <View className="flex-1 ml-2 pr-2">
                        <Text className="text-[13px] text-gray-900" numberOfLines={1}>
                          {item.description || 'Sin descripción'}
                        </Text>
                        <Text className="text-[11px] text-gray-500">{formatDate(item.date)}</Text>
                      </View>

                      <Text className="text-[12px] font-semibold" style={{ color: amountColor }}>
                        {formatCurrency(item.amount)}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View className="py-6 items-center">
                    <Text className="text-xs text-gray-400">No hay transacciones para mostrar.</Text>
                  </View>
                }
              />
            )}

            <View className="px-4 pt-2">
              <TouchableOpacity
                onPress={saveSelectedTransactions}
                disabled={txLoading}
                className="py-3 rounded-xl items-center"
                style={{ backgroundColor: '#0F172A', opacity: txLoading ? 0.7 : 1 }}
              >
                <Text className="text-sm font-semibold text-white">Guardar selección</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={manualModalOpen} transparent animationType="fade" onRequestClose={() => setManualModalOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', paddingHorizontal: 20 }}>
          <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16 }}>
            <Text className="text-sm font-semibold text-gray-900 mb-3">
              {editingEntry ? 'Editar movimiento manual' : 'Nuevo movimiento manual'}
            </Text>

            <View className="flex-row mb-3">
              {(['income', 'expense'] as EntryType[]).map((option) => {
                const active = manualForm.type === option;
                return (
                  <TouchableOpacity
                    key={option}
                    onPress={() => setManualForm((prev) => ({ ...prev, type: option }))}
                    style={{
                      flex: 1,
                      height: 36,
                      marginRight: option === 'income' ? 8 : 0,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: active ? colors.primary : '#D1D5DB',
                      backgroundColor: active ? '#EEF2FF' : 'white',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: active ? colors.primary : '#6B7280' }}>
                      {option === 'income' ? 'Ingreso' : 'Gasto'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              value={manualForm.title}
              onChangeText={(text) => setManualForm((prev) => ({ ...prev, title: text }))}
              placeholder="Título *"
              className="border border-gray-200 rounded-xl px-3 py-2 text-[13px] mb-2"
            />

            <TextInput
              value={manualForm.amount}
              onChangeText={(text) => setManualForm((prev) => ({ ...prev, amount: text }))}
              placeholder="Importe *"
              keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
              className="border border-gray-200 rounded-xl px-3 py-2 text-[13px] mb-2"
            />

            <TouchableOpacity
              onPress={() => setDatePickerVisible(true)}
              className="border border-gray-200 rounded-xl px-3 py-2 mb-2"
            >
              <Text className="text-[13px] text-gray-900">
                Fecha *: {formatDate(manualForm.date.toISOString())}
              </Text>
            </TouchableOpacity>

            <TextInput
              value={manualForm.category}
              onChangeText={(text) => setManualForm((prev) => ({ ...prev, category: text }))}
              placeholder="Categoría (opcional)"
              className="border border-gray-200 rounded-xl px-3 py-2 text-[13px] mb-2"
            />

            <TextInput
              value={manualForm.description}
              onChangeText={(text) => setManualForm((prev) => ({ ...prev, description: text }))}
              placeholder="Descripción (opcional)"
              className="border border-gray-200 rounded-xl px-3 py-2 text-[13px] mb-2"
            />

            <TextInput
              value={manualForm.notes}
              onChangeText={(text) => setManualForm((prev) => ({ ...prev, notes: text }))}
              placeholder="Notas (opcional)"
              multiline
              className="border border-gray-200 rounded-xl px-3 py-2 text-[13px]"
              style={{ minHeight: 64, textAlignVertical: 'top' }}
            />

            <View className="flex-row mt-3">
              <TouchableOpacity
                onPress={() => {
                  setManualModalOpen(false);
                  setEditingEntry(null);
                }}
                className="flex-1 py-2.5 rounded-xl mr-2 items-center"
                style={{ backgroundColor: '#F3F4F6' }}
              >
                <Text className="text-[13px] text-gray-700 font-semibold">Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={saveManualEntry}
                disabled={manualSaving}
                className="flex-1 py-2.5 rounded-xl ml-2 items-center"
                style={{ backgroundColor: '#0F172A', opacity: manualSaving ? 0.7 : 1 }}
              >
                {manualSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-[13px] text-white font-semibold">Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <CrossPlatformDateTimePicker
        isVisible={datePickerVisible}
        mode="date"
        date={manualForm.date}
        onCancel={() => setDatePickerVisible(false)}
        onConfirm={(date) => {
          setManualForm((prev) => ({ ...prev, date }));
          setDatePickerVisible(false);
        }}
      />
    </SafeAreaView>
  );
}

