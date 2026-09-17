import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import api from '../../../../api/api';
import AppHeader from '../../../../components/AppHeader';
import OverflowMenuButton from '../../../../components/OverflowMenuButton';
import HeroBalanceCard from '../../../../components/HeroBalanceCard';
import StatsRow from '../../../../components/StatsRow';
import SegmentedTabs from '../../../../components/SegmentedTabs';
import AddButton from '../../../../components/AddButton';
import CrossPlatformDateTimePicker from '../../../../components/CrossPlatformDateTimePicker';
import { colors } from '../../../../theme/theme';
import { appAlert } from '../../../../utils/appAlert';
import { formatEuro, signColor } from '../../../../utils/currency';
import { markTransactionsDirty } from '../../../../utils/transactionsInvalidation';
import { ProjectDetailScreenSkeleton } from '../../../../components/skeletons/ProjectDetailScreenSkeleton';
import {
  ProjectStatus,
  ProjectMovementKind as MovementKind,
  ProjectTransaction,
  ProjectManualEntry,
  ProjectPartner,
  ProjectDetail,
} from '../../../../types/project';

type DetailTab = 'info' | 'movements' | 'config';

const MOVEMENT_KIND_LABELS: Record<MovementKind, string> = {
  income: 'Ingreso',
  expense: 'Gasto',
  contribution: 'Aportación',
  withdrawal: 'Retirada',
};

const MOVEMENT_KIND_META: Record<MovementKind, { icon: keyof typeof Ionicons.glyphMap; bg: string; color: string }> = {
  income: { icon: 'add-outline', bg: '#ECFDF3', color: '#16A34A' },
  expense: { icon: 'remove-outline', bg: '#FEF2F2', color: '#DC2626' },
  contribution: { icon: 'arrow-down-circle-outline', bg: '#EFF6FF', color: '#2563EB' },
  withdrawal: { icon: 'arrow-up-circle-outline', bg: '#FFF7ED', color: '#C2410C' },
};

type CombinedMovement =
  | {
      source: 'transaction';
      id: number;
      kind: 'income' | 'expense';
      title: string;
      description?: string | null;
      amount: number;
      date?: string | null;
      category?: string | null;
    }
  | {
      source: 'manual';
      id: number;
      kind: MovementKind;
      title: string;
      description?: string | null;
      amount: number;
      date: string;
      category?: string | null;
      partnerId?: number | null;
    };

type ProfitFormLine = {
  partnerId: number;
  partnerName: string;
  amount: string;
  notes: string;
};

type ProfitForm = {
  title: string;
  totalAmount: string;
  date: Date;
  notes: string;
  lines: ProfitFormLine[];
};

type PartnerFormItem = {
  id?: number;
  name: string;
  percentage: string;
  isMe: boolean;
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
  return `${formatEuro(Number(value || 0))} €`;
}

