import React, { useMemo, useState } from "react";
import { View, Text, Pressable, Platform, Modal, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UI } from "./ui";

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
  notes: TripNote[];

  onCreateNote?: (note: { title?: string | null; body: string; pinned?: boolean }) => Promise<TripNote | void> | void;
  onUpdateNote?: (noteId: number, patch: Partial<Pick<TripNote, "title" | "body" | "pinned">>) => Promise<void> | void;
  onDeleteNote?: (noteId: number) => Promise<void> | void;
};

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

function fmtDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  try {
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
  } catch {
    return "";
  }
}

type Pastel = { bg: string; bd: string };
const PASTELS: Pastel[] = [
  { bg: "rgba(254,242,242,1)", bd: "rgba(239,68,68,0.14)" },   // rose
  { bg: "rgba(255,247,237,1)", bd: "rgba(249,115,22,0.14)" },  // orange
  { bg: "rgba(254,249,231,1)", bd: "rgba(234,179,8,0.16)" },   // amber
  { bg: "rgba(236,253,245,1)", bd: "rgba(34,197,94,0.14)" },   // green
  { bg: "rgba(240,253,250,1)", bd: "rgba(20,184,166,0.14)" },  // teal
  { bg: "rgba(239,246,255,1)", bd: "rgba(59,130,246,0.14)" },  // blue
  { bg: "rgba(245,243,255,1)", bd: "rgba(139,92,246,0.14)" },  // violet
  { bg: "rgba(250,245,255,1)", bd: "rgba(217,70,239,0.12)" },  // fuchsia
];

function pastelFor(id: number): Pastel {
  const idx = Math.abs(id) % PASTELS.length;
  return PASTELS[idx];
}

export function NotesPanel({ px, fs, notes, onCreateNote, onUpdateNote, onDeleteNote }: Props) {
  const sortedNotes = useMemo(() => {
    return notes.slice().sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  }, [notes]);

  // =========================
  // Composer + Editor
  // =========================
  type Mode = "create" | "edit";
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("create");

  const [editId, setEditId] = useState<number | null>(null);
  const [draftTitle, setDraftTitle] = useState<string>("");
  const [draftBody, setDraftBody] = useState("");
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // action menu per note
  const [menuForId, setMenuForId] = useState<number | null>(null);

  function closeModal() {
    setModalOpen(false);
    setSaveErr(null);
    setSaving(false);
  }

  function openCreate(e?: any) {
    e?.preventDefault?.();
    e?.stopPropagation?.();

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
    try {
      await onDeleteNote(noteId);
    } catch (e) {
      console.error("❌ Error borrando nota:", e);
    }
  }

  return (
    <View style={{ gap: px(14) }}>
      {/* header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: px(10) }}>
          <Ionicons name="document-text-outline" size={px(18)} color={UI.muted} />
          <Text style={{ fontSize: fs(18), fontWeight: "700", color: UI.text }}>Notas</Text>
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
            Platform.OS === "web" && hovered ? { backgroundColor: "rgba(37,99,235,0.06)", borderRadius: px(12) } : null,
          ]}
        >
          <Ionicons name="add-outline" size={px(16)} color="rgba(37,99,235,0.95)" />
          <Text style={{ fontSize: fs(13), fontWeight: "800", color: "rgba(37,99,235,0.95)" }}>Nueva nota</Text>
        </Pressable>
      </View>

      {/* Modal (narrower + nicer) */}
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
              maxWidth: px(440), // ✅ más estrecho
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
              <Text style={{ marginTop: px(10), fontSize: fs(12), fontWeight: "700", color: "rgba(185,28,28,0.95)" }}>
                {saveErr}
              </Text>
            ) : null}

            <View style={{ marginTop: px(14), flexDirection: "row", justifyContent: "flex-end", gap: px(10) }}>
              <Pressable onPress={closeModal} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
                <Text style={{ fontSize: fs(12), fontWeight: "700", color: UI.muted2 }}>Cancelar</Text>
              </Pressable>

              <Pressable
                onPress={save}
                disabled={saving}

              >
                <Text style={{ fontSize: fs(12), fontWeight: "700", color: "rgba(37,99,235,0.95)" }}>
                  {saving ? "Guardando…" : "Guardar"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* list/grid */}
      {sortedNotes.length === 0 ? (
        <Card px={px} style={{ width: "100%", padding: px(18) }}>
          <Text style={{ fontSize: fs(13), fontWeight: "600", color: UI.muted }}>
            Aún no tienes notas. Pulsa “Nueva nota”.
          </Text>
        </Card>
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
                  backgroundColor: p.bg, // ✅ pastel distinto
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

                    <Text style={{ marginTop: px(4), fontSize: fs(11), fontWeight: "700", color: UI.muted2 }}>
                      {fmtDate(n.updatedAt || n.createdAt)}
                    </Text>
                  </View>

                  {/* 3 dots menu */}
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
                          <Text style={{ fontSize: fs(12), fontWeight: "800", color: UI.text }}>Editar</Text>
                        </Pressable>

                        <View style={{ height: 1, backgroundColor: UI.border }} />

                        <Pressable
                          onPress={() => remove(n.id)}
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

                <Text style={{ marginTop: px(10), fontSize: fs(13), fontWeight: "600", color: UI.text }} numberOfLines={6}>
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
