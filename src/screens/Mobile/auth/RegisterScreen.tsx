import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { Ionicons, FontAwesome } from "@expo/vector-icons";
import { colors } from "../../../theme/theme";
import api from "../../../api/api";
import { useAuth } from "../../../context/AuthContext"; // 👈 usa tu contexto
import * as SecureStore from "expo-secure-store";

export default function RegisterScreen({ navigation }: any) {
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(""); // 👈 nuevo estado para mostrar errores

  const validateForm = () => {
    if (!name || !email || !password) {
      setError("Por favor completa todos los campos.");
      return false;
    }

    // Validación de formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Por favor introduce un correo electrónico válido.");
      return false;
    }

    // Validación de longitud de contraseña
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return false;
    }

    setError(""); // Si todo está bien
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      const res = await api.post("/auth/register", { name, email, password });
      console.log("✅ Usuario creado:", res.data);

      Alert.alert("Cuenta creada", "Tu cuenta ha sido creada exitosamente 🎉");

      // Redirigir al login (flujo limpio)
      navigation.replace("Login");
    } catch (error: any) {
      console.error("❌ Error al registrar:", error.response?.data || error.message);
      setError(error.response?.data?.message || "No se pudo crear la cuenta.");
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
          source={require("../../../../assets/finex_logo.webp")}
          style={{ width: 90, height: 90, resizeMode: "contain", marginBottom: 12 }}
        />
        <Text className="text-5xl font-bold text-primary mb-1">Finexa</Text>
        <Text className="text-gray-500 text-base mb-2">
          Crea una cuenta para empezar
        </Text>

        {/* 🧾 Texto de error */}
        {error ? (
          <Text className="text-red-500 text-sm text-center mt-1">{error}</Text>
        ) : null}
      </View>

      {/* Nombre completo */}
      <View className="mb-4">
        <View className="flex-row items-center border border-gray-300 rounded-xl px-3 py-3">
          <Ionicons name="person-outline" size={20} color={colors.textSecondary} />
          <TextInput
            className="flex-1 ml-2 text-base"
            style={{ outlineStyle: "none" } as any}
            value={name}
            onChangeText={setName}
            placeholder="Nombre completo"
            placeholderTextColor={colors.textSecondary}
          />
        </View>
      </View>

      {/* Email */}
      <View className="mb-4">
        <View className="flex-row items-center border border-gray-300 rounded-xl px-3 py-3">
          <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />
          <TextInput
            className="flex-1 ml-2 text-base"
            style={{ outlineStyle: "none" } as any}
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
        <View className="flex-row items-center border border-gray-300 rounded-xl px-3 py-3">
          <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
          <TextInput
            className="flex-1 ml-2 text-base"
            style={{ outlineStyle: "none" } as any}
            value={password}
            onChangeText={setPassword}
            placeholder="Contraseña"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
          />
        </View>
      </View>

      {/* Botón principal */}
      <TouchableOpacity
        className={`py-3 rounded-2xl ${loading ? "bg-gray-400" : "bg-primary"}`}
        disabled={loading}
        onPress={handleRegister}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white text-center text-lg font-semibold">
            Crear cuenta
          </Text>
        )}
      </TouchableOpacity>

      {/* Link de inicio de sesión */}
      <View className="mt-6 flex-row justify-center">
        <Text className="text-gray-600">¿Ya tienes cuenta? </Text>
        <TouchableOpacity onPress={() => navigation.navigate("Login")}>
          <Text className="text-primary font-semibold">Inicia sesión</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
