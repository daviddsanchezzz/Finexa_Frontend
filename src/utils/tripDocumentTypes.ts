// src/utils/tripDocumentTypes.ts
//
// Config de tipos de documento ligados a UN viaje concreto. Solo el seguro
// de viaje vive aquí de verdad — visado, vacunas, EHIC, sanitaria privada y
// carnet de conducir son documentos personales reutilizables entre viajes y
// se gestionan desde "Mis documentos" (ver personalDocumentTypes.ts).

import type { TripDocumentType } from "../hooks/useTripDocuments";
import { type DocTypeConfig, type DocLike, fmtShort } from "./documentTypeConfig";

export const TRIP_DOC_TYPE_CONFIGS: Record<TripDocumentType, DocTypeConfig> = {
  travel_insurance: {
    type: "travel_insurance",
    title: "Seguro de viaje",
    emoji: "🛡️",
    attachLabel: "Adjuntar póliza (PDF)",
    saveLabel: "Guardar seguro",
    fields: [
      { key: "provider", label: "Aseguradora", placeholder: "Ej: Mapfre, Allianz...", type: "text" },
      { key: "referenceCode", label: "Nº de póliza", type: "text", optional: true, autoCapitalize: "characters" },
      { key: "metadata.medicalCoverage", label: "Cobertura médica", placeholder: "Hasta 100.000€", type: "text", optional: true },
      { key: "metadata.cancellationIncluded", label: "Cancelación incluida", type: "boolean", optional: true },
      { key: "metadata.assistancePhone", label: "Teléfono de asistencia 24h", type: "text", optional: true },
    ],
    summary: (doc: DocLike) => {
      const parts = [doc.provider, doc.expiryDate ? `Caduca ${fmtShort(doc.expiryDate)}` : null];
      return parts.filter(Boolean).join(" · ") || "Añadido";
    },
  },
  // No usados desde esta pantalla (reservas de coche/alojamiento/actividad ya
  // se gestionan como plan items), pero deben cubrirse por exhaustividad del enum.
  car_rental: {
    type: "car_rental", title: "Alquiler de coche", emoji: "🚙",
    attachLabel: "Adjuntar contrato", saveLabel: "Guardar",
    fields: [{ key: "provider", label: "Empresa", type: "text" }],
    summary: (doc) => doc.provider || "Añadido",
  },
  accommodation_booking: {
    type: "accommodation_booking", title: "Reserva de alojamiento", emoji: "🏨",
    attachLabel: "Adjuntar reserva", saveLabel: "Guardar",
    fields: [{ key: "provider", label: "Alojamiento", type: "text" }],
    summary: (doc) => doc.provider || "Añadida",
  },
  activity_booking: {
    type: "activity_booking", title: "Reserva de actividad", emoji: "🎟️",
    attachLabel: "Adjuntar reserva", saveLabel: "Guardar",
    fields: [{ key: "provider", label: "Actividad", type: "text" }],
    summary: (doc) => doc.provider || "Añadida",
  },
  visa: {
    type: "visa", title: "Visado", emoji: "🛃",
    attachLabel: "Escanear o subir el visado", saveLabel: "Guardar",
    fields: [{ key: "referenceCode", label: "Nº de referencia", type: "text", optional: true }],
    summary: (doc) => doc.referenceCode || "Añadido",
  },
  vaccine: {
    type: "vaccine", title: "Vacuna", emoji: "💉",
    attachLabel: "Adjuntar certificado", saveLabel: "Guardar",
    fields: [{ key: "provider", label: "Vacuna", type: "text" }],
    summary: (doc) => doc.provider || "Añadida",
  },
  ehic: {
    type: "ehic", title: "Tarjeta sanitaria europea", emoji: "🩺",
    attachLabel: "Escanear tarjeta", saveLabel: "Guardar",
    fields: [{ key: "referenceCode", label: "Nº de tarjeta", type: "text" }],
    summary: (doc) => doc.referenceCode || "Añadida",
  },
  private_health_insurance: {
    type: "private_health_insurance", title: "Tarjeta sanitaria privada", emoji: "🏥",
    attachLabel: "Adjuntar tarjeta", saveLabel: "Guardar",
    fields: [{ key: "provider", label: "Aseguradora", type: "text" }],
    summary: (doc) => doc.provider || "Añadida",
  },
  driving_license: {
    type: "driving_license", title: "Carnet de conducir", emoji: "🚗",
    attachLabel: "Escanear carnet", saveLabel: "Guardar",
    fields: [{ key: "referenceCode", label: "Nº de carnet", type: "text" }],
    summary: (doc) => doc.referenceCode || "Añadido",
  },
  driving_license_international: {
    type: "driving_license_international", title: "Carnet de conducir internacional", emoji: "🌍",
    attachLabel: "Escanear carnet", saveLabel: "Guardar",
    fields: [{ key: "referenceCode", label: "Nº de carnet", type: "text" }],
    summary: (doc) => doc.referenceCode || "Añadido",
  },
};

export function getTripDocTypeConfig(type: TripDocumentType): DocTypeConfig {
  return TRIP_DOC_TYPE_CONFIGS[type];
}
