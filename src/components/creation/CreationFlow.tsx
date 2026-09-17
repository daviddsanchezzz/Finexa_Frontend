import React, { ReactNode, useEffect, useMemo, useRef, useState } from "react";
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
import { colors, radii } from "../../theme/theme";

export interface CreationStepRenderContext {
  showErrors: boolean;
}

export interface CreationStep {
  id: string;
  title: string;
  description?: string;
  isValid?: boolean;
  content: ReactNode | ((context: CreationStepRenderContext) => ReactNode);
}

interface CreationFlowProps {
  title: string;
  steps: CreationStep[];
  submitLabel: string;
  onSubmit: () => void | Promise<void>;
  onClose: () => void;
  isSubmitting?: boolean;
  submitError?: string | null;
}

export function CreationProgress({ current, total }: { current: number; total: number }) {
  if (total <= 1) return null;

  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
      <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8", marginBottom: 6 }}>
        Paso {current} de {total}
      </Text>
      <View style={{ height: 3, borderRadius: 999, backgroundColor: "#E8EDF5", overflow: "hidden" }}>
        <View
          style={{
            width: `${(current / total) * 100}%`,
            height: "100%",
            borderRadius: 999,
            backgroundColor: colors.primary,
          }}
        />
      </View>
    </View>
  );
}

export function CreationFooter({
  label,
  loading,
  enabled,
  onPress,
  disabled = false,
}: {
  label: string;
  loading?: boolean;
  enabled: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <View
      style={{
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: Platform.OS === "ios" ? 8 : 10,
        borderTopWidth: 1,
        borderTopColor: "#EEF1F5",
        backgroundColor: colors.background,
      }}
    >
      <TouchableOpacity
        onPress={onPress}
        disabled={loading || disabled}
        activeOpacity={0.82}
        accessibilityRole="button"
        accessibilityState={{ disabled: !enabled || !!loading, busy: !!loading }}
        style={{
          minHeight: 44,
          borderRadius: radii.input,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: enabled ? colors.primary : "#E2E8F0",
        }}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={{ fontSize: 15, fontWeight: "800", color: enabled ? "white" : "#94A3B8" }}>
            {label}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function CreationFlow({
  title,
  steps,
  submitLabel,
  onSubmit,
  onClose,
  isSubmitting = false,
  submitError,
}: CreationFlowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [attemptedStepIds, setAttemptedStepIds] = useState<Record<string, boolean>>({});
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setCurrentIndex((index) => Math.min(index, Math.max(steps.length - 1, 0)));
  }, [steps.length]);

  const step = steps[currentIndex];
  const isLastStep = currentIndex === steps.length - 1;
  const isStepValid = step?.isValid !== false;
  const buttonLabel = isLastStep ? submitLabel : "Continuar";
  const content = useMemo(() => {
    if (!step) return null;
    return typeof step.content === "function"
      ? step.content({ showErrors: !!attemptedStepIds[step.id] })
      : step.content;
  }, [attemptedStepIds, step]);

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex((index) => index - 1);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      return;
    }
    onClose();
  };

  const handlePrimary = async () => {
    if (!step || !isStepValid) {
      if (step) setAttemptedStepIds((current) => ({ ...current, [step.id]: true }));
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    if (!isLastStep) {
      setCurrentIndex((index) => index + 1);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      return;
    }

    await onSubmit();
  };

  if (!step) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          minHeight: 52,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 14,
        }}
      >
        <TouchableOpacity
          onPress={handleBack}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={currentIndex > 0 ? "Volver al paso anterior" : "Cerrar"}
          style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name={currentIndex > 0 ? "chevron-back" : "close"} size={26} color={colors.ink} />
        </TouchableOpacity>
        <Text
          numberOfLines={1}
          style={{ flex: 1, textAlign: "center", fontSize: 18, fontWeight: "800", color: colors.ink }}
        >
          {title}
        </Text>
        <View style={{ width: 42 }} />
      </View>

      <CreationProgress current={currentIndex + 1} total={steps.length} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 4 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 44 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        >
          <Text style={{ fontSize: 21, lineHeight: 27, fontWeight: "900", color: colors.ink }}>{step.title}</Text>
          {step.description ? (
            <Text style={{ fontSize: 13, lineHeight: 18, fontWeight: "500", color: "#64748B", marginTop: 4 }}>
              {step.description}
            </Text>
          ) : null}
          <View style={{ marginTop: 16 }}>{content}</View>
          {submitError ? (
            <View style={{ marginTop: 16, padding: 12, borderRadius: 12, backgroundColor: "#FEF2F2" }}>
              <Text style={{ color: colors.error, fontSize: 13, lineHeight: 18, fontWeight: "600" }}>{submitError}</Text>
            </View>
          ) : null}
        </ScrollView>

        <CreationFooter
          label={buttonLabel}
          loading={isSubmitting}
          enabled={isStepValid && !isSubmitting}
          onPress={handlePrimary}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
