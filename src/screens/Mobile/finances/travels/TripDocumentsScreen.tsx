import React, { useState } from "react";
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
import { useNavigation, useRoute } from "@react-navigation/native";
import { colors } from "../../../../theme/theme";
import { useUserDocuments, getDocumentStatus, DocumentStatus } from "../../../../hooks/useUserDocuments";
import { useTripDocuments } from "../../../../hooks/useTripDocuments";
import CrossPlatformDateTimePicker from "../../../../components/CrossPlatformDateTimePicker";
import { getDestinationRequirements, DESTINATION_REQUIREMENTS_DISCLAIMER } from "../../../../utils/destinationRequirements";

const STATUS_META: Record<DocumentStatus, { label: string; color: string; bg: string }> = {
  "no-expiry": { label: "Sin caducidad indicada", color: "#6B7280", bg: "#F3F4F6" },
  valid: { label: "Vigente", color: "#16A34A", bg: "#DCFCE7" },
  "expiring-soon": { label: "Caduca pronto", color: "#D97706", bg: "#FEF3C7" },
  expired: { label: "Caducado", color: "#DC2626", bg: "#FEE2E2" },
};

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export default function TripDocumentsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { tripId, destination, tripName, endDate } = route.params || {};

  const { documentsByType: userDocsByType, isLoading: userDocsLoading } = useUserDocuments();
  const {
    documentsByType: tripDocsByType,
    isLoading: tripDocsLoading,
    upsertDocument,
    deleteDocument,
    isSaving,
    isDeleting,
  } = useTripDocuments(tripId);

  const [insuranceModalOpen, setInsuranceModalOpen] = useState(false);

  const passport = userDocsByType.get("passport") ?? null;
  const dni = userDocsByType.get("dni") ?? null;
  const insurance = tripDocsByType.get("travel_insurance") ?? null;

  const nationality = passport?.country ?? dni?.country ?? null;
  const requirements = getDestinationRequirements(nationality, destination);

  const tripEnd = endDate ? new Date(endDate) : null;
  const passportExpiresBeforeTrip =
    !!passport?.expiryDate && !!tripEnd && new Date(passport.expiryDate) < tripEnd;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, gap: 8 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "900", color: "#0F172A" }}>Documentos</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {passportExpiresBeforeTrip && (
          <View style={{
            flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FEE2E2",
            borderRadius: 14, padding: 12, marginBottom: 16,
          }}>
            <Ionicons name="warning-outline" size={18} color="#DC2626" />
            <Text style={{ flex: 1, fontSize: 12, fontWeight: "700", color: "#991B1B" }}>
              Tu pasaporte caduca antes de que termine este viaje ({fmtDate(passport!.expiryDate)}). Revísalo antes de viajar.
            </Text>
          </View>
        )}

        <View style={{ backgroundColor: "white", borderRadius: 18, borderWidth: 1, borderColor: "#F3F4F6", overflow: "hidden", marginBottom: 20 }}>
          {userDocsLoading || tripDocsLoading ? (
            <ActivityIndicator color={colors.primary} style={{ margin: 20 }} />
          ) : (
            <>
              <ProfileDocRow
                emoji="🛂"
                title="Pasaporte"
                doc={passport}
                onPress={() => navigation.navigate("MyDocuments")}
              />
              <ProfileDocRow
                emoji="🪪"
                title="DNI / Carnet"
                doc={dni}
                isLast={!insurance && !insuranceModalOpen}
                onPress={() => navigation.navigate("MyDocuments")}
              />
              <InsuranceRow
                doc={insurance}
                onPress={() => setInsuranceModalOpen(true)}
              />
            </>
          )}
        </View>

        <Text style={{ fontSize: 12, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>
          Requisitos del destino
        </Text>

        <View style={{ backgroundColor: "white", borderRadius: 18, borderWidth: 1, borderColor: "#F3F4F6", padding: 16, marginBottom: 12 }}>
          {requirements.length > 0 ? (
            requirements.map((r) => (
              <View key={r.key} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
                <Text style={{ fontSize: 13, color: "#1F2937", fontWeight: "600" }}>{r.label}</Text>
              </View>
            ))
          ) : (
            <Text style={{ fontSize: 13, color: "#6B7280" }}>
              No tenemos información fiable sobre los requisitos para este destino.
            </Text>
          )}
        </View>

        <Text style={{ fontSize: 11, color: "#9CA3AF", lineHeight: 16 }}>
          {DESTINATION_REQUIREMENTS_DISCLAIMER}
        </Text>
      </ScrollView>

      {insuranceModalOpen && (
        <InsuranceFormModal
          doc={insurance}
          saving={isSaving}
          deleting={isDeleting}
          onClose={() => setInsuranceModalOpen(false)}
          onSave={async (input) => {
            await upsertDocument("travel_insurance", input);
            setInsuranceModalOpen(false);
          }}
          onDelete={async () => {
            await deleteDocument("travel_insurance");
            setInsuranceModalOpen(false);
          }}
        />
      )}
    </SafeAreaView>
  );
}

