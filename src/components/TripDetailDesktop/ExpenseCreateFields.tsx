// src/components/TripDetailDesktop/ExpenseCreateFields.tsx
import React, { useMemo } from "react";
import { View, Text, Platform } from "react-native";
import { UI } from "./ui";
import { BudgetCategoryType, TripPlanItemType } from "../../types/enums/travel";

type Props = {
  px: (n: number) => number;
  fs: (n: number) => number;

  // Reutilizamos tus “controls” del modal
  Field: React.ComponentType<{
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    autoCapitalize?: "none" | "sentences" | "words" | "characters";
    px: (n: number) => number;
    fs: (n: number) => number;
  }>;
  DateTimeField: React.ComponentType<{
    label: string;
    value: Date | null;
    onChange: (d: Date) => void;
    placeholder?: string;
    px: (n: number) => number;
    fs: (n: number) => number;
  }>;
  Row2: React.ComponentType<{
    left: React.ReactNode;
    right: React.ReactNode;
    px: (n: number) => number;
  }>;

  // Expense data
  type?: TripPlanItemType; // normalmente TripPlanItemType.expense
  title: string;
  setTitle: (v: string) => void;

  amountStr: string;
  setAmountStr: (v: string) => void;

  currency: string;
  setCurrency: (v: string) => void;

  category: BudgetCategoryType;
  setCategory: (v: BudgetCategoryType) => void;

  occurredAt: Date | null;
  setOccurredAt: (d: Date | null) => void;

  notes: string;
  setNotes: (v: string) => void;

  valid: boolean;
};

function labelForCategory(c: BudgetCategoryType) {
  switch (c) {
    case BudgetCategoryType.accommodation:
      return "Alojamiento";
    case BudgetCategoryType.transport_main:
      return "Transporte (principal)";
    case BudgetCategoryType.transport_local:
      return "Transporte (local)";
    case BudgetCategoryType.food:
      return "Comida";
    case BudgetCategoryType.activities:
      return "Actividades";
    case BudgetCategoryType.leisure:
      return "Ocio";
    case BudgetCategoryType.shopping:
      return "Compras";
    case BudgetCategoryType.other:
    default:
      return "Otros";
  }
}

export function ExpenseCreateFields({
  px,
  fs,
  Field,
  DateTimeField,
  Row2,

  type = TripPlanItemType.expense,
  title,
  setTitle,

  amountStr,
  setAmountStr,

  currency,
  setCurrency,

  category,
  setCategory,

  occurredAt,
  setOccurredAt,

  notes,
  setNotes,

  valid,
}: Props) {
  const categories = useMemo(
    () => [
      BudgetCategoryType.food,
      BudgetCategoryType.transport_main,
      BudgetCategoryType.transport_local,
      BudgetCategoryType.accommodation,
      BudgetCategoryType.activities,
      BudgetCategoryType.leisure,
      BudgetCategoryType.shopping,
      BudgetCategoryType.other,
    ],
    []
  );

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c, label: labelForCategory(c) })),
    [categories]
  );

  return (
    <View style={{ gap: px(12), paddingVertical: px(6) }}>
      <Row2
        px={px}
        left={
          <Field
            label="IMPORTE"
            value={amountStr}
            onChange={setAmountStr}
            placeholder=""
            autoCapitalize="none"
            px={px}
            fs={fs}
          />
        }
        right={
          <Field
            label="MONEDA"
            value={currency}
            onChange={(v) => setCurrency((v || "").trim().toUpperCase())}
            placeholder="EUR"
            autoCapitalize="characters"
            px={px}
            fs={fs}
          />
        }
      />

      <Field
        label="CONCEPTO"
        value={title}
        onChange={setTitle}
        placeholder=""
        autoCapitalize="sentences"
        px={px}
        fs={fs}
      />

      <DateTimeField
        label="FECHA Y HORA"
        value={occurredAt}
        onChange={(d) => setOccurredAt(d)}
        placeholder="Selecciona"
        px={px}
        fs={fs}
      />

      <View style={{ gap: px(8) }}>
        <Text style={{ fontSize: fs(12), fontWeight: "800", color: UI.muted, letterSpacing: 0.4 }}>
          CATEGORÍA
        </Text>

        {/* ✅ Select (web) / Select (native fallback) */}
        {Platform.OS === "web" ? (
          <View
            style={{
              height: px(42),
              borderRadius: px(12),
              borderWidth: 1,
              borderColor: "rgba(226,232,240,0.95)",
              paddingHorizontal: px(12),
              justifyContent: "center",
              backgroundColor: "white",
            }}
          >
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as BudgetCategoryType)}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                outline: "none",
                fontSize: fs(13),
                fontWeight: 800,
                color: UI.text,
                background: "transparent",
              } as any}
            >
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </View>
        ) : (
          // Fallback nativo sin librerías: "select" simple usando el mismo Field (editable).
          // Si ya usas un Picker/lib, aquí se sustituye por ese componente.
          <Field
            label="CATEGORÍA (texto)"
            value={labelForCategory(category)}
            onChange={(v) => {
              // intenta mapear por label (si coincide) y si no, no cambia
              const found = categoryOptions.find(
                (o) => o.label.toLowerCase() === (v || "").trim().toLowerCase()
              );
              if (found) setCategory(found.value);
            }}
            placeholder="Escribe: Comida, Ocio, ..."
            autoCapitalize="sentences"
            px={px}
            fs={fs}
          />
        )}
      </View>

      <Field
        label="NOTAS (opcional)"
        value={notes}
        onChange={setNotes}
        placeholder=""
        autoCapitalize="sentences"
        px={px}
        fs={fs}
      />
    </View>
  );
}
