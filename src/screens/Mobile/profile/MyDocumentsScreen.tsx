import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../../../components/AppHeader";
import { CountrySelect } from "../../../components/CountrySelect";
import CrossPlatformDateTimePicker from "../../../components/CrossPlatformDateTimePicker";
import { colors } from "../../../theme/theme";
import {
  useUserDocuments,
  getDocumentStatus,
  UserDocumentType,
  UserDocument,
  DocumentStatus,
} from "../../../hooks/useUserDocuments";

const DOC_META: Record<UserDocumentType, { title: string; subtitle: string; emoji: string; softBg: string }> = {
  passport: {
    title: "Pasaporte",
    subtitle: "Necesario para viajes fuera de la UE",
    emoji: "🛂",
    softBg: "#EEF2FF",
  },
  dni: {
    title: "DNI / Carnet de identidad",
    subtitle: "Válido para viajar dentro de la UE",
    emoji: "🪪",
    softBg: "#ECFDF5",
  },
};

const STATUS_META: Record<DocumentStatus, { label: string; color: string; bg: string }> = {
  "no-expiry": { label: "Sin caducidad indicada", color: "#6B7280", bg: "#F3F4F6" },
  valid: { label: "Vigente", color: "#16A34A", bg: "#DCFCE7" },
  "expiring-soon": { label: "Caduca pronto", color: "#D97706", bg: "#FEF3C7" },
  expired: { label: "Caducado", color: "#DC2626", bg: "#FEE2E2" },
};

function fmtDate(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function MyDocumentsScreen(_: any) {
  const { documentsByType, isLoading, upsertDocument, deleteDocument, isSaving, isDeleting } = useUserDocuments();
  const [editingType, setEditingType] = useState<UserDocumentType | null>(null);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pb-2">
        <AppHeader title="Mis documentos" showProfile={false} showDatePicker={false} showBack={true} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 13, color: "#6B7280", lineHeight: 19, marginBottom: 20 }}>
          Guarda los datos de tu pasaporte y DNI para que podamos avisarte si van a caducar antes de un viaje.
        </Text>

        <View style={{ backgroundColor: "white", borderRadius: 18, borderWidth: 1, borderColor: "#F3F4F6", overflow: "hidden" }}>
          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ margin: 20 }} />
          ) : (
            (Object.keys(DOC_META) as UserDocumentType[]).map((type, i, arr) => {
              const doc = documentsByType.get(type) ?? null;
              return (
                <DocumentRow
                  key={type}
                  type={type}
                  doc={doc}
                  isLast={i === arr.length - 1}
                  onPress={() => setEditingType(type)}
                />
              );
            })
          )}
        </View>
      </ScrollView>

      {editingType && (
        <DocumentFormModal
          type={editingType}
          doc={documentsByType.get(editingType) ?? null}
          saving={isSaving}
          deleting={isDeleting}
          onClose={() => setEditingType(null)}
          onSave={async (input) => {
            await upsertDocument(editingType, input);
            setEditingType(null);
          }}
          onDelete={async () => {
            await deleteDocument(editingType);
            setEditingType(null);
          }}
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
  const meta = DOC_META[type];
  const status = doc ? getDocumentStatus(doc.expiryDate) : null;
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
          width: 38, height: 38, borderRadius: 10, backgroundColor: meta.softBg,
          alignItems: "center", justifyContent: "center", marginRight: 12,
        }}
      >
        <Text style={{ fontSize: 20 }}>{meta.emoji}</Text>
      </View>

      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: "#1F2937" }}>{meta.title}</Text>
        <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2, lineHeight: 16 }} numberOfLines={1}>
          {doc?.expiryDate ? `Caduca ${fmtDate(doc.expiryDate)}` : meta.subtitle}
        </Text>
      </View>

      {doc && statusMeta ? (
        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: statusMeta.bg }}>
          <Text style={{ fontSize: 10, fontWeight: "800", color: statusMeta.color }}>{statusMeta.label}</Text>
        </View>
      ) : (
        <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary }}>+ Añadir</Text>
      )}
    </TouchableOpacity>
  );
}

