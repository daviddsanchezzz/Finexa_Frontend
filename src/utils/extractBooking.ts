import { Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import api from "../api/api";
import type { BookingDraft } from "./bookingDraft";

type Picked = { kind: "web"; blob: Blob; filename: string } | { kind: "native"; uri: string; filename: string; mimeType: string };

const ACCEPT = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

function extToMime(name: string): string {
  const n = name.toLowerCase();
  if (n.endsWith(".pdf")) return "application/pdf";
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

async function pickBookingFile(): Promise<Picked | null> {
  if (Platform.OS === "web") {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ACCEPT.join(",");
      input.style.position = "fixed";
      input.style.top = "-1000px";
      input.style.opacity = "0";
      document.body.appendChild(input);
      let settled = false;
      const finish = (v: Picked | null) => {
        if (settled) return;
        settled = true;
        window.removeEventListener("focus", onFocus);
        input.parentNode?.removeChild(input);
        resolve(v);
      };
      const onFocus = () => setTimeout(() => { if (!settled && !input.files?.length) finish(null); }, 500);
      window.addEventListener("focus", onFocus);
      input.oncancel = () => finish(null);
      input.onchange = () => {
        const f = input.files?.[0];
        finish(f ? { kind: "web", blob: f, filename: f.name } : null);
      };
      input.click();
    });
  }
  const res = await DocumentPicker.getDocumentAsync({ type: ACCEPT, copyToCacheDirectory: true, multiple: false });
  if (res.canceled || !res.assets?.[0]) return null;
  const a = res.assets[0];
  const name = a.name || "reserva.jpg";
  return { kind: "native", uri: a.uri, filename: name, mimeType: a.mimeType && ACCEPT.includes(a.mimeType) ? a.mimeType : extToMime(name) };
}

/** Elige un archivo, lo manda a la IA y devuelve el borrador (null si se cancela el selector). */
export async function pickAndExtractBooking(tripId: number): Promise<BookingDraft | null> {
  const picked = await pickBookingFile();
  if (!picked) return null;
  const form = new FormData();
  if (picked.kind === "web") form.append("file", picked.blob as any, picked.filename);
  else form.append("file", { uri: picked.uri, name: picked.filename, type: picked.mimeType } as any);
  const res = await api.post(`/trips/${tripId}/extract-booking`, form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 90_000,
  });
  return res.data as BookingDraft;
}
