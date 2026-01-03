import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../../theme/theme";
import api from "../../../api/api";

type Field = "name" | "email" | "password" | null;

export default function DesktopRegisterScreen({ navigation }: any) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const [focused, setFocused] = useState<Field>(null);

  const nameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passRef = useRef<TextInput>(null);

  const emailRegex = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/, []);
  const nameInvalid = useMemo(() => !!error && !name, [error, name]);
  const emailInvalid = useMemo(
    () => !!error && (!email || !emailRegex.test(email)),
    [error, email, emailRegex]
  );
  const passwordInvalid = useMemo(
    () => !!error && (!password || password.length < 6),
    [error, password]
  );

  const validateForm = () => {
    if (!name || !email || !password) {
      setError("Por favor completa todos los campos.");
      return false;
    }

    if (!emailRegex.test(email)) {
      setError("Por favor introduce un correo electrónico válido.");
      return false;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return false;
    }

    setError("");
    return true;
  };

  const handleRegister = async () => {
    if (loading) return;
    if (!validateForm()) return;

    try {
      setLoading(true);
      await api.post("/auth/register", { name, email, password });

      Alert.alert("Cuenta creada", "Tu cuenta ha sido creada exitosamente.");

      // ✅ coherente con DesktopNavigator: "Login"
      navigation.replace("Login");
    } catch (err: any) {
      console.error("❌ Error al registrar:", err.response?.data || err.message);
      setError(err.response?.data?.message || "No se pudo crear la cuenta.");
    } finally {
      setLoading(false);
    }
  };

  // Enter shortcut on web
  useEffect(() => {
    if (Platform.OS !== "web") return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (loading) return;
      if (e.key === "Enter") {
        e.preventDefault();
        handleRegister();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, name, email, password]);

  const borderColorFor = (field: Field, invalid: boolean) => {
    if (invalid) return "#FCA5A5";
    if (focused === field) return colors.primary;
    return "#D1D5DB";
  };

  const bg = colors.primary;
  const cardRadius = 14;

  const canSubmit =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 6 &&
    !loading;

  return (
    <View style={{ flex: 1, backgroundColor: bg, alignItems: "center", justifyContent: "center", padding: 22 }}>
      <View
        style={{
          width: "100%",
          maxWidth: 520,
          borderRadius: cardRadius,
          backgroundColor: "white",
          borderWidth: 1,
          borderColor: "rgba(0,0,0,0.06)",
          padding: 22,
          shadowColor: "#000",
          shadowOpacity: 0.12,
          shadowRadius: 22,
          shadowOffset: { width: 0, height: 14 },
          elevation: 10,
        }}
      >
        {/* Header (logo + marca) */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 18 }}>
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              backgroundColor: "rgba(0,0,0,0.03)",
              borderWidth: 1,
              borderColor: "#E5E7EB",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
              overflow: "hidden",
            }}
          >
            <Image
              source={require("../../../../assets/finex_logo.png")}
              style={{ width: 26, height: 26, resizeMode: "contain" }}
            />
          </View>

          <Text style={{ fontSize: 16, fontWeight: "900", color: "#111827" }}>
            Finexa
          </Text>
        </View>

        {/* Title */}
        <Text style={{ fontSize: 18, fontWeight: "900", color: "#111827", marginBottom: 6 }}>
          Crear cuenta
        </Text>
        <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 14 }}>
          Regístrate para empezar a controlar tus finanzas.
        </Text>

        {/* Error */}
        {error ? (
          <View
            style={{
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#FCA5A5",
              backgroundColor: "#FEF2F2",
              marginBottom: 14,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
              <Ionicons name="alert-circle-outline" size={18} color="#B91C1C" />
              <Text style={{ marginLeft: 8, color: "#B91C1C", fontSize: 12, fontWeight: "800", flex: 1 }}>
                {error}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Nombre */}
        <Text style={{ fontSize: 12, fontWeight: "800", color: "#111827", marginBottom: 6 }}>
          Nombre <Text style={{ color: "#DC2626" }}>*</Text>
        </Text>
        <View
          style={{
            borderWidth: 1,
            borderColor: borderColorFor("name", nameInvalid),
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: Platform.OS === "web" ? 10 : 8,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "white",
          }}
        >
          <TextInput
            ref={nameRef}
            value={name}
            onChangeText={setName}
            placeholder="Introduce tu nombre"
            placeholderTextColor="#9CA3AF"
            style={{ flex: 1, fontSize: 14, color: "#111827" }}
            onFocus={() => setFocused("name")}
            onBlur={() => setFocused(null)}
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus?.()}
          />
        </View>

        {/* Email */}
        <Text style={{ fontSize: 12, fontWeight: "800", color: "#111827", marginTop: 14, marginBottom: 6 }}>
          Email <Text style={{ color: "#DC2626" }}>*</Text>
        </Text>
        <View
          style={{
            borderWidth: 1,
            borderColor: borderColorFor("email", emailInvalid),
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: Platform.OS === "web" ? 10 : 8,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "white",
          }}
        >
          <TextInput
            ref={emailRef}
            value={email}
            onChangeText={setEmail}
            placeholder="Introduce tu correo"
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            autoCapitalize="none"
            style={{ flex: 1, fontSize: 14, color: "#111827" }}
            onFocus={() => setFocused("email")}
            onBlur={() => setFocused(null)}
            returnKeyType="next"
            onSubmitEditing={() => passRef.current?.focus?.()}
          />
        </View>

        {/* Password */}
        <Text style={{ fontSize: 12, fontWeight: "800", color: "#111827", marginTop: 14, marginBottom: 6 }}>
          Contraseña <Text style={{ color: "#DC2626" }}>*</Text>
        </Text>
        <View
          style={{
            borderWidth: 1,
            borderColor: borderColorFor("password", passwordInvalid),
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: Platform.OS === "web" ? 10 : 8,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "white",
          }}
        >
          <TextInput
            ref={passRef}
            value={password}
            onChangeText={setPassword}
            placeholder="Mínimo 6 caracteres"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            style={{ flex: 1, fontSize: 14, color: "#111827" }}
            onFocus={() => setFocused("password")}
            onBlur={() => setFocused(null)}
            returnKeyType="done"
            onSubmitEditing={handleRegister}
          />
        </View>

        <Text style={{ marginTop: 8, fontSize: 11, color: "#9CA3AF" }}>
          Mínimo 6 caracteres. Recomendado: mayúscula y símbolo.
        </Text>

        {/* CTA */}
        <TouchableOpacity
          onPress={handleRegister}
          disabled={!canSubmit}
          activeOpacity={0.9}
          style={{
            marginTop: 18,
            borderRadius: 10,
            paddingVertical: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: canSubmit ? colors.primary : "#E5E7EB",
          }}
        >
          {loading ? (
            <ActivityIndicator color={canSubmit ? "#fff" : "#111827"} />
          ) : (
            <Text style={{ fontSize: 13, fontWeight: "900", color: canSubmit ? "white" : "#9CA3AF" }}>
              Crear cuenta
            </Text>
          )}
        </TouchableOpacity>

        {/* Footer */}
        <View style={{ marginTop: 16, flexDirection: "row", justifyContent: "center" }}>
          <Text style={{ fontSize: 12, color: "#6B7280" }}>¿Ya tienes cuenta? </Text>
          <TouchableOpacity onPress={() => navigation.navigate("DesktopLogin")} activeOpacity={0.85}>
            <Text style={{ fontSize: 12, color: colors.primary, fontWeight: "900" }}>
              Inicia sesión
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={{ marginTop: 12, fontSize: 10, color: "#9CA3AF", textAlign: "center" }}>
          Al registrarte aceptas los términos y la política de privacidad.
        </Text>
      </View>
    </View>
  );
}
