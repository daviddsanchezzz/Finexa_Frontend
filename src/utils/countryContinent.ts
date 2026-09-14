import countries from "world-countries";

export type CountryContinent =
  | "europe"
  | "africa"
  | "asia"
  | "north_america"
  | "south_america"
  | "oceania"
  | "antarctica";

const continentByCountry = new Map<string, CountryContinent>();

for (const country of countries as any[]) {
  const code = String(country?.cca2 || "").trim().toUpperCase();
  const region = String(country?.region || "").trim().toLowerCase();
  const subregion = String(country?.subregion || "").trim().toLowerCase();
  if (!code) continue;

  let continent: CountryContinent | null = null;
  if (region === "europe") continent = "europe";
  else if (region === "africa") continent = "africa";
  else if (region === "asia") continent = "asia";
  else if (region === "oceania") continent = "oceania";
  else if (region === "antarctic") continent = "antarctica";
  else if (region === "americas") {
    continent = subregion === "south america" ? "south_america" : "north_america";
  }

  if (continent) continentByCountry.set(code, continent);
}

export function continentFromCountryCode(code?: string | null): CountryContinent | null {
  return continentByCountry.get(String(code || "").trim().toUpperCase()) ?? null;
}
