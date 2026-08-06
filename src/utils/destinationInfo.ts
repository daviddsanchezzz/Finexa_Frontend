// src/utils/destinationInfo.ts
//
// Datos prácticos + entrada al país, curados a mano para pasaporte/DNI
// español (UE). Lista deliberadamente acotada a destinos turísticos
// habituales — mismo espíritu que emergencyNumbers.ts: mejor decir
// claramente "no tenemos datos de este país" que arriesgarnos a mostrar
// algo desactualizado o incorrecto en un tema como visados/vacunas.
//
// Población y superficie van redondeadas a propósito (no cifras exactas):
// una cifra exacta se queda vieja cada año, una aproximada sigue siendo
// útil indefinidamente.
//
// "Orientativa" siempre: usar junto a DESTINATION_INFO_DISCLAIMER.

import type { PhraseLanguageKey } from "./travelPhrases";

export type RequirementStatus = "ok" | "info" | "required";
export type DrivingSide = "left" | "right";
export type TapWater = "potable" | "bottled";

export interface EntryRequirement {
  key: string;
  label: string;
  value: string;
  status: RequirementStatus;
}

export interface DestinationInfo {
  code: string; // ISO2
  name: string;
  eu: boolean;
  schengen: boolean;
  capital: string;
  population: string; // aprox., ej. "~59 millones"
  area: string; // aprox., ej. "~301.000 km²"
  drivingSide: DrivingSide;
  tapWater: TapWater;
  plugType: string;
  voltage: string;
  currencyCode: string;
  currencyName: string;
  language: string;
  /** Idioma para el phrasebook — omitido si el idioma local ya es español */
  phraseLanguage?: PhraseLanguageKey;
  timezone: string; // IANA
  timezoneNote?: string; // para países con varias franjas horarias
  entryRequirements: EntryRequirement[];
}

// Países UE (ISO2)
export const EU_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE",
]);

// Espacio Schengen (incluye UE + no-UE: CH, NO, IS, LI)
export const SCHENGEN_COUNTRIES = new Set([
  ...EU_COUNTRIES,
  "CH", "NO", "IS", "LI",
]);

function schengenVisa(): EntryRequirement {
  return { key: "visa", label: "Visado", value: "No requerido (Schengen)", status: "ok" };
}
function noVaccines(): EntryRequirement {
  return { key: "vaccines", label: "Vacunas", value: "Ninguna obligatoria", status: "ok" };
}
function ehic(): EntryRequirement {
  return { key: "health", label: "Sanidad", value: "Tarjeta san. europea", status: "info" };
}
function travelInsurance(): EntryRequirement {
  return { key: "health", label: "Sanidad", value: "Seguro de viaje recomendado", status: "info" };
}

