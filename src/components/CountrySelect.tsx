// src/components/CountrySelect.tsx
import React, { useMemo, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import countries from "world-countries";
import { textStyles } from "../theme/typography";

type CountryItem = { cca2: string; name: string; nameEn?: string };

function buildCountries(): CountryItem[] {
  return (countries as any[])
    .map((c) => {
      const cca2 = String(c?.cca2 || "").toUpperCase();

      const nameEs = String(
        c?.translations?.spa?.common ||
          c?.translations?.spa?.official ||
          ""
      ).trim();

      const nameEn = String(c?.name?.common || c?.name?.official || "").trim();

      return {
        cca2,
        name: nameEs || nameEn,
        nameEn: nameEn || undefined,
      };
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

function WebInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  if (Platform.OS !== "web") return null;

  // @ts-ignore
  return (
    <input
      value={value}
      onChange={(e: any) => onChange(e?.target?.value ?? "")}
      placeholder={placeholder}
      style={{
        width: "100%",
        border: "none",
        outline: "none",
        background: "transparent",
        fontWeight: 800,
        fontSize: 13,
        color: "#0F172A",
      }}
    />
  );
}

function Chip({
  label,
  icon,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: "rgba(15,23,42,0.06)",
        borderWidth: 1,
        borderColor: "rgba(15,23,42,0.10)",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
      }}
    >
      <Ionicons name={icon} size={14} color="#475569" />
      <Text style={{ fontSize: 12, fontWeight: "900", color: "#334155" }}>{label}</Text>
    </View>
  );
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
  const list = useMemo(() => buildCountries(), []);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

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

  const selectedLabel = valueName?.trim();
  const selectedCode = (valueCode || "").toUpperCase();

  return (
    <>
      {/* Trigger */}
      <Pressable
        onPress={() => setOpen(true)}
        style={({ hovered, pressed }) => [
          {
            height: 44,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: selectedLabel ? "rgba(37,99,235,0.30)" : "#E5E7EB",
            backgroundColor: selectedLabel ? "rgba(37,99,235,0.06)" : "#FFFFFF",
            paddingHorizontal: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            opacity: pressed ? 0.96 : 1,
          },
          Platform.OS === "web" && hovered ? { backgroundColor: "#F8FAFC" } : null,
        ]}
      >
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: selectedLabel ? "rgba(37,99,235,0.12)" : "rgba(15,23,42,0.06)",
            borderWidth: 1,
            borderColor: selectedLabel ? "rgba(37,99,235,0.18)" : "rgba(0,0,0,0.06)",
          }}
        >
          <Ionicons name="flag-outline" size={16} color={selectedLabel ? "#2563EB" : "#64748B"} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: "900", color: "#94A3B8" }}>País</Text>
          <Text
            style={[
              textStyles.body,
              { marginTop: 2, fontSize: 13, fontWeight: "900", color: selectedLabel ? "#0F172A" : "#94A3B8" },
            ]}
            numberOfLines={1}
          >
            {selectedLabel || placeholder}
          </Text>
        </View>

        {!!selectedCode && (
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.85)",
              borderWidth: 1,
              borderColor: "rgba(0,0,0,0.08)",
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: "900", color: "#0F172A" }}>{selectedCode}</Text>
          </View>
        )}

        <Ionicons name="chevron-down-outline" size={18} color="#64748B" />
      </Pressable>

      {/* Modal */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          onPress={() => setOpen(false)}
          style={{ flex: 1, backgroundColor: "rgba(2,6,23,0.55)", padding: 24, justifyContent: "center", alignItems: "center" }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              width: 720,
              maxWidth: "100%",
              borderRadius: 18,
              backgroundColor: "#FFFFFF",
              borderWidth: 1,
              borderColor: "rgba(229,231,235,0.95)",
              overflow: "hidden",
              shadowColor: "#000",
              shadowOpacity: 0.14,
              shadowRadius: 22,
              shadowOffset: { width: 0, height: 14 },
            }}
          >
            {/* Header */}
            <View
              style={{
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: "#E5E7EB",
                backgroundColor: "#FFFFFF",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(37,99,235,0.12)",
                    borderWidth: 1,
                    borderColor: "rgba(37,99,235,0.18)",
                  }}
                >
                  <Ionicons name="flag-outline" size={18} color="#2563EB" />
                </View>

                <View>
                  <Text style={[textStyles.body, { fontSize: 14, fontWeight: "700", color: "#0F172A" }]}>
                    Seleccionar país
                  </Text>
                  <Text style={[textStyles.caption, { marginTop: 2, fontWeight: "700", color: "#64748B" }]}>
                    Busca por nombre o código (ES, PL…)
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setOpen(false)}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#F8FAFC",
                }}
              >
                <Ionicons name="close" size={18} color="#334155" />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={{ padding: 14, backgroundColor: "#F8FAFC", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" }}>
              <View
                style={{
                  height: 44,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  backgroundColor: "#FFFFFF",
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 12,
                  gap: 10,
                }}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(15,23,42,0.06)",
                    borderWidth: 1,
                    borderColor: "rgba(0,0,0,0.06)",
                  }}
                >
                  <Ionicons name="search-outline" size={16} color="#64748B" />
                </View>

                <View style={{ flex: 1 }}>
                  <WebInput value={q} onChange={setQ} placeholder="Buscar país…" />
                  {Platform.OS !== "web" && (
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#94A3B8" }}>
                      (Este buscador está pensado para web)
                    </Text>
                  )}
                </View>

                {!!q && (
                  <TouchableOpacity activeOpacity={0.9} onPress={() => setQ("")}>
                    <Ionicons name="close-circle" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={{ marginTop: 10, flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                <Chip label={`${filtered.length} resultados`} icon="list-outline" />
                {!!selectedLabel && <Chip label={`Seleccionado: ${selectedCode || "—"}`} icon="checkmark-circle-outline" />}
              </View>
            </View>

            {/* List */}
            <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator>
              {filtered.map((c) => {
                const active = selectedCode === c.cca2 || selectedLabel === c.name;

                return (
                  <Pressable
                    key={c.cca2}
                    onPress={() => {
                      onChange({ name: c.name, code: c.cca2 });
                      setOpen(false);
                      setQ("");
                    }}
                    style={({ hovered, pressed }) => [
                      {
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: "#F1F5F9",
                        backgroundColor: active ? "rgba(37,99,235,0.08)" : "#FFFFFF",
                        opacity: pressed ? 0.95 : 1,
                      },
                      Platform.OS === "web" && hovered ? { backgroundColor: active ? "rgba(37,99,235,0.10)" : "#F8FAFC" } : null,
                    ]}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[textStyles.body, { fontSize: 13, fontWeight: active ? "700" : "600", color: "#0F172A" }]} numberOfLines={1}>
                          {c.name}
                        </Text>
                      </View>

                      <View
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 999,
                          backgroundColor: active ? "rgba(37,99,235,0.12)" : "rgba(15,23,42,0.06)",
                          borderWidth: 1,
                          borderColor: active ? "rgba(37,99,235,0.18)" : "rgba(0,0,0,0.06)",
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: "900", color: active ? "#2563EB" : "#334155" }}>
                          {c.cca2}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Footer */}
            <View
              style={{
                padding: 14,
                borderTopWidth: 1,
                borderTopColor: "#E5E7EB",
                backgroundColor: "#FFFFFF",
                flexDirection: "row",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setOpen(false)}
                style={{
                  height: 42,
                  paddingHorizontal: 14,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  backgroundColor: "#F8FAFC",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 8,
                }}
              >
                <Ionicons name="close-outline" size={18} color="#334155" />
                <Text style={[textStyles.button, { fontSize: 12, fontWeight: "900", color: "#334155" }]}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
