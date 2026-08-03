// src/utils/destinationRequirements.ts

// Países UE (ISO2). Suficiente para la única regla que afirmamos con confianza:
// pasaporte/DNI UE viajando dentro de la UE. No cubre Schengen no-UE (Suiza, Noruega...)
// a propósito: preferimos no afirmar nada sobre esos casos antes que afirmar algo impreciso.
const EU_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE",
]);

export interface DestinationRequirement {
  key: string;
  label: string;
  /** true = check verde, false = no se muestra como negativo, solo se omite */
  satisfied: true;
}

/**
 * Heurística deliberadamente conservadora: solo afirma lo que podemos garantizar
 * (viaje UE-UE). Para cualquier otro caso no inventamos reglas de visado/vacunas.
 * Usar siempre junto al disclaimer de DESTINATION_REQUIREMENTS_DISCLAIMER.
 */
export function getDestinationRequirements(
  nationalityCountry: string | null | undefined,
  destinationCountry: string | null | undefined
): DestinationRequirement[] {
  const nat = (nationalityCountry || "").toUpperCase();
  const dest = (destinationCountry || "").toUpperCase();

  if (nat && dest && EU_COUNTRIES.has(nat) && EU_COUNTRIES.has(dest)) {
    return [
      { key: "no-visa-eu", label: "No se requiere visado (UE)", satisfied: true },
      { key: "ehic-recommended", label: "Tarjeta sanitaria europea recomendada", satisfied: true },
    ];
  }

  return [];
}

export const DESTINATION_REQUIREMENTS_DISCLAIMER =
  "Información orientativa — verifica siempre los requisitos oficiales antes de viajar.";