const DESTINATIONS: Record<string, DestinationInfo> = {
  IT: {
    code: "IT", name: "Italia", eu: true, schengen: true,
    capital: "Roma", population: "~59 millones", area: "~301.000 km²",
    drivingSide: "right", tapWater: "potable",
    plugType: "F/L", voltage: "230V", currencyCode: "EUR", currencyName: "Euro",
    language: "Italiano", phraseLanguage: "it", timezone: "Europe/Rome",
    entryRequirements: [schengenVisa(), noVaccines(), ehic()],
  },
  FR: {
    code: "FR", name: "Francia", eu: true, schengen: true,
    capital: "París", population: "~68 millones", area: "~551.000 km²",
    drivingSide: "right", tapWater: "potable",
    plugType: "E", voltage: "230V", currencyCode: "EUR", currencyName: "Euro",
    language: "Francés", phraseLanguage: "fr", timezone: "Europe/Paris",
    entryRequirements: [schengenVisa(), noVaccines(), ehic()],
  },
  PT: {
    code: "PT", name: "Portugal", eu: true, schengen: true,
    capital: "Lisboa", population: "~10 millones", area: "~92.000 km²",
    drivingSide: "right", tapWater: "potable",
    plugType: "F", voltage: "230V", currencyCode: "EUR", currencyName: "Euro",
    language: "Portugués", phraseLanguage: "pt", timezone: "Europe/Lisbon",
    entryRequirements: [schengenVisa(), noVaccines(), ehic()],
  },
  DE: {
    code: "DE", name: "Alemania", eu: true, schengen: true,
    capital: "Berlín", population: "~84 millones", area: "~357.000 km²",
    drivingSide: "right", tapWater: "potable",
    plugType: "F", voltage: "230V", currencyCode: "EUR", currencyName: "Euro",
    language: "Alemán", phraseLanguage: "de", timezone: "Europe/Berlin",
    entryRequirements: [schengenVisa(), noVaccines(), ehic()],
  },
  GR: {
    code: "GR", name: "Grecia", eu: true, schengen: true,
    capital: "Atenas", population: "~10 millones", area: "~132.000 km²",
    drivingSide: "right", tapWater: "potable",
    plugType: "F", voltage: "230V", currencyCode: "EUR", currencyName: "Euro",
    language: "Griego", phraseLanguage: "el", timezone: "Europe/Athens",
    entryRequirements: [schengenVisa(), noVaccines(), ehic()],
  },
  NL: {
    code: "NL", name: "Países Bajos", eu: true, schengen: true,
    capital: "Ámsterdam", population: "~18 millones", area: "~41.500 km²",
    drivingSide: "right", tapWater: "potable",
    plugType: "F", voltage: "230V", currencyCode: "EUR", currencyName: "Euro",
    language: "Neerlandés", phraseLanguage: "nl", timezone: "Europe/Amsterdam",
    entryRequirements: [schengenVisa(), noVaccines(), ehic()],
  },
  AT: {
    code: "AT", name: "Austria", eu: true, schengen: true,
    capital: "Viena", population: "~9 millones", area: "~84.000 km²",
    drivingSide: "right", tapWater: "potable",
    plugType: "F", voltage: "230V", currencyCode: "EUR", currencyName: "Euro",
    language: "Alemán", phraseLanguage: "de", timezone: "Europe/Vienna",
    entryRequirements: [schengenVisa(), noVaccines(), ehic()],
  },
  PL: {
    code: "PL", name: "Polonia", eu: true, schengen: true,
    capital: "Varsovia", population: "~38 millones", area: "~313.000 km²",
    drivingSide: "right", tapWater: "potable",
    plugType: "E", voltage: "230V", currencyCode: "PLN", currencyName: "Zloty",
    language: "Polaco", phraseLanguage: "pl", timezone: "Europe/Warsaw",
    entryRequirements: [schengenVisa(), noVaccines(), ehic()],
  },
  CH: {
    code: "CH", name: "Suiza", eu: false, schengen: true,
    capital: "Berna", population: "~9 millones", area: "~41.000 km²",
    drivingSide: "right", tapWater: "potable",
    plugType: "J", voltage: "230V", currencyCode: "CHF", currencyName: "Franco suizo",
    language: "Alemán / Francés / Italiano", phraseLanguage: "de", timezone: "Europe/Zurich",
    entryRequirements: [schengenVisa(), noVaccines(), ehic()],
  },
  NO: {
    code: "NO", name: "Noruega", eu: false, schengen: true,
    capital: "Oslo", population: "~5,5 millones", area: "~324.000 km²",
    drivingSide: "right", tapWater: "potable",
    plugType: "F", voltage: "230V", currencyCode: "NOK", currencyName: "Corona noruega",
    language: "Noruego", phraseLanguage: "no", timezone: "Europe/Oslo",
    entryRequirements: [schengenVisa(), noVaccines(), ehic()],
  },
  IS: {
    code: "IS", name: "Islandia", eu: false, schengen: true,
    capital: "Reikiavik", population: "~390.000", area: "~103.000 km²",
    drivingSide: "right", tapWater: "potable",
    plugType: "F", voltage: "230V", currencyCode: "ISK", currencyName: "Corona islandesa",
    language: "Islandés", phraseLanguage: "is", timezone: "Atlantic/Reykjavik",
    entryRequirements: [schengenVisa(), noVaccines(), ehic()],
  },
  IE: {
    code: "IE", name: "Irlanda", eu: true, schengen: false,
    capital: "Dublín", population: "~5 millones", area: "~70.000 km²",
    drivingSide: "left", tapWater: "potable",
    plugType: "G", voltage: "230V", currencyCode: "EUR", currencyName: "Euro",
    language: "Inglés", phraseLanguage: "en", timezone: "Europe/Dublin",
    entryRequirements: [
      { key: "visa", label: "Visado", value: "No requerido (UE)", status: "ok" },
      noVaccines(),
      ehic(),
    ],
  },
  GB: {
    code: "GB", name: "Reino Unido", eu: false, schengen: false,
    capital: "Londres", population: "~68 millones", area: "~244.000 km²",
    drivingSide: "left", tapWater: "potable",
    plugType: "G", voltage: "230V", currencyCode: "GBP", currencyName: "Libra esterlina",
    language: "Inglés", phraseLanguage: "en", timezone: "Europe/London",
    entryRequirements: [
      { key: "visa", label: "Visado", value: "No requerido < 6 meses (pasaporte, no DNI)", status: "info" },
      noVaccines(),
      { key: "health", label: "Sanidad", value: "GHIC recomendada", status: "info" },
    ],
  },
  TR: {
    code: "TR", name: "Turquía", eu: false, schengen: false,
    capital: "Ankara", population: "~85 millones", area: "~785.000 km²",
    drivingSide: "right", tapWater: "bottled",
    plugType: "F", voltage: "230V", currencyCode: "TRY", currencyName: "Lira turca",
    language: "Turco", phraseLanguage: "tr", timezone: "Europe/Istanbul",
    entryRequirements: [
      { key: "visa", label: "Visado", value: "No requerido < 90 días", status: "ok" },
      noVaccines(),
      travelInsurance(),
    ],
  },
  US: {
    code: "US", name: "Estados Unidos", eu: false, schengen: false,
    capital: "Washington D.C.", population: "~335 millones", area: "~9.834.000 km²",
    drivingSide: "right", tapWater: "potable",
    plugType: "A/B", voltage: "120V", currencyCode: "USD", currencyName: "Dólar estadounidense",
    language: "Inglés", phraseLanguage: "en", timezone: "America/New_York", timezoneNote: "Varía según el estado",
    entryRequirements: [
      { key: "visa", label: "Visado", value: "ESTA obligatorio (online)", status: "required" },
      noVaccines(),
      { key: "health", label: "Sanidad", value: "Seguro de viaje muy recomendado", status: "info" },
    ],
  },
  MX: {
    code: "MX", name: "México", eu: false, schengen: false,
    capital: "Ciudad de México", population: "~128 millones", area: "~1.964.000 km²",
    drivingSide: "right", tapWater: "bottled",
    plugType: "A/B", voltage: "127V", currencyCode: "MXN", currencyName: "Peso mexicano",
    language: "Español", timezone: "America/Mexico_City", timezoneNote: "Varía según la región",
    entryRequirements: [
      { key: "visa", label: "Visado", value: "No requerido — FMM obligatoria (incl. en el vuelo)", status: "info" },
      noVaccines(),
      travelInsurance(),
    ],
  },
  AR: {
    code: "AR", name: "Argentina", eu: false, schengen: false,
    capital: "Buenos Aires", population: "~46 millones", area: "~2.780.000 km²",
    drivingSide: "right", tapWater: "potable",
    plugType: "C/I", voltage: "220V", currencyCode: "ARS", currencyName: "Peso argentino",
    language: "Español", timezone: "America/Argentina/Buenos_Aires",
    entryRequirements: [
      { key: "visa", label: "Visado", value: "No requerido < 90 días", status: "ok" },
      noVaccines(),
      travelInsurance(),
    ],
  },
  PE: {
    code: "PE", name: "Perú", eu: false, schengen: false,
    capital: "Lima", population: "~34 millones", area: "~1.285.000 km²",
    drivingSide: "right", tapWater: "bottled",
    plugType: "A/C", voltage: "220V", currencyCode: "PEN", currencyName: "Sol peruano",
    language: "Español", timezone: "America/Lima",
    entryRequirements: [
      { key: "visa", label: "Visado", value: "No requerido < 183 días", status: "ok" },
      { key: "vaccines", label: "Vacunas", value: "Fiebre amarilla si vas a la Amazonía", status: "info" },
      travelInsurance(),
    ],
  },
  CO: {
    code: "CO", name: "Colombia", eu: false, schengen: false,
    capital: "Bogotá", population: "~52 millones", area: "~1.142.000 km²",
    drivingSide: "right", tapWater: "bottled",
    plugType: "A/B", voltage: "110V", currencyCode: "COP", currencyName: "Peso colombiano",
    language: "Español", timezone: "America/Bogota",
    entryRequirements: [
      { key: "visa", label: "Visado", value: "No requerido < 90 días", status: "ok" },
      noVaccines(),
      travelInsurance(),
    ],
  },
  MA: {
    code: "MA", name: "Marruecos", eu: false, schengen: false,
    capital: "Rabat", population: "~37 millones", area: "~447.000 km²",
    drivingSide: "right", tapWater: "bottled",
    plugType: "C/E", voltage: "220V", currencyCode: "MAD", currencyName: "Dírham marroquí",
    language: "Árabe / Francés", phraseLanguage: "fr", timezone: "Africa/Casablanca",
    entryRequirements: [
      { key: "visa", label: "Visado", value: "No requerido < 90 días", status: "ok" },
      noVaccines(),
      travelInsurance(),
    ],
  },
  EG: {
    code: "EG", name: "Egipto", eu: false, schengen: false,
    capital: "El Cairo", population: "~112 millones", area: "~1.002.000 km²",
    drivingSide: "right", tapWater: "bottled",
    plugType: "C/F", voltage: "220V", currencyCode: "EGP", currencyName: "Libra egipcia",
    language: "Árabe", phraseLanguage: "ar", timezone: "Africa/Cairo",
    entryRequirements: [
      { key: "visa", label: "Visado", value: "e-Visa o visado a la llegada", status: "required" },
      noVaccines(),
      travelInsurance(),
    ],
  },
  ZA: {
    code: "ZA", name: "Sudáfrica", eu: false, schengen: false,
    capital: "Pretoria", population: "~60 millones", area: "~1.221.000 km²",
    drivingSide: "left", tapWater: "potable",
    plugType: "M/N", voltage: "230V", currencyCode: "ZAR", currencyName: "Rand sudafricano",
    language: "Inglés (+ 10 oficiales)", phraseLanguage: "en", timezone: "Africa/Johannesburg",
    entryRequirements: [
      { key: "visa", label: "Visado", value: "No requerido < 90 días", status: "ok" },
      noVaccines(),
      { key: "health", label: "Sanidad", value: "Seguro de viaje muy recomendado", status: "info" },
    ],
  },
  TH: {
    code: "TH", name: "Tailandia", eu: false, schengen: false,
    capital: "Bangkok", population: "~72 millones", area: "~513.000 km²",
    drivingSide: "left", tapWater: "bottled",
    plugType: "A/C/O", voltage: "220V", currencyCode: "THB", currencyName: "Baht tailandés",
    language: "Tailandés", phraseLanguage: "th", timezone: "Asia/Bangkok",
    entryRequirements: [
      { key: "visa", label: "Visado", value: "No requerido < 30 días", status: "ok" },
      noVaccines(),
      travelInsurance(),
    ],
  },
  JP: {
    code: "JP", name: "Japón", eu: false, schengen: false,
    capital: "Tokio", population: "~124 millones", area: "~378.000 km²",
    drivingSide: "left", tapWater: "potable",
    plugType: "A/B", voltage: "100V", currencyCode: "JPY", currencyName: "Yen japonés",
    language: "Japonés", phraseLanguage: "ja", timezone: "Asia/Tokyo",
    entryRequirements: [
      { key: "visa", label: "Visado", value: "No requerido < 90 días", status: "ok" },
      noVaccines(),
      { key: "health", label: "Sanidad", value: "Seguro de viaje recomendado (caro sin seguro)", status: "info" },
    ],
  },
  VN: {
    code: "VN", name: "Vietnam", eu: false, schengen: false,
    capital: "Hanói", population: "~99 millones", area: "~331.000 km²",
    drivingSide: "right", tapWater: "bottled",
    plugType: "A/C", voltage: "220V", currencyCode: "VND", currencyName: "Dong vietnamita",
    language: "Vietnamita", phraseLanguage: "vi", timezone: "Asia/Ho_Chi_Minh",
    entryRequirements: [
      { key: "visa", label: "Visado", value: "e-Visa obligatorio (online)", status: "required" },
      noVaccines(),
      travelInsurance(),
    ],
  },
  AE: {
    code: "AE", name: "Emiratos Árabes Unidos", eu: false, schengen: false,
    capital: "Abu Dabi", population: "~9,5 millones", area: "~83.600 km²",
    drivingSide: "right", tapWater: "potable",
    plugType: "G", voltage: "230V", currencyCode: "AED", currencyName: "Dirham de EAU",
    language: "Árabe", phraseLanguage: "ar", timezone: "Asia/Dubai",
    entryRequirements: [
      { key: "visa", label: "Visado", value: "No requerido < 90 días (gratuito a la llegada)", status: "ok" },
      noVaccines(),
      travelInsurance(),
    ],
  },
  IN: {
    code: "IN", name: "India", eu: false, schengen: false,
    capital: "Nueva Delhi", population: "~1.430 millones", area: "~3.287.000 km²",
    drivingSide: "left", tapWater: "bottled",
    plugType: "C/D/M", voltage: "230V", currencyCode: "INR", currencyName: "Rupia india",
    language: "Hindi / Inglés", phraseLanguage: "hi", timezone: "Asia/Kolkata",
    entryRequirements: [
      { key: "visa", label: "Visado", value: "e-Visa obligatorio (online)", status: "required" },
      { key: "vaccines", label: "Vacunas", value: "Hepatitis A/B, tifoidea recomendadas", status: "info" },
      { key: "health", label: "Sanidad", value: "Seguro de viaje muy recomendado", status: "info" },
    ],
  },
  JO: {
    code: "JO", name: "Jordania", eu: false, schengen: false,
    capital: "Amán", population: "~11 millones", area: "~89.000 km²",
    drivingSide: "right", tapWater: "bottled",
    plugType: "B/C/D/F/G", voltage: "230V", currencyCode: "JOD", currencyName: "Dinar jordano",
    language: "Árabe", phraseLanguage: "ar", timezone: "Asia/Amman",
    entryRequirements: [
      { key: "visa", label: "Visado", value: "A la llegada (o incl. en el Jordan Pass)", status: "info" },
      noVaccines(),
      travelInsurance(),
    ],
  },
  AU: {
    code: "AU", name: "Australia", eu: false, schengen: false,
    capital: "Canberra", population: "~26 millones", area: "~7.692.000 km²",
    drivingSide: "left", tapWater: "potable",
    plugType: "I", voltage: "230V", currencyCode: "AUD", currencyName: "Dólar australiano",
    language: "Inglés", phraseLanguage: "en", timezone: "Australia/Sydney", timezoneNote: "Varía según el estado",
    entryRequirements: [
      { key: "visa", label: "Visado", value: "eVisitor obligatorio (online, gratis)", status: "required" },
      noVaccines(),
      travelInsurance(),
    ],
  },
  NZ: {
    code: "NZ", name: "Nueva Zelanda", eu: false, schengen: false,
    capital: "Wellington", population: "~5,2 millones", area: "~268.000 km²",
    drivingSide: "left", tapWater: "potable",
    plugType: "I", voltage: "230V", currencyCode: "NZD", currencyName: "Dólar neozelandés",
    language: "Inglés", phraseLanguage: "en", timezone: "Pacific/Auckland",
    entryRequirements: [
      { key: "visa", label: "Visado", value: "NZeTA + tasa IVL obligatorios (online)", status: "required" },
      noVaccines(),
      travelInsurance(),
    ],
  },
};

