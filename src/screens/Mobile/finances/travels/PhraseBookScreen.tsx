import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { colors } from "../../../../theme/theme";
import { getPhraseSet, type PhraseLanguageKey } from "../../../../utils/travelPhrases";
import { speak, stopSpeaking } from "../../../../utils/speech";

export default function PhraseBookScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { phraseLanguage, destinationName } = (route.params || {}) as {
    phraseLanguage: PhraseLanguageKey;
    destinationName?: string;
  };

  const set = getPhraseSet(phraseLanguage);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);

  const handlePlay = (idx: number, text: string) => {
    if (!set) return;
    if (playingIdx === idx) {
      stopSpeaking();
      setPlayingIdx(null);
      return;
    }
    setPlayingIdx(idx);
    speak(text, set.ttsLocale);
    // No hay evento onDone fiable cross-platform con esta API mínima;
    // liberamos el estado "reproduciendo" tras un margen razonable.
    setTimeout(() => setPlayingIdx((cur) => (cur === idx ? null : cur)), 3000);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, gap: 8 }}>
        <TouchableOpacity
          onPress={() => {
            stopSpeaking();
            navigation.goBack();
          }}
          style={{ padding: 4 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: "900", color: "#0F172A" }}>Frases básicas</Text>
          {!!destinationName && (
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#94A3B8" }}>
              {set ? set.name : destinationName}
            </Text>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {!set ? (
          <View style={{ alignItems: "center", paddingVertical: 60, gap: 8 }}>
            <Ionicons name="chatbubble-ellipses-outline" size={32} color="#CBD5E1" />
            <Text style={{ fontSize: 13, color: "#94A3B8", textAlign: "center", paddingHorizontal: 20 }}>
              Todavía no tenemos frases para este idioma.
            </Text>
          </View>
        ) : (
          <View style={{ backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: "#F3F4F6" }}>
            {set.phrases.map((phrase, idx) => {
              const isLast = idx === set.phrases.length - 1;
              const isPlaying = playingIdx === idx;
              return (
                <View
                  key={idx}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 14,
                    borderBottomWidth: isLast ? 0 : 1,
                    borderBottomColor: "#F3F4F6",
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: "600", color: "#94A3B8" }}>{phrase.es}</Text>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: "#0F172A", marginTop: 2 }}>
                      {phrase.translated}
                    </Text>
                    {!!phrase.pronunciation && (
                      <Text style={{ fontSize: 11, fontWeight: "600", color: "#94A3B8", marginTop: 2 }}>
                        {phrase.pronunciation}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => handlePlay(idx, phrase.translated)}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      backgroundColor: isPlaying ? colors.primary : "#F1F5F9",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons
                      name={isPlaying ? "volume-high" : "volume-medium-outline"}
                      size={18}
                      color={isPlaying ? "white" : "#475569"}
                    />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
