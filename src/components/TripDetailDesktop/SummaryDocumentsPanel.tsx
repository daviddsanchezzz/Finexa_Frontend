import React from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UI } from "./ui";

export type DocItem = {
  id: string;
  name: string;
  kind: "pdf" | "image";
  sizeLabel: string;
  whenLabel: string;
};

type Props = {
  px: (n: number) => number;
  fs: (n: number) => number;
  docs: DocItem[];
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

function FileIcon({ kind, px }: { kind: "pdf" | "image"; px: (n: number) => number }) {
  const isPdf = kind === "pdf";
  return (
    <View
      style={{
        width: px(34),
        height: px(34),
        borderRadius: px(10),
        backgroundColor: isPdf ? "rgba(239,68,68,0.10)" : "rgba(37,99,235,0.10)",
        borderWidth: 1,
        borderColor: isPdf ? "rgba(239,68,68,0.18)" : "rgba(37,99,235,0.18)",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name={isPdf ? "document-text-outline" : "image-outline"} size={px(16)} color={isPdf ? "rgba(185,28,28,0.95)" : "rgba(29,78,216,0.95)"} />
    </View>
  );
}

export function DocumentsPanel({ px, fs, docs }: Props) {
  return (
    <View style={{ gap: px(12) }}>
      {/* header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: px(10) }}>
          <Ionicons name="folder-outline" size={px(18)} color={UI.muted} />
          <Text style={{ fontSize: fs(18), fontWeight: "700", color: UI.text }}>Mis Documentos</Text>
        </View>

        <Pressable
          onPress={() => {}}
          style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
        >
          <Text style={{ fontSize: fs(13), fontWeight: "800", color: "rgba(37,99,235,0.95)" }}>Ver todo</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", gap: px(14), flexWrap: "wrap" }}>
        {/* list */}
        <Card px={px} style={{ flex: 1, minWidth: px(340), padding: px(14) }}>
          {docs.map((d, idx) => (
            <View key={d.id}>
              <Pressable
                onPress={() => {}}
                style={({ hovered, pressed }) => [
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    gap: px(12),
                    paddingVertical: px(12),
                    paddingHorizontal: px(10),
                    borderRadius: px(14),
                    backgroundColor: Platform.OS === "web" && hovered ? "rgba(15,23,42,0.02)" : "transparent",
                    opacity: pressed ? 0.92 : 1,
                  },
                ]}
              >
                <FileIcon kind={d.kind} px={px} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: fs(13), fontWeight: "600", color: UI.text }} numberOfLines={1}>
                    {d.name}
                  </Text>
                  <Text style={{ marginTop: px(4), fontSize: fs(11), fontWeight: "600", color: UI.muted2 }}>
                    {d.sizeLabel} • {d.whenLabel}
                  </Text>
                </View>
              </Pressable>

              {idx < docs.length - 1 ? <View style={{ height: 1, backgroundColor: "rgba(226,232,240,0.8)", marginLeft: px(56) }} /> : null}
            </View>
          ))}
        </Card>

        {/* dropzone fake */}
        <View
          style={{
            flex: 1,
            minWidth: px(340),
            borderRadius: px(18),
            borderWidth: 2,
            borderStyle: "dashed",
            borderColor: "rgba(148,163,184,0.35)",
            backgroundColor: "rgba(15,23,42,0.01)",
            padding: px(16),
            alignItems: "center",
            justifyContent: "center",
            gap: px(10),
          }}
        >
          <View
            style={{
              width: px(44),
              height: px(44),
              borderRadius: px(999),
              backgroundColor: "rgba(37,99,235,0.08)",
              borderWidth: 1,
              borderColor: "rgba(37,99,235,0.16)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="cloud-upload-outline" size={px(20)} color="rgba(37,99,235,0.95)" />
          </View>

          <Text style={{ fontSize: fs(14), fontWeight: "700", color: UI.text }}>Arrastra tus archivos aquí</Text>
          <Text style={{ fontSize: fs(12), fontWeight: "600", color: UI.muted2, textAlign: "center" }}>
            O haz clic para seleccionar (PDF, PNG, JPG)
          </Text>
        </View>
      </View>
    </View>
  );
}
