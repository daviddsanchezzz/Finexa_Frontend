// src/utils/documentTypeConfig.ts
//
// Config declarativa compartida por tipo de documento (personales en "Mis
// documentos" y de viaje en "Documentos"): qué campos pedir en el modal y
// cómo resumir el documento guardado en una fila. Los campos "top-level"
// (provider/country/documentNumber/expiryDate) van a columnas propias del
// registro; el resto vive en su columna `metadata` (JSON).

export type DocFieldType = "text" | "date" | "boolean" | "country";

export interface DocFieldConfig {
  /** "provider" | "country" | "documentNumber" | "expiryDate" | "metadata.xxx" */
  key: string;
  label: string;
  placeholder?: string;
  type: DocFieldType;
  optional?: boolean;
  autoCapitalize?: "characters" | "words" | "none";
}

export interface DocLike {
  id: number;
  type: string;
  provider?: string | null;
  country?: string | null;
  documentNumber?: string | null;
  expiryDate?: string | null;
  metadata?: Record<string, any> | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileMimeType?: string | null;
  [key: string]: any;
}

export interface DocTypeConfig {
  type: string;
  title: string;
  emoji: string;
  attachLabel: string;
  saveLabel: string;
  fields: DocFieldConfig[];
  summary: (doc: DocLike) => string;
}

export function getMeta(doc: DocLike, key: string): any {
  return doc.metadata?.[key] ?? null;
}

export function fmtShort(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}