function DocumentFormModal({
  type,
  doc,
  saving,
  deleting,
  onClose,
  onSave,
  onDelete,
}: {
  type: UserDocumentType;
  doc: UserDocument | null;
  saving: boolean;
  deleting: boolean;
  onClose: () => void;
  onSave: (input: { country: string; documentNumber?: string | null; expiryDate?: string | null }) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const meta = DOC_META[type];
  const [countryName, setCountryName] = useState(doc?.country ?? "");
  const [countryCode, setCountryCode] = useState(doc?.country ?? "");
  const [documentNumber, setDocumentNumber] = useState(doc?.documentNumber ?? "");
  const [expiryDate, setExpiryDate] = useState<Date | null>(doc?.expiryDate ? new Date(doc.expiryDate) : null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    setCountryName(doc?.country ?? "");
    setCountryCode(doc?.country ?? "");
    setDocumentNumber(doc?.documentNumber ?? "");
    setExpiryDate(doc?.expiryDate ? new Date(doc.expiryDate) : null);
  }, [doc]);

  const canSave = countryCode.trim().length > 0;

  return (
    <Modal visible transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={{ backgroundColor: "white", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: "#0F172A" }}>{meta.title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 12, fontWeight: "700", color: "#9CA3AF", marginBottom: 6 }}>PAÍS EMISOR *</Text>
          <View style={{ marginBottom: 16 }}>
            <CountrySelect
              valueName={countryName}
              valueCode={countryCode}
              onChange={(x) => { setCountryName(x.name); setCountryCode(x.code); }}
              placeholder="Selecciona un país"
            />
          </View>

          <Text style={{ fontSize: 12, fontWeight: "700", color: "#9CA3AF", marginBottom: 6 }}>Nº DE DOCUMENTO (OPCIONAL)</Text>
          <TextInput
            value={documentNumber}
            onChangeText={setDocumentNumber}
            placeholder="Ej: AB123456"
            autoCapitalize="characters"
            style={{
              borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12,
              paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#0F172A", marginBottom: 16,
            }}
          />

          <Text style={{ fontSize: 12, fontWeight: "700", color: "#9CA3AF", marginBottom: 6 }}>CADUCA (OPCIONAL)</Text>
          <TouchableOpacity
            onPress={() => setPickerOpen(true)}
            style={{
              flexDirection: "row", alignItems: "center", justifyContent: "space-between",
              borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12,
              paddingHorizontal: 14, paddingVertical: 12, marginBottom: 24,
            }}
          >
            <Text style={{ fontSize: 14, color: expiryDate ? "#0F172A" : "#9CA3AF" }}>
              {expiryDate ? fmtDate(expiryDate.toISOString()) : "Selecciona una fecha"}
            </Text>
            <Ionicons name="calendar-outline" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <CrossPlatformDateTimePicker
            isVisible={pickerOpen}
            date={expiryDate ?? new Date()}
            mode="date"
            onConfirm={(d) => { setExpiryDate(d); setPickerOpen(false); }}
            onCancel={() => setPickerOpen(false)}
          />

          <TouchableOpacity
            disabled={!canSave || saving}
            onPress={() => onSave({
              country: countryCode,
              documentNumber: documentNumber.trim() || null,
              expiryDate: expiryDate ? expiryDate.toISOString() : null,
            })}
            style={{
              backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14,
              alignItems: "center", opacity: !canSave || saving ? 0.5 : 1, marginBottom: doc ? 10 : 0,
            }}
          >
            {saving ? <ActivityIndicator color="white" /> : <Text style={{ color: "white", fontWeight: "800", fontSize: 14 }}>Guardar</Text>}
          </TouchableOpacity>

          {doc && (
            <TouchableOpacity
              disabled={deleting}
              onPress={onDelete}
              style={{ alignItems: "center", paddingVertical: 10, opacity: deleting ? 0.5 : 1 }}
            >
              {deleting ? (
                <ActivityIndicator color="#DC2626" />
              ) : (
                <Text style={{ color: "#DC2626", fontWeight: "700", fontSize: 13 }}>Eliminar documento</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}