function ProfileDocRow({
  emoji,
  title,
  doc,
  isLast,
  onPress,
}: {
  emoji: string;
  title: string;
  doc: { expiryDate: string | null } | null;
  isLast?: boolean;
  onPress: () => void;
}) {
  const status = doc ? getDocumentStatus(doc.expiryDate) : null;
  const statusMeta = status ? STATUS_META[status] : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: isLast ? 0 : 1, borderBottomColor: "#F3F4F6",
      }}
    >
      <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
        <Text style={{ fontSize: 20 }}>{emoji}</Text>
      </View>
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: "#1F2937" }}>{title}</Text>
        <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }} numberOfLines={1}>
          {doc ? (doc.expiryDate ? `Caduca ${fmtDate(doc.expiryDate)}` : "Foto guardada · sin caducidad indicada") : "Falta añadir"}
        </Text>
      </View>
      {doc && statusMeta ? (
        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: statusMeta.bg }}>
          <Text style={{ fontSize: 10, fontWeight: "800", color: statusMeta.color }}>{statusMeta.label}</Text>
        </View>
      ) : (
        <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary }}>Ver</Text>
      )}
    </TouchableOpacity>
  );
}

function InsuranceRow({
  doc,
  onPress,
}: {
  doc: { provider: string | null; expiryDate: string | null } | null;
  onPress: () => void;
}) {
  if (!doc) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={{
          flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14,
          borderWidth: 1.5, borderColor: "#FCA5A5", borderStyle: "dashed", borderRadius: 14, margin: 10,
        }}
      >
        <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
          <Text style={{ fontSize: 20 }}>🛡️</Text>
        </View>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#1F2937" }}>Seguro de viaje</Text>
          <Text style={{ fontSize: 12, color: "#DC2626", fontWeight: "600", marginTop: 2 }}>Falta añadir</Text>
        </View>
        <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary }}>+ Añadir</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 }}
    >
      <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: "#ECFDF5", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
        <Text style={{ fontSize: 20 }}>🛡️</Text>
      </View>
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: "#1F2937" }}>Seguro de viaje</Text>
        <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }} numberOfLines={1}>
          {doc.provider || "Sin aseguradora indicada"}{doc.expiryDate ? ` · Caduca ${fmtDate(doc.expiryDate)}` : ""}
        </Text>
      </View>
      <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: "#DCFCE7" }}>
        <Text style={{ fontSize: 10, fontWeight: "800", color: "#16A34A" }}>Añadido</Text>
      </View>
    </TouchableOpacity>
  );
}

function InsuranceFormModal({
  doc,
  saving,
  deleting,
  onClose,
  onSave,
  onDelete,
}: {
  doc: { provider: string | null; referenceCode: string | null; expiryDate: string | null } | null;
  saving: boolean;
  deleting: boolean;
  onClose: () => void;
  onSave: (input: { provider?: string | null; referenceCode?: string | null; expiryDate?: string | null }) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [provider, setProvider] = useState(doc?.provider ?? "");
  const [referenceCode, setReferenceCode] = useState(doc?.referenceCode ?? "");
  const [expiryDate, setExpiryDate] = useState<Date | null>(doc?.expiryDate ? new Date(doc.expiryDate) : null);
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <Modal visible transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={{ backgroundColor: "white", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: "#0F172A" }}>Seguro de viaje</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 12, fontWeight: "700", color: "#9CA3AF", marginBottom: 6 }}>ASEGURADORA</Text>
          <TextInput
            value={provider}
            onChangeText={setProvider}
            placeholder="Ej: Mapfre, Allianz..."
            style={{ borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#0F172A", marginBottom: 16 }}
          />

          <Text style={{ fontSize: 12, fontWeight: "700", color: "#9CA3AF", marginBottom: 6 }}>Nº DE PÓLIZA (OPCIONAL)</Text>
          <TextInput
            value={referenceCode}
            onChangeText={setReferenceCode}
            placeholder="Ej: POL123456"
            autoCapitalize="characters"
            style={{ borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#0F172A", marginBottom: 16 }}
          />

          <Text style={{ fontSize: 12, fontWeight: "700", color: "#9CA3AF", marginBottom: 6 }}>CADUCA (OPCIONAL)</Text>
          <TouchableOpacity
            onPress={() => setPickerOpen(true)}
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 24 }}
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
            disabled={!provider.trim() || saving}
            onPress={() => onSave({
              provider: provider.trim() || null,
              referenceCode: referenceCode.trim() || null,
              expiryDate: expiryDate ? expiryDate.toISOString() : null,
            })}
            style={{ backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: "center", opacity: !provider.trim() || saving ? 0.5 : 1, marginBottom: doc ? 10 : 0 }}
          >
            {saving ? <ActivityIndicator color="white" /> : <Text style={{ color: "white", fontWeight: "800", fontSize: 14 }}>Guardar</Text>}
          </TouchableOpacity>

          {doc && (
            <TouchableOpacity disabled={deleting} onPress={onDelete} style={{ alignItems: "center", paddingVertical: 10, opacity: deleting ? 0.5 : 1 }}>
              {deleting ? <ActivityIndicator color="#DC2626" /> : <Text style={{ color: "#DC2626", fontWeight: "700", fontSize: 13 }}>Eliminar</Text>}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}
