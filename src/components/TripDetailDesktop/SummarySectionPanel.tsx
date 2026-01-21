import React, { useMemo } from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UI } from "./ui";
import { NotesPanel, TripNote } from "./SummaryNotesPanel";
import { TasksPanel, TripTask } from "./SummaryTasksPanel";
import { DocItem, DocumentsPanel } from "./SummaryDocumentsPanel";

export type TripSummaryTrip = {
  id: number;
  name: string;
  destination?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  notes?: TripNote[];
  tasks?: TripTask[];
  planItems?: any[];
  cost?: number | null;
  budget?: number | null;
};

type Props = {
  trip: any;
  px: (n: number) => number;
  fs: (n: number) => number;
  plannedActivitiesCount: number;

  onCreateTask: (title: string) => Promise<void> | void;
  onToggleTask: (taskId: number, next: "to_do" | "done") => Promise<void> | void;
  onDeleteTask: (taskId: number) => Promise<void> | void;
  onEditTaskTitle?: (taskId: number, title: string) => Promise<void> | void;

  onCreateNote: (...args: any[]) => any;
  onUpdateNote: (...args: any[]) => any;
  onDeleteNote: (...args: any[]) => any;
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysUntil(startIso?: string | null) {
  if (!startIso) return null;
  const start = new Date(startIso);
  if (isNaN(start.getTime())) return null;
  return Math.ceil((startOfDay(start).getTime() - startOfDay(new Date()).getTime()) / 86400000);
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function findCountdownTargetIso(trip: any): string | null {
  const now = Date.now();
  const items: any[] = trip?.planItems ?? [];

  const candidates = items
    .filter(
      (it) =>
        it &&
        (it.type === "transport_destination" || it.type === "flight") &&
        (it.startAt || it.day || it.date)
    )
    .map((it) => {
      const iso = it.startAt ?? it.day ?? it.date;
      const time = new Date(iso).getTime();
      return { iso, time };
    })
    .filter((x) => !isNaN(x.time) && x.time > now)
    .sort((a, b) => a.time - b.time); // 🔥 el más cercano en el futuro

  return candidates.length > 0 ? candidates[0].iso : null;
}


function countdownParts(targetIso?: string | null) {
  if (!targetIso) return null;

  const target = new Date(targetIso);
  if (isNaN(target.getTime())) return null;

  const now = new Date();
  let diffMs = target.getTime() - now.getTime();

  // si ya pasó, puedes devolver 0 o null; aquí devolvemos 0
  if (diffMs < 0) diffMs = 0;

  const totalHours = Math.floor(diffMs / 3600000);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  return { days, hours };
}

function countdownLabel(parts: { days: number; hours: number } | null) {
  if (!parts) return { value: "—", right: undefined as string | undefined };
  return {
    value: `${parts.days} días ${parts.hours} horas`,
    right: `EN ${parts.days}D ${pad2(parts.hours)}H`,
  };
}


function Card({
  children,
  px,
  style,
}: {
  children: React.ReactNode;
  px: (n: number) => number;
  style?: any;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: "white",
          borderRadius: px(18),
          borderWidth: 1,
          borderColor: UI.border,
          padding: px(16),
          shadowColor: "#0B1220",
          shadowOpacity: 0.06,
          shadowRadius: px(18),
          shadowOffset: { width: 0, height: px(10) },
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function MiniKpiCard({
  title,
  value,
  rightLabel,
  icon,
  px,
  fs,
  variant,
}: {
  title: string;
  value: string;
  rightLabel?: string;
  icon: keyof typeof Ionicons.glyphMap;
  px: (n: number) => number;
  fs: (n: number) => number;
  variant?: "countdown" | "normal";
}) {
  const countdown = variant === "countdown";

  return (
    <View
      style={{
        flex: 1,
        minWidth: px(230),
        borderRadius: px(18),
        borderWidth: 1,
        borderColor: countdown ? "rgba(255,255,255,0.12)" : UI.border,
        padding: px(16),
        backgroundColor: countdown ? "rgba(15,23,42,0.95)" : "white",
        overflow: "hidden",
        shadowColor: "#0B1220",
        shadowOpacity: 0.06,
        shadowRadius: px(18),
        shadowOffset: { width: 0, height: px(10) },
      }}
    >
      {/* faux photo overlay */}
      {countdown ? (
        <>
          <View
            style={{
              position: "absolute",
              top: -px(40),
              left: -px(60),
              width: px(220),
              height: px(220),
              borderRadius: px(999),
              backgroundColor: "rgba(37,99,235,0.35)",
            }}
          />
          <View
            style={{
              position: "absolute",
              bottom: -px(70),
              right: -px(80),
              width: px(280),
              height: px(280),
              borderRadius: px(999),
              backgroundColor: "rgba(99,102,241,0.25)",
            }}
          />
          <View
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(15,23,42,0.25)",
            }}
          />
        </>
      ) : null}

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View
          style={{
            width: px(36),
            height: px(36),
            borderRadius: px(12),
            backgroundColor: countdown ? "rgba(255,255,255,0.14)" : "rgba(15,23,42,0.04)",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: countdown ? "rgba(255,255,255,0.18)" : "rgba(148,163,184,0.25)",
          }}
        >
          <Ionicons name={icon} size={px(16)} color={countdown ? "white" : "rgba(37,99,235,0.95)"} />
        </View>

        {rightLabel ? (
          <Text
            style={{
              fontSize: fs(11),
              fontWeight: "600",
              color: countdown ? "rgba(255,255,255,0.75)" : UI.muted2,
            }}
          >
            {rightLabel}
          </Text>
        ) : null}
      </View>

      <Text
        style={{
          marginTop: px(12),
          fontSize: fs(11),
          fontWeight: "700",
          letterSpacing: 0.6,
          color: countdown ? "rgba(255,255,255,0.75)" : UI.muted2,
        }}
      >
        {title.toUpperCase()}
      </Text>

      <Text
        style={{
          marginTop: px(6),
          fontSize: fs(26),
          fontWeight: "800",
          color: countdown ? "white" : UI.text,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

export function SummarySectionPanel({
  trip,
  px,
  fs,
  plannedActivitiesCount,
  onCreateTask,
  onToggleTask,
  onDeleteTask,
  onEditTaskTitle,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
}: Props) {
  const tasks = useMemo(() => trip?.tasks ?? [], [trip?.tasks]);
  const notes = useMemo(() => trip?.notes ?? [], [trip?.notes]);

const countdown = useMemo(() => {
  const iso = findCountdownTargetIso(trip);
  return countdownParts(iso);
}, [trip?.planItems]);

const cd = useMemo(() => countdownLabel(countdown), [countdown]);

  const tasksDone = useMemo(() => tasks.filter((t) => t.status === "done").length, [tasks]);
  const tasksTotal = tasks.length;
  const tasksPct = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0;

  const activities = plannedActivitiesCount ?? (trip?.planItems?.length ?? 0);

  // Hardcoded docs like screenshot
  const docs: DocItem[] = useMemo(
    () => [
      { id: "d1", name: "Vuelo_Roma.pdf", kind: "pdf", sizeLabel: "1.2 MB", whenLabel: "Hace 2 días" },
      { id: "d2", name: "Reserva_Hotel.png", kind: "image", sizeLabel: "850 KB", whenLabel: "Ayer" },
      { id: "d3", name: "Entradas_Coliseo.pdf", kind: "pdf", sizeLabel: "2.4 MB", whenLabel: "Hace 4 horas" },
    ],
    []
  );

  return (
    <View style={{ gap: px(18) }}>
      {/* KPIs row */}
      <View style={{ flexDirection: "row", gap: px(14), flexWrap: "wrap" }}>
        <MiniKpiCard
          px={px}
          fs={fs}
          variant="countdown"
          icon="stopwatch-outline"
          title="Cuenta atrás"
  value={cd.value}       />

        <MiniKpiCard
          px={px}
          fs={fs}
          icon="checkbox-outline"
          title="Progreso tareas"
          value={`${tasksPct}%`}
          rightLabel={`${tasksDone}/${tasksTotal}`}
          variant="normal"
        />

        <MiniKpiCard
          px={px}
          fs={fs}
          icon="bookmark-outline"
          title="Actividades"
          value={`${activities}`}
          rightLabel={"Próx. Parada"}
          variant="normal"
        />
      </View>

      {/* Tasks */}
<TasksPanel
  px={px}
  fs={fs}
  tasks={trip?.tasks ?? []}
  onCreateTask={onCreateTask}
  onToggleTask={onToggleTask}
  onDeleteTask={onDeleteTask}
  onEditTaskTitle={onEditTaskTitle}
/>

      {/* Notes */}
      <NotesPanel
        px={px}
        fs={fs}
        notes={notes}
        onCreateNote={onCreateNote}
        onUpdateNote={onUpdateNote}
        onDeleteNote={onDeleteNote}
      />

      {/* Documents */}
      <DocumentsPanel px={px} fs={fs} docs={docs} />
    </View>
  );
}
