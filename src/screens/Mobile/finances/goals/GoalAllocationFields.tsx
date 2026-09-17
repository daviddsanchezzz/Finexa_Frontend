import React from 'react';
import { Text, View } from 'react-native';
import { FormMoneyField } from '../../../../components/creation';
import WalletIcon from '../../../../components/WalletIcon';
import { GoalAllocation, GoalWalletAvailability } from '../../../../types/goal';
import { colors, radii } from '../../../../theme/theme';
import { money, numeric } from './goalShared';

export function allocationDraft(wallets: GoalWalletAvailability[], currency: string, amounts: Record<number, string>, existing: GoalAllocation[] = []) {
  const selected = wallets.filter((w) => w.currency === currency && !w.fullyLinked);
  const rows = selected.map((w) => {
    const previous = existing.find((a) => a.walletId === w.id)?.amount ?? 0;
    const limit = previous + w.availableToAllocate;
    const amount = numeric(amounts[w.id] ?? '');
    const otherAllocated = Math.max(w.allocatedAmount - previous, 0);
    const draftAmount = Number.isFinite(amount) ? Math.max(amount, 0) : 0;
    const availableAmount = Math.max(w.eligibleBalance - otherAllocated - draftAmount, 0);
    const overAllocated = Math.max(otherAllocated + draftAmount - w.eligibleBalance, 0);
    const error = !Number.isFinite(amount) || amount < 0 ? 'Introduce un importe válido.'
      : !/^\d*(?:,\d{0,2})?$/.test(amounts[w.id] ?? '') ? 'Usa como máximo dos decimales.'
      : amount > limit + 0.0000001 ? `Solo puedes asignar ${money(limit, currency)}.` : null;
    return { wallet: w, limit, amount, error, otherAllocated, availableAmount, overAllocated };
  });
  return {
    rows, valid: rows.every((r) => !r.error),
    total: rows.reduce((sum, r) => sum + (Number.isFinite(r.amount) ? r.amount : 0), 0),
    payload: rows.filter((r) => r.amount > 0).map((r) => ({ walletId: r.wallet.id, amount: r.amount })),
  };
}

// Shared domain fields for initial reservations and their later management;
// every visual control comes from the existing common form system.
export default function GoalAllocationFields({ wallets, currency, amounts, onChange, existing = [], showErrors = false, showTotal = true }: {
  wallets: GoalWalletAvailability[];
  currency: string;
  amounts: Record<number, string>;
  onChange: (id: number, amount: string) => void;
  existing?: GoalAllocation[];
  showErrors?: boolean;
  showTotal?: boolean;
}) {
  const draft = allocationDraft(wallets, currency, amounts, existing);
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ fontSize: 13, lineHeight: 19, color: colors.textSecondary, marginBottom: 4 }}>Distribuye el dinero de tus carteras que quieres reservar para este objetivo.</Text>
      {!draft.rows.length && <Text style={{ color: colors.textSecondary, fontSize: 13 }}>No hay carteras disponibles en esta moneda. Puedes crear el objetivo sin asignaciones.</Text>}
      {draft.rows.map(({ wallet, error, otherAllocated, availableAmount, overAllocated }) => (
        <View key={wallet.id} style={{ backgroundColor: colors.white, borderRadius: radii.card, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 2 }}>
            <WalletIcon emoji={wallet.emoji} size={22} />
            <Text numberOfLines={1} style={{ flex: 1, fontSize: 14.5, fontWeight: '700', color: colors.ink }}>{wallet.name}</Text>
          </View>
          {[
            { label: 'Saldo', value: wallet.balance },
            ...(otherAllocated > 0 ? [{ label: 'Otros objetivos', value: otherAllocated }] : []),
            { label: 'Disponible', value: availableAmount },
          ].map((row) => (
            <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <Text style={{ fontSize: 12.5, color: colors.textSecondary }}>{row.label}</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink, fontVariant: ['tabular-nums'] }}>{money(row.value, currency)}</Text>
            </View>
          ))}
          {overAllocated > 0 && !error && <Text style={{ color: colors.error, fontSize: 12, lineHeight: 17 }}>Las reservas superan el saldo en {money(overAllocated, currency)}. Reduce las asignaciones para ajustarlas.</Text>}
          <FormMoneyField label="Asignar" currency={currency === 'EUR' ? '€' : currency} textAlign="right" placeholder="0,00"
            value={amounts[wallet.id] ?? ''} onChangeText={(value) => onChange(wallet.id, value.replace('.', ','))}
            error={error} showError={showErrors} />
        </View>
      ))}
      {showTotal && <Text style={{ fontSize: 15, fontWeight: '800', color: colors.ink }}>Total asignado: {money(draft.total, currency)}</Text>}
    </View>
  );
}
