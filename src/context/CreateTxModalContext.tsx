// src/context/CreateTxModalContext.tsx
import React, { createContext, useContext } from "react";

/**
 * Prefill opcional para abrir el modal con datos precargados
 */
export type CreateTxPrefill = {
  walletId?: number;
  type?: "expense" | "income" | "transfer";
  date?: string; // ISO
  assetId?: number;
};

/**
 * Datos mínimos para editar.
 * Puedes dejarlo en `any` si tu app todavía no tiene un tipo formal de tx,
 * pero esto te ayuda a no romper TS y a tener intellisense.
 */
export type EditTxData = {
  id: number;
  type: "income" | "expense" | "transfer";
  amount: number;
  date: string;

  // opcionales habituales
  wallet?: { id: number; name?: string } | null;
  category?: any;
  subcategory?: any;
  description?: string | null;
  note?: string | null;

  asset?: { id: number; name?: string } | null;
  fromWallet?: any;
  toWallet?: any;

  // flags
  isRecurring?: boolean;
  active?: boolean;
  excludeFromStats?: boolean;
};

/**
 * API pública del modal
 */
export type CreateTxModalContextValue = {
  openCreateTx: (prefill?: CreateTxPrefill) => void;

  // ✅ NUEVO: abrir el modal en modo edición
  openEditTx: (tx: EditTxData) => void;

  closeCreateTx: () => void;
};

/**
 * Context interno
 */
const CreateTxModalContext = createContext<CreateTxModalContextValue | null>(null);

/**
 * Hook de consumo
 */
export function useCreateTxModal() {
  const ctx = useContext(CreateTxModalContext);
  if (!ctx) {
    throw new Error("useCreateTxModal debe usarse dentro de <CreateTxModalProvider />");
  }
  return ctx;
}

/**
 * Provider
 * 👉 lo monta el DesktopShellLayout
 */
export function CreateTxModalProvider({
  value,
  children,
}: {
  value: CreateTxModalContextValue;
  children: React.ReactNode;
}) {
  return <CreateTxModalContext.Provider value={value}>{children}</CreateTxModalContext.Provider>;
}
