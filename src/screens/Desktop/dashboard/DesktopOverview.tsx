import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import { useCreateTxModal } from '../../../context/CreateTxModalContext';
import { useNetWorthTrend } from '../../../hooks/useNetWorthTrend';
import { useInvestmentPeriodProfit } from '../../../hooks/useInvestmentPeriodProfit';
import { wealthPeriodChange } from './wealthPeriodChange';
import { getTransactionsDataVersion, subscribeTransactionsInvalidation } from '../../../utils/transactionsInvalidation';
import { filterTransactionsForStats } from '../../../utils/wealthSeries';
import { getComparison } from '../../../utils/comparison';
import { exportTransactionsCsv } from '../../../utils/csvExport';
import api from '../../../api/api';
import DesktopDateTimeFilterModal from '../../../components/DesktopDateTimeFilterModal';
import HomeFiltersModal, { DEFAULT_HOME_FILTERS, applyHomeFilters, countActiveHomeFilters } from '../../../components/HomeFiltersModal';
import GroupedBarChart from '../../../components/GroupedBarChart';
import PieChart from '../../../components/PieChart';
import WalletIcon from '../../../components/WalletIcon';
import { activityBuckets, categories, currentMonth, inPeriod, previousPeriod, summarize, type DashboardTx, type Period } from './dashboardData';

const BLUE = '#2458E8', GREEN = '#20856C', RED = '#CF6570', INK = '#25334B', MUTED = '#8B96A8';
const FONT = Platform.OS === 'web' ? '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' : 'System';
type Icon = keyof typeof Ionicons.glyphMap;

