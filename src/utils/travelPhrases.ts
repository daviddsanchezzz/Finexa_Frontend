// src/utils/travelPhrases.ts
//
// Frases de viaje básicas, curadas a mano, con traducción + locale para
// texto-a-voz (expo-speech / Web Speech API). Un set por idioma (no por
// país) — varios países comparten idioma (AT/DE, la mayoría de LatAm...).

export type PhraseLanguageKey =
  | "it" | "fr" | "pt" | "de" | "el" | "nl" | "pl" | "no" | "is"
  | "en" | "tr" | "ar" | "th" | "ja" | "vi" | "hi";

export interface Phrase {
  es: string;
  translated: string;
  /** Romanización, solo para idiomas que no usan alfabeto latino */
  pronunciation?: string;
}

export interface PhraseLanguageSet {
  key: PhraseLanguageKey;
  name: string;
  ttsLocale: string;
  phrases: Phrase[];
}

const PHRASE_SETS: Record<PhraseLanguageKey, PhraseLanguageSet> = {
  it: {
    key: "it", name: "Italiano", ttsLocale: "it-IT",
    phrases: [
      { es: "Gracias", translated: "Grazie" },
      { es: "Por favor", translated: "Per favore" },
      { es: "¿Cuánto cuesta?", translated: "Quanto costa?" },
      { es: "Ayuda", translated: "Aiuto" },
      { es: "La cuenta, por favor", translated: "Il conto, per favore" },
      { es: "¿Dónde está el baño?", translated: "Dov'è il bagno?" },
      { es: "Buenos días", translated: "Buongiorno" },
      { es: "Adiós", translated: "Arrivederci" },
    ],
  },
  fr: {
    key: "fr", name: "Francés", ttsLocale: "fr-FR",
    phrases: [
      { es: "Gracias", translated: "Merci" },
      { es: "Por favor", translated: "S'il vous plaît" },
      { es: "¿Cuánto cuesta?", translated: "Combien ça coûte ?" },
      { es: "Ayuda", translated: "Au secours" },
      { es: "La cuenta, por favor", translated: "L'addition, s'il vous plaît" },
      { es: "¿Dónde está el baño?", translated: "Où sont les toilettes ?" },
      { es: "Buenos días", translated: "Bonjour" },
      { es: "Adiós", translated: "Au revoir" },
    ],
  },
  pt: {
    key: "pt", name: "Portugués", ttsLocale: "pt-PT",
    phrases: [
      { es: "Gracias", translated: "Obrigado" },
      { es: "Por favor", translated: "Por favor" },
      { es: "¿Cuánto cuesta?", translated: "Quanto custa?" },
      { es: "Ayuda", translated: "Socorro" },
      { es: "La cuenta, por favor", translated: "A conta, por favor" },
      { es: "¿Dónde está el baño?", translated: "Onde é a casa de banho?" },
      { es: "Buenos días", translated: "Bom dia" },
      { es: "Adiós", translated: "Adeus" },
    ],
  },
  de: {
    key: "de", name: "Alemán", ttsLocale: "de-DE",
    phrases: [
      { es: "Gracias", translated: "Danke" },
      { es: "Por favor", translated: "Bitte" },
      { es: "¿Cuánto cuesta?", translated: "Wie viel kostet das?" },
      { es: "Ayuda", translated: "Hilfe" },
      { es: "La cuenta, por favor", translated: "Die Rechnung, bitte" },
      { es: "¿Dónde está el baño?", translated: "Wo ist die Toilette?" },
      { es: "Buenos días", translated: "Guten Morgen" },
      { es: "Adiós", translated: "Auf Wiedersehen" },
    ],
  },
  el: {
    key: "el", name: "Griego", ttsLocale: "el-GR",
    phrases: [
      { es: "Gracias", translated: "Ευχαριστώ", pronunciation: "Efjaristó" },
      { es: "Por favor", translated: "Παρακαλώ", pronunciation: "Parakaló" },
      { es: "¿Cuánto cuesta?", translated: "Πόσο κοστίζει;", pronunciation: "Póso kostízei?" },
      { es: "Ayuda", translated: "Βοήθεια", pronunciation: "Voítheia" },
      { es: "La cuenta, por favor", translated: "Τον λογαριασμό, παρακαλώ", pronunciation: "Ton logariasmó, parakaló" },
      { es: "¿Dónde está el baño?", translated: "Πού είναι η τουαλέτα;", pronunciation: "Poú eínai i toualéta?" },
      { es: "Buenos días", translated: "Καλημέρα", pronunciation: "Kaliméra" },
      { es: "Adiós", translated: "Αντίο", pronunciation: "Antío" },
    ],
  },
  nl: {
    key: "nl", name: "Neerlandés", ttsLocale: "nl-NL",
    phrases: [
      { es: "Gracias", translated: "Dank je wel" },
      { es: "Por favor", translated: "Alsjeblieft" },
      { es: "¿Cuánto cuesta?", translated: "Hoeveel kost het?" },
      { es: "Ayuda", translated: "Help" },
      { es: "La cuenta, por favor", translated: "De rekening, alstublieft" },
      { es: "¿Dónde está el baño?", translated: "Waar is het toilet?" },
      { es: "Buenos días", translated: "Goedemorgen" },
      { es: "Adiós", translated: "Tot ziens" },
    ],
  },
  pl: {
    key: "pl", name: "Polaco", ttsLocale: "pl-PL",
    phrases: [
      { es: "Gracias", translated: "Dziękuję" },
      { es: "Por favor", translated: "Proszę" },
      { es: "¿Cuánto cuesta?", translated: "Ile to kosztuje?" },
      { es: "Ayuda", translated: "Pomocy" },
      { es: "La cuenta, por favor", translated: "Rachunek, proszę" },
      { es: "¿Dónde está el baño?", translated: "Gdzie jest toaleta?" },
      { es: "Buenos días", translated: "Dzień dobry" },
      { es: "Adiós", translated: "Do widzenia" },
    ],
  },
  no: {
    key: "no", name: "Noruego", ttsLocale: "nb-NO",
    phrases: [
      { es: "Gracias", translated: "Takk" },
      { es: "Por favor", translated: "Vær så snill" },
      { es: "¿Cuánto cuesta?", translated: "Hvor mye koster det?" },
      { es: "Ayuda", translated: "Hjelp" },
      { es: "La cuenta, por favor", translated: "Regningen, takk" },
      { es: "¿Dónde está el baño?", translated: "Hvor er toalettet?" },
      { es: "Buenos días", translated: "God morgen" },
      { es: "Adiós", translated: "Ha det" },
    ],
  },
  is: {
    key: "is", name: "Islandés", ttsLocale: "is-IS",
    phrases: [
      { es: "Gracias", translated: "Takk fyrir" },
      { es: "Por favor", translated: "Vinsamlegast" },
      { es: "¿Cuánto cuesta?", translated: "Hvað kostar þetta?" },
      { es: "Ayuda", translated: "Hjálp" },
      { es: "La cuenta, por favor", translated: "Reikninginn, takk" },
      { es: "¿Dónde está el baño?", translated: "Hvar er klósettið?" },
      { es: "Buenos días", translated: "Góðan daginn" },
      { es: "Adiós", translated: "Bless" },
    ],
  },
  en: {
    key: "en", name: "Inglés", ttsLocale: "en-GB",
    phrases: [
      { es: "Gracias", translated: "Thank you" },
      { es: "Por favor", translated: "Please" },
      { es: "¿Cuánto cuesta?", translated: "How much is it?" },
      { es: "Ayuda", translated: "Help" },
      { es: "La cuenta, por favor", translated: "The bill, please" },
      { es: "¿Dónde está el baño?", translated: "Where is the toilet?" },
      { es: "Buenos días", translated: "Good morning" },
      { es: "Adiós", translated: "Goodbye" },
    ],
  },
  tr: {
    key: "tr", name: "Turco", ttsLocale: "tr-TR",
    phrases: [
      { es: "Gracias", translated: "Teşekkürler" },
      { es: "Por favor", translated: "Lütfen" },
      { es: "¿Cuánto cuesta?", translated: "Ne kadar?" },
      { es: "Ayuda", translated: "İmdat" },
      { es: "La cuenta, por favor", translated: "Hesap, lütfen" },
      { es: "¿Dónde está el baño?", translated: "Tuvalet nerede?" },
      { es: "Buenos días", translated: "Günaydın" },
      { es: "Adiós", translated: "Hoşça kal" },
    ],
  },
  ar: {
    key: "ar", name: "Árabe", ttsLocale: "ar-SA",
    phrases: [
      { es: "Gracias", translated: "شكرا", pronunciation: "Shukran" },
      { es: "Por favor", translated: "من فضلك", pronunciation: "Min fadlik" },
      { es: "¿Cuánto cuesta?", translated: "كم الثمن؟", pronunciation: "Kam al-thaman?" },
      { es: "Ayuda", translated: "النجدة", pronunciation: "An-najda" },
      { es: "La cuenta, por favor", translated: "الحساب من فضلك", pronunciation: "Al-hisab min fadlik" },
      { es: "¿Dónde está el baño?", translated: "أين الحمام؟", pronunciation: "Ayna al-hammam?" },
      { es: "Buenos días", translated: "صباح الخير", pronunciation: "Sabah al-khayr" },
      { es: "Adiós", translated: "مع السلامة", pronunciation: "Ma' as-salama" },
    ],
  },
  th: {
    key: "th", name: "Tailandés", ttsLocale: "th-TH",
    phrases: [
      { es: "Gracias", translated: "ขอบคุณ", pronunciation: "Khop khun" },
      { es: "Por favor", translated: "กรุณา", pronunciation: "Karuna" },
      { es: "¿Cuánto cuesta?", translated: "เท่าไหร่", pronunciation: "Thao rai?" },
      { es: "Ayuda", translated: "ช่วยด้วย", pronunciation: "Chuai duai" },
      { es: "La cuenta, por favor", translated: "เช็คบิลด้วย", pronunciation: "Chek bin duai" },
      { es: "¿Dónde está el baño?", translated: "ห้องน้ำอยู่ไหน", pronunciation: "Hong nam yu nai?" },
      { es: "Buenos días", translated: "สวัสดีตอนเช้า", pronunciation: "Sawatdi ton chao" },
      { es: "Adiós", translated: "ลาก่อน", pronunciation: "La kon" },
    ],
  },
  ja: {
    key: "ja", name: "Japonés", ttsLocale: "ja-JP",
    phrases: [
      { es: "Gracias", translated: "ありがとう", pronunciation: "Arigatou" },
      { es: "Por favor", translated: "お願いします", pronunciation: "Onegaishimasu" },
      { es: "¿Cuánto cuesta?", translated: "いくらですか", pronunciation: "Ikura desu ka?" },
      { es: "Ayuda", translated: "助けて", pronunciation: "Tasukete" },
      { es: "La cuenta, por favor", translated: "お会計お願いします", pronunciation: "Okaikei onegaishimasu" },
      { es: "¿Dónde está el baño?", translated: "トイレはどこですか", pronunciation: "Toire wa doko desu ka?" },
      { es: "Buenos días", translated: "おはようございます", pronunciation: "Ohayou gozaimasu" },
      { es: "Adiós", translated: "さようなら", pronunciation: "Sayounara" },
    ],
  },
  vi: {
    key: "vi", name: "Vietnamita", ttsLocale: "vi-VN",
    phrases: [
      { es: "Gracias", translated: "Cảm ơn" },
      { es: "Por favor", translated: "Làm ơn" },
      { es: "¿Cuánto cuesta?", translated: "Bao nhiêu tiền?" },
      { es: "Ayuda", translated: "Cứu tôi" },
      { es: "La cuenta, por favor", translated: "Tính tiền" },
      { es: "¿Dónde está el baño?", translated: "Nhà vệ sinh ở đâu?" },
      { es: "Buenos días", translated: "Chào buổi sáng" },
      { es: "Adiós", translated: "Tạm biệt" },
    ],
  },
  hi: {
    key: "hi", name: "Hindi", ttsLocale: "hi-IN",
    phrases: [
      { es: "Gracias", translated: "धन्यवाद", pronunciation: "Dhanyavaad" },
      { es: "Por favor", translated: "कृपया", pronunciation: "Kripaya" },
      { es: "¿Cuánto cuesta?", translated: "कितने का है?", pronunciation: "Kitne ka hai?" },
      { es: "Ayuda", translated: "मदद", pronunciation: "Madad" },
      { es: "La cuenta, por favor", translated: "बिल दीजिए", pronunciation: "Bill dijiye" },
      { es: "¿Dónde está el baño?", translated: "बाथरूम कहाँ है?", pronunciation: "Bathroom kahan hai?" },
      { es: "Buenos días", translated: "सुप्रभात", pronunciation: "Suprabhat" },
      { es: "Adiós", translated: "अलविदा", pronunciation: "Alvida" },
    ],
  },
};

export function getPhraseSet(key: PhraseLanguageKey | null | undefined): PhraseLanguageSet | null {
  if (!key) return null;
  return PHRASE_SETS[key] ?? null;
}
