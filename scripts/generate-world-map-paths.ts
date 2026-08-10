/**
 * One-off generator: converts world-atlas's TopoJSON world map into a flat
 * { [ISO2]: svgPathD } lookup, precomputed at build time so the app never
 * ships d3-geo/topojson-client or does map projection math at runtime.
 *
 * Run with: npx ts-node --compiler-options '{"module":"commonjs","types":["node"]}' scripts/generate-world-map-paths.ts
 * (the app's tsconfig restricts `types` to nativewind only, so this script
 * needs its own override to see `fs`/`path`/`__dirname` from @types/node)
 * Output: src/assets/worldMapPaths.ts
 */
import * as fs from "fs";
import * as path from "path";
import { geoPath, geoNaturalEarth1 } from "d3-geo";
import { feature } from "topojson-client";
// @ts-ignore - no type declarations published for this package
import { presimplify, simplify } from "topojson-simplify";
import worldCountries from "world-countries";
// @ts-ignore - no type declarations shipped for the JSON data files themselves
import rawTopology from "world-atlas/countries-50m.json";

// Simplify the topology itself (fewer points per coastline) rather than just
// rounding coordinates — this is what actually shrinks the generated file,
// since point count dominates string length far more than decimal digits do.
// A lighter threshold than before keeps far more coastline detail (small
// islands, archipelagos, the Mediterranean) at the cost of a bigger file.
const topology = simplify(presimplify(rawTopology as any), 0.00015);

// Bigger viewBox = more integer steps available per coordinate before
// rounding, i.e. finer effective resolution even at the same `.digits()`
// setting (SVG still scales the viewBox to fit the rendered size, so this
// doesn't change how big the map appears on screen — only how much detail
// survives rounding).
const VIEWBOX_WIDTH = 960;
const VIEWBOX_HEIGHT = 500;

const numericToIso2 = new Map<string, string>();
for (const c of worldCountries as any[]) {
  if (c.ccn3) numericToIso2.set(c.ccn3, c.cca2);
}

// Several countries' MultiPolygon shapes bundle in remote overseas
// territories as extra polygon rings on the SAME feature — e.g. France's
// shape here also includes French Guiana (South America), Martinique/
// Guadeloupe (Caribbean) and Réunion/Mayotte (Indian Ocean). On a small
// world map those render as stray disconnected blobs far from the country's
// actual landmass, which reads as a rendering bug rather than a real place.
//
// A generic "far + small" geometric heuristic was tried here first and
// failed on the very case it targeted: French Guiana's bounding box is ~9%
// of mainland France's area, above any threshold that wouldn't also risk
// chopping legitimate territory off other countries (Hawaii vs. the US
// mainland is a similarly "far + small" ratio, and must NOT be dropped).
// So instead this is an explicit, manually-verified allowlist per country —
// slower to extend to new countries, but each entry is a checked fact, not
// a guess.
const TERRITORY_MIN_LAT: Record<string, number> = {
  // Mainland France/Corsica/nearby islands are all lat > 41; French Guiana,
  // Martinique, Guadeloupe, Réunion and Mayotte are all lat < 17.
  FR: 30,
  // Mainland Netherlands is lat ~50-54; the Caribbean BES islands
  // (Bonaire/Sint Eustatius/Saba) bundled into the same shape are lat ~12-18.
  NL: 30,
};

function ringCentroidLat(ring: [number, number][]) {
  let sum = 0;
  for (const [, lat] of ring) sum += lat;
  return sum / ring.length;
}

function stripRemoteTerritories(f: any, minLat: number) {
  if (f.geometry?.type !== "MultiPolygon") return f;
  const polys: any[] = f.geometry.coordinates;
  const kept = polys.filter((poly) => ringCentroidLat(poly[0]) >= minLat);
  if (!kept.length || kept.length === polys.length) return f;
  return { ...f, geometry: { ...f.geometry, coordinates: kept } };
}

const fc: any = feature(topology as any, (topology as any).objects.countries);
fc.features = fc.features.map((f: any) => {
  const iso2 = numericToIso2.get(String(f.id));
  const minLat = iso2 ? TERRITORY_MIN_LAT[iso2] : undefined;
  return minLat != null ? stripRemoteTerritories(f, minLat) : f;
});

const projection = geoNaturalEarth1().fitSize([VIEWBOX_WIDTH, VIEWBOX_HEIGHT], fc);
// Full float precision is pointless here — the map renders at a few hundred
// px wide in the app, and untruncated coordinates were bloating the
// generated file to ~1.4MB. One decimal digit keeps sub-pixel definition at
// this larger viewBox without the full float bloat.
const pathGenerator = geoPath(projection).digits(1);

const paths: Record<string, string> = {};
let matched = 0;
let unmatched: string[] = [];

for (const f of fc.features) {
  const iso2 = numericToIso2.get(String(f.id));
  const d = pathGenerator(f);
  if (!d) continue;
  if (!iso2) {
    unmatched.push(`${f.id} (${f.properties?.name ?? "?"})`);
    continue;
  }
  // A couple of numeric codes map to the same ISO2 in edge cases (disputed
  // territories); keep the first (largest, since world-atlas lists the
  // main landmass first for those cases) rather than overwrite it.
  if (!paths[iso2]) paths[iso2] = d;
  matched++;
}

console.log(`Matched ${matched}/${fc.features.length} country shapes to an ISO2 code.`);
if (unmatched.length) {
  console.log(`Unmatched (no ISO2 in world-countries, skipped): ${unmatched.join(", ")}`);
}

const outPath = path.join(__dirname, "..", "src", "assets", "worldMapPaths.ts");
const header = `// AUTO-GENERATED by scripts/generate-world-map-paths.ts — do not edit by hand.\n// Regenerate with: npx ts-node --compiler-options '{"module":"commonjs","types":["node"]}' scripts/generate-world-map-paths.ts\n\n`;
const body =
  `export const WORLD_MAP_VIEWBOX = "0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}";\n\n` +
  `export const WORLD_MAP_PATHS: Record<string, string> = ${JSON.stringify(paths, null, 0)};\n`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, header + body);
console.log(`Wrote ${outPath} (${Object.keys(paths).length} countries, ${(body.length / 1024).toFixed(0)} KB)`);