function Button({ label, icon, onPress, primary = false, disabled = false }: { label: string; icon?: Icon; onPress: () => void; primary?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={({ hovered }: any) => [s.button, primary && s.primary, hovered && { opacity: 0.8 }, disabled && { opacity: 0.45 }]}>
    {icon && <Ionicons name={icon} size={16} color={primary ? 'white' : '#718099'} />}<Text style={[s.buttonText, primary && { color: 'white' }]}>{label}</Text>
  </Pressable>;
}
function Heading({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return <View style={s.cardHeading}><View style={{ flex: 1 }}><Text style={s.cardTitle}>{title}</Text>{subtitle && <Text style={s.caption}>{subtitle}</Text>}</View>{children}</View>;
}
function Empty({ text }: { text: string }) {
  return <View style={s.empty}><Ionicons name="analytics-outline" size={27} color="#B9C3D3" /><Text style={s.emptyText}>{text}</Text></View>;
}
function Metric({ title, value, icon, color, comparison, loading, caption, valueColor }: { caption?: string; valueColor?: string; title: string; value: string; icon: Icon; color: string; comparison?: ReturnType<typeof getComparison>; loading: boolean }) {
  return <View style={s.metric}>
    <View style={s.between}><Text style={s.metricLabel}>{title}</Text><View style={[s.metricIcon, { backgroundColor: `${color}10` }]}><Ionicons name={icon} size={17} color={color} /></View></View>
    <Text style={[s.metricValue, valueColor ? { color: valueColor } : undefined]} numberOfLines={1} adjustsFontSizeToFit>{loading ? '—' : value}</Text>
    <View style={s.metricFoot}>{!loading && comparison ? <><Ionicons name={comparison.direction === 'up' ? 'arrow-up' : comparison.direction === 'down' ? 'arrow-down' : 'remove'} size={12} color={comparison.isPositiveForUser ? GREEN : RED} /><Text style={[s.comparison, { color: comparison.isPositiveForUser ? GREEN : RED }]}>{comparison.formattedPercentage}</Text><Text style={s.tiny}>vs. periodo anterior</Text></> : <Text style={s.tiny}>{caption || 'En el periodo seleccionado'}</Text>}</View>
  </View>;
}

export default function DesktopOverview({ navigation }: any) {
  const { user } = useAuth();
  const money = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: user?.currency || 'EUR' }).format(n);
  const { openCreateTx, openEditTx } = useCreateTxModal();
  const { width } = useWindowDimensions();
  const twoColumns = width >= 1250;
  const client = useQueryClient();
  const [period, setPeriod] = useState<Period>(currentMonth);
  const [dateOpen, setDateOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [walletId, setWalletId] = useState<number | null>(null);
  const [categoryType, setCategoryType] = useState<'expense' | 'income'>('expense');
  const [category, setCategory] = useState<string | null>(null);
  const [allCategories, setAllCategories] = useState(false);
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(8);
  const [filters, setFilters] = useState(DEFAULT_HOME_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [version, setVersion] = useState(getTransactionsDataVersion);
  useEffect(() => subscribeTransactionsInvalidation(setVersion), []);
  const netWorth = useNetWorthTrend('month');
  const investment = useInvestmentPeriodProfit(period.from, period.to);
  const transactionsQuery = useQuery({
    queryKey: ['desktopOverviewTransactions', user?.id, version],
    queryFn: async () => {
      const data = (await api.get('/transactions')).data;
      if (!Array.isArray(data)) throw new Error('Invalid transactions response');
      return data as DashboardTx[];
    }, staleTime: 30000,
  });
  useFocusEffect(useCallback(() => { void transactionsQuery.refetch(); }, [transactionsQuery.refetch]));
  const rows = useMemo(() => (transactionsQuery.data ?? []).filter(tx => tx.active !== false && tx.isRecurring === false && (walletId == null || (tx.walletId ?? tx.wallet?.id) === walletId || tx.fromWalletId === walletId || tx.toWalletId === walletId)), [transactionsQuery.data, walletId]);
  const statsRows = useMemo(() => filterTransactionsForStats(rows) as DashboardTx[], [rows]);
  const currentRows = useMemo(() => inPeriod(statsRows, period), [statsRows, period]);
  const previous = useMemo(() => previousPeriod(period), [period]);
  const totals = useMemo(() => summarize(currentRows), [currentRows]);
  const past = useMemo(() => summarize(inPeriod(statsRows, previous)), [statsRows, previous]);
  const buckets = useMemo(() => activityBuckets(statsRows, period), [statsRows, period]);
  const categoryRows = useMemo(() => categories(currentRows, categoryType), [currentRows, categoryType]);
  const topExpense = useMemo(() => categories(currentRows, 'expense')[0], [currentRows]);
  const tableBase = useMemo(() => inPeriod(rows, period), [rows, period]);
  const visibleRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es');
    return applyHomeFilters(tableBase, filters).filter(tx => (!category || ((tx.category?.name || 'Sin categoría') === category && tx.type === categoryType)) && (!query || [tx.description, tx.note, tx.category?.name, tx.subcategory?.name, tx.wallet?.name].filter(Boolean).join(' ').toLocaleLowerCase('es').includes(query))) as DashboardTx[];
  }, [tableBase, filters, search, category, categoryType]);
  useEffect(() => setLimit(8), [search, filters, category, period, walletId]);
  const categoryTotal = categoryType === 'expense' ? totals.expense : totals.income;
  const loading = transactionsQuery.isPending || transactionsQuery.isError;
  const selectedWallet = netWorth.wallets.find(w => w.id === walletId);
  const refresh = async () => {
    setRefreshing(true);
    try { await Promise.all([
      transactionsQuery.refetch(),
      ...['netWorthCurrent', 'netWorthTrendSeries', 'investmentSnapshotsAll', 'investmentSnapshotCurrent', 'investmentAssets'].map(key => client.invalidateQueries({ queryKey: [key] })),
    ]); } finally { setRefreshing(false); }
  };
  const baseMoney = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: user?.currency || 'EUR' }).format(n);
  const wealthChange = useMemo(() => wealthPeriodChange(period, netWorth.series, netWorth.current, transactionsQuery.data ?? []), [period, netWorth.series, netWorth.current, transactionsQuery.data]);
  const wealthChangeReady = !netWorth.isLoading && !netWorth.isError && !transactionsQuery.isPending && !transactionsQuery.isError;
  const signedMoney = (value: number) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${baseMoney(Math.abs(value))}`;
  const expensesDelta = getComparison(totals.expense, past.expense, 'expense');

  return <View style={s.root}>
    <ScrollView contentContainerStyle={[s.content, width < 1200 && { padding: 24 }]}>
      <View style={s.header}>
        <View><Text style={s.eyebrow}>TU VISTA GENERAL</Text><Text style={s.title}>Todo en perspectiva.</Text><Text style={s.subtitle}>Hola{user?.name ? `, ${user.name.split(' ')[0]}` : ''}. Así van tus finanzas.</Text></View>
        <View style={s.actions}><Button icon="calendar-outline" label={period.label} onPress={() => setDateOpen(true)} /><Button icon="refresh-outline" label={refreshing ? 'Actualizando…' : 'Actualizar'} onPress={refresh} disabled={refreshing} /></View>
      </View>

      <View style={[s.heroRow, !twoColumns && { flexDirection: 'column' }]}>
        <View style={s.wealthCard}>
          <View>
            <Text style={s.wealthLabel}>PATRIMONIO NETO</Text>
            <Text style={s.wealthValue}>{netWorth.isLoading ? '—' : netWorth.isError ? 'No disponible' : baseMoney(netWorth.current)}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 7, flexWrap: 'wrap' }}>
              {wealthChangeReady && wealthChange ? <>
                <Ionicons name={wealthChange.delta < 0 ? 'trending-down-outline' : wealthChange.delta > 0 ? 'trending-up-outline' : 'remove-outline'} size={15} color={wealthChange.delta < 0 ? '#FFD0D5' : '#A7F3D0'} />
                <Text style={[s.wealthHint, { color: wealthChange.delta < 0 ? '#FFD0D5' : '#A7F3D0', fontWeight: '600' }]}>
                  {signedMoney(wealthChange.delta)} · {wealthChange.percentage == null ? '% no disponible' : `${wealthChange.percentage > 0 ? '+' : ''}${wealthChange.percentage.toFixed(1).replace('.', ',')} %`}
                </Text>
                <Text style={s.wealthHint}>{period.label}{wealthChange.estimated ? ' · estimado por movimientos' : ''}</Text>
              </> : <Text style={s.wealthHint}>{wealthChangeReady ? 'Sin referencia de patrimonio para este periodo' : 'Variación no disponible'}</Text>}
            </View>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 12 }}>
            <View style={s.liveBadge}><View style={s.liveDot} /><Text style={s.liveText}>Hoy · todas tus carteras</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Ver composición del patrimonio" onPress={() => setWalletOpen(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
              <Text style={s.wealthHint}>{netWorth.isError ? 'Revisar carteras' : 'Ver carteras'}</Text><Ionicons name="arrow-forward" size={17} color="#C0D0FF" />
            </Pressable>
          </View>
        </View>
      </View>

      <View style={s.sectionBar}><View><Text style={s.sectionTitle}>Tu actividad</Text><Text style={s.caption}>{period.label} · {selectedWallet?.name || 'Todas las carteras'}</Text></View><Button icon="wallet-outline" label={selectedWallet?.name || 'Filtrar cartera'} onPress={() => setWalletOpen(true)} /></View>
      {transactionsQuery.isError && <View accessibilityRole="alert" style={s.error}><Ionicons name="alert-circle-outline" size={20} color={RED} /><Text style={s.errorText}>No se ha podido cargar la actividad. Pulsa Actualizar para volver a intentarlo.</Text></View>}
      <View style={s.metrics}>
        <Metric title="Ingresos" value={money(totals.income)} icon="arrow-down-outline" color={GREEN} loading={loading} comparison={previous ? getComparison(totals.income, past.income, 'income') : undefined} />
        <Metric title="Gastos" value={money(totals.expense)} icon="arrow-up-outline" color={RED} loading={loading} comparison={previous ? expensesDelta : undefined} />
        <Metric title="Balance del periodo" value={money(totals.savings)} icon="wallet-outline" color={BLUE} loading={loading} comparison={previous ? getComparison(totals.savings, past.savings, 'savings') : undefined} />
        <Metric title="Tasa de ahorro" value={totals.rate == null ? '—' : `${totals.rate.toFixed(1).replace('.', ',')} %`} icon="leaf-outline" color="#9580CE" loading={loading} />
        {investment.hasAssets && <Metric title="Rentabilidad" value={investment.isError ? 'No disponible' : signedMoney(investment.profit)} icon="trending-up-outline" color={GREEN} valueColor={investment.isError ? MUTED : investment.profit < 0 ? RED : GREEN} loading={investment.isLoading} caption="Todas las inversiones · datos mensuales" />}
      </View>

      <View style={[s.analysisRow, !twoColumns && { flexDirection: 'column' }]}>
        <View style={[s.card, { flex: 1.55 }]}>
          <Heading title="Ingresos y gastos" subtitle={period.type === 'month' ? 'Semana a semana, dentro del mes seleccionado' : period.type === 'year' ? 'Mes a mes, dentro del año seleccionado' : 'Los seis meses hasta el final del periodo'} />
          
          {transactionsQuery.isError ? <Empty text="Actividad no disponible." /> : loading ? <View style={s.chartLoading}><ActivityIndicator color={BLUE} /></View> : buckets.some(b => b.income || b.expense) ? <GroupedBarChart key={`${period.from}-${period.to}`} series={[{ label: 'Ingresos', color: BLUE, values: buckets.map(b => b.income) }, { label: 'Gastos', color: '#BCCAF0', values: buckets.map(b => b.expense) }]} xLabels={buckets.map(b => b.label)} tooltipLabels={buckets.map(b => b.fullLabel)} height={182} currentPeriodIndex={null} formatValue={money} formatAxisValue={value => new Intl.NumberFormat('es-ES', { notation: 'compact', maximumFractionDigits: 1 }).format(value)} /> : <Empty text="Aún no hay actividad para este gráfico." />}
          <View style={s.chartFooter}><Text style={s.small}>Ahorro = ingresos − gastos</Text><Text style={[s.small, { color: totals.savings < 0 ? RED : GREEN, fontWeight: '600' }]}>{loading ? '—' : money(totals.savings)}</Text></View>
        </View>
        <View style={[s.card, { flex: 1 }]}>
          <Heading title="Dónde va tu dinero" subtitle="Selecciona una categoría para ver sus movimientos" />
          <View style={s.tabs}>{(['expense', 'income'] as const).map(type => <Pressable key={type} accessibilityRole="button" accessibilityLabel={type === 'expense' ? 'Categorías de gastos' : 'Categorías de ingresos'} onPress={() => { setCategoryType(type); setCategory(null); setAllCategories(false); }} style={[s.tab, categoryType === type && s.tabActive]}><Text style={[s.tabText, categoryType === type && { color: BLUE }]}>{type === 'expense' ? 'Gastos' : 'Ingresos'}</Text></Pressable>)}</View>
          {transactionsQuery.isError ? <Empty text="Actividad no disponible." /> : loading ? <ActivityIndicator color={BLUE} /> : categoryRows.length ? <>
            <View style={s.categorySummary}><View style={{ width: 156, flexShrink: 0 }}><PieChart formatValue={money} key={`${categoryType}-${period.from}-${walletId}-${categoryRows.map(c => c.name).join('|')}`} data={categoryRows.map(c => ({ value: c.amount, color: c.color, label: c.name }))} size={126} innerRadius={46} /></View><View style={{ flex: 1, minWidth: 0 }}><Text style={s.small}>{categoryType === 'expense' ? 'Gasto total' : 'Ingreso total'}</Text><Text style={s.categoryTotal}>{money(categoryTotal)}</Text><Text style={s.caption}>{categoryRows.length} categorías</Text></View></View>
            {categoryRows.slice(0, allCategories ? undefined : 4).map(c => <Pressable key={c.name} accessibilityRole="button" accessibilityLabel={`Ver movimientos de ${c.name}`} onPress={() => { setCategory(category === c.name ? null : c.name); setFilters(DEFAULT_HOME_FILTERS); setSearch(''); }} style={({ hovered }: any) => [s.categoryRow, (hovered || category === c.name) && { backgroundColor: '#F4F7FC' }]}>
              <View style={s.between}><View style={s.inline}><View style={[s.legendDot, { backgroundColor: c.color }]} /><Text style={s.categoryName} numberOfLines={1}>{c.name}</Text></View><Text style={s.categoryAmount}>{money(c.amount)}</Text></View>
              <View style={s.categoryBar}><View style={{ height: 3, borderRadius: 3, width: `${categoryTotal ? c.amount / categoryTotal * 100 : 0}%`, backgroundColor: c.color }} /></View>
            </Pressable>)}
            {categoryRows.length > 4 && <Pressable accessibilityRole="button" onPress={() => setAllCategories(!allCategories)}><Text style={s.link}>{allCategories ? 'Ver menos' : `Ver las ${categoryRows.length} categorías`}</Text></Pressable>}
          </> : <Empty text="No hay categorías con actividad en este periodo." />}
        </View>
      </View>

      <View style={s.insights}>
        <View style={s.insight}><Ionicons name="bulb-outline" size={21} color="#B99551" /><View style={{ flex: 1 }}><Text style={s.insightTitle}>{topExpense && !loading ? `${topExpense.name}, tu mayor gasto` : 'Cada movimiento cuenta'}</Text><Text style={s.caption}>{topExpense && !loading ? `Representa el ${(topExpense.amount / totals.expense * 100).toFixed(1).replace('.', ',')} % del gasto del periodo.` : 'Registra tus ingresos y gastos para descubrir tus hábitos.'}</Text></View></View>
        <View style={s.insight}><Ionicons name="analytics-outline" size={21} color={BLUE} /><View style={{ flex: 1 }}><Text style={s.insightTitle}>{previous && !loading ? `Gastos ${expensesDelta.direction === 'down' ? 'a la baja' : expensesDelta.direction === 'up' ? 'al alza' : 'sin cambios'}` : 'Una visión de tu actividad'}</Text><Text style={s.caption}>{previous && !loading ? `${expensesDelta.difference > 0 ? '+' : expensesDelta.difference < 0 ? '−' : ''}${money(Math.abs(expensesDelta.difference))} frente al periodo anterior.` : 'Filtra por fechas para comparar periodos.'}</Text></View></View>

      </View>

      <View style={s.card}>
        <Heading title="Tus movimientos" subtitle="Toda la actividad del periodo, incluidas transferencias"><Button label="Nuevo movimiento" icon="add" primary onPress={() => openCreateTx()} /></Heading>
        <View style={s.tableToolbar}><View style={s.search}><Ionicons name="search-outline" size={17} color={MUTED} /><TextInput accessibilityLabel="Buscar movimientos" value={search} onChangeText={setSearch} placeholder="Buscar por comercio, categoría o cartera…" placeholderTextColor={MUTED} style={s.searchInput} /></View><Button label={`Filtros${countActiveHomeFilters(filters) ? ` (${countActiveHomeFilters(filters)})` : ''}`} icon="options-outline" onPress={() => setFilterOpen(true)} /><Button label="Exportar" icon="download-outline" onPress={() => { void exportTransactionsCsv(visibleRows.map(tx => ({ ...tx, amount: Number(tx.baseAmount ?? tx.amount) })), 'finexa_movimientos', user?.currency || 'EUR'); }} disabled={!visibleRows.length} /></View>
        {category && <View style={s.categoryFilter}><Text style={s.small}>Categoría: {category}</Text><Pressable accessibilityRole="button" accessibilityLabel="Quitar filtro de categoría" onPress={() => setCategory(null)}><Ionicons name="close-circle" size={18} color={BLUE} /></Pressable></View>}
        <View style={s.tableHead}><Text style={[s.columnLabel, { flex: 2 }]}>MOVIMIENTO</Text><Text style={[s.columnLabel, { flex: 1 }]}>CATEGORÍA</Text>{twoColumns && <Text style={[s.columnLabel, { flex: 1 }]}>CARTERA</Text>}<Text style={[s.columnLabel, { width: 100 }]}>FECHA</Text><Text style={[s.columnLabel, { width: 120, textAlign: 'right' }]}>IMPORTE</Text></View>
        {loading ? <View style={s.empty}>{transactionsQuery.isError ? <Text style={s.emptyText}>Actividad no disponible.</Text> : <ActivityIndicator color={BLUE} />}</View> : visibleRows.length ? visibleRows.slice(0, limit).map(tx => <Pressable key={tx.id} accessibilityRole="button" accessibilityLabel={`Editar ${tx.description || tx.category?.name || 'movimiento'}`} onPress={() => openEditTx(tx as any)} style={({ hovered }: any) => [s.tableRow, hovered && { backgroundColor: '#F7F9FC' }]}>
          <View style={[s.inline, { flex: 2, minWidth: 0, paddingRight: 15 }]}><View style={s.txIcon}><Text style={{ fontSize: 17 }}>{tx.type === 'transfer' ? '↔' : tx.category?.emoji || '•'}</Text></View><View style={{ flex: 1 }}><Text numberOfLines={1} style={s.txTitle}>{tx.description || tx.note || tx.category?.name || (tx.type === 'transfer' ? 'Transferencia' : 'Sin descripción')}</Text><Text style={s.tiny} numberOfLines={1}>{tx.subcategory?.name || (tx.type === 'income' ? 'Ingreso' : tx.type === 'expense' ? 'Gasto' : 'Entre carteras')}{tx.excludeFromStats ? ' · fuera de estadísticas' : ''}</Text></View></View>
          <Text numberOfLines={1} style={[s.small, { flex: 1, paddingRight: 10 }]}>{tx.category?.name || '—'}</Text>{twoColumns && <Text numberOfLines={1} style={[s.small, { flex: 1, paddingRight: 10 }]}>{tx.wallet?.name || '—'}</Text>}<Text style={[s.small, { width: 100 }]}>{new Date(tx.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</Text><Text style={[s.txAmount, { color: tx.type === 'income' ? GREEN : tx.type === 'expense' ? RED : MUTED }]}>{tx.type === 'expense' ? '−' : tx.type === 'income' ? '+' : ''}{new Intl.NumberFormat('es-ES', { style: 'currency', currency: tx.currency || user?.currency || 'EUR' }).format(Math.abs(tx.amount))}</Text>
        </Pressable>) : <Empty text="No hay movimientos que coincidan con estos filtros." />}
        <View style={s.tableFooter}><Text style={s.tiny}>{Math.min(limit, visibleRows.length)} de {visibleRows.length} movimientos</Text>{visibleRows.length > limit && <Button label="Ver más movimientos" onPress={() => setLimit(limit + 20)} />}</View>
      </View>
      <Text style={s.footnote}>Las estadísticas excluyen transferencias, plantillas recurrentes y movimientos marcados como excluidos. El patrimonio refleja el saldo actual de todas tus carteras.</Text>
    </ScrollView>

    <DesktopDateTimeFilterModal visible={dateOpen} onClose={() => setDateOpen(false)} showCustomRange showTotalRange showDayRange onSelect={next => { setPeriod(next); setDateOpen(false); setCategory(null); }} />
    <HomeFiltersModal visible={filterOpen} onClose={() => setFilterOpen(false)} filters={filters} onApply={next => { setFilters(next); setFilterOpen(false); }} baseTransactions={tableBase} />
    <Modal visible={walletOpen} transparent animationType="fade" onRequestClose={() => setWalletOpen(false)}>
      <Pressable style={s.backdrop} onPress={() => setWalletOpen(false)}><Pressable style={s.walletModal} onPress={e => e.stopPropagation()}>
        <Heading title="Tus carteras" subtitle="Saldo actual · selecciona una para filtrar la actividad"><Pressable accessibilityRole="button" accessibilityLabel="Cerrar carteras" onPress={() => setWalletOpen(false)}><Ionicons name="close" size={22} color={MUTED} /></Pressable></Heading>
        <Button label="Todas las carteras" icon="layers-outline" onPress={() => { setWalletId(null); setCategory(null); setWalletOpen(false); }} />
        <ScrollView style={{ maxHeight: 360, marginTop: 12 }}>{netWorth.wallets.map(w => <Pressable key={w.id} accessibilityRole="button" accessibilityLabel={`Filtrar ${w.name}`} onPress={() => { setWalletId(w.id); setCategory(null); setWalletOpen(false); }} style={[s.walletRow, walletId === w.id && { backgroundColor: '#EEF3FF' }]}><WalletIcon emoji={w.emoji} size={25} /><Text style={[s.txTitle, { flex: 1 }]}>{w.name}</Text><Text style={s.categoryAmount}>{baseMoney(w.balanceInBase)}</Text></Pressable>)}{!netWorth.wallets.length && <Empty text={netWorth.isError ? 'No se pudieron cargar las carteras.' : 'Todavía no tienes carteras.'} />}</ScrollView>
      </Pressable></Pressable>
    </Modal>
  </View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F9FC' }, content: { padding: 36, gap: 22, maxWidth: 1720, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 18, marginBottom: 4 },
  eyebrow: { fontFamily: FONT, color: MUTED, fontSize: 9, fontWeight: '600', letterSpacing: 1.9, marginBottom: 9 },
  title: { fontFamily: FONT, color: INK, fontSize: 29, fontWeight: '600', letterSpacing: -0.9 }, subtitle: { fontFamily: FONT, fontSize: 13, color: MUTED, marginTop: 7 },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' }, button: { minHeight: 37, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'white', borderWidth: 1, borderColor: '#E4E9F2', paddingHorizontal: 13, borderRadius: 8 }, buttonText: { fontFamily: FONT, fontSize: 11, fontWeight: '500', color: '#596A83' }, primary: { backgroundColor: BLUE, borderColor: BLUE },
  heroRow: { flexDirection: 'row', gap: 20 }, wealthCard: { flex: 1, backgroundColor: '#234BD1', borderRadius: 13, paddingHorizontal: 24, paddingVertical: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, minHeight: 106 }, wealthLabel: { fontFamily: FONT, color: '#C0D0FF', fontSize: 10, letterSpacing: 1.4, fontWeight: '500' }, wealthValue: { fontFamily: FONT, fontSize: 32, color: 'white', letterSpacing: -1, fontWeight: '600', marginTop: 7 }, wealthHint: { fontFamily: FONT, fontSize: 11, color: '#C0D0FF' }, liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 }, liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#9CDFCF' }, liveText: { fontFamily: FONT, fontSize: 9, color: '#D6E0FF' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, sectionBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 }, sectionTitle: { fontFamily: FONT, fontSize: 17, fontWeight: '600', color: INK },
  metrics: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' }, metric: { flex: 1, minWidth: 165, backgroundColor: 'white', borderRadius: 13, borderWidth: 1, borderColor: '#E9EDF4', padding: 18 }, metricLabel: { fontFamily: FONT, fontSize: 12, color: '#748198' }, metricIcon: { height: 29, width: 29, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }, metricValue: { fontFamily: FONT, fontSize: 25, color: INK, fontWeight: '600', letterSpacing: -0.6, marginTop: 12, marginBottom: 12 }, metricFoot: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' }, comparison: { fontFamily: FONT, fontSize: 10, fontWeight: '600' },
  analysisRow: { flexDirection: 'row', alignItems: 'stretch', gap: 20 }, card: { backgroundColor: 'white', padding: 23, borderRadius: 15, borderWidth: 1, borderColor: '#E9EDF4', minWidth: 0 }, cardHeading: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 }, cardTitle: { fontFamily: FONT, fontSize: 15, fontWeight: '600', color: INK }, caption: { fontFamily: FONT, fontSize: 11, color: MUTED, lineHeight: 18, marginTop: 4 }, small: { fontFamily: FONT, fontSize: 11, color: '#78869C' }, tiny: { fontFamily: FONT, fontSize: 10, color: '#9BA5B5', lineHeight: 16 }, legend: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 26 }, legendDot: { width: 7, height: 7, borderRadius: 3 }, chartFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#EFF2F7', paddingTop: 17, marginTop: 22 }, chartLoading: { height: 200, justifyContent: 'center' },
  tabs: { flexDirection: 'row', backgroundColor: '#F5F7FB', borderRadius: 7, padding: 3, alignSelf: 'flex-start', marginBottom: 12 }, tab: { paddingHorizontal: 17, paddingVertical: 7, borderRadius: 5 }, tabActive: { backgroundColor: 'white' }, tabText: { fontFamily: FONT, fontSize: 11, color: MUTED, fontWeight: '500' }, categorySummary: { flexDirection: 'row', alignItems: 'center', gap: 22, marginBottom: 10 }, categoryTotal: { fontFamily: FONT, fontSize: 22, fontWeight: '600', color: INK, marginTop: 7 }, categoryRow: { paddingVertical: 9, paddingHorizontal: 4, borderRadius: 5 }, inline: { flexDirection: 'row', alignItems: 'center', gap: 10 }, categoryName: { fontFamily: FONT, fontSize: 11, color: '#65748A', flexShrink: 1 }, categoryAmount: { fontFamily: FONT, fontSize: 11, color: INK, fontWeight: '500' }, categoryBar: { height: 3, backgroundColor: '#F2F4F8', borderRadius: 3, marginTop: 8 }, link: { fontFamily: FONT, fontSize: 11, color: BLUE, marginTop: 12 },
  insights: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 }, insight: { flex: 1, minWidth: 230, backgroundColor: '#EFF3F9', padding: 17, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }, insightTitle: { fontFamily: FONT, fontSize: 12, fontWeight: '500', color: INK },
  tableToolbar: { flexDirection: 'row', gap: 8, marginBottom: 18 }, search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, minHeight: 38, backgroundColor: '#F7F9FC', borderRadius: 8 }, searchInput: { flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 11, color: INK, height: 38 }, categoryFilter: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 9, backgroundColor: '#EEF3FF', borderRadius: 7, padding: 8, marginBottom: 12 }, tableHead: { flexDirection: 'row', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#EDF1F6', gap: 10 }, columnLabel: { fontFamily: FONT, fontSize: 9, letterSpacing: 0.8, color: '#9CA6B6', fontWeight: '500' }, tableRow: { flexDirection: 'row', alignItems: 'center', minHeight: 62, gap: 10, borderBottomWidth: 1, borderBottomColor: '#F1F4F8' }, txIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#F3F6FB', justifyContent: 'center', alignItems: 'center' }, txTitle: { fontFamily: FONT, fontSize: 12, fontWeight: '500', color: INK }, txAmount: { fontFamily: FONT, width: 120, fontSize: 12, textAlign: 'right', fontWeight: '600' }, tableFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 17 },
  empty: { minHeight: 140, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 20 }, emptyText: { fontFamily: FONT, fontSize: 12, color: MUTED, textAlign: 'center', lineHeight: 20 }, error: { flexDirection: 'row', gap: 10, padding: 16, borderRadius: 10, backgroundColor: '#FFF0F2' }, errorText: { fontFamily: FONT, flex: 1, color: RED, fontSize: 12 }, footnote: { fontFamily: FONT, fontSize: 10, color: '#9BA5B5', lineHeight: 17 },
  backdrop: { flex: 1, backgroundColor: 'rgba(20,32,55,0.3)', justifyContent: 'center', alignItems: 'center', padding: 30 }, walletModal: { width: '100%', maxWidth: 500, backgroundColor: 'white', padding: 26, borderRadius: 17 }, walletRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 58, paddingHorizontal: 10, borderRadius: 9 },
});
