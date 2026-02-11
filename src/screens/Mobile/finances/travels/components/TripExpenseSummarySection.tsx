// src/screens/finances/travels/components/TripExpenseSummarySection.tsx
import React, { useMemo, useState } from "react";
import { View, Text, Pressable, Platform, TextInput, Modal, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const UI = {
  text: "#0B1220",
  muted: "#64748B",
  muted2: "#94A3B8",
  border: "rgba(148,163,184,0.22)",
};

export type TaskStatus = "to_do" | "done";

export type TripTask = {
  id: number;
  tripId: number;
  title: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
};

export type TripNote = {
  id: number;
  tripId: number;
  title?: string | null;
  body: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  px: (n: number) => number;
  fs: (n: number) => number;

  tasks: TripTask[];
  notes: TripNote[];

  onCreateTask?: (title: string) => Promise<void> | void;
  onToggleTask?: (taskId: number, next: TaskStatus) => Promise<void> | void;
  onDeleteTask?: (taskId: number) => Promise<void> | void;
  onEditTaskTitle?: (taskId: number, title: string) => Promise<void> | void;

  onCreateNote?: (note: { title?: string | null; body: string; pinned?: boolean }) => Promise<TripNote | void> | void;
  onUpdateNote?: (noteId: number, patch: Partial<Pick<TripNote, "title" | "body" | "pinned">>) => Promise<void> | void;
  onDeleteNote?: (noteId: number) => Promise<void> | void;
};

/** ========= Segmented (Tasks) ========= */
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
        borderColor: UI.border,
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
                borderColor: active ? UI.border : "transparent",
                opacity: pressed ? 0.92 : 1,
              },
            ]}
          >
            <Text style={{ fontSize: fs(12), fontWeight: "800", color: active ? UI.text : UI.muted }}>
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

