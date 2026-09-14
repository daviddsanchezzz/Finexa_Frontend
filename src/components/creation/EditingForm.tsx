import React, { ReactNode, useRef } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/theme";
import { CreationFooter } from "./CreationFlow";

interface EditingFormProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  onSubmit: () => void | Promise<void>;
  submitLabel?: string;
  isLoading?: boolean;
  isSubmitting?: boolean;
  isValid?: boolean;
  submitError?: string | null;
}

export function EditingActionRow({
  label,
  onPress,
  destructive = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.65}
      accessibilityRole="button"
      style={{
        minHeight: 50,
        flexDirection: "row",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: "#E8EDF3",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text style={{ flex: 1, fontSize: 14, fontWeight: "700", color: destructive ? colors.error : colors.ink }}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={17} color={destructive ? "#FCA5A5" : "#CBD5E1"} />
    </TouchableOpacity>
  );
}

export default function EditingForm({
  title,
  children,
  onClose,
  onSubmit,
  submitLabel = "Guardar cambios",
  isLoading = false,
  isSubmitting = false,
  isValid = true,
  submitError,
}: EditingFormProps) {
  const scrollRef = useRef<ScrollView>(null);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ minHeight: 58, flexDirection: "row", alignItems: "center", paddingHorizontal: 14 }}>
        <TouchableOpacity
          onPress={onClose}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </TouchableOpacity>
        <Text
          numberOfLines={1}
          style={{ flex: 1, textAlign: "center", fontSize: 18, fontWeight: "800", color: colors.ink }}
        >
          {title}
        </Text>
        <View style={{ width: 42 }} />
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#94A3B8", marginTop: 10 }}>Cargando…</Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 4 : 0}
        >
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 44 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          >
            {children}
            {submitError ? (
              <View style={{ marginTop: 16, padding: 12, borderRadius: 12, backgroundColor: "#FEF2F2" }}>
                <Text style={{ color: colors.error, fontSize: 13, lineHeight: 18, fontWeight: "600" }}>{submitError}</Text>
              </View>
            ) : null}
          </ScrollView>

          <CreationFooter
            label={submitLabel}
            loading={isSubmitting}
            enabled={isValid && !isSubmitting}
            onPress={() => {
              if (!isValid) {
                scrollRef.current?.scrollTo({ y: 0, animated: true });
                return;
              }
              void onSubmit();
            }}
          />
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
