import { create } from "zustand";

interface Wallet {
  id: number;
  name: string;
  emoji: string;
  currency: string;
}

interface FiltersState {
  selectedWallet: Wallet | null;
  dateFrom: string | null;
  dateTo: string | null;
  dateLabel: string;
  setWallet: (wallet: Wallet | null) => void;
  setDateRange: (from: string | null, to: string | null, label: string) => void;
  reset: () => void;
}

const defaultLabel = () =>
  new Date()
    .toLocaleString("es-ES", { month: "long", year: "numeric" })
    .replace("de ", "");

export const useFiltersStore = create<FiltersState>((set) => ({
  selectedWallet: null,
  dateFrom: null,
  dateTo: null,
  dateLabel: defaultLabel(),
  setWallet: (wallet) => set({ selectedWallet: wallet }),
  setDateRange: (from, to, label) =>
    set({ dateFrom: from, dateTo: to, dateLabel: label }),
  reset: () =>
    set({
      selectedWallet: null,
      dateFrom: null,
      dateTo: null,
      dateLabel: defaultLabel(),
    }),
}));
