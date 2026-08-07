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
// Heuristic: keep the largest polygon (by bbox area) plus anything close to
// it (legitimate nearby islands); drop polygons that are BOTH far away AND
// small relative to the main landmass — that combination is what separates
// "remote overseas territory" from "this country is a large archipelago"
// (Indonesia/Philippines/Japan have several comparably-large islands, none
// of which is a tiny distant outlier, so they're untouched by this).
const REMOTE_DISTANCE_DEG = 25;
const REMOTE_MAX_AREA_RATIO = 0.05;

function ringBBox(ring: [number, number][]) {
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const [lon, lat] of ring) {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return { minLon, maxLon, minLat, maxLat };
}
function bboxArea(b: ReturnType<typeof ringBBox>) {
  return Math.max(0, b.maxLon - b.minLon) * Math.max(0, b.maxLat - b.minLat);
}
function bboxCenter(b: ReturnType<typeof ringBBox>): [number, number] {
  return [(b.minLon + b.maxLon) / 2, (b.minLat + b.maxLat) / 2];
}
function dist(a: [number, number], b: [number, number]) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function stripRemoteTerritories(f: any) {
  if (f.geometry?.type !== "MultiPolygon") return f;
  const polys: any[] = f.geometry.coordinates;
  if (polys.length <= 1) return f;

  const boxed = polys.map((poly) => ({ poly, bbox: ringBBox(poly[0]) }));
  let main = boxed[0];
  for (const b of boxed) if (bboxArea(b.bbox) > bboxArea(main.bbox)) main = b;
  const mainCenter = bboxCenter(main.bbox);
  const mainArea = bboxArea(main.bbox) || 1;

  const kept = boxed.filter((b) => {
    if (b === main) return true;
    const isRemote = dist(mainCenter, bboxCenter(b.bbox)) > REMOTE_DISTANCE_DEG
      && bboxArea(b.bbox) / mainArea < REMOTE_MAX_AREA_RATIO;
    return !isRemote;
  });

  if (kept.length === boxed.length) return f;
  return { ...f, geometry: { ...f.geometry, coordinates: kept.map((b) => b.poly) } };
}

// Deliberately NOT applied blanket to every country: the distance+area
// heuristic can't tell "remote overseas department" (French Guiana) apart
// from "this large, spread-out country legitimately includes this" (Hawaii
// is just as far/small relative to the US mainland and would get stripped
// too, which would be wrong). So it only runs for countries manually
// checked to have genuine remote-territory blobs bundled into their shape.
const APPLY_TERRITORY_STRIP = new Set(["FR", "NL"]);

const fc: any = feature(topology as any, (topology as any).objects.countries);
fc.features = fc.features.map((f: any) => {
  const iso2 = numericToIso2.get(String(f.id));
  return iso2 && APPLY_TERRITORY_STRIP.has(iso2) ? stripRemoteTerritories(f) : f;
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
