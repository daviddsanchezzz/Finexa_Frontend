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
 * API pública del modal
 */
type CreateTxModalContextValue = {
  openCreateTx: (prefill?: CreateTxPrefill) => void;
  closeCreateTx: () => void;
};

/**
 * Context interno
 */
const CreateTxModalContext = createContext<CreateTxModalContextValue | null>(null);

/**
 * Hook de consumo
 * 👉 usar en cualquier screen / componente dentro del DesktopShell
 */
export function useCreateTxModal() {
  const ctx = useContext(CreateTxModalContext);

  if (!ctx) {
    throw new Error(
      "useCreateTxModal debe usarse dentro de <CreateTxModalProvider />"
    );
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
  return (
    <CreateTxModalContext.Provider value={value}>
      {children}
    </CreateTxModalContext.Provider>
  );
}
