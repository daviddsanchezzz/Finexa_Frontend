// src/components/RecurringScopeModal.tsx
import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import Modal from "react-native-modal";
import { Ionicons } from "@expo/vector-icons";

export type RecurringScope = "single" | "future" | "series";
export type RecurringMode = "update" | "delete";

interface Props {
  visible: boolean;
  mode: RecurringMode;
  onSelect: (scope: RecurringScope) => void;
  onClose: () => void;
}

export default function RecurringScopeModal({
  visible,
  mode,
  onSelect,
  onClose,
}: Props) {
  const [selectedScope, setSelectedScope] = useState<RecurringScope | null>(
    null
  );

  // Limpia selección al abrir/cerrar
  useEffect(() => {
    if (!visible) {
      setSelectedScope(null);
    }
  }, [visible]);

  const isDelete = mode === "delete";
  const accentColor = isDelete ? "#ef4444" : "#2563eb";
  const softAccent = isDelete ? "#fee2e2" : "#dbeafe";
  const iconName = isDelete ? "trash-outline" : "repeat-outline";
  const title = isDelete
    ? "Eliminar transacción"
    : "Editar transacción";
  const subtitle = isDelete
    ? "¿Sobre qué parte de la serie?"
    : "¿Dónde aplicar los cambios?";

  const scopes: { key: RecurringScope; label: string; helper: string }[] = [
    {
      key: "single",
      label: "Solo esta",
      helper: "Solo afecta a esta transacción.",
    },
    {
      key: "future",
      label: "Solo futuras",
      helper: "Desde esta en adelante.",
    },
    {
      key: "series",
      label: "Toda la transacciones",
      helper: "Todas las transacciones de la serie.",
    },
  ];

  const handleConfirm = () => {
    if (!selectedScope) return;
    onSelect(selectedScope);
  };

  const renderRadio = (scope: RecurringScope) => {
    const active = selectedScope === scope;
    return (
      <View
        className="w-5 h-5 rounded-full mr-3 items-center justify-center"
        style={{
          borderWidth: 2,
          borderColor: active ? accentColor : "#d1d5db",
        }}
      >
        {active && (
          <View
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
        )}
      </View>
    );
  };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      backdropOpacity={0.6}
      animationIn="fadeInUp"
      animationOut="fadeOutDown"
      useNativeDriver
    >
      <View className="bg-white rounded-3xl p-6">
        {/* Header */}
        <View className="flex-row items-center mb-4">
          <View
            style={{ backgroundColor: softAccent }}
            className="w-10 h-10 rounded-full items-center justify-center mr-3"
          >
            <Ionicons name={iconName as any} size={20} color={accentColor} />
          </View>
          <View>
            <Text className="text-[15px] font-semibold text-gray-900">
              {title}
            </Text>
            <Text className="text-[13px] text-gray-500 mt-0.5">
              {subtitle}
            </Text>
          </View>
        </View>

        {/* Opciones (seleccionables, sin acción inmediata) */}
        <View className="space-y-2 mb-5">
          {scopes.map((opt) => {
            const active = selectedScope === opt.key;
            const isSeries = opt.key === "series";

            return (
              <TouchableOpacity
                key={opt.key}
                activeOpacity={0.8}
                onPress={() => setSelectedScope(opt.key)}
                className="flex-row items-center p-3 rounded-2xl"
                style={{
                  backgroundColor: active
                    ? isDelete
                      ? softAccent
                      : "#eff6ff"
                    : "#f9fafb",
                  borderWidth: active ? 1 : 1,
                  borderColor: active
                    ? isDelete
                      ? accentColor
                      : "#bfdbfe"
                    : "#e5e7eb",
                }}
              >
                {renderRadio(opt.key)}
                <View className="flex-1">
                  <Text
                    className="text-[15px] font-semibold"
                    style={{
                      color:
                        active && isSeries
                          ? accentColor
                          : "#111827",
                    }}
                  >
                    {opt.label}
                  </Text>
                  <Text className="text-[12px] text-gray-500 mt-0.5">
                    {opt.helper}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Botones acción */}
        <View className="flex-row gap-3">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onClose}
            className="flex-1 py-3 rounded-full bg-gray-100"
          >
            <Text className="text-center text-[15px] font-semibold text-gray-700">
              Cancelar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={selectedScope ? 0.8 : 1}
            onPress={handleConfirm}
            disabled={!selectedScope}
            className="flex-1 py-3 rounded-full"
            style={{
              backgroundColor: selectedScope ? accentColor : "#e5e7eb",
            }}
          >
            <Text className="text-center text-[15px] font-semibold text-white">
              Confirmar
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
