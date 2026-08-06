import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../../../components/AppHeader";
import { colors } from "../../../theme/theme";
import {
  useUserDocuments,
  getDocumentStatus,
  type UserDocumentType,
  type UserDocument,
  type DocumentStatus,
} from "../../../hooks/useUserDocuments";
import { getPersonalDocTypeConfig, MULTI_INSTANCE_PERSONAL_TYPES } from "../../../utils/personalDocumentTypes";
import DocumentFormModal from "../../../components/DocumentFormModal";

const STATUS_META: Record<DocumentStatus, { label: string; color: string; bg: string }> = {
  "no-expiry": { label: "Sin caducidad indicada", color: "#6B7280", bg: "#F3F4F6" },
  valid: { label: "Vigente", color: "#16A34A", bg: "#DCFCE7" },
  "expiring-soon": { label: "Caduca pronto", color: "#D97706", bg: "#FEF3C7" },
  expired: { label: "Caducado", color: "#DC2626", bg: "#FEE2E2" },
};

interface Section {
  title: string;
  types: UserDocumentType[];
}

const SECTIONS: Section[] = [
  { title: "Identidad", types: ["passport", "dni"] },
  { title: "Salud", types: ["ehic", "private_health_insurance", "vaccine"] },
  { title: "Visados", types: ["visa"] },
  { title: "Conducir", types: ["driving_license", "driving_license_international"] },
];

export default function MyDocumentsScreen(_: any) {
  const { documentsByType, isLoading, createDocument, updateDocument, deleteDocument, isSaving, isDeleting } = useUserDocuments();
  const [activeModal, setActiveModal] = useState<{ type: UserDocumentType; doc: UserDocument | null } | null>(null);

  const closeModal = () => setActiveModal(null);

  const handleSave = async (input: Record<string, any>) => {
    if (activeModal?.doc) {
      await updateDocument(activeModal.doc.id, input);
    } else if (activeModal) {
      await createDocument({ type: activeModal.type, ...input });
    }
    closeModal();
  };

  const handleDelete = async () => {
    if (!activeModal?.doc) return;
    await deleteDocument(activeModal.doc.id);
    closeModal();
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pb-2">
        <AppHeader title="Mis documentos" showProfile={false} showDatePicker={false} showBack={true} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 13, color: "#6B7280", lineHeight: 19, marginBottom: 20 }}>
          Guarda aquí tus documentos personales — pasaporte, DNI, vacunas, carnet de conducir, tarjeta sanitaria...
          para reutilizarlos en cualquier viaje y que podamos avisarte si van a caducar.
        </Text>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ margin: 20 }} />
        ) : (
          SECTIONS.map((section) => (
            <View key={section.title} style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>
                {section.title}
              </Text>
              <View style={{ backgroundColor: "white", borderRadius: 18, borderWidth: 1, borderColor: "#F3F4F6", overflow: "hidden" }}>
                {section.types.map((type, idx) => {
                  const isMulti = MULTI_INSTANCE_PERSONAL_TYPES.includes(type);
                  const docs = documentsByType.get(type) ?? [];
                  const isLastType = idx === section.types.length - 1;

                  if (!isMulti) {
                    return (
                      <DocumentRow
                        key={type}
                        type={type}
                        doc={docs[0] ?? null}
                        isLast={isLastType}
                        onPress={() => setActiveModal({ type, doc: docs[0] ?? null })}
                      />
                    );
                  }

                  return (
                    <View key={type}>
                      {docs.map((doc, i) => (
                        <DocumentRow
                          key={doc.id}
                          type={type}
                          doc={doc}
                          isLast={false}
                          onPress={() => setActiveModal({ type, doc })}
                        />
                      ))}
                      <AddAnotherRow
                        type={type}
                        isLast={isLastType}
                        onPress={() => setActiveModal({ type, doc: null })}
                      />
                    </View>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {activeModal && (
        <DocumentFormModal
          config={getPersonalDocTypeConfig(activeModal.type)}
          doc={activeModal.doc}
          saving={isSaving}
          deleting={isDeleting}
          onClose={closeModal}
          onSave={handleSave}
          onDelete={activeModal.doc ? handleDelete : undefined}
        />
      )}
    </SafeAreaView>
  );
}

function DocumentRow({
  type,
  doc,
  isLast,
  onPress,
}: {
  type: UserDocumentType;
  doc: UserDocument | null;
  isLast: boolean;
  onPress: () => void;
}) {
  const config = getPersonalDocTypeConfig(type);
  const status = doc?.expiryDate ? getDocumentStatus(doc.expiryDate) : null;
  const statusMeta = status ? STATUS_META[status] : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: "#F3F4F6",
      }}
    >
      <View
        style={{
          width: 38, height: 38, borderRadius: 10, backgroundColor: "#F1F5F9",
          alignItems: "center", justifyContent: "center", marginRight: 12,
        }}
      >
        <Text style={{ fontSize: 20 }}>{config.emoji}</Text>
      </View>

      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: "#1F2937" }}>{config.title}</Text>
        <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2, lineHeight: 16 }} numberOfLines={1}>
          {doc ? config.summary(doc) : "Falta añadir"}
        </Text>
      </View>

      {doc && statusMeta ? (
        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: statusMeta.bg }}>
          <Text style={{ fontSize: 10, fontWeight: "800", color: statusMeta.color }}>{statusMeta.label}</Text>
        </View>
      ) : (
        <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary }}>{doc ? "Ver" : "+ Añadir"}</Text>
      )}
    </TouchableOpacity>
  );
}

function AddAnotherRow({ type, isLast, onPress }: { type: UserDocumentType; isLast: boolean; onPress: () => void }) {
  const config = getPersonalDocTypeConfig(type);
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: isLast ? 0 : 1, borderBottomColor: "#F3F4F6",
      }}
    >
      <View style={{ width: 38, height: 38, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
      </View>
      <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primary }}>
        Añadir {config.title.toLowerCase()}
      </Text>
    </TouchableOpacity>
  );
}
