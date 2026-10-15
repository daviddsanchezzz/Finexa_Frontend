import React, { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";
import { radii } from "../../theme/theme";
import IconCircleButton from "../IconCircleButton";
import { useUpdateFinancialProfile } from "../../hooks/useFinancialHealth";
import {
  EMPTY_PROFILE_FORM,
  INCOME_TYPE_OPTIONS,
  RISK_LABELS,
  parseProfileForm,
  profileToForm,
  type ProfileFormState,
} from "../../utils/financialProfileForm";
import type { FinancialProfile } from "../../types/financialHealth";

interface Props {
  visible: boolean;
  onClose: () => void;
  profile: Partial<FinancialProfile> | null;
}

function Field({ label, hint, value, onChangeText, placeholder, error, keyboardType = "number-pad" }: {
  label: string; hint?: string; value: string; onChangeText: (v: string) => void; placeholder?: string; error?: string; keyboardType?: "number-pad" | "decimal-pad";
}) {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text }}>{label}</Text>
      {hint ? <Text style={{ fontSize: 11.5, color: colors.textSecondary, marginTop: 1, marginBottom: 4 }}>{hint}</Text> : <View style={{ height: 4 }} />}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        style={{
          borderWidth: 1,
          borderColor: error ? "#DC2626" : colors.border,
          borderRadius: radii.input,
          paddingHorizontal: 12,
          paddingVertical: 9,
          fontSize: 14,
          color: colors.text,
          backgroundColor: colors.background,
        }}
      />
      {error ? <Text style={{ fontSize: 11.5, color: "#DC2626", marginTop: 3 }}>{error}</Text> : null}
    </View>
  );
}

function Chips<T extends string | number>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T | null; onChange: (v: T | null) => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <TouchableOpacity
            key={String(o.value)}
            // Volver a pulsar la opción activa la deselecciona (= "sin indicar").
            onPress={() => onChange(active ? null : o.value)}
            activeOpacity={0.8}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: radii.full,
              borderWidth: 1,
              borderColor: active ? colors.primary : colors.border,
              backgroundColor: active ? colors.primary + "18" : colors.background,
            }}
          >
            <Text style={{ fontSize: 12.5, fontWeight: active ? "700" : "500", color: active ? colors.primary : colors.textSecondary }}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function FinancialProfileModal({ visible, onClose, profile }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const save = useUpdateFinancialProfile();
  const [form, setForm] = useState<ProfileFormState>(EMPTY_PROFILE_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileFormState, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  // Cada vez que se abre, parte del perfil guardado.
  useEffect(() => {
    if (visible) {
      setForm(profileToForm(profile));
      setErrors({});
      setServerError(null);
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const submit = () => {
    const { body, errors: errs } = parseProfileForm(form);
    setErrors(errs);
    setServerError(null);
    if (Object.keys(errs).length) return;
    save.mutate(body, {
      onSuccess: onClose,
      onError: () => setServerError("No se pudo guardar. Inténtalo de nuevo."),
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <TouchableOpacity activeOpacity={1} onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" }}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={{ maxHeight: "92%" }}>
            <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 18, paddingBottom: Math.max(insets.bottom, 16) + 8 }}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ fontSize: 19, fontWeight: "800", color: colors.text }}>Ajusta a tu situación</Text>
                  <Text style={{ fontSize: 12.5, color: colors.textSecondary, marginTop: 3, lineHeight: 17 }}>
                    Todo es opcional. Cuanto más completes, menos suposiciones usa la nota. Se guarda solo en tu cuenta.
                  </Text>
                </View>
                <IconCircleButton icon="close" onPress={onClose} size={30} iconSize={16} />
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flexGrow: 0 }}>
                <Field label="Año de nacimiento" hint="Define tu horizonte de inversión." value={form.birthYear} onChangeText={(v) => set("birthYear", v)} placeholder="p. ej. 1998" error={errors.birthYear} />

                <View style={{ marginBottom: 14 }}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text }}>Tipo de ingreso</Text>
                  <Text style={{ fontSize: 11.5, color: colors.textSecondary, marginTop: 1, marginBottom: 6 }}>Decide cuántos meses de colchón son razonables.</Text>
                  <Chips options={INCOME_TYPE_OPTIONS} value={form.incomeType} onChange={(v) => set("incomeType", v)} />
                </View>

                <Field label="Personas a tu cargo" value={form.dependents} onChangeText={(v) => set("dependents", v)} placeholder="0" error={errors.dependents} />

                <View style={{ marginBottom: 14 }}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text }}>Si tu cartera cayera un 30 %…</Text>
                  <Text style={{ fontSize: 11.5, color: colors.textSecondary, marginTop: 1, marginBottom: 6 }}>Marca el perfil de riesgo con el que te sientes cómodo; limita el peso razonable de la cripto.</Text>
                  <Chips options={RISK_LABELS.map((label, i) => ({ value: i + 1, label }))} value={form.riskTolerance} onChange={(v) => set("riskTolerance", v)} />
                </View>

                <Field label="Meses de colchón que quieres tener" hint="Vacío = automático según tu tipo de ingreso." value={form.emergencyMonthsTarget} onChangeText={(v) => set("emergencyMonthsTarget", v)} placeholder="Automático" error={errors.emergencyMonthsTarget} />
                <Field label="Edad a la que quieres ser independiente" hint="Con ella se mide si tu ritmo es suficiente." value={form.fiTargetAge} onChangeText={(v) => set("fiTargetAge", v)} placeholder="p. ej. 50" error={errors.fiTargetAge} />
                <Field label="Objetivo: veces tu gasto anual" hint="Vacío = 25 (la regla del 4 %)." value={form.fiTargetMultiple} onChangeText={(v) => set("fiTargetMultiple", v)} placeholder="25" error={errors.fiTargetMultiple} />
                <Field label="Rentabilidad real anual esperada (%)" hint="Descontada la inflación. Vacío = 4 %." value={form.expectedRealReturnPct} onChangeText={(v) => set("expectedRealReturnPct", v)} placeholder="4" keyboardType="decimal-pad" error={errors.expectedRealReturnPct} />
              </ScrollView>

              {serverError ? <Text style={{ fontSize: 12, color: "#DC2626", marginTop: 8 }}>{serverError}</Text> : null}

              <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                <TouchableOpacity onPress={() => { setForm(EMPTY_PROFILE_FORM); setErrors({}); }} activeOpacity={0.8} style={{ paddingVertical: 12, paddingHorizontal: 16, borderRadius: radii.input, borderWidth: 1, borderColor: colors.border }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: colors.textSecondary }}>Vaciar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={submit} disabled={save.isPending} activeOpacity={0.85} style={{ flex: 1, paddingVertical: 12, borderRadius: radii.input, backgroundColor: colors.primary, alignItems: "center", opacity: save.isPending ? 0.7 : 1 }}>
                  {save.isPending ? <ActivityIndicator color="white" /> : <Text style={{ fontSize: 14, fontWeight: "700", color: "white" }}>Guardar</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}
