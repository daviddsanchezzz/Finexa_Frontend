// src/components/CurrencyPickerModal.tsx
// Selector de divisa (bottom sheet) reutilizable. Misma lista y aspecto que
// FormCurrencyPicker, pero controlado desde fuera para poder abrirlo tocando
// el símbolo de moneda junto al importe.
import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/theme";
import { COMMON_CURRENCIES } from "../utils/exchangeRate";
import { CountryFlag } from "./CountryFlag";

// Las etiquetas visibles son cortas; estos términos hacen que buscar por país,
// código o un nombre habitual encuentre la moneda sin exigir una coincidencia exacta.
const CURRENCY_SEARCH_TERMS: Record<string, string[]> = {
  EUR: ["europa", "union europea", "eurozona"],
  USD: ["estados unidos", "america", "dolar americano"],
  GBP: ["reino unido", "inglaterra", "libra esterlina"],
  JPY: ["japon", "japones", "yen japones"],
  CHF: ["suiza", "suizo", "franco"],
  MXN: ["mexico", "mexicano"],
  BRL: ["brasil", "brasileño"],
  CAD: ["canada", "canadiense"],
  AUD: ["australia", "australiano"],
  THB: ["tailandia", "tailandes"],
  TRY: ["turquia", "turco"],
  MAD: ["marruecos", "marroqui"],
  CZK: ["republica checa", "chequia", "checo"],
  PLN: ["polonia", "polaco", "zloty"],
  SEK: ["suecia", "sueco"],
  NOK: ["noruega", "noruego"],
  DKK: ["dinamarca", "danes"],
  HUF: ["hungria", "hungaro", "forinto", "florin"],
  RON: ["rumania", "rumano"],
  BGN: ["bulgaria", "bulgaro"],
};

const CURRENCY_COUNTRY: Record<string, string> = {
  EUR: "EU",
  USD: "US",
  GBP: "GB",
  JPY: "JP",
  CHF: "CH",
  MXN: "MX",
  BRL: "BR",
  CAD: "CA",
  AUD: "AU",
  THB: "TH",
  TRY: "TR",
  MAD: "MA",
  CZK: "CZ",
  PLN: "PL",
  SEK: "SE",
  NOK: "NO",
  DKK: "DK",
  HUF: "HU",
  RON: "RO",
  BGN: "BG",
};

const normalizeSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export function currencySymbol(code: string): string {
  return COMMON_CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
}

export default function CurrencyPickerModal({
  visible,
  value,
  onSelect,
  onClose,
}: {
  visible: boolean;
  value: string;
  onSelect: (code: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  useEffect(() => {
    if (!visible) setQuery("");
  }, [visible]);
  const currencies = useMemo(() => {
    const terms = normalizeSearch(query);
    if (!terms) return COMMON_CURRENCIES;
    return COMMON_CURRENCIES.filter((currency) =>
      [
        currency.code,
        currency.label,
        currency.symbol,
        ...(CURRENCY_SEARCH_TERMS[currency.code] || []),
      ].some((term) => normalizeSearch(term).includes(terms)),
    );
  }, [query]);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.38)" }}
      />
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: "72%",
          backgroundColor: "white",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingBottom: 24,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingVertical: 17,
            borderBottomWidth: 1,
            borderBottomColor: "#EEF1F5",
          }}
        >
          <Text
            style={{
              flex: 1,
              fontSize: 18,
              fontWeight: "900",
              color: colors.ink,
            }}
          >
            Seleccionar divisa
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={22} color="#64748B" />
          </TouchableOpacity>
        </View>
        <View
          style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 }}
        >
          <View
            style={{
              height: 44,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#DDE5F0",
              backgroundColor: "#F8FAFC",
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 12,
            }}
          >
            <Ionicons name="search-outline" size={18} color="#72819A" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar por divisa, código o país"
              placeholderTextColor="#91A0B5"
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                flex: 1,
                fontSize: 14,
                color: colors.ink,
                marginLeft: 9,
                paddingVertical: 0,
              }}
              accessibilityLabel="Buscar divisa"
            />
            {query ? (
              <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color="#91A0B5" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
        <FlatList
          data={currencies}
          keyExtractor={(c) => c.code}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View
              style={{
                alignItems: "center",
                paddingVertical: 34,
                paddingHorizontal: 24,
              }}
            >
              <Ionicons name="search-outline" size={25} color="#A5B1C2" />
              <Text
                style={{
                  marginTop: 10,
                  color: "#72819A",
                  fontSize: 14,
                  textAlign: "center",
                }}
              >
                No encontramos una divisa para “{query}”.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const active = item.code === value;
            return (
              <TouchableOpacity
                onPress={() => {
                  onSelect(item.code);
                  onClose();
                }}
                activeOpacity={0.72}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 20,
                  minHeight: 68,
                }}
              >
                <CountryFlag
                  cca2={CURRENCY_COUNTRY[item.code]}
                  size={38}
                  radius={19}
                />
                <View style={{ flex: 1, marginLeft: 13 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "900",
                      color: colors.ink,
                    }}
                  >
                    {item.code}
                  </Text>
                  <Text
                    style={{
                      marginTop: 2,
                      fontSize: 13,
                      fontWeight: "600",
                      color: "#64748B",
                    }}
                  >
                    {item.label}
                  </Text>
                </View>
                {active ? (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                ) : null}
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </Modal>
  );
}
