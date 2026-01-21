import React, { useMemo, useState } from "react";
import { View, Text, Pressable, Platform, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UI } from "./ui";

export type TaskStatus = "to_do" | "done";

export type TripTask = {
  id: number;
  tripId: number;
  title: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  px: (n: number) => number;
  fs: (n: number) => number;
  tasks: TripTask[];
  onCreateTask?: (title: string) => Promise<void> | void;
  onToggleTask?: (taskId: number, next: TaskStatus) => Promise<void> | void;
  onDeleteTask?: (taskId: number) => Promise<void> | void;

  // ✅ EDIT real (lo conectas a updateTripTask)
  onEditTaskTitle?: (taskId: number, title: string) => Promise<void> | void;
};

function Segmented({
  value,
  onChange,
  px,
  fs,
}: {
  value: "all" | "to_do" | "done";
  onChange: (v: "all" | "to_do" | "done") => void;
  px: (n: number) => number;
  fs: (n: number) => number;
}) {
  const items: Array<{ k: "all" | "to_do" | "done"; label: string }> = [
    { k: "all", label: "Todas" },
    { k: "to_do", label: "Pendientes" },
    { k: "done", label: "Hechas" },
  ];

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: "rgba(15,23,42,0.04)",
        borderRadius: px(12),
        padding: px(4),
        borderWidth: 1,
        borderColor: "rgba(148,163,184,0.22)",
        gap: px(6),
      }}
    >
      {items.map((it) => {
        const active = value === it.k;
        return (
          <Pressable
            key={it.k}
            onPress={() => onChange(it.k)}
            style={({ pressed }) => [
              {
                height: px(30),
                paddingHorizontal: px(12),
                borderRadius: px(10),
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: active ? "white" : "transparent",
                borderWidth: active ? 1 : 0,
                borderColor: active ? "rgba(148,163,184,0.22)" : "transparent",
                opacity: pressed ? 0.92 : 1,
              },
            ]}
          >
            <Text style={{ fontSize: fs(12), fontWeight: "700", color: active ? UI.text : UI.muted }}>
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function IconButton({
  icon,
  tint,
  hoverBg,
  px,
  onPress,
}: {
  icon: any;
  tint: string;
  hoverBg: string;
  px: (n: number) => number;
  onPress: (e: any) => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ hovered, pressed }) => [
        {
          width: px(34),
          height: px(34),
          borderRadius: px(12),
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: Platform.OS === "web" && hovered ? hoverBg : "transparent",
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={px(16)} color={tint} />
    </Pressable>
  );
}

export function TasksPanel({ px, fs, tasks, onCreateTask, onToggleTask, onDeleteTask, onEditTaskTitle }: Props) {
  const [filter, setFilter] = useState<"all" | "to_do" | "done">("to_do");
  const [draft, setDraft] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const filtered = useMemo(() => {
    const base = tasks.slice().sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    if (filter === "all") return base;
    return base.filter((t) => t.status === filter);
  }, [tasks, filter]);

  async function create() {
    const t = draft.trim();
    if (!t) return;
    setDraft("");
    await onCreateTask?.(t);
  }

  function startEdit(t: TripTask) {
    setEditingId(t.id);
    setEditingTitle(t.title);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingTitle("");
  }

  async function saveEdit(task: TripTask) {
    const next = editingTitle.trim();
    if (!next) return;
    if (next === task.title.trim()) {
      cancelEdit();
      return;
    }

    // cerramos edición ya (optimista UX)
    cancelEdit();
    await onEditTaskTitle?.(task.id, next);
  }

  const cardBorder = "rgba(226,232,240,0.95)";

  return (
    <View style={{ gap: px(14) }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: px(10) }}>
          <Ionicons name="list-outline" size={px(18)} color={UI.text} />
          <Text style={{ fontSize: fs(18), fontWeight: "700", color: UI.text }}>Tareas</Text>
        </View>

        <Segmented value={filter} onChange={setFilter} px={px} fs={fs} />
      </View>

      {/* Caja grande tipo Notas */}
      <View
        style={{
          borderRadius: px(18),
          borderWidth: 1,
          borderColor: cardBorder,
          backgroundColor: "white",
          overflow: "hidden",
        }}
      >
        {filtered.length === 0 ? (
          <View style={{ padding: px(18) }}>
            <Text style={{ fontSize: fs(13), fontWeight: "600", color: UI.muted }}>Aún no tienes tareas.</Text>
          </View>
        ) : (
          filtered.map((t, idx) => {
            const done = t.status === "done";
            const isEditing = editingId === t.id;

            return (
              <View key={t.id}>
                <Pressable
                  onPress={() => {
                    if (isEditing) return;
                    onToggleTask?.(t.id, done ? "to_do" : "done");
                  }}
                  style={({ hovered, pressed }) => [
                    {
                      paddingHorizontal: px(16),
                      paddingVertical: px(14),
                      flexDirection: "row",
                      alignItems: "center",
                      gap: px(12),
                      backgroundColor: Platform.OS === "web" && hovered ? "rgba(15,23,42,0.02)" : "white",
                      opacity: pressed ? 0.94 : 1,
                    },
                  ]}
                >
                  {/* circle */}
                  <View
                    style={{
                      width: px(22),
                      height: px(22),
                      borderRadius: px(999),
                      borderWidth: 2,
                      borderColor: done ? "rgba(22,163,74,0.45)" : "rgba(148,163,184,0.45)",
                      backgroundColor: done ? "rgba(22,163,74,0.08)" : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {done ? <Ionicons name="checkmark" size={px(14)} color="rgba(22,163,74,0.95)" /> : null}
                  </View>

                  {/* text / edit */}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    {isEditing ? (
                      <TextInput
                        value={editingTitle}
                        onChangeText={setEditingTitle}
                        autoFocus
                        onSubmitEditing={() => saveEdit(t)}
                        style={{
                          fontSize: fs(14),
                          fontWeight: "750" as any,
                          color: UI.text,
                          paddingVertical: px(2),
                          outlineStyle: "none" as any,
                        }}
                        placeholder="Título…"
                        placeholderTextColor={UI.muted2}
                      />
                    ) : (
                      <>
                        <Text
                          style={{
                            fontSize: fs(14),
                            fontWeight: "600" as any,
                            color: done ? UI.muted : UI.text,
                            textDecorationLine: done ? "line-through" : "none",
                          }}
                          numberOfLines={1}
                        >
                          {t.title}
                        </Text>

                      </>
                    )}
                  </View>

                  {/* actions */}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: px(6) }}>
                    {isEditing ? (
                      <>
                        <IconButton
                          icon="checkmark"
                          tint="rgba(22,163,74,0.95)"
                          hoverBg="rgba(22,163,74,0.10)"
                          px={px}
                          onPress={(e) => {
                            e?.stopPropagation?.();
                            e?.preventDefault?.();
                            saveEdit(t);
                          }}
                        />
                        <IconButton
                          icon="close"
                          tint="rgba(100,116,139,0.9)"
                          hoverBg="rgba(15,23,42,0.06)"
                          px={px}
                          onPress={(e) => {
                            e?.stopPropagation?.();
                            e?.preventDefault?.();
                            cancelEdit();
                          }}
                        />
                      </>
                    ) : (
                      <>
                        <IconButton
                          icon="create-outline"
                          tint="rgba(15,23,42,0.72)"
                          hoverBg="rgba(15,23,42,0.06)"
                          px={px}
                          onPress={(e) => {
                            e?.stopPropagation?.();
                            e?.preventDefault?.();
                            startEdit(t);
                          }}
                        />
                        <IconButton
                          icon="trash-outline"
                          tint="rgba(239,68,68,0.9)"
                          hoverBg="rgba(239,68,68,0.10)"
                          px={px}
                          onPress={(e) => {
                            e?.stopPropagation?.();
                            e?.preventDefault?.();
                            onDeleteTask?.(t.id);
                          }}
                        />
                      </>
                    )}
                  </View>
                </Pressable>

                {idx < filtered.length - 1 ? (
                  <View style={{ height: 1, backgroundColor: "rgba(226,232,240,0.85)", marginLeft: px(52) }} />
                ) : null}
              </View>
            );
          })
        )}

        {/* Add input row */}
        <View style={{ borderTopWidth: 1, borderTopColor: "rgba(226,232,240,0.85)", padding: px(14) }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: px(10),
              borderRadius: px(14),
              borderWidth: 1,
              borderColor: "rgba(148,163,184,0.22)",
              backgroundColor: "white",
              paddingHorizontal: px(12),
              height: px(48),
            }}
          >
            <Ionicons name="add-circle-outline" size={px(18)} color={UI.muted} />
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Añadir nueva tarea…"
              placeholderTextColor={UI.muted2}
              onSubmitEditing={create}
              style={{
                flex: 1,
                fontSize: fs(13),
                fontWeight: "600",
                color: UI.text,
                outlineStyle: "none" as any,
              }}
            />

            <Pressable
              onPress={create}
              style={({ pressed }) => [
                {
                  height: px(36),
                  paddingHorizontal: px(16),
                  borderRadius: px(12),
                  backgroundColor: "rgba(15,23,42,0.95)",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.92 : 1,
                },
              ]}
            >
              <Text style={{ fontSize: fs(12), fontWeight: "800", color: "white" }}>Añadir</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
