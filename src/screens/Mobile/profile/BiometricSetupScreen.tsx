import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  isBiometricAvailable,
  isBiometricEnabled,
  setBiometricEnabled,
  authenticateWithBiometric,
} from "../../../hooks/useBiometric";
import { colors } from "../../../theme/theme";
import AppHeader from "../../../components/AppHeader";

export default function BiometricSetupScreen({ navigation }: any) {
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const avail = await isBiometricAvailable();
      const enab = await isBiometricEnabled();
      setAvailable(avail);
      setEnabled(enab);
      setLoading(false);
    })();
  }, []);

  const toggle = async (value: boolean) => {
    if (value) {
      const ok = await authenticateWithBiometric();
      if (!ok) {
        Alert.alert("Autenticación fallida", "No se pudo verificar tu identidad.");
        return;
      }
    }
    await setBiometricEnabled(value);
    setEnabled(value);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pb-3">
        <AppHeader
          title="Seguridad"
          showBack={true}
          showProfile={false}
          showDatePicker={false}
        />
      </View>

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View className="items-center py-8">
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 22,
              backgroundColor: colors.primary + "18",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name={Platform.OS === "ios" ? "finger-print" : "finger-print"}
              size={36}
              color={colors.primary}
            />
          </View>
          <Text
            style={{
              marginTop: 16,
              fontSize: 20,
              fontWeight: "700",
              color: "#111827",
              textAlign: "center",
            }}
          >
            Autenticación biométrica
          </Text>
          <Text
            style={{
              marginTop: 8,
              fontSize: 14,
              color: "#6B7280",
              textAlign: "center",
              lineHeight: 20,
              maxWidth: 280,
            }}
          >
            Usa Face ID, huella dactilar o PIN para acceder a Spendly de
            forma segura.
          </Text>
        </View>

        {/* Card */}
        <View
          style={{
            backgroundColor: "white",
            borderRadius: 18,
            padding: 16,
            borderWidth: 1,
            borderColor: "#E5E7EB",
          }}
        >
          {!available && (
            <View
              style={{
                backgroundColor: "#FEF3C7",
                borderRadius: 12,
                padding: 12,
                marginBottom: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Ionicons name="warning-outline" size={18} color="#D97706" />
              <Text style={{ fontSize: 13, color: "#92400E", flex: 1, lineHeight: 18 }}>
                Tu dispositivo no tiene biometría configurada. Actívala en
                Ajustes del sistema primero.
              </Text>
            </View>
          )}

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#111827" }}>
                Desbloqueo biométrico
              </Text>
              <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
                {enabled ? "Activado" : "Desactivado"}
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={toggle}
              disabled={!available || loading}
              trackColor={{ false: "#E5E7EB", true: colors.primary }}
              thumbColor="white"
            />
          </View>
        </View>

        <Text
          style={{
            fontSize: 12,
            color: "#9CA3AF",
            marginTop: 12,
            textAlign: "center",
            lineHeight: 16,
            paddingHorizontal: 16,
          }}
        >
          Al activarlo, cada vez que abras la app se solicitará confirmación
          biométrica.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
