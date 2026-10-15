import React, { useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../../../components/AppHeader";
import { useTheme } from "../../../context/ThemeContext";
import { radii } from "../../../theme/theme";
import { useFinancialHealth } from "../../../hooks/useFinancialHealth";
import HealthScoreRing from "../../../components/financialHealth/HealthScoreRing";
import FinancialProfileModal from "../../../components/financialHealth/FinancialProfileModal";
import {
  FiCard,
  FocusCard,
  HistoryChart,
  InsightCard,
  MetricCard,
  PillarsRow,
  SectionTitle,
  SimulatorCard,
} from "../../../components/financialHealth/HealthSections";
import { CONFIDENCE_LABEL, GRADE_LABEL, gradeColor } from "../../../utils/financialHealthFormat";

export default function FinancialHealthScreen() {
  const { colors } = useTheme();
  const q = useFinancialHealth();
  const [profileOpen, setProfileOpen] = useState(false);
  const r = q.data;

  const header = (
    <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
      <AppHeader title="Salud financiera" showBack showProfile={false} showDatePicker={false} />
    </View>
  );

  if (q.isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        {header}
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (q.isError || !r) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        {header}
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <Ionicons name="cloud-offline-outline" size={30} color={colors.textMuted} />
          <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: "center", marginTop: 10 }}>No se pudo cargar tu salud financiera.</Text>
          <TouchableOpacity onPress={() => q.refetch()} activeOpacity={0.85} style={{ marginTop: 14, paddingHorizontal: 20, paddingVertical: 10, borderRadius: radii.input, backgroundColor: colors.primary }}>
            <Text style={{ color: "white", fontWeight: "700" }}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const color = gradeColor(r.grade);
  const card = { backgroundColor: colors.surface, borderRadius: radii.card, borderWidth: 1, borderColor: colors.border, padding: 14 } as const;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {header}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => q.refetch()} tintColor={colors.primary} />}
      >
        {/* Nota */}
        <View style={[card, { alignItems: "center", paddingVertical: 20 }]}>
          <HealthScoreRing score={r.score} color={color} size={120} stroke={11} fontSize={38} />
          {r.grade ? <Text style={{ fontSize: 20, fontWeight: "800", color, marginTop: 12 }}>{GRADE_LABEL[r.grade]}</Text> : null}
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4, textAlign: "center" }}>
            {r.score == null
              ? "Registra al menos 2 meses de movimientos para calcularla."
              : `${CONFIDENCE_LABEL[r.confidence]} · ${r.monthsUsed} ${r.monthsUsed === 1 ? "mes" : "meses"} de datos`}
          </Text>
          <View style={{ alignSelf: "stretch", marginTop: 18 }}><PillarsRow pillars={r.pillars} /></View>
        </View>

        {r.score != null && (
          <>
            <SectionTitle>Qué hacer ahora</SectionTitle>
            <FocusCard focus={r.focus} />
            {r.insights.length > 0 && <View style={{ marginTop: 10 }}>{r.insights.map((i) => <InsightCard key={i.id} insight={i} />)}</View>}

            <SectionTitle hint="Cuánto te falta para vivir de tu capital y qué lo acerca más.">Camino a la independencia financiera</SectionTitle>
            <FiCard fi={r.fi} levers={r.levers} />

            <SectionTitle hint="Toca una métrica para ver su peso y las suposiciones.">Detalle de la nota</SectionTitle>
            {r.metrics.map((m) => <MetricCard key={m.key} metric={m} />)}

            <SectionTitle>Tu evolución</SectionTitle>
            <HistoryChart history={r.history} />

            <SectionTitle hint="Pruébalo antes de decidir.">¿Y si…?</SectionTitle>
            <SimulatorCard />
          </>
        )}

        {/* Perfil y suposiciones */}
        <SectionTitle>Ajusta a tu situación</SectionTitle>
        <View style={card}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text }}>Tu perfil</Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>{Math.round(r.profile.completeness * 100)} % completo</Text>
          </View>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: "hidden" }}>
            <View style={{ width: `${Math.round(r.profile.completeness * 100)}%`, height: 6, backgroundColor: colors.primary }} />
          </View>
          {r.assumptions.length > 0 && (
            <View style={{ marginTop: 10 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: colors.textSecondary, marginBottom: 3 }}>Ahora mismo la nota supone:</Text>
              {r.assumptions.map((a, i) => <Text key={i} style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 17, marginTop: 2 }}>• {a}</Text>)}
            </View>
          )}
          <TouchableOpacity onPress={() => setProfileOpen(true)} activeOpacity={0.85} style={{ marginTop: 12, paddingVertical: 11, borderRadius: radii.input, backgroundColor: colors.primary, alignItems: "center" }}>
            <Text style={{ color: "white", fontWeight: "700", fontSize: 14 }}>{r.profile.completeness > 0 ? "Editar mi perfil" : "Completar mi perfil"}</Text>
          </TouchableOpacity>
        </View>

        <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 18, lineHeight: 16, textAlign: "center" }}>
          Es una guía orientativa calculada con tus datos y reglas generales. No es asesoramiento financiero ni fiscal.
        </Text>
      </ScrollView>

      <FinancialProfileModal visible={profileOpen} onClose={() => setProfileOpen(false)} profile={r.profile} />
    </SafeAreaView>
  );
}