function formatPercentage(value: number) {
  const rounded = Math.round(Number(value || 0) * 100) / 100;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(2)}%`;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
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

function defaultProfitForm(): ProfitForm {
  return {
    title: '',
    totalAmount: '',
    date: new Date(),
    notes: '',
    lines: [],
  };
}

export default function ProjectDetailScreen({ route, navigation }: any) {
  const projectId: number | undefined = route?.params?.projectId;

  const projectQuery = useQuery({
    queryKey: ['projects', 'detail', projectId],
    queryFn: async () => (await api.get(`/projects/${projectId}`)).data as ProjectDetail,
    enabled: !!projectId,
  });
  const project = projectQuery.data ?? null;
  const loading = projectQuery.isLoading;
  const fetchProject = useCallback(() => {
    projectQuery.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);
  const [tab, setTab] = useState<DetailTab>('info');

  const [txSelectorOpen, setTxSelectorOpen] = useState(false);
  const [txLoading, setTxLoading] = useState(false);
  const [allTransactions, setAllTransactions] = useState<ProjectTransaction[]>([]);
  const [search, setSearch] = useState('');
  const [selectedTxIds, setSelectedTxIds] = useState<Set<number>>(new Set());

  const [profitModalOpen, setProfitModalOpen] = useState(false);
  const [profitSaving, setProfitSaving] = useState(false);
  const [partnersModalOpen, setPartnersModalOpen] = useState(false);
  const [partnersSaving, setPartnersSaving] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);
  const [addMovementMenuOpen, setAddMovementMenuOpen] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState<CombinedMovement | null>(null);
  const [profitForm, setProfitForm] = useState<ProfitForm>(defaultProfitForm());
  const [partnersForm, setPartnersForm] = useState<PartnerFormItem[]>([]);
  const [profitDatePickerVisible, setProfitDatePickerVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      projectQuery.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]),
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
      markTransactionsDirty();
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
      markTransactionsDirty();
      fetchProject();
    } catch (error) {
      console.error('Error desasociando transacción:', error);
      appAlert('Error', 'No se pudo desasociar la transacción.');
    }
  };

  const openManualCreate = () => {
    navigation.navigate('ProjectManualEntryForm', { projectId: project?.id, partners: project?.partners || [] });
  };

  const openManualEdit = (entry: ProjectManualEntry) => {
    navigation.navigate('ProjectManualEntryForm', {
      projectId: project?.id,
      partners: project?.partners || [],
      editEntry: entry,
    });
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
            markTransactionsDirty();
            fetchProject();
          } catch (error) {
            console.error('Error eliminando movimiento manual:', error);
            appAlert('Error', 'No se pudo eliminar el movimiento manual.');
          }
        },
      },
    ]);
  };

  const openProfitCreate = () => {
    const partners = project?.partners || [];
    if (!partners.length) {
      appAlert('Socios requeridos', 'Primero configura socios y porcentajes para repartir beneficios.');
      openPartnersEditor();
      return;
    }

    setProfitForm({
      title: 'Reparto de beneficios',
      totalAmount: '',
      date: new Date(),
      notes: '',
      lines: partners.map((partner) => ({
        partnerId: partner.id,
        partnerName: partner.name,
        amount: '',
        notes: partner.isMe ? 'Mi parte' : '',
      })),
    });
    setProfitModalOpen(true);
  };

  const openPartnersEditor = () => {
    const base = (project?.partners || []).map((partner) => ({
      id: partner.id,
      name: partner.name,
      percentage: String(partner.percentage),
      isMe: !!partner.isMe,
    }));

    setPartnersForm(base.length ? base : [{ name: '', percentage: '', isMe: true }]);
    setPartnersModalOpen(true);
  };

  const recalculateProfitLinesFromPercentages = (totalRaw: string) => {
    const total = Number(String(totalRaw).replace(',', '.'));
    const partners = project?.partners || [];
    if (!Number.isFinite(total) || total <= 0 || !partners.length) return;

    const rawLines = partners.map((partner) => ({
      partnerId: partner.id,
      partnerName: partner.name,
      amount: Number(((total * partner.percentage) / 100).toFixed(2)),
      notes: partner.isMe ? 'Mi parte' : '',
    }));

    const sumWithoutLast = rawLines
      .slice(0, rawLines.length - 1)
      .reduce((acc, line) => acc + line.amount, 0);
    if (rawLines.length > 0) {
      rawLines[rawLines.length - 1].amount = Number((total - sumWithoutLast).toFixed(2));
    }

    setProfitForm((prev) => ({
      ...prev,
      lines: rawLines.map((line) => ({
        partnerId: line.partnerId,
        partnerName: line.partnerName,
        amount: String(line.amount),
        notes: line.notes,
      })),
    }));
  };

  const updateProfitLine = (
    index: number,
    field: keyof ProfitFormLine,
    value: string,
  ) => {
    setProfitForm((prev) => {
      const next = [...prev.lines];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, lines: next };
    });
  };

  const validateProfitForm = () => {
    const total = Number(String(profitForm.totalAmount).replace(',', '.'));
    if (!Number.isFinite(total) || total <= 0) {
      appAlert('Validación', 'El total del reparto debe ser mayor que 0.');
      return false;
    }

    if (!profitForm.date || Number.isNaN(profitForm.date.getTime())) {
      appAlert('Validación', 'La fecha del reparto es obligatoria.');
      return false;
    }

    const cleanLines = profitForm.lines;

    if (!cleanLines.length) {
      appAlert('Validación', 'Debes añadir al menos un socio.');
      return false;
    }

    for (const line of cleanLines) {
      const amount = Number(String(line.amount).replace(',', '.'));
      if (!line.partnerName.trim()) {
        appAlert('Validación', 'Cada línea debe tener nombre de socio.');
        return false;
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        appAlert('Validación', `Importe inválido para ${line.partnerName || 'línea'}.`);
        return false;
      }
    }

    const sum = cleanLines.reduce(
      (acc, line) => acc + Number(String(line.amount).replace(',', '.')),
      0,
    );
    if (Math.round(sum * 100) !== Math.round(total * 100)) {
      appAlert(
        'Validación',
        `La suma de socios (${formatEuro(sum)}) debe coincidir con el total (${formatEuro(total)}).`,
      );
      return false;
    }

    return true;
  };

  const saveProfitDistribution = async () => {
    if (!project) return;
    if (!validateProfitForm()) return;

    const cleanLines = profitForm.lines
      .filter((line) => line.partnerName.trim() || line.amount.trim())
      .map((line) => ({
        partnerId: line.partnerId,
        amount: Number(String(line.amount).replace(',', '.')),
      }));

    const payload = {
      title: profitForm.title.trim() || null,
      totalAmount: Number(String(profitForm.totalAmount).replace(',', '.')),
      date: profitForm.date.toISOString(),
      notes: profitForm.notes.trim() || null,
      lines: cleanLines,
    };

    try {
      setProfitSaving(true);
      await api.post(`/projects/${project.id}/distribute-profit`, payload);
      setProfitModalOpen(false);
      setProfitForm(defaultProfitForm());
      markTransactionsDirty();
      fetchProject();
    } catch (error) {
      console.error('Error guardando reparto de beneficios:', error);
      appAlert('Error', 'No se pudo guardar el reparto de beneficios.');
    } finally {
      setProfitSaving(false);
    }
  };

  const savePartners = async () => {
    if (!project) return;

    const clean = partnersForm
      .filter((item) => item.name.trim() || item.percentage.trim())
      .map((item) => ({
        id: item.id,
        name: item.name.trim(),
        percentage: Number(String(item.percentage).replace(',', '.')),
        isMe: !!item.isMe,
      }));

    if (!clean.length) {
      appAlert('Validación', 'Debes añadir al menos un socio.');
      return;
    }

    if (clean.some((item) => !item.name)) {
      appAlert('Validación', 'Todos los socios deben tener nombre.');
      return;
    }

    const sum = clean.reduce((acc, item) => acc + Number(item.percentage || 0), 0);
    if (Math.round(sum * 100) !== 10000) {
      appAlert('Validación', `El porcentaje total debe ser 100%. Actual: ${sum.toFixed(2)}%.`);
      return;
    }

    const meCount = clean.filter((item) => item.isMe).length;
    if (meCount !== 1) {
      appAlert('Validación', 'Debe existir exactamente un socio marcado como tú.');
      return;
    }

    try {
      setPartnersSaving(true);
      await api.patch(`/projects/${project.id}/partners`, { partners: clean });
      setPartnersModalOpen(false);
      fetchProject();
    } catch (error) {
      console.error('Error guardando socios:', error);
      appAlert('Error', 'No se pudo guardar la configuración de socios.');
    } finally {
      setPartnersSaving(false);
    }
  };

  const updatePartnerLine = (
    index: number,
    field: keyof PartnerFormItem,
    value: string | boolean,
  ) => {
    setPartnersForm((prev) => {
      const next = [...prev];
      if (field === 'isMe') {
        next.forEach((item, i) => {
          next[i] = { ...item, isMe: i === index };
        });
      } else {
        next[index] = { ...next[index], [field]: value as string };
      }
      return next;
    });
  };

  const addPartnerLine = () => {
    setPartnersForm((prev) => [...prev, { name: '', percentage: '', isMe: false }]);
  };

  const removePartnerLine = (index: number) => {
    setPartnersForm((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDeleteProject = () => {
    if (!project) return;

    appAlert('Eliminar proyecto', '¿Seguro que quieres eliminar este proyecto?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeletingProject(true);
            await api.delete(`/projects/${project.id}`);
            markTransactionsDirty();
            navigation.goBack();
          } catch (error) {
            console.error('Error eliminando proyecto:', error);
            appAlert('Error', 'No se pudo eliminar el proyecto.');
          } finally {
            setDeletingProject(false);
          }
        },
      },
    ]);
  };

  const combinedMovements = useMemo<CombinedMovement[]>(() => {
    const transactions = project?.transactions || [];
    const manualEntries = project?.manualEntries || [];

    const txItems: CombinedMovement[] = transactions
      .filter(
        (
          tx,
        ): tx is ProjectTransaction & {
          type: 'income' | 'expense';
        } => tx.type === 'income' || tx.type === 'expense',
      )
      .map((tx) => ({
        source: 'transaction',
        id: tx.id,
        kind: tx.type,
        title: tx.description || 'Transacción sin descripción',
        description: tx.description,
        amount: Number(tx.amount || 0),
        date: tx.date,
      }));

    const manualItems: CombinedMovement[] = manualEntries.map((entry) => ({
      source: 'manual',
      id: entry.id,
      kind: entry.kind,
      title: entry.title,
      description: entry.description,
      amount: Number(entry.amount || 0),
      date: entry.date,
      category: entry.category,
      partnerId: entry.partnerId,
    }));

    return [...txItems, ...manualItems].sort((a, b) => {
      const aDate = a.date ? new Date(a.date).getTime() : 0;
      const bDate = b.date ? new Date(b.date).getTime() : 0;
      return bDate - aDate;
    });
  }, [project?.transactions, project?.manualEntries]);

  const partnerNameById = useMemo(() => {
    const map = new Map<number, string>();
    (project?.partners || []).forEach((partner) => map.set(partner.id, partner.name));
    return map;
  }, [project?.partners]);

  if (loading && !project) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="px-5 pb-2">
          <AppHeader title="Proyecto" showProfile={false} showDatePicker={false} showBack={true} />
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <ProjectDetailScreenSkeleton />
        </ScrollView>
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

  const result = Number(project.financials.result || 0);
  const statusTone = STATUS_COLORS[project.status];
  // Beneficio aún no repartido: resultado acumulado menos lo ya retirado por
  // los socios. Puramente informativo — no escribe nada hasta que se
  // registre una retirada real.
  const distributable = Math.max(0, result - Number(project.financials.withdrawals || 0));
  const myProfit = Number(project.financials.myProfit || 0);
  const myPending = Number(project.financials.myPending || 0);
  const hasActivity =
    Number(project.financials.income || 0) !== 0 ||
    Number(project.financials.expense || 0) !== 0 ||
    Number(project.financials.myPercentage || 100) !== 100;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pb-2">
        <AppHeader
          title={project.name}
          showProfile={false}
          showDatePicker={false}
          showBack={true}
          rightElement={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AddButton label="Añadir" onPress={() => setAddMovementMenuOpen(true)} />
              <OverflowMenuButton
                title={project.name}
                actions={[
                  { label: 'Editar', onPress: () => navigation.navigate('ProjectForm', { editProject: project }) },
                  { label: 'Eliminar', style: 'destructive', onPress: handleDeleteProject, disabled: deletingProject },
                ]}
                iconSize={19}
                accessibilityLabel="Acciones del proyecto"
                buttonStyle={{ width: 30, height: 36 }}
              />
            </View>
          }
        />
      </View>

      <View style={{ paddingHorizontal: 20 }}>
        <HeroBalanceCard
          label="Resultado del proyecto"
          value={formatCurrency(result)}
          style={{ marginBottom: 8 }}
        />

        <StatsRow
          items={[
            { key: 'ingresos', label: 'INGRESOS', value: formatCurrency(project.financials.income || 0), color: colors.success },
            { key: 'gastos', label: 'GASTOS', value: formatCurrency(project.financials.expense || 0), color: colors.danger },
          ]}
        />
      </View>

      <View style={{ marginTop: 12 }}>
        <SegmentedTabs<DetailTab>
          variant="underline"
          options={[
            { key: 'info', label: 'Información' },
            { key: 'movements', label: 'Movimientos' },
            { key: 'config', label: 'Configuración' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>

      <ScrollView
        key={tab}
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40, paddingTop: 14 }}
      >
        {tab === 'info' && (() => {
          const infoRows: { label: string; value: string }[] = [
            ...(project.type ? [{ label: 'Tipo', value: project.type }] : []),
            { label: 'Fecha de inicio', value: formatDate(project.startDate) },
            ...(project.endDate ? [{ label: 'Fecha de fin', value: formatDate(project.endDate) }] : []),
          ];

          const cashRows: { label: string; value: number; sign: '+' | '-'; tone?: 'signal' }[] = [
            { label: 'Aportaciones', value: project.financials.contributions, sign: '+' },
            { label: 'Ingresos', value: project.financials.income, sign: '+', tone: 'signal' },
            { label: 'Gastos', value: project.financials.expense, sign: '-', tone: 'signal' },
            { label: 'Retiradas de beneficio', value: project.financials.withdrawalsProfit, sign: '-' },
            ...(project.financials.withdrawalsCapital > 0
              ? [{ label: 'Capital devuelto', value: project.financials.withdrawalsCapital, sign: '-' as const }]
              : []),
          ];

          return (
            <View>
              {/* SOBRE EL PROYECTO */}
              <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 20, overflow: 'hidden', marginBottom: 14 }}>
                <View style={{ paddingHorizontal: 14, paddingTop: 16, paddingBottom: infoRows.length ? 5 : 18 }}>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: statusTone.bg, alignSelf: 'flex-start' }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: statusTone.text }}>{STATUS_LABELS[project.status]}</Text>
                  </View>

                  {!!project.description && (
                    <Text style={{ fontSize: 13, lineHeight: 19, color: '#475569', marginTop: 10 }}>{project.description}</Text>
                  )}

                  {infoRows.length ? (
                    <View style={{ borderTopWidth: 1, borderTopColor: '#E8EDF4', marginTop: 14 }}>
                      {infoRows.map((row, index) => (
                        <View
                          key={row.label}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            minHeight: 43,
                            borderBottomWidth: index < infoRows.length - 1 ? 1 : 0,
                            borderBottomColor: '#E8EDF4',
                            gap: 16,
                          }}
                        >
                          <Text style={{ fontSize: 12.5, fontWeight: '600', color: '#64748B' }}>{row.label}</Text>
                          <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>{row.value}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>

                {project.notes ? (
                  <View style={{ borderTopWidth: 1, borderTopColor: '#E8EDF4', paddingHorizontal: 14, paddingVertical: 14 }}>
                    <Text style={{ fontSize: 12, fontWeight: '900', color: '#64748B', letterSpacing: 0.55, marginBottom: 8 }}>NOTAS</Text>
                    <Text style={{ fontSize: 13, lineHeight: 19, color: '#0F172A' }}>{project.notes}</Text>
                  </View>
                ) : null}
              </View>

              {/* TU POSICIÓN — perspectiva personal, derivada del resultado de arriba */}
              {hasActivity && (
                <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 20, overflow: 'hidden', marginBottom: 14 }}>
                  <View style={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: 14 }}>
                    <Text style={{ fontSize: 12, fontWeight: '900', color: '#64748B', letterSpacing: 0.55 }}>
                      TU POSICIÓN
                    </Text>
                    <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>
                      Resultado del proyecto ({formatCurrency(result)}) × tu {formatPercentage(project.financials.myPercentage)} de participación
                    </Text>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 14 }}>
                      <Text style={{ fontSize: 12.5, fontWeight: '600', color: '#64748B' }}>Tu beneficio</Text>
                      <Text style={{ fontSize: 22, fontWeight: '800', color: signColor(myProfit, colors.success, colors.danger, '#0F172A') }}>
                        {formatCurrency(myProfit)}
                      </Text>
                    </View>

                    <View style={{ height: 1, backgroundColor: '#E8EDF4', marginTop: 12, marginBottom: 12 }} />

                    <StatsRow
                      items={[
                        { key: 'participacion', label: 'PARTICIPACIÓN', value: formatPercentage(project.financials.myPercentage) },
                        { key: 'retirado', label: 'RETIRADO', value: formatCurrency(project.financials.myWithdrawnProfit) },
                        {
                          key: 'pendiente',
                          label: 'PENDIENTE',
                          value: formatCurrency(myPending),
                          color: signColor(myPending, colors.success, colors.danger, '#0F172A'),
                        },
                      ]}
                    />
                  </View>
                </View>
              )}

              {/* CAJA DEL PROYECTO — perspectiva del proyecto entero, todos los socios */}
              <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 20, overflow: 'hidden' }}>
                <View style={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '900', color: '#64748B', letterSpacing: 0.55 }}>CAJA DEL PROYECTO</Text>
                  <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 3, marginBottom: 10 }}>
                    Dinero de todos los socios que sigue dentro del proyecto
                  </Text>

                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      minHeight: 40,
                      borderTopWidth: 1,
                      borderBottomWidth: 1,
                      borderTopColor: '#E8EDF4',
                      borderBottomColor: '#E8EDF4',
                    }}
                  >
                    <Text style={{ fontSize: 12.5, fontWeight: '600', color: '#64748B' }}>Caja actual</Text>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>{formatCurrency(project.financials.cash)}</Text>
                  </View>
                  {cashRows.map((row, index) => (
                    <View
                      key={row.label}
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        minHeight: 40,
                        borderBottomWidth: index < cashRows.length - 1 ? 1 : 0,
                        borderBottomColor: '#E8EDF4',
                      }}
                    >
                      <Text style={{ fontSize: 12.5, fontWeight: '600', color: '#64748B' }}>{row.label}</Text>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '800',
                          color: row.tone === 'signal' ? (row.sign === '+' ? colors.success : colors.danger) : '#334155',
                        }}
                      >
                        {row.sign}{formatCurrency(row.value)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          );
        })()}

        {tab === 'movements' && (() => {
          if (combinedMovements.length === 0) {
            return (
              <Text style={{ fontSize: 12.5, color: '#94A3B8', textAlign: 'center', marginTop: 24 }}>
                No hay movimientos todavía.
              </Text>
            );
          }

          const getDayKey = (dateStr?: string | null) => {
            if (!dateStr) return '__undated__';
            const d = new Date(dateStr);
            if (Number.isNaN(d.getTime())) return '__undated__';
            const y = d.getUTCFullYear();
            const m = String(d.getUTCMonth() + 1).padStart(2, '0');
            const day = String(d.getUTCDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
          };

          const formatDayLabel = (isoDay: string) => {
            if (isoDay === '__undated__') return 'Sin fecha';
            const today = new Date();
            const [y, m, d] = isoDay.split('-').map(Number);
            const isToday = y === today.getUTCFullYear() && m === today.getUTCMonth() + 1 && d === today.getUTCDate();
            if (isToday) return 'Hoy';
            return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('es-ES', {
              weekday: 'short',
              day: '2-digit',
              month: 'short',
            });
          };

          const grouped: Record<string, CombinedMovement[]> = {};
          combinedMovements.forEach((item) => {
            const key = getDayKey(item.date);
            (grouped[key] = grouped[key] || []).push(item);
          });

          const dayKeys = Object.keys(grouped).sort((a, b) => {
            if (a === '__undated__') return 1;
            if (b === '__undated__') return -1;
            return b.localeCompare(a);
          });

          return (
            <View>
              {dayKeys.map((dayKey) => {
                const items = grouped[dayKey];
                const dayTotal = items.reduce((acc, item) => {
                  const signed = item.kind === 'income' || item.kind === 'contribution' ? item.amount : -item.amount;
                  return acc + signed;
                }, 0);

                return (
                  <View key={dayKey} style={{ marginBottom: 14 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, paddingHorizontal: 2 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#94A3B8' }}>{formatDayLabel(dayKey)}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#94A3B8' }}>
                        {dayTotal >= 0 ? '+' : ''}{formatCurrency(dayTotal)}
                      </Text>
                    </View>
                    <View style={{ height: 1, backgroundColor: '#E2E8F0', marginBottom: 4 }} />

                    {items.map((item) => {
                      const meta = MOVEMENT_KIND_META[item.kind];
                      const sign = item.kind === 'income' || item.kind === 'contribution' ? '+' : '-';
                      const partnerName = item.source === 'manual' && item.partnerId != null ? partnerNameById.get(item.partnerId) : null;
                      const movementTag = `${MOVEMENT_KIND_LABELS[item.kind]}${partnerName ? ` · ${partnerName}` : ''}`;
                      const secondaryText = [movementTag, item.category, item.description].filter(Boolean).join(' · ');

                      return (
                        <TouchableOpacity
                          key={`${item.source}-${item.id}`}
                          activeOpacity={0.7}
                          onPress={() => setSelectedMovement(item)}
                          style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 2 }}
                        >
                          <View
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 10,
                              backgroundColor: meta.bg,
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: 12,
                            }}
                          >
                            <Ionicons name={meta.icon} size={17} color={meta.color} />
                          </View>

                          <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={{ fontSize: 15, fontWeight: '600', color: '#0F172A' }} numberOfLines={1}>
                              {item.title}
                            </Text>
                            <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 1 }} numberOfLines={1}>
                              {secondaryText}
                            </Text>
                          </View>

                          <Text style={{ fontSize: 15.5, fontWeight: '600', color: '#0F172A' }}>
                            {sign}{formatCurrency(item.amount)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          );
        })()}

        {tab === 'config' && (
          <View>
            <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 20, overflow: 'hidden' }}>
              <View style={{ paddingHorizontal: 14, paddingTop: 16, paddingBottom: project.partners?.length ? 12 : 18 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: '900', color: '#64748B', letterSpacing: 0.55 }}>SOCIOS</Text>
                  <View style={{ flexDirection: 'row', gap: 14 }}>
                    {!!project.partners?.length && (
                      <TouchableOpacity onPress={openProfitCreate}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>Repartir</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={openPartnersEditor}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>Configurar</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {!project.partners?.length ? (
                  <Text style={{ fontSize: 12.5, color: '#94A3B8', marginTop: 12 }}>
                    Define los socios y porcentajes para activar el reparto de beneficios.
                  </Text>
                ) : (
                  <View style={{ marginTop: 12 }}>
                    {distributable > 0 && (
                      <Text style={{ fontSize: 11, color: '#94A3B8', marginBottom: 10 }}>
                        Beneficio sin repartir: {formatCurrency(distributable)}
                      </Text>
                    )}
                    {project.partners.map((partner, index) => {
                      const suggested = distributable * (partner.percentage / 100);
                      return (
                        <View
                          key={partner.id}
                          style={{
                            backgroundColor: '#F8FAFC',
                            borderRadius: 14,
                            padding: 12,
                            marginBottom: index < project.partners.length - 1 ? 8 : 0,
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 10,
                                backgroundColor: partner.isMe ? '#EEF2FF' : '#E2E8F0',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: 10,
                              }}
                            >
                              <Text style={{ fontSize: 13, fontWeight: '700', color: partner.isMe ? '#4F46E5' : '#64748B' }}>
                                {initials(partner.name)}
                              </Text>
                            </View>
                            <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: '#0F172A' }} numberOfLines={1}>
                              {partner.name}{partner.isMe ? ' · Tú' : ''}
                            </Text>
                            <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: '#EEF2FF' }}>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#4F46E5' }}>{formatPercentage(partner.percentage)}</Text>
                            </View>
                          </View>

                          <View style={{ flexDirection: 'row', marginTop: 12, gap: 20 }}>
                            <View>
                              <Text style={{ fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.4 }}>APORTADO</Text>
                              <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#334155', marginTop: 2 }}>
                                {formatCurrency(partner.contributed)}
                              </Text>
                            </View>
                            <View>
                              <Text style={{ fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.4 }}>RETIRADO</Text>
                              <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#334155', marginTop: 2 }}>
                                {formatCurrency(partner.withdrawnProfit)}
                              </Text>
                            </View>
                            {partner.capitalReturned > 0 && (
                              <View>
                                <Text style={{ fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.4 }}>DEVUELTO</Text>
                                <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#334155', marginTop: 2 }}>
                                  {formatCurrency(partner.capitalReturned)}
                                </Text>
                              </View>
                            )}
                          </View>

                          {suggested > 0 && (
                            <View
                              style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginTop: 10,
                                paddingTop: 10,
                                borderTopWidth: 1,
                                borderTopColor: '#E2E8F0',
                              }}
                            >
                              <Text style={{ fontSize: 11.5, color: '#64748B' }}>Le correspondería</Text>
                              <Text style={{ fontSize: 12.5, fontWeight: '800', color: colors.primary }}>
                                {formatCurrency(suggested)}
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

      </ScrollView>

      <Modal visible={txSelectorOpen} transparent animationType="slide" onRequestClose={() => setTxSelectorOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: 'white',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: '85%',
              paddingBottom: 12,
            }}
          >
            <View className="px-4 pt-3 pb-2 flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-slate-900">Asociar transacciones</Text>
              <TouchableOpacity onPress={() => setTxSelectorOpen(false)}>
                <Ionicons name="close-outline" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View className="px-4 pb-2">
              <View className="flex-row items-center px-3 py-2 rounded-full" style={{ backgroundColor: '#F1F5F9' }}>
                <Ionicons name="search-outline" size={16} color="#64748B" />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Buscar por descripción"
                  placeholderTextColor="#94A3B8"
                  className="ml-2 text-[16px] flex-1 text-slate-900"
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
                      className="px-4 py-3 border-b border-slate-100 flex-row items-center"
                    >
                      <Ionicons
                        name={checked ? 'checkbox' : 'square-outline'}
                        size={20}
                        color={checked ? colors.primary : '#9CA3AF'}
                      />

                      <View className="flex-1 ml-2 pr-2">
                        <Text className="text-[13px] text-slate-900" numberOfLines={1}>
                          {item.description || 'Sin descripción'}
                        </Text>
                        <Text className="text-[11px] text-slate-500">{formatDate(item.date)}</Text>
                      </View>

                      <Text className="text-[12px] font-semibold" style={{ color: amountColor }}>
                        {formatCurrency(item.amount)}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View className="py-6 items-center">
                    <Text className="text-xs text-slate-400">No hay transacciones para mostrar.</Text>
                  </View>
                }
              />
            )}

            <View className="px-4 pt-2">
              <TouchableOpacity
                onPress={saveSelectedTransactions}
                disabled={txLoading}
                className="py-3 rounded-xl items-center"
                style={{ backgroundColor: colors.primary, opacity: txLoading ? 0.7 : 1 }}
              >
                <Text className="text-sm font-semibold text-white">Guardar selección</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={profitModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setProfitModalOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', paddingHorizontal: 20 }}>
          <View style={{ backgroundColor: 'white', borderRadius: 18, padding: 16, maxHeight: '86%' }}>
            <Text className="text-sm font-semibold text-slate-900 mb-3">
              Repartir beneficios
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TextInput
                value={profitForm.title}
                onChangeText={(text) => setProfitForm((prev) => ({ ...prev, title: text }))}
                placeholder="Título (opcional)"
                placeholderTextColor="#94A3B8"
                className="border border-slate-200 rounded-xl px-3 py-2 text-[16px] mb-2 text-slate-900"
              />

              <TextInput
                value={profitForm.totalAmount}
                onChangeText={(text) => {
                  setProfitForm((prev) => ({ ...prev, totalAmount: text }));
                  recalculateProfitLinesFromPercentages(text);
                }}
                placeholder="Importe total *"
                placeholderTextColor="#94A3B8"
                keyboardType="decimal-pad"
                className="border border-slate-200 rounded-xl px-3 py-2 text-[16px] mb-2 text-slate-900"
              />

              <TouchableOpacity
                onPress={() => recalculateProfitLinesFromPercentages(profitForm.totalAmount)}
                style={{ alignSelf: 'flex-end', marginBottom: 8 }}
              >
                <Text className="text-[12px] font-semibold text-primary">Recalcular por porcentajes</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setProfitDatePickerVisible(true)}
                className="border border-slate-200 rounded-xl px-3 py-2 mb-2"
              >
                <Text className="text-[13px] text-slate-900">
                  Fecha *: {formatDate(profitForm.date.toISOString())}
                </Text>
              </TouchableOpacity>

              <TextInput
                value={profitForm.notes}
                onChangeText={(text) => setProfitForm((prev) => ({ ...prev, notes: text }))}
                placeholder="Notas (opcional)"
                placeholderTextColor="#94A3B8"
                multiline
                className="border border-slate-200 rounded-xl px-3 py-2 text-[16px] mb-2 text-slate-900"
                style={{ minHeight: 64, textAlignVertical: 'top' }}
              />

              <View className="flex-row justify-between items-center mt-1 mb-2">
                <Text className="text-[12px] text-slate-500">Socios y reparto</Text>
                <TouchableOpacity onPress={() => recalculateProfitLinesFromPercentages(profitForm.totalAmount)}>
                  <Text className="text-[12px] font-semibold text-primary">Recalcular</Text>
                </TouchableOpacity>
              </View>

              {profitForm.lines.map((line, index) => (
                <View
                  key={`${index}-${line.partnerName}`}
                  className="border border-slate-200 rounded-xl p-2 mb-2"
                  style={{ backgroundColor: '#F8FAFC' }}
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-[13px] font-semibold text-slate-900">{line.partnerName || `Socio ${index + 1}`}</Text>
                    <Text className="text-[11px] text-slate-500">
                      {formatPercentage((project.partners || []).find((p) => p.name === line.partnerName)?.percentage || 0)}
                    </Text>
                  </View>
                  <TextInput
                    value={line.amount}
                    onChangeText={(text) => updateProfitLine(index, 'amount', text)}
                    placeholder="Importe"
                    placeholderTextColor="#94A3B8"
                    keyboardType="decimal-pad"
                    className="border border-slate-200 rounded-lg px-2 py-2 text-[15px] mb-2 text-slate-900 bg-white"
                  />
                  <TextInput
                    value={line.notes}
                    onChangeText={(text) => updateProfitLine(index, 'notes', text)}
                    placeholder="Nota (opcional)"
                    placeholderTextColor="#94A3B8"
                    className="border border-slate-200 rounded-lg px-2 py-2 text-[15px] text-slate-900 bg-white"
                  />
                </View>
              ))}
            </ScrollView>

            <View className="flex-row mt-3">
              <TouchableOpacity
                onPress={() => {
                  setProfitModalOpen(false);
                }}
                className="flex-1 py-2.5 rounded-xl mr-2 items-center"
                style={{ backgroundColor: '#F1F5F9' }}
              >
                <Text className="text-[13px] text-slate-700 font-semibold">Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={saveProfitDistribution}
                disabled={profitSaving}
                className="flex-1 py-2.5 rounded-xl ml-2 items-center"
                style={{ backgroundColor: colors.primary, opacity: profitSaving ? 0.7 : 1 }}
              >
                {profitSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-[13px] text-white font-semibold">Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <CrossPlatformDateTimePicker
          isVisible={profitDatePickerVisible}
          mode="date"
          date={profitForm.date}
          onCancel={() => setProfitDatePickerVisible(false)}
          onConfirm={(date) => {
            setProfitForm((prev) => ({ ...prev, date }));
            setProfitDatePickerVisible(false);
          }}
        />
      </Modal>

      <Modal
        visible={partnersModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPartnersModalOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', paddingHorizontal: 20 }}>
          <View style={{ backgroundColor: 'white', borderRadius: 18, padding: 16, maxHeight: '86%' }}>
            <Text className="text-sm font-semibold text-slate-900 mb-3">
              Configurar socios y porcentajes
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {partnersForm.map((partner, index) => (
                <View
                  key={`partner-${index}`}
                  className="border border-slate-200 rounded-xl p-2 mb-2"
                  style={{ backgroundColor: '#F8FAFC' }}
                >
                  <TextInput
                    value={partner.name}
                    onChangeText={(text) => updatePartnerLine(index, 'name', text)}
                    placeholder={`Socio ${index + 1}`}
                    placeholderTextColor="#94A3B8"
                    className="border border-slate-200 rounded-lg px-2 py-2 text-[15px] mb-2 text-slate-900 bg-white"
                  />
                  <TextInput
                    value={partner.percentage}
                    onChangeText={(text) => updatePartnerLine(index, 'percentage', text)}
                    placeholder="% participación"
                    placeholderTextColor="#94A3B8"
                    keyboardType="decimal-pad"
                    className="border border-slate-200 rounded-lg px-2 py-2 text-[15px] mb-2 text-slate-900 bg-white"
                  />
                  <TouchableOpacity
                    onPress={() => updatePartnerLine(index, 'isMe', true)}
                    className="flex-row items-center"
                  >
                    <Ionicons
                      name={partner.isMe ? 'radio-button-on' : 'radio-button-off'}
                      size={16}
                      color={partner.isMe ? '#2563EB' : '#94A3B8'}
                    />
                    <Text className="text-[12px] text-slate-700 ml-1.5">Soy yo</Text>
                  </TouchableOpacity>

                  {partnersForm.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removePartnerLine(index)}
                      style={{ alignSelf: 'flex-end', marginTop: 6 }}
                    >
                      <Text className="text-[12px] font-semibold text-red-600">Eliminar socio</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              <TouchableOpacity onPress={addPartnerLine} style={{ marginTop: 2 }}>
                <Text className="text-[12px] font-semibold text-primary">+ Añadir socio</Text>
              </TouchableOpacity>
            </ScrollView>

            <View className="flex-row mt-3">
              <TouchableOpacity
                onPress={() => setPartnersModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl mr-2 items-center"
                style={{ backgroundColor: '#F1F5F9' }}
              >
                <Text className="text-[13px] text-slate-700 font-semibold">Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={savePartners}
                disabled={partnersSaving}
                className="flex-1 py-2.5 rounded-xl ml-2 items-center"
                style={{ backgroundColor: colors.primary, opacity: partnersSaving ? 0.7 : 1 }}
              >
                {partnersSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-[13px] text-white font-semibold">Guardar socios</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={addMovementMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAddMovementMenuOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.24)', justifyContent: 'flex-end' }}>
          <TouchableOpacity activeOpacity={1} onPress={() => setAddMovementMenuOpen(false)} style={{ flex: 1 }} />
          <View
            style={{
              backgroundColor: 'white',
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              paddingHorizontal: 16,
              paddingTop: 10,
              paddingBottom: 22,
            }}
          >
            <View
              style={{
                alignSelf: 'center',
                width: 40,
                height: 4,
                borderRadius: 99,
                backgroundColor: '#CBD5E1',
                marginBottom: 12,
              }}
            />

            <Text className="text-[12px] text-slate-500 mb-2">Añadir movimiento</Text>

            <TouchableOpacity
              onPress={() => {
                setAddMovementMenuOpen(false);
                openTxSelector();
              }}
              className="flex-row items-center px-2 py-3 border-b border-slate-100"
            >
              <Ionicons name="link-outline" size={17} color="#2563EB" />
              <Text className="text-[14px] font-medium text-slate-800 ml-2">Vincular transacción existente</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setAddMovementMenuOpen(false);
                openManualCreate();
              }}
              className="flex-row items-center px-2 py-3"
            >
              <Ionicons name="add-circle-outline" size={17} color="#059669" />
              <Text className="text-[14px] font-medium text-slate-800 ml-2">Crear movimiento manual</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={!!selectedMovement} transparent animationType="fade" onRequestClose={() => setSelectedMovement(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.24)', justifyContent: 'flex-end' }}>
          <TouchableOpacity activeOpacity={1} onPress={() => setSelectedMovement(null)} style={{ flex: 1 }} />
          <View
            style={{
              backgroundColor: 'white',
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              paddingHorizontal: 16,
              paddingTop: 10,
              paddingBottom: 22,
            }}
          >
            <View
              style={{
                alignSelf: 'center',
                width: 40,
                height: 4,
                borderRadius: 99,
                backgroundColor: '#CBD5E1',
                marginBottom: 12,
              }}
            />

            <Text className="text-[14px] font-semibold text-slate-900 mb-2" numberOfLines={1}>
              {selectedMovement?.title}
            </Text>

            {selectedMovement?.source === 'transaction' ? (
              <>
                <TouchableOpacity
                  onPress={() => {
                    const tx = project.transactions.find((t) => t.id === selectedMovement.id);
                    setSelectedMovement(null);
                    if (tx) navigation.navigate('Add', { editData: tx });
                  }}
                  className="flex-row items-center px-2 py-3 border-b border-slate-100"
                >
                  <Ionicons name="eye-outline" size={17} color="#2563EB" />
                  <Text className="text-[14px] font-medium text-slate-800 ml-2">Ver transacción</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    const id = selectedMovement.id;
                    setSelectedMovement(null);
                    detachTransaction(id);
                  }}
                  className="flex-row items-center px-2 py-3"
                >
                  <Ionicons name="close-circle-outline" size={17} color="#DC2626" />
                  <Text className="text-[14px] font-medium text-red-600 ml-2">Desvincular del proyecto</Text>
                </TouchableOpacity>
              </>
            ) : selectedMovement?.source === 'manual' ? (
              <>
                <TouchableOpacity
                  onPress={() => {
                    const entry = project.manualEntries.find((e) => e.id === selectedMovement.id);
                    setSelectedMovement(null);
                    if (entry) openManualEdit(entry);
                  }}
                  className="flex-row items-center px-2 py-3 border-b border-slate-100"
                >
                  <Ionicons name="create-outline" size={17} color="#4F46E5" />
                  <Text className="text-[14px] font-medium text-slate-800 ml-2">Editar movimiento</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    const entry = project.manualEntries.find((e) => e.id === selectedMovement.id);
                    setSelectedMovement(null);
                    if (entry) removeManualEntry(entry);
                  }}
                  className="flex-row items-center px-2 py-3"
                >
                  <Ionicons name="trash-outline" size={17} color="#DC2626" />
                  <Text className="text-[14px] font-medium text-red-600 ml-2">Eliminar movimiento</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
