import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import { Ionicons, FontAwesome } from "@expo/vector-icons";
import { colors } from "../../theme/theme";
import { storage } from "../../utils/storage";
import api from "../../api/api";
import { useAuth } from "../../context/AuthContext";

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(""); // 👈 nuevo estado para mostrar errores
  const { login } = useAuth();

  const validateForm = () => {
    if (!email || !password) {
      setError("Por favor completa todos los campos.");
      return false;
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Por favor introduce un correo electrónico válido.");
      return false;
    }

    setError("");
    return true;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      const res = await api.post("/auth/login", { email, password });
      const { access_token, refresh_token, user } = res.data;

      await storage.setItem("access_token", access_token);
      await storage.setItem("refresh_token", refresh_token);
      await login(email, password);

      console.log("✅ Sesión iniciada:", user);
      navigation.replace("Home"); // 👈 redirige tras login exitoso
    } catch (error: any) {
      console.error("❌ Error al iniciar sesión:", error.response?.data || error.message);
      setError(error.response?.data?.message || "Credenciales incorrectas.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-white px-8"
      contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Logo / Marca */}
      <View className="mb-10 items-center">
        <Image
          source={require("../../../assets/finex_logo.png")}
          style={{ width: 90, height: 90, resizeMode: "contain", marginBottom: 12 }}
        />
        <Text className="text-5xl font-bold text-primary mb-1">Finexa</Text>
        <Text className="text-gray-500 text-base mb-2">
          Controla tus finanzas fácilmente
        </Text>

        {/* 🧾 Texto de error */}
        {error ? (
          <Text className="text-red-500 text-sm text-center mt-1">{error}</Text>
        ) : null}
      </View>

      {/* Email */}
      <View className="mb-4">
        <View
          className={`flex-row items-center border rounded-xl px-3 py-3 ${
            error && (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
              ? "border-red-400"
              : "border-gray-300"
          }`}
        >
          <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />
          <TextInput
            className="flex-1 ml-2 text-base"
            value={email}
            onChangeText={setEmail}
            placeholder="Correo electrónico"
            placeholderTextColor={colors.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
      </View>

      {/* Contraseña */}
      <View className="mb-6">
        <View
          className={`flex-row items-center border rounded-xl px-3 py-3 ${
            error && !password ? "border-red-400" : "border-gray-300"
          }`}
        >
          <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
          <TextInput
            className="flex-1 ml-2 text-base"
            value={password}
            onChangeText={setPassword}
            placeholder="Contraseña"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
          />
        </View>
      </View>

      {/* Botón de login */}
      <TouchableOpacity
        className={`py-3 rounded-2xl ${loading ? "bg-gray-400" : "bg-primary"}`}
        disabled={loading}
        onPress={handleLogin}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white text-center text-lg font-semibold">
            Iniciar sesión
          </Text>
        )}
      </TouchableOpacity>

      {/* Registro */}
      <View className="mt-6 flex-row justify-center">
        <Text className="text-gray-600">¿No tienes cuenta? </Text>
        <TouchableOpacity onPress={() => navigation.navigate("Register")}>
          <Text className="text-primary font-semibold">Crear cuenta</Text>
        </TouchableOpacity>
      </View>

      {/* Línea divisoria */}
      <View className="my-8 h-[1px] bg-gray-200" />

      {/* Botones sociales */}
      <TouchableOpacity className="flex-row items-center justify-center border border-gray-300 rounded-2xl py-3 mb-4">
        <FontAwesome name="google" size={20} color="#DB4437" />
        <Text className="ml-3 text-base text-gray-700 font-medium">
          Iniciar sesión con Google
        </Text>
      </TouchableOpacity>

      <TouchableOpacity className="flex-row items-center justify-center border border-gray-300 rounded-2xl py-3">
        <FontAwesome name="apple" size={22} color="#000" />
        <Text className="ml-3 text-base text-gray-700 font-medium">
          Iniciar sesión con Apple
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
