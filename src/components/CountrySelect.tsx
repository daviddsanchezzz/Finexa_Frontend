// src/components/CountrySelect.tsx
import React, { useMemo, useRef, useState, useCallback } from "react";
import {
  Modal,
  Platform,
  Pressable,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  Dimensions,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import countries from "world-countries";
import { textStyles } from "../theme/typography";
import { colors } from "../theme/theme";
import { FormSelect } from "./creation";

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
  const { width, height } = Dimensions.get("window");
  const s = Math.max(0.92, Math.min(1.08, width / 390));
  const px = (n: number) => Math.round(n * s);
  return { px, width, height };
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
  const { px, height: winHeight } = useUiScaleMobile();
  // % heights no siempre se resuelven bien en RN Web (dependen de que toda la
  // cadena de ancestros tenga alto definido); un máximo en px es fiable en
  // todas las plataformas.
  const sheetMaxHeight = Math.round(winHeight * 0.82);

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

  const insets = useSafeAreaInsets();

  const close = useCallback(() => {
    setOpen(false);
    setQ("");
  }, []);

  const listRef = useRef<FlatList<CountryItem> | null>(null);

  const openModal = useCallback(() => {
    setOpen(true);
  }, []);

  const handleModalShow = useCallback(() => {
    if (selectedIndex > 2) {
      requestAnimationFrame(() => {
        try {
          listRef.current?.scrollToIndex({ index: Math.max(0, selectedIndex - 2), animated: false });
        } catch {}
      });
    }
  }, [selectedIndex]);

  const ROW_HEIGHT = px(11) * 2 + px(22) + 1; // padding vertical + flag height + separator

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
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: px(20),
            paddingVertical: px(11),
            gap: px(12),
            backgroundColor: "#FFFFFF",
            opacity: pressed ? 0.6 : 1,
          },
          Platform.OS === "web" && hovered ? { backgroundColor: "#F8FAFC" } : null,
        ]}
      >
        <FlagBadge code={item.cca2} size={px(22)} />

        <View style={{ flex: 1 }}>
          <Text
            style={[textStyles.body, { fontSize: px(15), fontWeight: "600", color: "#0F172A" }]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          {!!item.nameEn && item.nameEn !== item.name && (
            <Text style={[textStyles.caption, { marginTop: px(1), fontWeight: "500", color: "#94A3B8" }]} numberOfLines={1}>
              {item.nameEn}
            </Text>
          )}
        </View>

        <Text style={{ fontSize: px(12), fontWeight: "600", color: "#94A3B8" }}>{item.cca2}</Text>

        {active ? <Ionicons name="checkmark" size={px(19)} color={colors.primary} /> : null}
      </Pressable>
    );
  };

  return (
    <>
      {/* Trigger: mismo componente FormSelect que "Divisa" en el resto de formularios.
          Sin label propia: todos los usos de CountrySelect ya ponen su propia
          etiqueta ("País", "Añadir otro país"...) justo encima. */}
      <FormSelect value={selectedLabel || placeholder} onPress={openModal} />

      {/* Modal: hoja inferior estilo iOS, igual que el resto de menús de la app */}
      <Modal visible={open} transparent animationType="slide" onRequestClose={close} statusBarTranslucent onShow={handleModalShow}>
        <Pressable onPress={close} style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" }}>
            <Pressable
              onPress={() => {}}
              style={{
                width: "100%",
                maxHeight: sheetMaxHeight,
                borderTopLeftRadius: px(20),
                borderTopRightRadius: px(20),
                backgroundColor: "#FFFFFF",
                overflow: "hidden",
              }}
            >
              <View style={{ alignItems: "center", paddingTop: px(10), paddingBottom: px(4) }}>
                <View style={{ width: px(36), height: px(4), borderRadius: 999, backgroundColor: "#E2E8F0" }} />
              </View>

              {/* Header */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: px(16),
                  paddingTop: px(6),
                  paddingBottom: px(12),
                }}
              >
                <TouchableOpacity
                  onPress={close}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{ width: px(64), alignItems: "flex-start" }}
                >
                  <Ionicons name="close" size={px(22)} color="#334155" />
                </TouchableOpacity>
                <Text style={[textStyles.body, { fontSize: px(16), fontWeight: "700", color: "#0F172A" }]}>
                  Seleccionar país
                </Text>
                <View style={{ width: px(64) }} />
              </View>

              {/* Búsqueda */}
              <View style={{ paddingHorizontal: px(16), paddingBottom: px(10) }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: px(8),
                    height: px(40),
                    borderRadius: px(12),
                    backgroundColor: "#F1F5F9",
                    paddingHorizontal: px(12),
                  }}
                >
                  <Ionicons name="search" size={px(16)} color="#94A3B8" />
                  <TextInput
                    value={q}
                    onChangeText={setQ}
                    placeholder="Buscar país"
                    placeholderTextColor="#94A3B8"
                    autoCorrect={false}
                    autoCapitalize="none"
                    style={{ flex: 1, fontSize: px(15), color: "#0F172A", paddingVertical: 0 }}
                  />
                  {!!q && (
                    <TouchableOpacity onPress={() => setQ("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="close-circle" size={px(16)} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <FlatList
                ref={(r) => { listRef.current = r; }}
                data={filtered}
                keyExtractor={(item) => item.cca2}
                renderItem={renderRow}
                keyboardShouldPersistTaps="handled"
                ItemSeparatorComponent={() => (
                  <View style={{ height: 1, backgroundColor: "#F1F5F9", marginLeft: px(52) }} />
                )}
                contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, px(12)) }}
                initialNumToRender={24}
                windowSize={10}
                getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
                onScrollToIndexFailed={() => {}}
              />
            </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
