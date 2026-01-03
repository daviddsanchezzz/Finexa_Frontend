import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../../theme/theme";

const N8N_WEBHOOK_URL =
  "https://n8n.srv877053.hstgr.cloud/webhook-test/finexa-chat";

// AJUSTA ESTO A TU TAB BAR EN WEB (64/72/80 suelen cuadrar)
const WEB_TABBAR_HEIGHT = 92;

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
    { id: 2, from: "user", text: "¿Puedes ayudarme a analizar mis gastos?" },
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

  const extraBottom = Platform.OS === "web" ? WEB_TABBAR_HEIGHT : 0;

  const scrollToEnd = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated });
    });
  }, []);

  useEffect(() => {
    scrollToEnd(true);
  }, [messages.length, scrollToEnd]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setLoading(true);
    setInput("");

    const userMessage: ChatMessage = { id: Date.now(), from: "user", text };
    const thinkingId = Date.now() + 1;

    setMessages((prev) => [
      ...prev,
      userMessage,
      { id: thinkingId, from: "ai", text: "Pensando..." },
    ]);

    try {
      const res = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      let aiText = "No he recibido respuesta del asistente 🤔";
      try {
        const data = await res.json();
        aiText = data?.reply || data?.data?.reply || aiText;
      } catch {}

      setMessages((prev) => {
        const withoutThinking = prev.filter((m) => m.id !== thinkingId);
        return [...withoutThinking, { id: Date.now() + 2, from: "ai", text: aiText }];
      });
    } catch (e) {
      setMessages((prev) => {
        const withoutThinking = prev.filter((m) => m.id !== thinkingId);
        return [
          ...withoutThinking,
          {
            id: Date.now() + 3,
            from: "ai",
            text: "Ha habido un problema al conectar con el asistente 😥\nInténtalo de nuevo.",
          },
        ];
      });
    } finally {
      setLoading(false);
      scrollToEnd(true);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* HEADER */}
      <View
        style={{
          paddingHorizontal: 18,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: `${colors.primary}20`,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={18}
            color={colors.primary}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>
            Asistente financiero
          </Text>
        </View>

        {loading ? <ActivityIndicator size="small" color={colors.primary} /> : null}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1, minHeight: 0 }} // minHeight:0 ayuda MUCHO en web con flex/scroll
        behavior={Platform.OS === "ios" ? "padding" : Platform.OS === "android" ? "height" : undefined}
      >
        {/* MENSAJES */}
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 12,
            paddingTop: 14,
            // IMPORTANTE: deja espacio para que el final no quede tapado en web
            paddingBottom: 12 + extraBottom,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollToEnd(false)}
        >
          {messages.map((msg) => {
            const isUser = msg.from === "user";
            return (
              <View
                key={msg.id}
                style={{
                  alignSelf: isUser ? "flex-end" : "flex-start",
                  maxWidth: "80%",
                  marginBottom: 10,
                }}
              >
                <View
                  style={{
                    backgroundColor: isUser ? colors.primary : colors.card,
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    borderRadius: 18,
                    borderTopRightRadius: isUser ? 6 : 18,
                    borderTopLeftRadius: isUser ? 18 : 6,
                    borderWidth: isUser ? 0 : 1,
                    borderColor: isUser ? "transparent" : colors.border,
                  }}
                >
                  <Text
                    style={{
                      color: isUser ? "#fff" : colors.text,
                      fontSize: 15,
                      lineHeight: 20,
                    }}
                  >
                    {msg.text}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* INPUT */}
        <View
          style={{
            paddingHorizontal: 12,
            paddingTop: 10,
            // aquí es donde se estaba “metiendo debajo” del tabbar en web
            paddingBottom: Math.max(insets.bottom, 10) + extraBottom,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.background,
          }}
        >
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 28,
              paddingHorizontal: 14,
              paddingVertical: 10,
              flexDirection: "row",
              alignItems: "flex-end",
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={loading ? "Esperando respuesta..." : "Escribe un mensaje…"}
              editable={!loading}
              placeholderTextColor={colors.textSecondary}
              style={{
                flex: 1,
                color: colors.text,
                fontSize: 16,
                paddingVertical: Platform.OS === "ios" ? 8 : 4,
                maxHeight: 110,
              }}
              multiline
              onFocus={() => scrollToEnd(true)}
            />

            <TouchableOpacity
              onPress={sendMessage}
              disabled={!input.trim() || loading}
              style={{
                marginLeft: 10,
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor:
                  !input.trim() || loading ? `${colors.primary}20` : colors.primary,
              }}
              activeOpacity={0.85}
            >
              <Ionicons
                name="send"
                size={18}
                color={!input.trim() || loading ? colors.primary : "#fff"}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
