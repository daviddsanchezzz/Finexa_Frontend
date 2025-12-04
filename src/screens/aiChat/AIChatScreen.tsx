import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/theme";

const N8N_WEBHOOK_URL =
  "https://n8n.srv877053.hstgr.cloud/webhook-test/finexa-chat";

type ChatMessage = {
  id: number;
  from: "user" | "ai";
  text: string;
};

export default function AIChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      from: "ai",
      text: "¡Hola! Soy Finexa Assistant 🤖\nPronto podré ayudarte con tus gastos, presupuestos y más.",
    },
    {
      id: 2,
      from: "user",
      text: "¿Puedes ayudarme a analizar mis gastos?",
    },
    {
      id: 3,
      from: "ai",
      text: "¡Claro! 📊\nEn cuanto conecte mis funciones, podré mostrarte estadísticas, alertas y recomendaciones personalizadas.",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);
  const insets = useSafeAreaInsets();

  const scrollToEnd = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 50);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const text = input.trim();
    const userMessage: ChatMessage = {
      id: Date.now(),
      from: "user",
      text,
    };

    // Añadimos el mensaje del usuario
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    scrollToEnd();

    // Añadimos un mensaje temporal de "pensando..."
    const thinkingId = Date.now() + 1;
    setMessages((prev) => [
      ...prev,
      userMessage,
      {
        id: thinkingId,
        from: "ai",
        text: "Pensando...",
      },
    ]);

    setLoading(true);

    try {
      const res = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          // aquí puedes mandar más cosas: userId, idioma, etc.
          // userId: "123",
        }),
      });

      let aiText = "No he recibido respuesta del flujo de n8n 🤔";

      try {
        const data = await res.json();
        aiText =
          data?.reply ||
          data?.data?.reply || // por si tu flujo devuelve otro shape
          aiText;
      } catch {
        // por si la respuesta no es JSON válido
      }

      // Reemplazamos el "Pensando..." por la respuesta real
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== thinkingId && m.id !== userMessage.id),
        userMessage,
        {
          id: Date.now() + 2,
          from: "ai",
          text: aiText,
        },
      ]);
    } catch (error) {
      console.error("Error llamando a n8n:", error);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== thinkingId && m.id !== userMessage.id),
        userMessage,
        {
          id: Date.now() + 3,
          from: "ai",
          text:
            "Ha habido un problema al conectar con el asistente 😥\nInténtalo de nuevo en un momento.",
        },
      ]);
    } finally {
      setLoading(false);
      scrollToEnd();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* HEADER */}
      <View
        style={{
          paddingHorizontal: 18,
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Ionicons
          name="chatbubble-ellipses-outline"
          size={22}
          color={colors.text}
        />
        <Text
          style={{
            color: colors.text,
            fontSize: 20,
            fontWeight: "600",
            marginLeft: 10,
          }}
        >
          Assistente Financiero
        </Text>
      </View>

      {/* CHAT + INPUT */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 70 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1, paddingHorizontal: 12 }}
          contentContainerStyle={{
            paddingVertical: 15,
            paddingBottom: 130, // espacio para el input flotante
          }}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={{
                alignSelf: msg.from === "user" ? "flex-end" : "flex-start",
                backgroundColor:
                  msg.from === "user" ? colors.primary : colors.card,
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 16,
                marginBottom: 12,
                maxWidth: "75%",
              }}
            >
              <Text
                style={{
                  color: msg.from === "user" ? "#fff" : colors.text,
                  fontSize: 15,
                  lineHeight: 20,
                }}
              >
                {msg.text}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* INPUT FLOTANTE */}
        <View
          style={{
            position: "absolute",
            bottom: insets.bottom + 30, // encima del tab bar
            left: 0,
            right: 0,
            paddingHorizontal: 12,
          }}
        >
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 30,
              paddingHorizontal: 15,
              paddingVertical: 10,
              flexDirection: "row",
              alignItems: "center",
              shadowColor: "#000",
              shadowOpacity: 0.08,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 3 },
              elevation: 3,
            }}
          >
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={
                loading
                  ? "Esperando respuesta del asistente..."
                  : "Escribe un mensaje..."
              }
              editable={!loading}
              placeholderTextColor={colors.textSecondary}
              style={{
                flex: 1,
                color: colors.text,
                fontSize: 16,
              }}
            />

            <TouchableOpacity
              onPress={sendMessage}
              disabled={!input.trim() || loading}
              style={{ marginLeft: 10 }}
            >
              <Ionicons
                name="send"
                size={24}
                color={
                  !input.trim() || loading
                    ? colors.textSecondary
                    : colors.primary
                }
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
