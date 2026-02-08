// src/components/CountrySelect.tsx
import React, { useMemo, useRef, useState, useCallback } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import countries from "world-countries";
import { textStyles } from "../theme/typography";

type CountryItem = { cca2: string; name: string; nameEn?: string };

function buildCountries(): CountryItem[] {
  return (countries as any[])
    .map((c) => {
      const cca2 = String(c?.cca2 || "").toUpperCase();

      const nameEs = String(c?.translations?.spa?.common || c?.translations?.spa?.official || "").trim();
      const nameEn = String(c?.name?.common || c?.name?.official || "").trim();

      return { cca2, name: nameEs || nameEn, nameEn: nameEn || undefined };
    })
    .filter((c) => c.cca2 && c.name)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

function norm(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function useUiScaleMobile() {
  const { width } = Dimensions.get("window");
  const s = Math.max(0.92, Math.min(1.08, width / 390));
  const px = (n: number) => Math.round(n * s);
  return { px, width };
}

function Chip({ label, icon, px }: { label: string; icon: keyof typeof Ionicons.glyphMap; px: (n: number) => number }) {
  return (
    <View
      style={{
        paddingHorizontal: px(10),
        paddingVertical: px(6),
        borderRadius: 999,
        backgroundColor: "rgba(15,23,42,0.06)",
        borderWidth: 1,
        borderColor: "rgba(15,23,42,0.10)",
        flexDirection: "row",
        alignItems: "center",
        gap: px(6),
      }}
    >
      <Ionicons name={icon} size={px(14)} color="#475569" />
      <Text style={{ fontSize: px(12), fontWeight: "900", color: "#334155" }}>{label}</Text>
    </View>
  );
}

function FlagBadge({ code, size = 18 }: { code?: string | null; size?: number }) {
  const c = (code || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return <Text style={{ fontSize: size }}>🌍</Text>;
  const cps = [...c].map((ch) => 127397 + ch.charCodeAt(0));
  return <Text style={{ fontSize: size }}>{String.fromCodePoint(...cps)}</Text>;
}

export function CountrySelect({
  valueName,
  valueCode,
  onChange,
  placeholder = "Selecciona un país",
}: {
  valueName: string;
  valueCode?: string | null; // cca2
  onChange: (x: { name: string; code: string }) => void;
  placeholder?: string;
}) {
  const { px, width } = useUiScaleMobile();

  const list = useMemo(() => buildCountries(), []);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const selectedLabel = valueName?.trim();
  const selectedCode = (valueCode || "").toUpperCase();

  const filtered = useMemo(() => {
    const needle = norm(q);
    if (!needle) return list;
    return list.filter((c) => {
      const a = norm(c.name);
      const b = norm(c.nameEn || "");
      const cc = norm(c.cca2);
      return a.includes(needle) || b.includes(needle) || cc.includes(needle);
    });
  }, [list, q]);

  // pre-index for quick scroll to selection (mobile)
  const selectedIndex = useMemo(() => {
    if (!selectedCode) return -1;
    const idx = filtered.findIndex((c) => c.cca2 === selectedCode);
    return idx;
  }, [filtered, selectedCode]);

  const close = useCallback(() => {
    setOpen(false);
    setQ("");
  }, []);

  const openModal = useCallback(() => {
    setOpen(true);
  }, []);

  const listRef = useRef<FlatList<CountryItem> | null>(null);

  const modalWidth = useMemo(() => {
    if (Platform.OS === "web") return Math.min(720, Math.round(width * 0.92));
    return Math.round(width * 0.92);
  }, [width]);

  const modalMaxHeight = useMemo(() => {
    // mobile: almost fullscreen sheet-like
    if (Platform.OS !== "web") return undefined;
    return 520;
  }, []);

  const renderRow = ({ item }: { item: CountryItem }) => {
    const active = selectedCode === item.cca2 || selectedLabel === item.name;

    return (
      <Pressable
        onPress={() => {
          onChange({ name: item.name, code: item.cca2 });
          close();
        }}
        style={({ pressed, hovered }: any) => [
          {
            paddingHorizontal: px(16),
            paddingVertical: px(12),
            borderBottomWidth: 1,
            borderBottomColor: "#F1F5F9",
            backgroundColor: active ? "rgba(37,99,235,0.08)" : "#FFFFFF",
            opacity: pressed ? 0.95 : 1,
          },
          Platform.OS === "web" && hovered ? { backgroundColor: active ? "rgba(37,99,235,0.10)" : "#F8FAFC" } : null,
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: px(12) }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: px(10), flex: 1 }}>
            <View
              style={{
                width: px(34),
                height: px(34),
                borderRadius: px(12),
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: active ? "rgba(37,99,235,0.12)" : "rgba(15,23,42,0.06)",
                borderWidth: 1,
                borderColor: active ? "rgba(37,99,235,0.18)" : "rgba(0,0,0,0.06)",
              }}
            >
              <FlagBadge code={item.cca2} size={px(18)} />
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={[
                  textStyles.body,
                  { fontSize: px(13), fontWeight: active ? "900" : "800", color: "#0F172A" },
                ]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              {!!item.nameEn && item.nameEn !== item.name && (
                <Text style={[textStyles.caption, { marginTop: px(2), fontWeight: "800", color: "#94A3B8" }]} numberOfLines={1}>
                  {item.nameEn}
                </Text>
              )}
            </View>
          </View>

          <View
            style={{
              paddingHorizontal: px(10),
              paddingVertical: px(6),
              borderRadius: 999,
              backgroundColor: active ? "rgba(37,99,235,0.12)" : "rgba(15,23,42,0.06)",
              borderWidth: 1,
              borderColor: active ? "rgba(37,99,235,0.18)" : "rgba(0,0,0,0.06)",
            }}
          >
            <Text style={{ fontSize: px(11), fontWeight: "900", color: active ? "#2563EB" : "#334155" }}>
              {item.cca2}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <>
      {/* Trigger (works for web + mobile) */}
      <Pressable
        onPress={openModal}
        style={({ hovered, pressed }: any) => [
          {
            minHeight: px(44),
            borderRadius: px(16),
            borderWidth: 1,
            borderColor: selectedCode ? "rgba(37,99,235,0.30)" : "rgba(148,163,184,0.22)",
            backgroundColor: selectedCode ? "rgba(37,99,235,0.06)" : "#FFFFFF",
            paddingHorizontal: px(12),
            paddingVertical: px(10),
            flexDirection: "row",
            alignItems: "center",
            gap: px(10),
            opacity: pressed ? 0.96 : 1,
          },
          Platform.OS === "web" && hovered ? { backgroundColor: "#F8FAFC" } : null,
        ]}
      >
        <View
          style={{
            width: px(34),
            height: px(34),
            borderRadius: px(12),
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: selectedCode ? "rgba(37,99,235,0.12)" : "rgba(15,23,42,0.06)",
            borderWidth: 1,
            borderColor: selectedCode ? "rgba(37,99,235,0.18)" : "rgba(0,0,0,0.06)",
          }}
        >
          {selectedCode ? <FlagBadge code={selectedCode} size={px(18)} /> : <Ionicons name="flag-outline" size={px(16)} color="#64748B" />}
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: px(11), fontWeight: "900", color: "#94A3B8" }}>País</Text>
          <Text
            style={[
              textStyles.body,
              {
                marginTop: px(2),
                fontSize: px(13),
                fontWeight: "900",
                color: selectedLabel || selectedCode ? "#0F172A" : "#94A3B8",
              },
            ]}
            numberOfLines={1}
          >
            {selectedLabel || placeholder}
          </Text>
        </View>

        {!!selectedCode && (
          <View
            style={{
              paddingHorizontal: px(10),
              paddingVertical: px(6),
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.85)",
              borderWidth: 1,
              borderColor: "rgba(0,0,0,0.08)",
            }}
          >
            <Text style={{ fontSize: px(11), fontWeight: "900", color: "#0F172A" }}>{selectedCode}</Text>
          </View>
        )}

        <Ionicons name="chevron-down-outline" size={px(18)} color="#64748B" />
      </Pressable>

      {/* Modal (desktop centered, mobile bottom-sheet like) */}
      <Modal visible={open} transparent animationType={Platform.OS === "web" ? "fade" : "slide"} onRequestClose={close}>
        <Pressable
          onPress={close}
          style={{
            flex: 1,
            backgroundColor: "rgba(2,6,23,0.55)",
            justifyContent: Platform.OS === "web" ? "center" : "flex-end",
            alignItems: "center",
            padding: Platform.OS === "web" ? px(24) : px(12),
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ width: "100%", alignItems: "center" }}
          >
            <Pressable
              onPress={() => {}}
              style={{
                width: modalWidth,
                maxWidth: "100%",
                borderRadius: px(20),
                backgroundColor: "#FFFFFF",
                borderWidth: 1,
                borderColor: "rgba(229,231,235,0.95)",
                overflow: "hidden",
                shadowColor: "#000",
                shadowOpacity: 0.16,
                shadowRadius: px(22),
                shadowOffset: { width: 0, height: px(14) },
                // mobile: give it a sheet feel
                ...(Platform.OS !== "web"
                  ? {
                      marginBottom: px(10),
                    }
                  : null),
              }}
            >
              {/* Header */}
              <View
                style={{
                  paddingHorizontal: px(16),
                  paddingVertical: px(14),
                  borderBottomWidth: 1,
                  borderBottomColor: "#E5E7EB",
                  backgroundColor: "#FFFFFF",
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: px(12),
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: px(10), flex: 1 }}>
                  <View
                    style={{
                      width: px(36),
                      height: px(36),
                      borderRadius: px(12),
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(37,99,235,0.12)",
                      borderWidth: 1,
                      borderColor: "rgba(37,99,235,0.18)",
                    }}
                  >
                    <Ionicons name="flag-outline" size={px(18)} color="#2563EB" />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[textStyles.body, { fontSize: px(14), fontWeight: "900", color: "#0F172A" }]}>
                      Seleccionar país
                    </Text>
                    <Text style={[textStyles.caption, { marginTop: px(2), fontWeight: "800", color: "#64748B" }]}>
                      Busca por nombre o código (ES, PL…)
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={close}
                  style={{
                    width: px(38),
                    height: px(38),
                    borderRadius: px(12),
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#F8FAFC",
                  }}
                >
                  <Ionicons name="close" size={px(18)} color="#334155" />
                </TouchableOpacity>
              </View>

              {/* Search (now works on mobile too) */}
              <View style={{ padding: px(14), backgroundColor: "#F8FAFC", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" }}>
                <View
                  style={{
                    minHeight: px(44),
                    borderRadius: px(16),
                    borderWidth: 1,
                    borderColor: "rgba(148,163,184,0.22)",
                    backgroundColor: "#FFFFFF",
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: px(12),
                    gap: px(10),
                  }}
                >
                  <View
                    style={{
                      width: px(34),
                      height: px(34),
                      borderRadius: px(12),
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(15,23,42,0.06)",
                      borderWidth: 1,
                      borderColor: "rgba(0,0,0,0.06)",
                    }}
                  >
                    <Ionicons name="search-outline" size={px(16)} color="#64748B" />
                  </View>

                  <View style={{ flex: 1 }}>
                    <TextInput
                      value={q}
                      onChangeText={setQ}
                      placeholder="Buscar país…"
                      placeholderTextColor="#94A3B8"
                      autoCorrect={false}
                      autoCapitalize="none"
                      style={{
                        width: "100%",
                        fontWeight: "900",
                        fontSize: px(13),
                        color: "#0F172A",
                        paddingVertical: 0,
                      }}
                    />
                  </View>

                  {!!q && (
                    <TouchableOpacity activeOpacity={0.9} onPress={() => setQ("")} style={{ padding: px(2) }}>
                      <Ionicons name="close-circle" size={px(18)} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={{ marginTop: px(10), flexDirection: "row", gap: px(8), flexWrap: "wrap" }}>
                  <Chip label={`${filtered.length} resultados`} icon="list-outline" px={px} />
                  {!!selectedCode && <Chip label={`Seleccionado: ${selectedCode}`} icon="checkmark-circle-outline" px={px} />}
                </View>

                {!!selectedIndex && selectedIndex > 8 && Platform.OS !== "web" && (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => {
                      try {
                        listRef.current?.scrollToIndex({ index: Math.max(0, selectedIndex - 2), animated: true });
                      } catch {}
                    }}
                    style={{
                      marginTop: px(10),
                      height: px(40),
                      borderRadius: px(14),
                      borderWidth: 1,
                      borderColor: "rgba(148,163,184,0.22)",
                      backgroundColor: "white",
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "row",
                      gap: px(8),
                    }}
                  >
                    <Ionicons name="locate-outline" size={px(16)} color="#0F172A" />
                    <Text style={{ fontSize: px(12), fontWeight: "900", color: "#0F172A" }}>Ir al seleccionado</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* List (FlatList perf for mobile, scroll view ok on web too) */}
              {Platform.OS === "web" ? (
                <ScrollView style={{ maxHeight: modalMaxHeight ?? 520 }} showsVerticalScrollIndicator>
                  {filtered.map((c) => (
                    <View key={c.cca2}>{renderRow({ item: c } as any)}</View>
                  ))}
                </ScrollView>
              ) : (
                <FlatList
                  ref={(r) => (listRef.current = r)}
                  data={filtered}
                  keyExtractor={(item) => item.cca2}
                  renderItem={renderRow}
                  keyboardShouldPersistTaps="handled"
                  style={{ maxHeight: 520 }}
                  initialNumToRender={24}
                  windowSize={10}
                  getItemLayout={(_, index) => ({
                    length: px(12) * 2 + px(34), // approximate row height; safe enough for scrollToIndex
                    offset: (px(12) * 2 + px(34)) * index,
                    index,
                  })}
                />
              )}

              {/* Footer */}
              <View
                style={{
                  padding: px(14),
                  borderTopWidth: 1,
                  borderTopColor: "#E5E7EB",
                  backgroundColor: "#FFFFFF",
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: px(10),
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => {
                    // clear selection by selecting nothing? (keep behavior as caller wants)
                    // If you want explicit "clear", handle it outside; here we just close.
                    close();
                  }}
                  style={{
                    height: px(42),
                    paddingHorizontal: px(14),
                    borderRadius: px(14),
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    backgroundColor: "#F8FAFC",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                    gap: px(8),
                  }}
                >
                  <Ionicons name="close-outline" size={px(18)} color="#334155" />
                  <Text style={[textStyles.button, { fontSize: px(12), fontWeight: "900", color: "#334155" }]}>Cerrar</Text>
                </TouchableOpacity>

                <View style={{ flexDirection: "row", alignItems: "center", gap: px(10) }}>
                  {!!selectedCode && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: px(8) }}>
                      <FlagBadge code={selectedCode} size={px(16)} />
                      <Text style={{ fontSize: px(12), fontWeight: "900", color: "#0F172A" }}>{selectedCode}</Text>
                    </View>
                  )}
                </View>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </>
  );
}
