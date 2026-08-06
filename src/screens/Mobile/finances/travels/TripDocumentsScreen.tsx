import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { colors } from "../../../../theme/theme";
import { useUserDocuments, getDocumentStatus, type DocumentStatus, type UserDocument, type UserDocumentType } from "../../../../hooks/useUserDocuments";
import { useTripDocuments, type TripDocument } from "../../../../hooks/useTripDocuments";
import { getTripDocTypeConfig } from "../../../../utils/tripDocumentTypes";
import { getPersonalDocTypeConfig } from "../../../../utils/personalDocumentTypes";
import { getDestinationInfo, type EntryRequirement, type RequirementStatus } from "../../../../utils/destinationInfo";
import DocumentFormModal from "../../../../components/DocumentFormModal";

const STATUS_META: Record<DocumentStatus, { label: string; color: string; bg: string }> = {
  "no-expiry": { label: "Sin caducidad indicada", color: "#6B7280", bg: "#F3F4F6" },
  valid: { label: "Vigente", color: "#16A34A", bg: "#DCFCE7" },
  "expiring-soon": { label: "Caduca pronto", color: "#D97706", bg: "#FEF3C7" },
  expired: { label: "Caducado", color: "#DC2626", bg: "#FEE2E2" },
};

const REQ_STATUS_META: Record<RequirementStatus, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  ok: { icon: "checkmark-circle", color: "#16A34A" },
  info: { icon: "information-circle", color: "#D97706" },
  required: { icon: "alert-circle", color: "#DC2626" },
};

/** Requisitos de entrada con un documento PERSONAL asociado (se gestionan en Mis documentos) */
const ACTIONABLE_REQ_TO_DOC_TYPE: Record<string, UserDocumentType> = {
  visa: "visa",
  vaccines: "vaccine",
};

type ActiveModal =
  | { kind: "trip"; doc: TripDocument | null }
  | { kind: "personal"; type: UserDocumentType; doc: UserDocument | null; presetCountry?: string; presetCountryLabel?: string };

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function flagEmoji(code: string) {
  const c = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return "🌍";
  return String.fromCodePoint(...[...c].map((ch) => 127397 + ch.charCodeAt(0)));
}

interface CountryStayParam {
  country: string;
  startDate?: string | null;
  endDate?: string | null;
}

