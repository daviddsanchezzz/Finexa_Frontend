const COUNTRY_MAP: Record<string, string> = {
  "United States": "Estados Unidos",
  "United States & Canada": "Estados Unidos y Canadá",
  "Japan": "Japón",
  "United Kingdom": "Reino Unido",
  "Canada": "Canadá",
  "France": "Francia",
  "Germany": "Alemania",
  "Switzerland": "Suiza",
  "Australia": "Australia",
  "Netherlands": "Países Bajos",
  "China": "China",
  "South Korea": "Corea del Sur",
  "Korea": "Corea del Sur",
  "Sweden": "Suecia",
  "Denmark": "Dinamarca",
  "Hong Kong": "Hong Kong",
  "Spain": "España",
  "Italy": "Italia",
  "Brazil": "Brasil",
  "India": "India",
  "Taiwan": "Taiwán",
  "Singapore": "Singapur",
  "Norway": "Noruega",
  "Finland": "Finlandia",
  "Belgium": "Bélgica",
  "Austria": "Austria",
  "Ireland": "Irlanda",
  "Portugal": "Portugal",
  "Mexico": "México",
  "Russia": "Rusia",
  "Poland": "Polonia",
  "Turkey": "Turquía",
  "South Africa": "Sudáfrica",
  "Israel": "Israel",
  "New Zealand": "Nueva Zelanda",
  "Greece": "Grecia",
  "Czech Republic": "República Checa",
  "Hungary": "Hungría",
  "Indonesia": "Indonesia",
  "Malaysia": "Malasia",
  "Thailand": "Tailandia",
  "Philippines": "Filipinas",
  "Chile": "Chile",
  "Colombia": "Colombia",
  "Peru": "Perú",
  "Argentina": "Argentina",
  "Egypt": "Egipto",
  "Saudi Arabia": "Arabia Saudí",
  "United Arab Emirates": "Emiratos Árabes Unidos",
  "Qatar": "Qatar",
  "Kuwait": "Kuwait",
  "Pakistan": "Pakistán",
  "Other": "Otros",
  "Unknown": "Sin datos",
  "Cash": "Liquidez",
  "Emerging Markets": "Mercados emergentes",
  "Developed Markets": "Mercados desarrollados",
  "Europe": "Europa",
  "Asia Pacific": "Asia Pacífico",
  "Asia Pacific ex Japan": "Asia Pacífico (ex Japón)",
  "Asia": "Asia",
  "North America": "Norteamérica",
  "Latin America": "Latinoamérica",
  "Middle East": "Oriente Medio",
  "Middle East & Africa": "Oriente Medio y África",
  "Africa": "África",
  "Global": "Global",
  "Eurozone": "Eurozona",
};

const SECTOR_MAP: Record<string, string> = {
  "Information Technology": "Tecnología",
  "Technology": "Tecnología",
  "Financials": "Finanzas",
  "Finance": "Finanzas",
  "Health Care": "Salud",
  "Healthcare": "Salud",
  "Health care": "Salud",
  "Consumer Discretionary": "Consumo discrecional",
  "Consumer Staples": "Consumo básico",
  "Industrials": "Industria",
  "Industrial": "Industria",
  "Communication Services": "Comunicaciones",
  "Communications": "Comunicaciones",
  "Energy": "Energía",
  "Materials": "Materiales",
  "Real Estate": "Inmobiliario",
  "Utilities": "Servicios básicos",
  "Basic Materials": "Materiales básicos",
  "Consumer Goods": "Bienes de consumo",
  "Consumer Services": "Servicios al consumidor",
  "Semiconductors": "Semiconductores",
  "Broadline Retail": "Distribución minorista",
  "Systems Software": "Software de sistemas",
  "Aerospace & Defense": "Aeroespacial y defensa",
  "Healthcare Supplies": "Suministros sanitarios",
  "Electronic Components": "Componentes electrónicos",
  "Automobile Manufacturers": "Fabricantes de automóviles",
  "Communications Equipment": "Equipos de comunicaciones",
  "Heavy Electrical Equipment": "Equipamiento eléctrico pesado",
  "Interactive Media & Services": "Medios y servicios interactivos",
  "Investment Banking & Brokerage": "Banca de inversión y brókeres",
  "Electrical Components & Equipment": "Componentes y equipos eléctricos",
  "Electronic Manufacturing Services": "Fabricación electrónica",
  "Electronic Equipment & Instruments": "Equipos e instrumentos electrónicos",
  "Internet Services & Infrastructure": "Servicios e infraestructura de internet",
  "Semiconductor Materials & Equipment": "Materiales y equipos de semiconductores",
  "Tech Hardware Storage & Peripherals": "Hardware, almacenamiento y periféricos",
  "Wireless Telecommunication Services": "Telecomunicaciones inalámbricas",
  "Other": "Otros",
  "Unknown": "Sin datos",
  "Cash": "Liquidez",
  "Cryptocurrency": "Criptomonedas",
  "DeFi": "DeFi",
};

export const translateCountry = (name: string): string => COUNTRY_MAP[name] ?? name;

export const translateSector = (name: string): string => SECTOR_MAP[name] ?? name;

// Reverse maps: Spanish label → English DB key (for saving back to the API)
export const REVERSE_COUNTRY_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTRY_MAP).map(([k, v]) => [v, k])
);

export const REVERSE_SECTOR_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(SECTOR_MAP).map(([k, v]) => [v, k])
);

// Suggestion arrays for autocomplete (deduplicated by label, sorted alphabetically in Spanish)
export const COUNTRY_SUGGESTIONS: Array<{ label: string; value: string }> = Object.entries(
  COUNTRY_MAP
)
  .reduce((acc, [value, label]) => {
    if (!acc.find((x) => x.label === label)) acc.push({ label, value });
    return acc;
  }, [] as Array<{ label: string; value: string }>)
  .sort((a, b) => a.label.localeCompare(b.label, "es"));

export const SECTOR_SUGGESTIONS: Array<{ label: string; value: string }> = Object.entries(
  SECTOR_MAP
)
  .reduce((acc, [value, label]) => {
    if (!acc.find((x) => x.label === label)) acc.push({ label, value });
    return acc;
  }, [] as Array<{ label: string; value: string }>)
  .sort((a, b) => a.label.localeCompare(b.label, "es"));

/**
 * Convierte un número a string en formato español para inputs (sin separador de miles).
 * Ej: 291.403 → "291,403" | 3702.64 → "3702,64"
 */
export const numToInputStr = (n: number | null | undefined, maxDecimals = 6): string => {
  if (n == null || !Number.isFinite(n as number)) return "";
  return (n as number).toLocaleString("es-ES", {
    maximumFractionDigits: maxDecimals,
    useGrouping: false,
  });
};
