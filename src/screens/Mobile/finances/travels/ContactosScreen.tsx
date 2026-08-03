import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Modal, Pressable, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { colors } from "../../../../theme/theme";
import { useTripContacts } from "../../../../hooks/useTripContacts";
import { getEmergencyNumber } from "../../../../utils/emergencyNumbers";

interface AccommodationDetails {
  name?: string | null;
  phone?: string | null;
}

interface TripPlanItem {
  id: number;
  type: string;
  title: string;
  accommodationDetails?: AccommodationDetails | null;
}

function callNumber(phone: string) {
  Linking.openURL(`tel:${phone.replace(/\s/g, "")}`);
}

export default function ContactosScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { tripId, destination, planItems = [] } = route.params || {};

  const { contacts, isLoading, createContact, deleteContact, isSaving } = useTripContacts(tripId);
  const [addOpen, setAddOpen] = useState(false);

  const emergencyNumber = getEmergencyNumber(destination);

  const accommodationsWithPhone = useMemo(
    () => (planItems as TripPlanItem[]).filter((i) => i.type === "accommodation" && i.accommodationDetails?.phone),
    [planItems]
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, gap: 8 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "900", color: "#0F172A" }}>Contactos</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <SectionTitle>Contactos de emergencia</SectionTitle>
        <View style={{ backgroundColor: "white", borderRadius: 18, borderWidth: 1, borderColor: "#F3F4F6", overflow: "hidden", marginBottom: 20 }}>
          {emergencyNumber && (
            <ContactRow
              emoji="🚨"
              title={`Emergencias`}
              subtitle="Ambulancia · policía · bomberos"
              action={emergencyNumber}
              onPress={() => callNumber(emergencyNumber)}
            />
          )}
          {accommodationsWithPhone.map((item, i) => (
            <ContactRow
              key={item.id}
              emoji="🏨"
              title={item.accommodationDetails?.name || item.title}
              subtitle="Recepción del alojamiento"
              action="Llamar"
              isLast={i === accommodationsWithPhone.length - 1}
              onPress={() => callNumber(item.accommodationDetails!.phone!)}
            />
          ))}
          {!emergencyNumber && accommodationsWithPhone.length === 0 && (
            <Text style={{ fontSize: 12, color: "#9CA3AF", padding: 16 }}>
              No hay contactos automáticos disponibles para este viaje.
            </Text>
          )}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <SectionTitle noMargin>Tus contactos</SectionTitle>
          <TouchableOpacity onPress={() => setAddOpen(true)}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary }}>+ Añadir</Text>
          </TouchableOpacity>
        </View>

        <View style={{ backgroundColor: "white", borderRadius: 18, borderWidth: 1, borderColor: "#F3F4F6", overflow: "hidden" }}>
          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ margin: 20 }} />
          ) : contacts.length === 0 ? (
            <Text style={{ fontSize: 12, color: "#9CA3AF", padding: 16 }}>
              Añade contactos personales para este viaje (compañeros, familiares...).
            </Text>
          ) : (
            contacts.map((c, i) => (
              <ContactRow
                key={c.id}
                emoji="👤"
                title={c.name}
                subtitle={c.notes || undefined}
                action="Llamar"
                isLast={i === contacts.length - 1}
                onPress={() => callNumber(c.phone)}
                onLongPress={() => deleteContact(c.id)}
              />
            ))
          )}
        </View>
      </ScrollView>

      {addOpen && (
        <AddContactModal
          saving={isSaving}
          onClose={() => setAddOpen(false)}
          onSave={async (input) => {
            await createContact(input);
            setAddOpen(false);
          }}
        />
      )}
    </SafeAreaView>
  );
}

function SectionTitle({ children, noMargin }: { children: React.ReactNode; noMargin?: boolean }) {
  return (
    <Text style={{ fontSize: 12, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: noMargin ? 0 : 10 }}>
      {children}
    </Text>
  );
}

function ContactRow({
  emoji,
  title,
  subtitle,
  action,
  isLast,
  onPress,
  onLongPress,
}: {
  emoji: string;
  title: string;
  subtitle?: string;
  action: string;
  isLast?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
      style={{
        flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: isLast ? 0 : 1, borderBottomColor: "#F3F4F6",
      }}
    >
      <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
        <Text style={{ fontSize: 18 }}>{emoji}</Text>
      </View>
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: "#1F2937" }}>{title}</Text>
        {!!subtitle && <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{subtitle}</Text>}
      </View>
      <Text style={{ fontSize: 13, fontWeight: "800", color: colors.primary }}>{action}</Text>
    </TouchableOpacity>
  );
}

function AddContactModal({
  saving,
  onClose,
  onSave,
}: {
  saving: boolean;
  onClose: () => void;
  onSave: (input: { name: string; phone: string; notes?: string }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const canSave = name.trim().length > 0 && phone.trim().length > 0;

  return (
    <Modal visible transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={{ backgroundColor: "white", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: "#0F172A" }}>Añadir contacto</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 12, fontWeight: "700", color: "#9CA3AF", marginBottom: 6 }}>NOMBRE</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ej: María (compañera de viaje)"
            style={{ borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#0F172A", marginBottom: 16 }}
          />

          <Text style={{ fontSize: 12, fontWeight: "700", color: "#9CA3AF", marginBottom: 6 }}>TELÉFONO</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="+34 600 000 000"
            keyboardType="phone-pad"
            style={{ borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#0F172A", marginBottom: 16 }}
          />

          <Text style={{ fontSize: 12, fontWeight: "700", color: "#9CA3AF", marginBottom: 6 }}>NOTA (OPCIONAL)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Ej: Se aloja en el mismo hotel"
            style={{ borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#0F172A", marginBottom: 24 }}
          />

          <TouchableOpacity
            disabled={!canSave || saving}
            onPress={() => onSave({ name: name.trim(), phone: phone.trim(), notes: notes.trim() || undefined })}
            style={{ backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: "center", opacity: !canSave || saving ? 0.5 : 1 }}
          >
            {saving ? <ActivityIndicator color="white" /> : <Text style={{ color: "white", fontWeight: "800", fontSize: 14 }}>Guardar</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
