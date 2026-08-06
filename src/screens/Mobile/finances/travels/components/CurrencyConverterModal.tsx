import React, { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Platform } from "react-native";
import Modal from "react-native-modal";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../../../../theme/theme";
import { toEur, fromEur, preloadRates } from "../../../../../utils/exchangeRate";

interface Props {
  visible: boolean;
  onClose: () => void;
  currencyCode: string;
  currencyName: string;
}

function formatNumber(n: number): string {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CurrencyConverterModal({ visible, onClose, currencyCode, currencyName }: Props) {
  const [eurStr, setEurStr] = useState("10");
  const [destStr, setDestStr] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const editingRef = useRef<"eur" | "dest">("eur");

  useEffect(() => {
    if (!visible) return;
    preloadRates().catch(() => null);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    const run = async () => {
      setError(false);
      if (editingRef.current === "eur") {
        const n = Number(eurStr.replace(",", "."));
        if (!isFinite(n)) {
          setDestStr("");
          return;
        }
        setLoading(true);
        const result = await fromEur(n, currencyCode);
        if (cancelled) return;
        setLoading(false);
        if (result == null) setError(true);
        else setDestStr(formatNumber(result));
      } else {
        const n = Number(destStr.replace(",", "."));
        if (!isFinite(n)) {
          setEurStr("");
          return;
        }
        setLoading(true);
        const result = await toEur(n, currencyCode);
        if (cancelled) return;
        setLoading(false);
        if (result == null) setError(true);
        else setEurStr(formatNumber(result));
      }
    };
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eurStr, destStr, visible, currencyCode]);

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      backdropOpacity={0.4}
      style={{ justifyContent: "flex-end", margin: 0 }}
    >
      <View className="bg-white rounded-t-3xl p-5 pb-8">
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: "800", color: "#0F172A" }}>Conversor de moneda</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={22} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <Text style={{ fontSize: 12, fontWeight: "700", color: "#9CA3AF", marginBottom: 6 }}>EUROS</Text>
        <TextInput
          value={eurStr}
          onChangeText={(t) => {
            editingRef.current = "eur";
            setEurStr(t);
          }}
          keyboardType="decimal-pad"
          placeholder="0,00"
          style={{
            borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
            fontSize: 18, fontWeight: "800", color: "#0F172A", marginBottom: 16,
            ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
          }}
        />

        <View style={{ alignItems: "center", marginBottom: 16 }}>
          <Ionicons name="swap-vertical" size={18} color="#9CA3AF" />
        </View>

        <Text style={{ fontSize: 12, fontWeight: "700", color: "#9CA3AF", marginBottom: 6 }}>
          {currencyName.toUpperCase()} ({currencyCode})
        </Text>
        <TextInput
          value={destStr}
          onChangeText={(t) => {
            editingRef.current = "dest";
            setDestStr(t);
          }}
          keyboardType="decimal-pad"
          placeholder="0,00"
          style={{
            borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
            fontSize: 18, fontWeight: "800", color: "#0F172A",
            ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
          }}
        />

        <View style={{ height: 20, marginTop: 10, alignItems: "center" }}>
          {loading && <ActivityIndicator size="small" color={colors.primary} />}
          {!loading && error && (
            <Text style={{ fontSize: 12, color: "#DC2626", fontWeight: "600" }}>No se pudo obtener el cambio ahora mismo</Text>
          )}
        </View>
      </View>
    </Modal>
  );
}
