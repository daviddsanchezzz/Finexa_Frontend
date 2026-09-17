import React from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useGoalsQuery, useGoalWalletsQuery } from '../hooks/useGoalsQuery';
import { Goal, GoalWallet } from '../types/goal';
import { useTheme } from '../context/ThemeContext';
import { money } from '../screens/Mobile/finances/goals/goalShared';
import IconCircleButton from './IconCircleButton';
import WalletIcon from './WalletIcon';

// Reuses saved GoalAllocation records. Manual progress and archived goals
// never reserve wallet balances; a fully linked wallet reserves its whole balance.
export function walletGoalBreakdown(goals: Goal[], walletId: number) {
  return goals.flatMap((goal) => {
    if (goal.status === 'ARCHIVED') return [];
    if (goal.trackingMode === 'ALLOCATIONS') {
      return goal.allocations.filter((allocation) => allocation.walletId === walletId && allocation.amount > 0)
        .map((allocation) => ({ goalId: goal.id, name: goal.name, icon: goal.icon, amount: allocation.amount, linked: false }));
    }
    if (goal.trackingMode === 'WALLET_BALANCE' && goal.linkedWalletId === walletId) {
      return [{ goalId: goal.id, name: goal.name, icon: goal.icon, amount: goal.currentAmount, linked: true }];
    }
    return [];
  });
}

export default function WalletGoalReservationsModal({ wallet, onClose, onOpenGoal }: {
  wallet: GoalWallet;
  onClose: () => void;
  onOpenGoal: (goalId: number) => void;
}) {
  const { colors: t } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const walletsQuery = useGoalWalletsQuery();
  const goalsQuery = useGoalsQuery();
  const availability = walletsQuery.data?.find((item) => item.id === wallet.id);
  const entries = walletGoalBreakdown(goalsQuery.data?.goals ?? [], wallet.id);
  const currency = availability?.currency ?? wallet.currency;
  const retry = () => { void walletsQuery.refetch(); void goalsQuery.refetch(); };

  return <Modal visible transparent animationType="slide" onRequestClose={onClose}>
    <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' }}>
      <TouchableOpacity style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Cerrar detalle de cartera" />
      <View style={{ maxHeight: height * 0.85, backgroundColor: t.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 18, paddingBottom: Math.max(insets.bottom, 16) }}>
        <View style={{ paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <WalletIcon emoji={wallet.emoji} size={22} />
          <Text numberOfLines={1} style={{ flex: 1, fontSize: 18, fontWeight: '800', color: t.text }}>{wallet.name}</Text>
          <IconCircleButton icon="close" onPress={onClose} size={30} iconSize={16} />
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}>
          {walletsQuery.isLoading ? <ActivityIndicator color={t.primary} /> : walletsQuery.isError || !availability ?
            <TouchableOpacity onPress={retry} style={{ paddingVertical: 14 }}><Text style={{ color: t.primary }}>No se pudo cargar la disponibilidad. Reintentar</Text></TouchableOpacity> : <>
              <View style={{ backgroundColor: t.background, borderRadius: 16, padding: 14, gap: 12 }}>
                {[
                  { label: 'Saldo total', value: availability.balance },
                  { label: 'Destinado a objetivos', value: availability.allocatedAmount },
                  { label: 'Disponible / no asignado', value: availability.availableToAllocate },
                ].map((row) => <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                  <Text style={{ flex: 1, fontSize: 13, color: t.textSecondary }}>{row.label}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: t.text, fontVariant: ['tabular-nums'] }}>{money(row.value, currency)}</Text>
                </View>)}
              </View>
              {availability.overAllocated > 0 && <Text style={{ color: t.error, fontSize: 12, lineHeight: 18, marginTop: 12 }}>Las asignaciones superan el saldo en {money(availability.overAllocated, currency)}. Revisa las reservas en tus objetivos.</Text>}
            </>}
          <Text style={{ fontSize: 11, fontWeight: '700', color: t.textMuted, letterSpacing: 0.8, marginTop: 22, marginBottom: 8 }}>OBJETIVOS</Text>
          {goalsQuery.isLoading ? <ActivityIndicator color={t.primary} /> : goalsQuery.isError ?
            <TouchableOpacity onPress={retry} style={{ paddingVertical: 14 }}><Text style={{ color: t.primary }}>No se pudieron cargar los objetivos. Reintentar</Text></TouchableOpacity> :
            !entries.length ? <Text style={{ color: t.textSecondary, fontSize: 13, paddingVertical: 12 }}>Esta cartera no tiene dinero destinado a objetivos.</Text> :
              entries.map((entry) => <TouchableOpacity key={entry.goalId} accessibilityRole="button" onPress={() => onOpenGoal(entry.goalId)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: t.border }}>
                <WalletIcon emoji={entry.icon && /\p{Emoji}/u.test(entry.icon) ? entry.icon : '🎯'} size={20} />
                <View style={{ flex: 1 }}><Text style={{ fontSize: 13.5, fontWeight: '600', color: t.text }}>{entry.name}</Text>{entry.linked && <Text style={{ fontSize: 11, color: t.textSecondary, marginTop: 3 }}>Cartera vinculada por completo</Text>}</View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: t.text }}>{money(entry.amount, currency)}</Text>
                <Ionicons name="chevron-forward" size={15} color={t.textMuted} />
              </TouchableOpacity>)}
          <Text style={{ fontSize: 12, lineHeight: 18, color: t.textSecondary, marginTop: 16 }}>El dinero destinado a objetivos sigue en esta cartera y ya está incluido en tu patrimonio.</Text>
        </ScrollView>
      </View>
    </View>
  </Modal>;
}