export function getDestinationInfo(countryCode: string | null | undefined): DestinationInfo | null {
  if (!countryCode) return null;
  return DESTINATIONS[countryCode.trim().toUpperCase()] ?? null;
}

export function hasDestinationInfo(countryCode: string | null | undefined): boolean {
  return !!getDestinationInfo(countryCode);
}

/** Compara la franja horaria del destino con la del dispositivo, en horas. */
export function timezoneDiffHours(ianaTimezone: string): number | null {
  try {
    const now = new Date();
    const localOffset = -now.getTimezoneOffset(); // minutos, ya en signo correcto
    const destOffset = getIanaOffsetMinutes(ianaTimezone, now);
    if (destOffset == null) return null;
    return Math.round((destOffset - localOffset) / 60);
  } catch {
    return null;
  }
}

function getIanaOffsetMinutes(timeZone: string, date: Date): number | null {
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    const parts = dtf.formatToParts(date).reduce((acc: any, p) => {
      acc[p.type] = p.value;
      return acc;
    }, {});
    const asUTC = Date.UTC(
      Number(parts.year), Number(parts.month) - 1, Number(parts.day),
      Number(parts.hour), Number(parts.minute), Number(parts.second)
    );
    return Math.round((asUTC - date.getTime()) / 60000);
  } catch {
    return null;
  }
}

export function timezoneLabel(info: DestinationInfo): string {
  const diff = timezoneDiffHours(info.timezone);
  if (diff == null) return "—";
  if (diff === 0) return "Misma que tú";
  const sign = diff > 0 ? "+" : "";
  return `${sign}${diff} h`;
}

export function drivingSideLabel(side: DrivingSide): string {
  return side === "left" ? "Izquierda" : "Derecha";
}

export function tapWaterLabel(water: TapWater): string {
  return water === "potable" ? "Potable" : "Mejor embotellada";
}

export const DESTINATION_INFO_DISCLAIMER =
  "Información orientativa para pasaporte/DNI español — verifica siempre los requisitos oficiales antes de viajar.";
