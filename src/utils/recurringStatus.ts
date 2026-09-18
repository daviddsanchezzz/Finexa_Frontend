// Estado de una plantilla recurrente. Se calcula, no se persiste: `paused`
// viene de la BD, pero "finished" se deriva de `endDate` frente a la fecha
// actual, así nunca puede quedar desincronizado con la fecha fin.
export type RecurringStatus = "active" | "paused" | "finished";

export function getRecurringStatus(
  tx: { paused?: boolean | null; endDate?: string | null },
  now: Date = new Date()
): RecurringStatus {
  if (tx.paused) return "paused";
  if (tx.endDate) {
    const end = new Date(tx.endDate);
    if (!isNaN(end.getTime()) && end.getTime() < now.getTime()) return "finished";
  }
  return "active";
}

export const RECURRING_STATUS_LABEL: Record<RecurringStatus, string> = {
  active: "Activa",
  paused: "Pausada",
  finished: "Finalizada",
};

export const RECURRING_STATUS_COLOR: Record<RecurringStatus, string> = {
  active: "#16A34A",
  paused: "#D97706",
  finished: "#6B7280",
};
