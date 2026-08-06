import { Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { supabase } from "../lib/supabase";

const BUCKET = "documents";
const DEFAULT_FOLDER = "plan-item-attachments";

export type UploadedTripAttachment = {
  kind: string;
  url: string;
  filename: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  metadata?: any;
};

export interface UploadOptions {
  /** Carpeta dentro del bucket "documents" (por defecto "plan-item-attachments") */
  folder?: string;
  /** Filtro de tipo para el selector, ej. imágenes únicamente (por defecto: cualquier archivo) */
  accept?: string;
}

function safeExt(name?: string | null) {
  const ext = (name || "").split(".").pop()?.trim();
  return ext || "bin";
}

function safeFilename(name?: string | null) {
  const base = (name || `file-${Date.now()}`).trim();
  return base.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function attachmentKind(mimeType?: string | null, filename?: string | null) {
  const mime = (mimeType || "").toLowerCase();
  const name = (filename || "").toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  return "file";
}

async function uploadFileBlob(file: Blob, filename: string, mimeType: string | null | undefined, folder: string): Promise<UploadedTripAttachment | null> {
  const ext = safeExt(filename);
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: mimeType || file.type || undefined,
  });

  if (error) {
    console.error("Attachment upload error:", error.message);
    return null;
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return {
    kind: attachmentKind(mimeType || file.type, filename),
    url: data.publicUrl,
    filename,
    mimeType: mimeType || file.type || null,
    sizeBytes: typeof file.size === "number" ? file.size : null,
  };
}

async function pickWebFiles(folder: string, accept: string): Promise<UploadedTripAttachment[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = accept;
    input.style.position = "fixed";
    input.style.top = "-1000px";
    input.style.left = "-1000px";
    input.style.opacity = "0";
    document.body.appendChild(input);

    let settled = false;
    const finish = (value: UploadedTripAttachment[]) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("focus", onWindowFocus);
      if (input.parentNode) input.parentNode.removeChild(input);
      resolve(value);
    };

    const onWindowFocus = () => {
      setTimeout(() => {
        if (!settled && !input.files?.length) finish([]);
      }, 500);
    };
    window.addEventListener("focus", onWindowFocus);

    input.oncancel = () => finish([]);

    input.onchange = async () => {
      const files = Array.from(input.files || []);
      if (files.length === 0) {
        finish([]);
        return;
      }

      const uploaded = await Promise.all(
        files.map((file) => uploadFileBlob(file, safeFilename(file.name), file.type || null, folder))
      );
      finish(uploaded.filter((file): file is UploadedTripAttachment => !!file));
    };

    input.click();
  });
}

async function pickNativeFiles(folder: string, accept: string): Promise<UploadedTripAttachment[]> {
  const result = await DocumentPicker.getDocumentAsync({
    multiple: true,
    copyToCacheDirectory: true,
    type: accept,
  });

  if (result.canceled) return [];

  const uploaded = await Promise.all(
    result.assets.map(async (asset) => {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      return uploadFileBlob(blob, safeFilename(asset.name), asset.mimeType || null, folder);
    })
  );

  return uploaded.filter((file): file is UploadedTripAttachment => !!file);
}

export async function pickAndUploadTripAttachments(options?: UploadOptions): Promise<UploadedTripAttachment[]> {
  const folder = options?.folder ?? DEFAULT_FOLDER;
  const accept = options?.accept ?? "*/*";
  if (Platform.OS === "web") {
    return pickWebFiles(folder, accept);
  }
  return pickNativeFiles(folder, accept);
}

/** Igual que pickAndUploadTripAttachments pero para flujos de un único archivo (escaneo de documento). */
export async function pickAndUploadSingleTripAttachment(options?: UploadOptions): Promise<UploadedTripAttachment | null> {
  const files = await pickAndUploadTripAttachments(options);
  return files[0] ?? null;
}
