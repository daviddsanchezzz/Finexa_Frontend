// src/utils/personalDocumentTypes.ts
//
// Config de documentos personales, reutilizables entre viajes: pasaporte,
// DNI, visados de larga duración, vacunas, tarjeta sanitaria europea (EHIC),
// tarjeta sanitaria privada y carnet de conducir (nacional e internacional).
// Se gestionan todos desde "Mis documentos" (MyDocumentsScreen).
//
// El seguro de viaje NO vive aquí: es específico de cada viaje (se compra
// una vez por viaje) y se gestiona desde la pantalla Documentos del viaje.

import type { UserDocumentType } from "../hooks/useUserDocuments";
import { type DocTypeConfig, type DocLike, getMeta, fmtShort } from "./documentTypeConfig";

/** Tipos que se pueden repetir (varias vacunas, varios visados) frente a los "de slot único" (pasaporte, DNI). */
export const MULTI_INSTANCE_PERSONAL_TYPES: UserDocumentType[] = ["visa", "vaccine"];

export const PERSONAL_DOC_TYPE_CONFIGS: Record<UserDocumentType, DocTypeConfig> = {
  passport: {
    type: "passport",
    title: "Pasaporte",
    emoji: "🛂",
    attachLabel: "Escanear pasaporte",
    saveLabel: "Guardar",
    fields: [
      { key: "country", label: "País emisor", type: "country" },
      { key: "documentNumber", label: "Nº de documento", type: "text", optional: true, autoCapitalize: "characters" },
      { key: "expiryDate", label: "Caduca", type: "date", optional: true },
    ],
    summary: (doc: DocLike) => (doc.expiryDate ? `Caduca ${fmtShort(doc.expiryDate)}` : "Foto guardada · sin caducidad indicada"),
  },
  dni: {
    type: "dni",
    title: "DNI / Carnet de identidad",
    emoji: "🪪",
    attachLabel: "Escanear DNI",
    saveLabel: "Guardar",
    fields: [
      { key: "country", label: "País emisor", type: "country" },
      { key: "documentNumber", label: "Nº de documento", type: "text", optional: true, autoCapitalize: "characters" },
      { key: "expiryDate", label: "Caduca", type: "date", optional: true },
    ],
    summary: (doc: DocLike) => (doc.expiryDate ? `Caduca ${fmtShort(doc.expiryDate)}` : "Foto guardada · sin caducidad indicada"),
  },
  visa: {
    type: "visa",
    title: "Visado",
    emoji: "🛃",
    attachLabel: "Escanear o subir el visado (PDF o foto)",
    saveLabel: "Guardar visado",
    fields: [
      { key: "country", label: "País de destino", type: "country" },
      { key: "metadata.visaType", label: "Tipo de visado", placeholder: "Turístico — múltiples entradas", type: "text", optional: true },
      { key: "metadata.validFrom", label: "Válido desde", type: "date", optional: true },
      { key: "expiryDate", label: "Válido hasta", type: "date", optional: true },
      { key: "documentNumber", label: "Nº de referencia/solicitud", type: "text", optional: true, autoCapitalize: "characters" },
    ],
    summary: (doc: DocLike) => {
      const parts = [getMeta(doc, "visaType"), doc.expiryDate ? `Hasta ${fmtShort(doc.expiryDate)}` : null];
      return parts.filter(Boolean).join(" · ") || "Añadido";
    },
  },
  vaccine: {
    type: "vaccine",
    title: "Vacuna",
    emoji: "💉",
    attachLabel: "Adjuntar certificado (PDF/foto)",
    saveLabel: "Guardar vacuna",
    fields: [
      { key: "metadata.vaccineName", label: "Vacuna", placeholder: "Fiebre amarilla", type: "text" },
      { key: "country", label: "País (opcional)", type: "country", optional: true },
      { key: "metadata.doseDate", label: "Fecha de dosis", type: "date", optional: true },
      { key: "metadata.validity", label: "Vigencia", placeholder: "10 años", type: "text", optional: true },
    ],
    summary: (doc: DocLike) => {
      const parts = [getMeta(doc, "doseDate") ? fmtShort(getMeta(doc, "doseDate")) : null, getMeta(doc, "validity")];
      return parts.filter(Boolean).join(" · ") || "Añadida";
    },
  },
  ehic: {
    type: "ehic",
    title: "Tarjeta sanitaria europea",
    emoji: "🩺",
    attachLabel: "Escanear tarjeta física (o importar desde tu sanidad)",
    saveLabel: "Guardar tarjeta",
    fields: [
      { key: "documentNumber", label: "Nº de tarjeta", type: "text" },
      { key: "expiryDate", label: "Caduca", type: "date", optional: true },
    ],
    summary: (doc: DocLike) => {
      const parts = [doc.documentNumber, doc.expiryDate ? `Caduca ${fmtShort(doc.expiryDate)}` : null];
      return parts.filter(Boolean).join(" · ") || "Añadida";
    },
  },
  private_health_insurance: {
    type: "private_health_insurance",
    title: "Tarjeta sanitaria privada",
    emoji: "🏥",
    attachLabel: "Adjuntar tarjeta/póliza (PDF/foto)",
    saveLabel: "Guardar tarjeta",
    fields: [
      { key: "provider", label: "Aseguradora", placeholder: "Ej: Sanitas, Adeslas...", type: "text" },
      { key: "documentNumber", label: "Nº de tarjeta/póliza", type: "text", optional: true },
      { key: "expiryDate", label: "Caduca", type: "date", optional: true },
      { key: "metadata.assistancePhone", label: "Teléfono de asistencia 24h", type: "text", optional: true },
    ],
    summary: (doc: DocLike) => doc.provider || "Añadida",
  },
  driving_license: {
    type: "driving_license",
    title: "Carnet de conducir",
    emoji: "🚗",
    attachLabel: "Escanear carnet de conducir",
    saveLabel: "Guardar carnet",
    fields: [
      { key: "documentNumber", label: "Nº de carnet", type: "text" },
      { key: "expiryDate", label: "Caduca", type: "date", optional: true },
      { key: "metadata.issuingCountry", label: "País expedidor", type: "text", optional: true },
    ],
    summary: (doc: DocLike) => (doc.expiryDate ? `Caduca ${fmtShort(doc.expiryDate)}` : "Añadido"),
  },
  driving_license_international: {
    type: "driving_license_international",
    title: "Carnet de conducir internacional",
    emoji: "🌍",
    attachLabel: "Escanear carnet internacional",
    saveLabel: "Guardar carnet",
    fields: [
      { key: "documentNumber", label: "Nº de carnet", type: "text" },
      { key: "metadata.validFrom", label: "Válido desde", type: "date", optional: true },
      { key: "expiryDate", label: "Válido hasta", type: "date", optional: true },
    ],
    summary: (doc: DocLike) => (doc.expiryDate ? `Válido hasta ${fmtShort(doc.expiryDate)}` : "Añadido"),
  },
};

export function getPersonalDocTypeConfig(type: UserDocumentType): DocTypeConfig {
  return PERSONAL_DOC_TYPE_CONFIGS[type];
}

export const PERSONAL_DOC_TYPES_ORDER: UserDocumentType[] = [
  "passport",
  "dni",
  "visa",
  "vaccine",
  "ehic",
  "private_health_insurance",
  "driving_license",
  "driving_license_international",
];
