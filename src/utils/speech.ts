// src/utils/speech.ts
//
// Texto a voz multiplataforma: expo-speech en nativo, Web Speech API en web.

import { Platform } from "react-native";
import * as ExpoSpeech from "expo-speech";

export function speak(text: string, langCode: string): void {
  if (!text) return;

  if (Platform.OS === "web") {
    try {
      const synth = (window as any).speechSynthesis;
      if (!synth) return;
      synth.cancel();
      const utterance = new (window as any).SpeechSynthesisUtterance(text);
      utterance.lang = langCode;
      synth.speak(utterance);
    } catch {}
    return;
  }

  ExpoSpeech.stop();
  ExpoSpeech.speak(text, { language: langCode });
}

export function stopSpeaking(): void {
  if (Platform.OS === "web") {
    try {
      (window as any).speechSynthesis?.cancel();
    } catch {}
    return;
  }
  ExpoSpeech.stop();
}
