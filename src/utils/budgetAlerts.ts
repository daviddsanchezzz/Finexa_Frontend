import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const SENT_ALERTS_KEY = "budget_alerts_sent_v1";
const ALERT_THRESHOLD = 0.8; // 80%

interface Budget {
  id: number;
  name?: string | null;
  limit: number;
  spent: number;
  progress: number;
  category?: { name: string; emoji?: string | null } | null;
}

async function getSentAlerts(): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(SENT_ALERTS_KEY);
  if (!raw) return new Set();
  const parsed: { key: string; month: number }[] = JSON.parse(raw);
  const currentMonth = new Date().getMonth();
  // Only keep alerts from the current month
  const valid = parsed.filter((a) => a.month === currentMonth);
  return new Set(valid.map((a) => a.key));
}

async function markAlertSent(key: string): Promise<void> {
  const raw = await AsyncStorage.getItem(SENT_ALERTS_KEY);
  const parsed: { key: string; month: number }[] = raw ? JSON.parse(raw) : [];
  const currentMonth = new Date().getMonth();
  const updated = [
    ...parsed.filter((a) => a.month === currentMonth),
    { key, month: currentMonth },
  ];
  await AsyncStorage.setItem(SENT_ALERTS_KEY, JSON.stringify(updated));
}

async function canSendNotifications(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status } = await Notifications.getPermissionsAsync();
  return status === "granted";
}

export async function checkBudgetAlerts(budgets: Budget[]): Promise<void> {
  if (!(await canSendNotifications())) return;

  const sentAlerts = await getSentAlerts();

  for (const b of budgets) {
    const ratio = b.limit > 0 ? b.spent / b.limit : 0;
    if (ratio < ALERT_THRESHOLD) continue;

    const alertKey = `budget_${b.id}_${ratio >= 1 ? "over" : "warn"}`;
    if (sentAlerts.has(alertKey)) continue;

    const name = b.category?.name ?? b.name ?? "Presupuesto";
    const emoji = b.category?.emoji ?? "📊";
    const pct = Math.round(ratio * 100);

    const isOver = ratio >= 1;
    const title = isOver
      ? `${emoji} Presupuesto superado: ${name}`
      : `${emoji} Alerta de presupuesto: ${name}`;
    const body = isOver
      ? `Has superado el límite (${pct}% gastado). Límite: ${b.limit.toFixed(2)} €`
      : `Llevas un ${pct}% del presupuesto de ${name}. Quedan ${(b.limit - b.spent).toFixed(2)} €`;

    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: null,
    });

    await markAlertSent(alertKey);
  }
}
