import { create } from "zustand";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export interface ActionSheetButton {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

export interface ActionSheetState {
  title: string;
  message?: string;
  buttons: ActionSheetButton[];
}

interface UIState {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType) => void;
  dismissToast: (id: string) => void;

  actionSheet: ActionSheetState | null;
  showActionSheet: (title: string, message: string | undefined, buttons: ActionSheetButton[]) => void;
  hideActionSheet: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  toasts: [],
  showToast: (message, type = "info") => {
    const id = `${Date.now()}-${Math.random()}`;
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3500);
  },
  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  actionSheet: null,
  showActionSheet: (title, message, buttons) => set({ actionSheet: { title, message, buttons } }),
  hideActionSheet: () => set({ actionSheet: null }),
}));
