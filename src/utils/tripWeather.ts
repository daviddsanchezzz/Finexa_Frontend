// src/utils/tripWeather.ts

export interface WeatherDay {
  date: string;
  code: number;
  max: number;
  min: number;
}

// ===== WMO weather code → emoji + label =====
export function wmoToMeta(code: number): { emoji: string; label: string } {
  if (code === 0) return { emoji: "☀️", label: "Despejado" };
  if (code <= 3) return { emoji: "⛅", label: "Nuboso" };
  if (code <= 48) return { emoji: "🌫️", label: "Niebla" };
  if (code <= 55) return { emoji: "🌦️", label: "Llovizna" };
  if (code <= 65) return { emoji: "🌧️", label: "Lluvia" };
  if (code <= 77) return { emoji: "❄️", label: "Nieve" };
  if (code <= 82) return { emoji: "🌦️", label: "Chubascos" };
  if (code <= 99) return { emoji: "⛈️", label: "Tormenta" };
  return { emoji: "🌡️", label: "Variable" };
}

export async function fetchTripWeather(countryCode: string, tripName?: string): Promise<{ city: string; days: WeatherDay[] }> {
  let lat: number | undefined;
  let lon: number | undefined;
  let resolvedCity = "";

  // 1. Try geocoding the trip name directly (e.g. "Sicilia", "París")
  if (tripName) {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(tripName)}&count=1&language=es&format=json`
    );
    const geoData = await geoRes.json();
    if (geoData?.results?.length > 0) {
      const r = geoData.results[0];
      lat = r.latitude;
      lon = r.longitude;
      resolvedCity = r.name || tripName;
    }
  }

  // 2. Fallback: country capital from restcountries
  if (!lat || !lon) {
    const rc = await fetch(
      `https://restcountries.com/v3.1/alpha/${countryCode}?fields=capital,capitalInfo`
    );
    const rcData = await rc.json();
    resolvedCity = rcData?.capital?.[0] || "";
    lat = rcData?.capitalInfo?.latlng?.[0];
    lon = rcData?.capitalInfo?.latlng?.[1];
  }

  if (!lat || !lon) return { city: "", days: [] };

  // 3. Weather from open-meteo (free, no key)
  const wRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5`
  );
  const wData = await wRes.json();
  const { time, weathercode, temperature_2m_max, temperature_2m_min } = wData.daily || {};
  if (!time) return { city: resolvedCity, days: [] };
  const days: WeatherDay[] = (time as string[]).map((d: string, i: number) => ({
    date: d,
    code: weathercode[i],
    max: Math.round(temperature_2m_max[i]),
    min: Math.round(temperature_2m_min[i]),
  }));
  return { city: resolvedCity, days };
}

/** Sugerencias básicas de maleta según el pronóstico (no persistidas, solo un aviso). */
export function getClimateChecklistSuggestions(days: WeatherDay[]): string[] {
  if (!days.length) return [];
  const maxTemp = Math.max(...days.map((d) => d.max));
  const minTemp = Math.min(...days.map((d) => d.min));
  const rainy = days.some((d) => d.code >= 51 && d.code <= 82);

  const suggestions: string[] = [];
  if (maxTemp >= 26) suggestions.push("protector solar", "gafas de sol", "repelente de insectos");
  if (minTemp <= 10) suggestions.push("abrigo", "guantes", "gorro");
  if (rainy) suggestions.push("paraguas o chubasquero");

  return Array.from(new Set(suggestions));
}