export default function TripDocumentsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { tripId, destination, tripName, endDate, countryStays } = route.params || {};

  const {
    documentsByType: userDocsByType,
    isLoading: userDocsLoading,
    createDocument: createUserDocument,
    updateDocument: updateUserDocument,
    deleteDocument: deleteUserDocument,
    isSaving: userDocsSaving,
    isDeleting: userDocsDeleting,
  } = useUserDocuments();
  const {
    documentsByType: tripDocsByType,
    isLoading: tripDocsLoading,
    createDocument: createTripDocument,
    updateDocument: updateTripDocument,
    deleteDocument: deleteTripDocument,
    isSaving: tripDocsSaving,
    isDeleting: tripDocsDeleting,
  } = useTripDocuments(tripId);

  const [activeModal, setActiveModal] = useState<ActiveModal | null>(null);

  const passport = userDocsByType.get("passport")?.[0] ?? null;
  const dni = userDocsByType.get("dni")?.[0] ?? null;
  const insurance = tripDocsByType.get("travel_insurance")?.[0] ?? null;

  const tripEnd = endDate ? new Date(endDate) : null;
  const passportExpiresBeforeTrip =
    !!passport?.expiryDate && !!tripEnd && new Date(passport.expiryDate) < tripEnd;

  const stays: CountryStayParam[] = useMemo(() => {
    const fromStays: CountryStayParam[] = Array.isArray(countryStays)
      ? countryStays
          .map((s: any) => (typeof s === "string" ? { country: s } : s))
          .filter((s: any) => s?.country)
      : [];
    if (fromStays.length) return fromStays;
    return destination ? [{ country: destination }] : [];
  }, [countryStays, destination]);

  const closeModal = () => setActiveModal(null);

  const handleSave = async (input: Record<string, any>) => {
    if (activeModal?.kind === "trip") {
      if (activeModal.doc) await updateTripDocument(activeModal.doc.id, input);
      else await createTripDocument({ type: "travel_insurance", ...input });
    } else if (activeModal?.kind === "personal") {
      if (activeModal.doc) await updateUserDocument(activeModal.doc.id, input);
      else await createUserDocument({ type: activeModal.type, ...input });
    }
    closeModal();
  };

  const handleDelete = async () => {
    if (activeModal?.kind === "trip" && activeModal.doc) {
      await deleteTripDocument(activeModal.doc.id);
    } else if (activeModal?.kind === "personal" && activeModal.doc) {
      await deleteUserDocument(activeModal.doc.id);
    }
    closeModal();
  };

  const loading = userDocsLoading || tripDocsLoading;

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

        <Text style={{ fontSize: 12, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>
          Tus documentos
        </Text>

        <View style={{ backgroundColor: "white", borderRadius: 18, borderWidth: 1, borderColor: "#F3F4F6", overflow: "hidden", marginBottom: 10 }}>
          {loading ? (
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
                onPress={() => navigation.navigate("MyDocuments")}
              />
              <InsuranceRow doc={insurance} onPress={() => setActiveModal({ kind: "trip", doc: insurance })} />
            </>
          )}
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate("MyDocuments")}
          activeOpacity={0.7}
          style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 20 }}
        >
          <Ionicons name="person-outline" size={14} color={colors.primary} />
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary }}>
            Vacunas, tarjeta sanitaria y carnet de conducir se gestionan desde Mis documentos
          </Text>
        </TouchableOpacity>

        {stays.length > 0 && (
          <>
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>
              Por país del viaje
            </Text>

            {stays.map((stay) => {
              const info = getDestinationInfo(stay.country);
              const dateRange = joinText([fmtDate(stay.startDate ?? null), fmtDate(stay.endDate ?? null)], " – ");
              return (
                <View key={stay.country} style={{ backgroundColor: "white", borderRadius: 18, borderWidth: 1, borderColor: "#F3F4F6", padding: 14, marginBottom: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <Text style={{ fontSize: 16 }}>{flagEmoji(stay.country)}</Text>
                    <Text style={{ fontSize: 14, fontWeight: "800", color: "#0F172A" }}>{info?.name ?? stay.country}</Text>
                    {!!dateRange && <Text style={{ fontSize: 11, fontWeight: "600", color: "#94A3B8" }}>· {dateRange}</Text>}
                  </View>

                  {!info ? (
                    <Text style={{ fontSize: 12, color: "#94A3B8" }}>Sin información curada de este destino.</Text>
                  ) : (() => {
                    const pendingReqs = info.entryRequirements.filter((r) => r.status !== "ok");
                    if (pendingReqs.length === 0) {
                      return (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <Ionicons name="checkmark-circle" size={17} color="#16A34A" />
                          <Text style={{ fontSize: 12, fontWeight: "700", color: "#16A34A" }}>
                            No necesitas nada especial para entrar
                          </Text>
                        </View>
                      );
                    }
                    return pendingReqs.map((req) => {
                      const docType = ACTIONABLE_REQ_TO_DOC_TYPE[req.key];
                      const existingDoc = docType
                        ? userDocsByType.get(docType)?.find((d) => d.country === stay.country) ?? null
                        : null;
                      return (
                        <CountryRequirementRow
                          key={req.key}
                          req={req}
                          existingDoc={existingDoc}
                          onAdd={
                            docType
                              ? () =>
                                  setActiveModal({
                                    kind: "personal",
                                    type: docType,
                                    doc: existingDoc,
                                    presetCountry: stay.country,
                                    presetCountryLabel: info.name,
                                  })
                              : undefined
                          }
                        />
                      );
                    });
                  })()}
                </View>
              );
            })}

            <TouchableOpacity
              onPress={() => navigation.navigate("DestinationInfo", { tripId, destination, countryStays, tripName })}
              activeOpacity={0.7}
              style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 20 }}
            >
              <Ionicons name="globe-outline" size={15} color={colors.primary} />
              <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary }}>Ver requisitos de entrada del destino</Text>
            </TouchableOpacity>
          </>
        )}

        <Text style={{ fontSize: 11, color: "#9CA3AF", lineHeight: 16 }}>
          Información orientativa — verifica siempre los requisitos oficiales antes de viajar.
        </Text>
      </ScrollView>

      {activeModal && (
        <DocumentFormModal
          config={activeModal.kind === "trip" ? getTripDocTypeConfig("travel_insurance") : getPersonalDocTypeConfig(activeModal.type)}
          doc={activeModal.doc}
          presetCountry={activeModal.kind === "personal" ? activeModal.presetCountry : undefined}
          presetCountryLabel={activeModal.kind === "personal" ? activeModal.presetCountryLabel : undefined}
          saving={activeModal.kind === "trip" ? tripDocsSaving : userDocsSaving}
          deleting={activeModal.kind === "trip" ? tripDocsDeleting : userDocsDeleting}
          onClose={closeModal}
          onSave={handleSave}
          onDelete={activeModal.doc ? handleDelete : undefined}
        />
      )}
    </SafeAreaView>
  );
}