/** ========= TasksPanel ========= */
function TasksPanel({
  px,
  fs,
  tasks,
  onCreateTask,
  onToggleTask,
  onDeleteTask,
  onEditTaskTitle,
}: {
  px: (n: number) => number;
  fs: (n: number) => number;
  tasks: TripTask[];
  onCreateTask?: (title: string) => Promise<void> | void;
  onToggleTask?: (taskId: number, next: TaskStatus) => Promise<void> | void;
  onDeleteTask?: (taskId: number) => Promise<void> | void;
  onEditTaskTitle?: (taskId: number, title: string) => Promise<void> | void;
}) {
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
    cancelEdit();
    await onEditTaskTitle?.(task.id, next);
  }

  return (
    <View style={{ gap: px(14) }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: px(10) }}>
          <Ionicons name="list-outline" size={px(18)} color={UI.text} />
          <Text style={{ fontSize: fs(18), fontWeight: "800", color: UI.text }}>Tareas</Text>
        </View>

        <Segmented value={filter} onChange={setFilter} px={px} fs={fs} />
      </View>

      {/* Caja */}
      <View
        style={{
          borderRadius: px(18),
          borderWidth: 1,
          borderColor: "rgba(226,232,240,0.95)",
          backgroundColor: "white",
          overflow: "hidden",
        }}
      >
        {filtered.length === 0 ? (
          <View style={{ padding: px(18) }}>
            <Text style={{ fontSize: fs(13), fontWeight: "700", color: UI.muted }}>
              Aún no tienes tareas.
            </Text>
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
                  style={({ pressed, hovered }) => [
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
                      <Text
                        style={{
                          fontSize: fs(14),
                          fontWeight: "700",
                          color: done ? UI.muted : UI.text,
                          textDecorationLine: done ? "line-through" : "none",
                        }}
                        numberOfLines={1}
                      >
                        {t.title}
                      </Text>
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
                            Alert.alert("Eliminar tarea", "¿Seguro que quieres eliminarla?", [
                              { text: "Cancelar", style: "cancel" },
                              { text: "Eliminar", style: "destructive", onPress: () => onDeleteTask?.(t.id) },
                            ]);
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
              borderColor: UI.border,
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
                fontWeight: "700",
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
              <Text style={{ fontSize: fs(12), fontWeight: "900", color: "white" }}>Añadir</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

/** ========= NotesPanel ========= */
function fmtDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  try {
    return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
  } catch {
    return "";
  }
}

type Pastel = { bg: string; bd: string };
const PASTELS: Pastel[] = [
  { bg: "rgba(254,242,242,1)", bd: "rgba(239,68,68,0.14)" },
  { bg: "rgba(255,247,237,1)", bd: "rgba(249,115,22,0.14)" },
  { bg: "rgba(254,249,231,1)", bd: "rgba(234,179,8,0.16)" },
  { bg: "rgba(236,253,245,1)", bd: "rgba(34,197,94,0.14)" },
  { bg: "rgba(240,253,250,1)", bd: "rgba(20,184,166,0.14)" },
  { bg: "rgba(239,246,255,1)", bd: "rgba(59,130,246,0.14)" },
  { bg: "rgba(245,243,255,1)", bd: "rgba(139,92,246,0.14)" },
  { bg: "rgba(250,245,255,1)", bd: "rgba(217,70,239,0.12)" },
];
function pastelFor(id: number): Pastel {
  const idx = Math.abs(id) % PASTELS.length;
  return PASTELS[idx];
}

function NotesPanel({
  px,
  fs,
  notes,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
}: {
  px: (n: number) => number;
  fs: (n: number) => number;
  notes: TripNote[];
  onCreateNote?: (note: { title?: string | null; body: string; pinned?: boolean }) => Promise<TripNote | void> | void;
  onUpdateNote?: (noteId: number, patch: Partial<Pick<TripNote, "title" | "body" | "pinned">>) => Promise<void> | void;
  onDeleteNote?: (noteId: number) => Promise<void> | void;
}) {
  const sortedNotes = useMemo(() => notes.slice().sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))), [notes]);

  type Mode = "create" | "edit";
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("create");

  const [editId, setEditId] = useState<number | null>(null);
  const [draftTitle, setDraftTitle] = useState<string>("");
  const [draftBody, setDraftBody] = useState("");
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [menuForId, setMenuForId] = useState<number | null>(null);

  function closeModal() {
    setModalOpen(false);
    setSaveErr(null);
    setSaving(false);
  }

  function openCreate() {
    setMode("create");
    setEditId(null);
    setDraftTitle("");
    setDraftBody("");
    setSaveErr(null);
    setModalOpen(true);
  }

  function openEdit(note: TripNote) {
    setMode("edit");
    setEditId(note.id);
    setDraftTitle(note.title?.toString() ?? "");
    setDraftBody(note.body ?? "");
    setSaveErr(null);
    setMenuForId(null);
    setModalOpen(true);
  }

  async function save() {
    const body = draftBody.trim();
    if (!body) {
      setSaveErr("Escribe algo en la nota antes de guardar.");
      return;
    }

    setSaving(true);
    setSaveErr(null);

    try {
      if (mode === "create") {
        if (!onCreateNote) return;
        await onCreateNote({ title: draftTitle.trim() ? draftTitle.trim() : null, body });
      } else {
        if (!onUpdateNote || editId == null) return;
        await onUpdateNote(editId, { title: draftTitle.trim() ? draftTitle.trim() : null, body });
      }

      closeModal();
    } catch (e) {
      console.error("❌ Error guardando nota:", e);
      setSaveErr("No se pudo guardar. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(noteId: number) {
    setMenuForId(null);
    if (!onDeleteNote) return;
    await onDeleteNote(noteId);
  }

  return (
    <View style={{ gap: px(14) }}>
      {/* header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: px(10) }}>
          <Ionicons name="document-text-outline" size={px(18)} color={UI.muted} />
          <Text style={{ fontSize: fs(18), fontWeight: "800", color: UI.text }}>Notas</Text>
        </View>

        <Pressable
          onPress={openCreate}
          style={({ hovered, pressed }) => [
            {
              height: px(34),
              paddingHorizontal: px(12),
              borderRadius: px(12),
              backgroundColor: "transparent",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: px(8),
              opacity: pressed ? 0.92 : 1,
            },
            Platform.OS === "web" && hovered ? { backgroundColor: "rgba(37,99,235,0.06)" } : null,
          ]}
        >
          <Ionicons name="add-outline" size={px(16)} color="rgba(37,99,235,0.95)" />
          <Text style={{ fontSize: fs(13), fontWeight: "900", color: "rgba(37,99,235,0.95)" }}>Nueva nota</Text>
        </Pressable>
      </View>

      {/* Modal */}
      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={closeModal}>
        <Pressable
          onPress={closeModal}
          style={{
            flex: 1,
            backgroundColor: "rgba(15,23,42,0.40)",
            padding: px(18),
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Pressable
            onPress={(e: any) => e?.stopPropagation?.()}
            style={{
              width: "100%",
              maxWidth: px(440),
              backgroundColor: "white",
              borderRadius: px(18),
              borderWidth: 1,
              borderColor: UI.border,
              padding: px(16),
              shadowColor: "#0B1220",
              shadowOpacity: 0.16,
              shadowRadius: px(26),
              shadowOffset: { width: 0, height: px(16) },
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: px(12) }}>
              <Text style={{ fontSize: fs(14), fontWeight: "900", color: UI.text }}>
                {mode === "create" ? "Nueva nota" : "Editar nota"}
              </Text>

              <Pressable onPress={closeModal} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
                <Ionicons name="close-outline" size={px(20)} color={UI.muted} />
              </Pressable>
            </View>

            <TextInput
              value={draftTitle}
              onChangeText={setDraftTitle}
              placeholder="Título"
              placeholderTextColor={UI.muted2}
              style={{
                marginTop: px(12),
                borderWidth: 1,
                borderColor: UI.border,
                borderRadius: px(12),
                paddingHorizontal: px(12),
                paddingVertical: px(10),
                fontSize: fs(13),
                color: UI.text,
                backgroundColor: "rgba(15,23,42,0.02)",
              }}
            />

            <TextInput
              value={draftBody}
              onChangeText={setDraftBody}
              placeholder="Escribe tu nota…"
              placeholderTextColor={UI.muted2}
              multiline
              style={{
                marginTop: px(10),
                minHeight: px(180),
                borderWidth: 1,
                borderColor: UI.border,
                borderRadius: px(12),
                paddingHorizontal: px(12),
                paddingVertical: px(10),
                fontSize: fs(13),
                color: UI.text,
                textAlignVertical: "top",
                backgroundColor: "rgba(15,23,42,0.02)",
              }}
            />

            {saveErr ? (
              <Text style={{ marginTop: px(10), fontSize: fs(12), fontWeight: "800", color: "rgba(185,28,28,0.95)" }}>
                {saveErr}
              </Text>
            ) : null}

            <View style={{ marginTop: px(14), flexDirection: "row", justifyContent: "flex-end", gap: px(12) }}>
              <Pressable onPress={closeModal} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
                <Text style={{ fontSize: fs(12), fontWeight: "800", color: UI.muted2 }}>Cancelar</Text>
              </Pressable>

              <Pressable onPress={save} disabled={saving} style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}>
                <Text style={{ fontSize: fs(12), fontWeight: "900", color: "rgba(37,99,235,0.95)" }}>
                  {saving ? "Guardando…" : "Guardar"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* list/grid */}
      {sortedNotes.length === 0 ? (
        <View
          style={{
            backgroundColor: "white",
            borderRadius: px(18),
            borderWidth: 1,
            borderColor: UI.border,
            padding: px(16),
            shadowColor: "#0B1220",
            shadowOpacity: 0.06,
            shadowRadius: px(18),
            shadowOffset: { width: 0, height: px(10) },
          }}
        >
          <Text style={{ fontSize: fs(13), fontWeight: "700", color: UI.muted }}>
            Aún no tienes notas. Pulsa “Nueva nota”.
          </Text>
        </View>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: px(12) }}>
          {sortedNotes.map((n) => {
            const p = pastelFor(n.id);

            return (
              <View
                key={n.id}
                style={{
                  width: "48%",
                  minWidth: px(260),
                  borderRadius: px(18),
                  padding: px(16),
                  backgroundColor: p.bg,
                  borderWidth: 1,
                  borderColor: p.bd,
                  shadowColor: "#0B1220",
                  shadowOpacity: 0.05,
                  shadowRadius: px(14),
                  shadowOffset: { width: 0, height: px(8) },
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: px(10) }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: fs(14), fontWeight: "900", color: UI.text }} numberOfLines={1}>
                      {n.title?.trim() ? n.title.trim() : "Sin título"}
                    </Text>

                    <Text style={{ marginTop: px(4), fontSize: fs(11), fontWeight: "800", color: UI.muted2 }}>
                      {fmtDate(n.updatedAt || n.createdAt)}
                    </Text>
                  </View>

                  <View style={{ position: "relative" }}>
                    <Pressable
                      onPress={() => setMenuForId((cur) => (cur === n.id ? null : n.id))}
                      style={({ pressed, hovered }) => [
                        {
                          width: px(30),
                          height: px(30),
                          borderRadius: px(10),
                          alignItems: "center",
                          justifyContent: "center",
                          opacity: pressed ? 0.9 : 1,
                        },
                        Platform.OS === "web" && hovered ? { backgroundColor: "rgba(15,23,42,0.05)" } : null,
                      ]}
                    >
                      <Ionicons name="ellipsis-horizontal" size={px(18)} color="rgba(15,23,42,0.45)" />
                    </Pressable>

                    {menuForId === n.id ? (
                      <View
                        style={{
                          position: "absolute",
                          top: px(32),
                          right: 0,
                          width: px(150),
                          backgroundColor: "white",
                          borderRadius: px(12),
                          borderWidth: 1,
                          borderColor: UI.border,
                          shadowColor: "#0B1220",
                          shadowOpacity: 0.12,
                          shadowRadius: px(18),
                          shadowOffset: { width: 0, height: px(10) },
                          overflow: "hidden",
                          zIndex: 20,
                        }}
                      >
                        <Pressable
                          onPress={() => openEdit(n)}
                          style={({ pressed, hovered }) => [
                            { paddingHorizontal: px(12), paddingVertical: px(10), opacity: pressed ? 0.9 : 1 },
                            Platform.OS === "web" && hovered ? { backgroundColor: "rgba(15,23,42,0.03)" } : null,
                          ]}
                        >
                          <Text style={{ fontSize: fs(12), fontWeight: "900", color: UI.text }}>Editar</Text>
                        </Pressable>

                        <View style={{ height: 1, backgroundColor: UI.border }} />

                        <Pressable
                          onPress={() =>
                            Alert.alert("Eliminar nota", "¿Seguro que quieres eliminarla?", [
                              { text: "Cancelar", style: "cancel" },
                              { text: "Eliminar", style: "destructive", onPress: () => remove(n.id) },
                            ])
                          }
                          style={({ pressed, hovered }) => [
                            { paddingHorizontal: px(12), paddingVertical: px(10), opacity: pressed ? 0.9 : 1 },
                            Platform.OS === "web" && hovered ? { backgroundColor: "rgba(239,68,68,0.06)" } : null,
                          ]}
                        >
                          <Text style={{ fontSize: fs(12), fontWeight: "900", color: "rgba(185,28,28,0.95)" }}>
                            Eliminar
                          </Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                </View>

                <Text style={{ marginTop: px(10), fontSize: fs(13), fontWeight: "700", color: UI.text }} numberOfLines={6}>
                  {n.body?.trim() ? n.body.trim() : "—"}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default function TripExpenseSummarySection({
  px,
  fs,
  tasks,
  notes,
  onCreateTask,
  onToggleTask,
  onDeleteTask,
  onEditTaskTitle,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
}: Props) {
  return (
    <View style={{ gap: px(18) }}>
      <TasksPanel
        px={px}
        fs={fs}
        tasks={tasks}
        onCreateTask={onCreateTask}
        onToggleTask={onToggleTask}
        onDeleteTask={onDeleteTask}
        onEditTaskTitle={onEditTaskTitle}
      />

      <NotesPanel
        px={px}
        fs={fs}
        notes={notes}
        onCreateNote={onCreateNote}
        onUpdateNote={onUpdateNote}
        onDeleteNote={onDeleteNote}
      />
    </View>
  );
}
