// src/screens/Trips/components/TripTransactionSelectorModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../../../../api/api";
import { colors } from "../../../../theme/theme";

export interface TransactionForSelector {
  id: number;
  description?: string;
  amount: number | string;
  date?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (tx: TransactionForSelector) => void;
}

export default function TripTransactionSelectorModal({
  visible,
  onClose,
  onSelect,
}: Props) {
  const [transactions, setTransactions] = useState<TransactionForSelector[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      // Ajusta este endpoint / params a cómo tengas montado tu backend
      const res = await api.get("/transactions");
      const data: TransactionForSelector[] = res.data || [];

      // Ordenar de más antiguas a más nuevas por fecha
      const sorted = [...data].sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        return da - db;
      });

      setTransactions(sorted);
    } catch (err) {
      console.error("❌ Error al cargar transacciones para selector:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchTransactions();
    }
  }, [visible]);

  const filtered = useMemo(() => {
    if (!search.trim()) return transactions;
    const q = search.toLowerCase();
    return transactions.filter((tx) =>
      (tx.description || "").toLowerCase().includes(q)
    );
  }, [transactions, search]);

  const renderItem = ({ item }: { item: TransactionForSelector }) => {
    const amount =
      typeof item.amount === "number"
        ? item.amount
        : Number(item.amount) || 0;

    const dateLabel = item.date
      ? new Date(item.date).toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "";

    return (
      <TouchableOpacity
        onPress={() => onSelect(item)}
        style={{
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderBottomWidth: 1,
          borderBottomColor: "#E5E7EB",
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 999,
            backgroundColor: "#EEF2FF",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 10,
          }}
        >
          <Ionicons
            name={amount >= 0 ? "arrow-up-circle-outline" : "arrow-down-circle-outline"}
            size={18}
            color={amount >= 0 ? "#16A34A" : "#DC2626"}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{ fontSize: 13, fontWeight: "500", color: "#111827" }}
            numberOfLines={1}
          >
            {item.description || "Sin descripción"}
          </Text>
          <Text style={{ fontSize: 11, color: "#6B7280" }}>{dateLabel}</Text>
        </View>

        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: amount >= 0 ? "#16A34A" : "#DC2626",
            marginLeft: 8,
          }}
        >
          {amount.toFixed(2)} €
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.3)",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: "white",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: "80%",
            paddingBottom: 8,
          }}
        >
          {/* Header */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingTop: 10,
              paddingBottom: 6,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#111827",
              }}
            >
              Seleccionar transacción
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-outline" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Buscador */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingBottom: 8,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#F3F4F6",
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 6,
              }}
            >
              <Ionicons name="search-outline" size={16} color="#6B7280" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar por descripción"
                style={{
                  marginLeft: 6,
                  fontSize: 13,
                  color: "#111827",
                  flex: 1,
                }}
              />
            </View>
          </View>

          {/* Lista */}
          {loading ? (
            <View
              style={{
                paddingVertical: 24,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ActivityIndicator size="small" color={colors.primary} />
              <Text
                style={{ fontSize: 12, color: "#6B7280", marginTop: 8 }}
              >
                Cargando transacciones...
              </Text>
            </View>
          ) : filtered.length === 0 ? (
            <View
              style={{
                paddingVertical: 24,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 12, color: "#9CA3AF" }}>
                No hay transacciones que coincidan.
              </Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderItem}
              contentContainerStyle={{ paddingBottom: 16 }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