function joinText(parts: Array<string | null | undefined>, sep: string) {
  return parts.filter(Boolean).join(sep);
}

function ProfileDocRow({
  emoji,
  title,
  doc,
  onPress,
}: {
  emoji: string;
  title: string;
  doc: { expiryDate: string | null } | null;
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
        borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
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

function InsuranceRow({ doc, onPress }: { doc: TripDocument | null; onPress: () => void }) {
  const config = getTripDocTypeConfig("travel_insurance");

  if (!doc) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 }}
      >
        <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
          <Text style={{ fontSize: 20 }}>{config.emoji}</Text>
        </View>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#1F2937" }}>{config.title}</Text>
          <Text style={{ fontSize: 12, color: "#D97706", fontWeight: "600", marginTop: 2 }}>Recomendado</Text>
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
        <Text style={{ fontSize: 20 }}>{config.emoji}</Text>
      </View>
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: "#1F2937" }}>{config.title}</Text>
        <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }} numberOfLines={1}>{config.summary(doc)}</Text>
      </View>
      <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: "#DCFCE7" }}>
        <Text style={{ fontSize: 10, fontWeight: "800", color: "#16A34A" }}>Añadido</Text>
      </View>
    </TouchableOpacity>
  );
}

function CountryRequirementRow({
  req,
  existingDoc,
  onAdd,
}: {
  req: EntryRequirement;
  existingDoc: UserDocument | null;
  onAdd?: () => void;
}) {
  const meta = REQ_STATUS_META[req.status];
  const showAction = !!onAdd && (req.status !== "ok" || !!existingDoc);

  return (
    <TouchableOpacity
      disabled={!showAction}
      onPress={onAdd}
      activeOpacity={showAction ? 0.7 : 1}
      style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 }}
    >
      <Ionicons name={meta.icon} size={17} color={meta.color} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: "700", color: "#0F172A" }}>{req.label}</Text>
        <Text style={{ fontSize: 11, color: "#64748B", marginTop: 1 }} numberOfLines={2}>{req.value}</Text>
      </View>
      {showAction && (
        existingDoc ? (
          <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: "#DCFCE7" }}>
            <Text style={{ fontSize: 10, fontWeight: "800", color: "#16A34A" }}>Añadido</Text>
          </View>
        ) : (
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary }}>+ Añadir</Text>
        )
      )}
    </TouchableOpacity>
  );
}
