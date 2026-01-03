import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Platform,
  Modal,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../../theme/theme";
import { storage } from "../../../utils/storage";
import api from "../../../api/api";
import { useAuth } from "../../../context/AuthContext";

type Field = "email" | "password" | "forgotEmail" | null;

export default function DesktopLoginScreen({ navigation }: any) {
  const { login } = useAuth();

  // Login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const [focused, setFocused] = useState<Field>(null);

  const [showPassword, setShowPassword] = useState(false);

  // Forgot modal
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);
  const [forgotErr, setForgotErr] = useState<string | null>(null);

  const emailRef = useRef<TextInput>(null);
  const passRef = useRef<TextInput>(null);
  const forgotEmailRef = useRef<TextInput>(null);

  const emailRegex = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/, []);
  const emailInvalid = useMemo(
    () => !!error && (!email || !emailRegex.test(email)),
    [error, email, emailRegex]
  );
  const passwordInvalid = useMemo(() => !!error && !password, [error, password]);

  const validateForm = () => {
    if (!email || !password) {
      setError("Por favor completa todos los campos.");
      return false;
    }
    if (!emailRegex.test(email)) {
      setError("Por favor introduce un correo electrónico válido.");
      return false;
    }
    setError("");
    return true;
  };

  const handleLogin = async () => {
    if (loading) return;
    if (!validateForm()) return;

    try {
      setLoading(true);
      const res = await api.post("/auth/login", { email, password });
      const { access_token, refresh_token } = res.data;

      await storage.setItem("access_token", access_token);
      await storage.setItem("refresh_token", refresh_token);

      await login(email, password);

      navigation.replace("DesktopShell");
    } catch (err: any) {
      console.error("❌ Error al iniciar sesión:", err.response?.data || err.message);
      setError(err.response?.data?.message || "Credenciales incorrectas.");
    } finally {
      setLoading(false);
    }
  };

  // Enter shortcut on web
  useEffect(() => {
    if (Platform.OS !== "web") return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (forgotOpen || loading) return;
      if (e.key === "Enter") {
        e.preventDefault();
        handleLogin();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forgotOpen, loading, email, password]);

  const openForgot = () => {
    setForgotEmail(email || "");
    setForgotErr(null);
    setForgotMsg(null);
    setForgotOpen(true);
    setTimeout(() => forgotEmailRef.current?.focus?.(), 50);
  };

  const closeForgot = () => {
    setForgotOpen(false);
    setForgotLoading(false);
    setForgotErr(null);
    setForgotMsg(null);
  };

  const handleForgot = async () => {
    if (forgotLoading) return;

    const candidate = (forgotEmail || "").trim();
    if (!candidate) {
      setForgotErr("Introduce un correo.");
      setForgotMsg(null);
      return;
    }
    if (!emailRegex.test(candidate)) {
      setForgotErr("El correo no parece válido.");
      setForgotMsg(null);
      return;
    }

    try {
      setForgotLoading(true);
      setForgotErr(null);

      // Ajusta si tu backend usa otro endpoint
      await api.post("/auth/forgot-password", { email: candidate });

      setForgotMsg("Si el correo existe, recibirás instrucciones para restablecer la contraseña.");
    } catch (err: any) {
      console.error("❌ Forgot password:", err.response?.data || err.message);
      setForgotErr(err.response?.data?.message || "No se pudo iniciar la recuperación. Inténtalo de nuevo.");
      setForgotMsg(null);
    } finally {
      setForgotLoading(false);
    }
  };

  const borderColorFor = (field: Field, invalid: boolean) => {
    if (invalid) return "#FCA5A5";
    if (focused === field) return colors.primary;
    return "#D1D5DB";
  };

  // Estilo tipo “login corporate” (como la captura)
  const bg = colors.primary; // fondo sólido con tu color
  const cardRadius = 14;

  const canSubmit = email.length > 0 && password.length > 0 && !loading;

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
        <Text style={{ fontSize: 18, fontWeight: "900", color: "#111827", marginBottom: 14 }}>
          Iniciar sesión
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

        {/* Email label */}
        <Text style={{ fontSize: 12, fontWeight: "800", color: "#111827", marginBottom: 6 }}>
          Email <Text style={{ color: "#DC2626" }}>*</Text>
        </Text>

        {/* Email input */}
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

        {/* Password label */}
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
    placeholder="Introduce tu contraseña"
    placeholderTextColor="#9CA3AF"
    secureTextEntry={!showPassword}
    style={{ flex: 1, fontSize: 14, color: "#111827" }}
    onFocus={() => setFocused("password")}
    onBlur={() => setFocused(null)}
    returnKeyType="done"
    onSubmitEditing={handleLogin}
  />

  <TouchableOpacity
    activeOpacity={0.8}
    onPress={() => setShowPassword((v) => !v)}
    style={{
      paddingLeft: 10,
      paddingVertical: 4,
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <Ionicons
      name={showPassword ? "eye-off-outline" : "eye-outline"}
      size={18}
      color="#9CA3AF"
    />
  </TouchableOpacity>
</View>


        {/* Forgot */}
        <TouchableOpacity onPress={openForgot} activeOpacity={0.85} style={{ marginTop: 10 }}>
          <Text style={{ fontSize: 12, color: colors.primary, fontWeight: "800" }}>
            ¿Has olvidado la contraseña?
          </Text>
        </TouchableOpacity>

        {/* CTA */}
        <TouchableOpacity
          onPress={handleLogin}
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
              Iniciar sesión
            </Text>
          )}
        </TouchableOpacity>

        {/* Footer (optional) */}
        <View style={{ marginTop: 16, flexDirection: "row", justifyContent: "center" }}>
          <Text style={{ fontSize: 12, color: "#6B7280" }}>¿No tienes cuenta? </Text>
          <TouchableOpacity onPress={() => navigation.navigate("DesktopRegister")} activeOpacity={0.85}>
            <Text style={{ fontSize: 12, color: colors.primary, fontWeight: "900" }}>Crear cuenta</Text>
          </TouchableOpacity>
        </View>
      </View>

{/* Forgot password modal (refinado) */}
<Modal
  transparent
  animationType="fade"
  visible={forgotOpen}
  onRequestClose={closeForgot}
>
  {/* Backdrop */}
  <Pressable
    onPress={closeForgot}
    style={{
      flex: 1,
      backgroundColor: "rgba(15, 23, 42, 0.55)",
      alignItems: "center",
      justifyContent: "center",
      padding: 18,
    }}
  >
    {/* Card (stop propagation) */}
    <Pressable
      onPress={() => {}}
      style={{
        width: "100%",
        maxWidth: 520,
        borderRadius: 16,
        backgroundColor: "white",
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.08)",
        padding: 18,
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: 28,
        shadowOffset: { width: 0, height: 16 },
        elevation: 12,
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 14,
              backgroundColor: "rgba(0,0,0,0.04)",
              borderWidth: 1,
              borderColor: "#E5E7EB",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <Ionicons name="key-outline" size={18} color="#111827" />
          </View>

          <View>
            <Text style={{ fontSize: 14, fontWeight: "900", color: "#111827" }}>
              Recuperar contraseña
            </Text>
            <Text style={{ marginTop: 2, color: "#6B7280", fontSize: 12, lineHeight: 16 }}>
              Te enviaremos un correo con instrucciones.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={closeForgot}
          activeOpacity={0.85}
          style={{
            width: 34,
            height: 34,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: "#E5E7EB",
            backgroundColor: "white",
          }}
        >
          <Ionicons name="close" size={18} color="#111827" />
        </TouchableOpacity>
      </View>

      {/* Feedback */}
      {forgotMsg ? (
        <View
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "rgba(34,197,94,0.35)",
            backgroundColor: "rgba(34,197,94,0.08)",
          }}
        >
          <Text style={{ color: "#166534", fontSize: 12, fontWeight: "800" }}>
            {forgotMsg}
          </Text>
        </View>
      ) : null}

      {forgotErr ? (
        <View
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "rgba(239,68,68,0.35)",
            backgroundColor: "rgba(239,68,68,0.08)",
          }}
        >
          <Text style={{ color: "#B91C1C", fontSize: 12, fontWeight: "800" }}>
            {forgotErr}
          </Text>
        </View>
      ) : null}

      {/* Field */}
      <View style={{ marginTop: 14 }}>
        <Text style={{ fontSize: 12, fontWeight: "900", color: "#111827", marginBottom: 6 }}>
          Email <Text style={{ color: "#DC2626" }}>*</Text>
        </Text>

        <View
          style={{
            borderWidth: 1,
            borderColor: focused === "forgotEmail" ? colors.primary : "#D1D5DB",
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: Platform.OS === "web" ? 10 : 8,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "white",
          }}
        >
          <Ionicons name="mail-outline" size={18} color="#9CA3AF" />
          <TextInput
            ref={forgotEmailRef}
            value={forgotEmail}
            onChangeText={setForgotEmail}
            placeholder="Introduce tu correo"
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            autoCapitalize="none"
            style={{ flex: 1, marginLeft: 10, fontSize: 14, color: "#111827" }}
            onFocus={() => setFocused("forgotEmail")}
            onBlur={() => setFocused(null)}
            returnKeyType="done"
            onSubmitEditing={handleForgot}
          />
        </View>

        <Text style={{ marginTop: 8, color: "#94A3B8", fontSize: 11, lineHeight: 16 }}>
          Si el correo no existe, no lo indicaremos por seguridad.
        </Text>
      </View>

      {/* Actions */}
      <View style={{ marginTop: 16, flexDirection: "row", justifyContent: "flex-end" }}>
        <TouchableOpacity
          onPress={closeForgot}
          activeOpacity={0.9}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#E5E7EB",
            backgroundColor: "white",
            marginRight: 10,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: "900", color: "#111827" }}>
            Cancelar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleForgot}
          disabled={forgotLoading}
          activeOpacity={0.9}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 12,
            backgroundColor: forgotLoading ? "#E5E7EB" : colors.primary,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 120,
          }}
        >
          {forgotLoading ? (
            <ActivityIndicator color="#111827" />
          ) : (
            <>
              <Text style={{ fontSize: 12, fontWeight: "900", color: "white" }}>
                Enviar
              </Text>
              <Ionicons name="arrow-forward" size={16} color="white" style={{ marginLeft: 8 }} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </Pressable>
  </Pressable>
</Modal>
    </View>
  );
}
