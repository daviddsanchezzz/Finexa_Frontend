// src/utils/emergencyNumbers.ts

// Números de emergencia generales por país (ISO2). Lista deliberadamente corta:
// solo países donde el número es estable y de conocimiento público, para no
// arriesgarnos a mostrar un dato incorrecto en una situación de emergencia real.
const EMERGENCY_NUMBERS: Record<string, string> = {
  // UE + resto de Europa que usa el 112
  AT: "112", BE: "112", BG: "112", HR: "112", CY: "112", CZ: "112", DK: "112",
  EE: "112", FI: "112", FR: "112", DE: "112", GR: "112", HU: "112", IE: "112",
  IT: "112", LV: "112", LT: "112", LU: "112", MT: "112", NL: "112", PL: "112",
  PT: "112", RO: "112", SK: "112", SI: "112", ES: "112", SE: "112", GB: "112",
  CH: "112", NO: "112", IS: "112",
  // Norteamérica
  US: "911", CA: "911", MX: "911",
  // Oceanía
  AU: "000", NZ: "111",
};

export function getEmergencyNumber(countryCode: string | null | undefined): string | null {
  if (!countryCode) return null;
  return EMERGENCY_NUMBERS[countryCode.toUpperCase()] ?? null;
}
