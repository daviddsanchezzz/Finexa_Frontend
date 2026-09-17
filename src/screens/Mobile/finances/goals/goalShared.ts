import { formatEuro } from '../../../../utils/currency';
import { GoalTrackingMode } from '../../../../types/goal';

export const TRACKING_LABELS: Record<GoalTrackingMode, string> = {
  MANUAL: 'Progreso manual',
  ALLOCATIONS: 'Dinero asignado de carteras',
  WALLET_BALANCE: 'Cartera vinculada',
};
export const TRACKING_DESCRIPTIONS: Record<GoalTrackingMode, string> = {
  MANUAL: 'Registra cuánto llevas ahorrado. No cambia el saldo de ninguna cartera.',
  ALLOCATIONS: 'Reserva parte del dinero que ya tienes sin moverlo.',
  WALLET_BALANCE: 'Todo el saldo de una cartera contará para este objetivo.',
};
export const money = (value: number, currency = 'EUR') => `${formatEuro(value)} ${currency === 'EUR' ? '€' : currency}`;
export const decimalText = (value: number) => String(value).replace('.', ',');
export const numeric = (value: string) => Number(value.replace(',', '.'));
export const percentage = (value: number) => `${value.toLocaleString('es-ES', { maximumFractionDigits: 1 })} %`;
export const dateLabel = (value: string) => new Date(value).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
export function errorText(error: any) {
  const message = error?.response?.data?.message;
  return Array.isArray(message) ? message.join('\n') : message || 'No se pudo guardar. Inténtalo de nuevo.';
}
